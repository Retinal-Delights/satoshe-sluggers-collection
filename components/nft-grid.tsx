"use client";

import { useState, useEffect, useMemo, useRef } from "react";
// import Link from "next/link";
// import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Pagination from "@/components/ui/pagination";
import { useActiveAccount, useWalletBalance, useSendTransaction, TransactionButton } from "thirdweb/react";
import { format } from "date-fns";
import { readContract } from "thirdweb";
import { bidInAuction, buyoutAuction } from "thirdweb/extensions/marketplace";
import { base } from "thirdweb/chains";
import { client } from "@/lib/thirdweb";
import { marketplace } from "@/lib/contracts";
import { toWei } from "thirdweb";
import NFTCard from "./nft-card";
import { track } from '@vercel/analytics';

// Utility to convert wei to ETH
function fromWei(wei: string | number | bigint): string {
  try {
    const value = BigInt(wei);
    const eth = Number(value) / 1e18;
    return eth.toLocaleString(undefined, { maximumFractionDigits: 6 });
  } catch {
    return "0";
  }
}

function getAuctionCountdown(auctionEnd: string | number | bigint) {
  if (!auctionEnd) return "Auction ended";

  const now = Date.now();
  const end = Number(auctionEnd) * 1000;
  const timeLeft = end - now;

  if (timeLeft <= 0) return "Auction ended";

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m remaining`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  } else {
    return `${minutes}m remaining`;
  }
}

function displayPrice(val: string | number | bigint) {
  if (!val || val === "0") {
    return "--";
  }
  if ((typeof val === "string" && /^\d{12,}$/.test(val)) || typeof val === "bigint") {
    try {
      const eth = Number(BigInt(val)) / 1e18;
      if (eth > 10000) {
        return "--";
      }
      return eth + " ETH";
    } catch {
      return "--";
    }
  }
  if (typeof val === "number" && val < 1e6) {
    return val + " ETH";
  }
  if (typeof val === "string" && /^\d*\.?\d+$/.test(val)) {
    return val + " ETH";
  }
  return "--";
}

const FALLBACK_IMAGE = "/placeholder-nft.webp";
const METADATA_URL = "/docs/combined_metadata.json";
const NFT_URLS = "/docs/nft_urls.json";

type NFTGridItem = {
  id: string;
  tokenId: string;
  name: string;
  image: string;
  bidPriceWei: string | number | bigint;
  currentBidWei: string | number | bigint;
  priceWei: string | number | bigint;
  auctionEnd: string | number | bigint;
  auctionStart: string | number | bigint;
  rank: number | string;
  rarity: string;
  rarityPercent: string | number;
  auctionId: bigint;
  numBids: number;
  isForSale: boolean;
  isCancelled: boolean;
  background?: string;
  skinTone?: string;
  shirt?: string;
  eyewear?: string;
  hair?: Record<string, string[]>;
  headwear?: Record<string, string[]>;
};

const tierPrices: Record<string, { start: number; bid: number; buy: number }> = {
  "Ground Ball": { start: 0.00777, bid: 0.00777, buy: 0.015 },
  "Base Hit": { start: 0.025, bid: 0.025, buy: 0.05 },
  "Double": { start: 0.05, bid: 0.05, buy: 0.1 },
  "Stand-Up Double": { start: 0.1, bid: 0.1, buy: 0.25 },
  "Line Drive": { start: 0.25, bid: 0.25, buy: 0.5 },
  "Triple": { start: 0.5, bid: 0.5, buy: 1 },
  "Pinch Hit Home Run": { start: 1, bid: 1, buy: 2 },
  "Home Run": { start: 2, bid: 2, buy: 3 },
  "Over-the-Fence Shot": { start: 3, bid: 3, buy: 4.5 },
  "Walk-Off Home Run": { start: 4.5, bid: 4.5, buy: 6.75 },
  "Grand Slam (Ultra-Legendary)": { start: 6.75, bid: 6.75, buy: 10 },
};

// Helper to determine if a value is likely wei (big number string)
const isWei = (val: any) => typeof val === "string" && /^[0-9]+$/.test(val) && val.length > 10;

interface NFTGridProps {
  searchTerm: string;
  selectedFilters: any;
  onFilteredCountChange?: (count: number) => void;
  onTraitCountsChange?: (counts: Record<string, Record<string, number>>) => void;
}

// Set the total number of NFTs in your collection
const TOTAL_NFTS = 7777;

// Cancelled/Expired Listings - DO NOT USE THESE LISTING IDS
const CANCELLED_LISTING_IDS = [0, 1, 2, 3, 4, 5, 6, 7782, 7783, 7784, 7785, 7786, 7787, 7788];

// Helper function to check if a listing ID is cancelled
const isCancelledListing = (listingId: string | number | bigint) => {
  return CANCELLED_LISTING_IDS.includes(Number(listingId));
};

// Helper to extract attribute value from metadata
function getAttribute(meta: any, traitType: string) {
  return meta?.attributes?.find((attr: any) => attr.trait_type === traitType)?.value;
}

// Helper to get all unique values for a trait type from metadata
function getUniqueTraitValues(metadata: any[], traitType: string) {
  const values = new Set<string>();
  metadata.forEach((meta: any) => {
    const value = getAttribute(meta, traitType);
    if (value) values.add(value);
  });
  return Array.from(values).sort();
}

// After filtering, compute dynamic trait counts for every filterable option
function computeTraitCounts(nfts: NFTGridItem[], categories: string[]) {
  const counts: Record<string, Record<string, number>> = {};
  categories.forEach(category => {
    counts[category] = {};
    nfts.forEach(nft => {
      const value = (nft as any)[category];
      if (value) {
        if (!counts[category][value]) counts[category][value] = 0;
        counts[category][value]++;
      }
    });
  });
  return counts;
}

export default function NFTGrid({ searchTerm, selectedFilters, onFilteredCountChange, onTraitCountsChange }: NFTGridProps) {
  const [activeView, setActiveView] = useState("forSale");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [sortBy, setSortBy] = useState("default");
  const [nfts, setNfts] = useState<NFTGridItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bidAmounts, setBidAmounts] = useState<{
    [id: string]: string;
  }>({});
  const [isProcessingBid, setIsProcessingBid] = useState<{
    [id: string]: boolean;
  }>({});
  const [isProcessingBuyNow, setIsProcessingBuyNow] = useState<{
    [id: string]: boolean;
  }>({});
    const [clientReady, setClientReady] = useState(false);
  const [allMetadata, setAllMetadata] = useState<any[]>([]);
  const [imageUrlMap, setImageUrlMap] = useState<{ [tokenId: string]: string }>({});
  const [isMetadataLoaded, setIsMetadataLoaded] = useState(false);

  // Business metrics tracking
  const [sessionMetrics, setSessionMetrics] = useState({
    pageViews: 0,
    uniqueNFTsViewed: new Set<string>(),
    totalBidVolume: 0,
    totalPurchaseVolume: 0,
    sessionStartTime: Date.now()
  });

  const account = useActiveAccount();
  const { data: balance } = useWalletBalance({ client, address: account?.address, chain: base });

      // Create a more efficient approach: use static metadata and minimal auction data
  // Only fetch auction IDs and basic info, not full NFT metadata
  const [auctionMap, setAuctionMap] = useState<Map<number, any>>(new Map());
  const [isLoadingAuctions, setIsLoadingAuctions] = useState(true);

        // Fetch real auction data from marketplace contract with batching
      useEffect(() => {
        const fetchAuctionData = async () => {
          try {
            setIsLoadingAuctions(true);

            // Check for cached data first
            const cacheKey = `auction-data-${marketplace.address}`;
            const cachedData = localStorage.getItem(cacheKey);
            const cacheTimestamp = localStorage.getItem(`${cacheKey}-timestamp`);
            const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : Infinity;
            
            // Use cache if it's less than 15 minutes old
            if (cachedData && cacheAge < 15 * 60 * 1000) {
              const auctionDataMap = new Map(JSON.parse(cachedData) as [number, any][]);
              setAuctionMap(auctionDataMap);
              setIsLoadingAuctions(false);
              return;
            }

            
            // Fetch in batches to handle the entire collection
            const batchSize = 200; // Process 200 auctions at a time (increased for faster loading)
            const maxPossibleAuctions = 7777; // Maximum possible based on collection size
            const allAuctionData: any[] = [];
            
            for (let startId = 0; startId < maxPossibleAuctions; startId += batchSize) {
              const endId = Math.min(startId + batchSize - 1, maxPossibleAuctions - 1);
              
              try {
                const contractCallPromise = readContract({
                  contract: marketplace,
                  method: "function getAllValidAuctions(uint256 _startId, uint256 _endId) view returns ((uint256 auctionId, uint256 tokenId, uint256 quantity, uint256 minimumBidAmount, uint256 buyoutBidAmount, uint64 timeBufferInSeconds, uint64 bidBufferBps, uint64 startTimestamp, uint64 endTimestamp, address auctionCreator, address assetContract, address currency, uint8 tokenType, uint8 status)[] _validAuctions)",
                  params: [BigInt(startId), BigInt(endId)],
                });
                
                const timeoutPromise = new Promise((_, reject) => 
                  setTimeout(() => reject(new Error(`Batch ${startId}-${endId} timeout after 10 seconds`)), 10000)
                );
                
                const batchData = await Promise.race([contractCallPromise, timeoutPromise]) as any[];
                
                if (batchData && Array.isArray(batchData)) {
                  allAuctionData.push(...batchData);
                  
                  // If we get an empty batch, we've likely reached the end of active auctions
                  if (batchData.length === 0) {
                    break;
                  }
                }
                
                // Small delay between batches to be respectful to RPC
                await new Promise(resolve => setTimeout(resolve, 50));
                
              } catch (batchError) {
                console.warn(`[fetchAuctionData] Batch ${startId}-${endId} failed:`, batchError);
                // Continue with next batch even if one fails
              }
            }
            

            // Create auction map from all batched data
            const auctionDataMap = new Map();
            
            if (allAuctionData && Array.isArray(allAuctionData) && allAuctionData.length > 0) {
              allAuctionData.forEach((auction: any) => {
                const tokenId = Number(auction.tokenId);
                auctionDataMap.set(tokenId, {
                  id: auction.auctionId,
                  tokenId: auction.tokenId,
                  auctionId: auction.auctionId,
                  assetContractAddress: auction.assetContract,
                  status: auction.status,
                  type: auction.tokenType,
                  startingPrice: auction.minimumBidAmount,
                  minimumBidAmount: auction.minimumBidAmount,
                  currentBidAmount: auction.minimumBidAmount, // Will be updated with actual current bid
                  buyoutAmount: auction.buyoutBidAmount,
                  endTimeInSeconds: auction.endTimestamp,
                  startTimeInSeconds: auction.startTimestamp,
                  totalBids: 0 // This will need to be fetched separately
                });
              });
            }

            // Cache the auction data for future use
            try {
              localStorage.setItem(cacheKey, JSON.stringify(Array.from(auctionDataMap.entries())));
              localStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString());
            } catch (cacheError) {
              console.warn('[fetchAuctionData] Failed to cache data:', cacheError);
            }

            setAuctionMap(auctionDataMap);
          } catch (error) {
            
            // Try to extract meaningful information from the error
            let errorMessage = 'Unknown error';
            let errorName = 'UnknownError';
            
            if (error instanceof Error) {
              errorMessage = error.message;
              errorName = error.name;
              console.error('[fetchAuctionData] Error stack:', error.stack);
            } else if (error && typeof error === 'object') {
              // Try to extract message from various possible properties
              const errorObj = error as any;
              errorMessage = errorObj.message || errorObj.msg || errorObj.error || errorObj.reason || 'Non-Error object';
              errorName = errorObj.name || errorObj.type || 'ObjectError';
              
              // Log all enumerable properties
              console.error('[fetchAuctionData] Error properties:', Object.keys(error));
              console.error('[fetchAuctionData] Error values:', Object.values(error));
            } else {
              errorMessage = String(error);
              errorName = typeof error;
            }
            
            console.error('[fetchAuctionData] Processed error:', {
              name: errorName,
              message: errorMessage,
              original: error
            });
            
            // Check for specific error types
            if (errorMessage.includes('AbiDecodingZeroDataError')) {
              setAuctionMap(new Map());
            } else if (errorMessage.includes('Invalid currency token')) {
              setAuctionMap(new Map());
            } else if (errorMessage.includes('fetch')) {
              setAuctionMap(new Map());
            } else {
              console.error('[fetchAuctionData] Unexpected error type:', errorName, 'Message:', errorMessage);
              setAuctionMap(new Map());
            }
          } finally {
            setIsLoadingAuctions(false);
          }
        };

        fetchAuctionData();
      }, []); // Run once on mount
  const { mutate: sendBid } = useSendTransaction();
  const { mutate: sendBuyout } = useSendTransaction();

    useEffect(() => {
    // Load all static metadata and image URLs from local JSON files
    Promise.all([
      fetch(METADATA_URL).then((r) => {
        return r.json();
      }),
      fetch(NFT_URLS).then((r) => {
        return r.json();
      })
    ])
      .then(([metadataData, urlData]) => {

        // Use all metadata from combined_metadata.json
        const allMetadataItems = metadataData || [];
        const allUrlItems = urlData || [];


        // Set metadata
        setAllMetadata(allMetadataItems);

        // Create image URL map from nft_urls.json
        const map: { [tokenId: string]: string } = {};
        allUrlItems.forEach((item: any) => {
          if (item.TokenID !== undefined && item["Media URL"]) {
            map[item.TokenID.toString()] = item["Media URL"];
          }
        });
        setImageUrlMap(map);
        setIsMetadataLoaded(true);
      })
      .catch((error) => {
        console.error("Error loading metadata:", error);
        setAllMetadata([]);
        setImageUrlMap({});
        setIsMetadataLoaded(true);
      });
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, searchTerm, selectedFilters]);

    // Track session and page performance metrics
  useEffect(() => {
    // Track page view and session data
    setSessionMetrics(prev => ({ ...prev, pageViews: prev.pageViews + 1 }));

    // Track current view metrics
    track('Page Performance', {
      activeView,
      totalNFTsLoaded: nfts.length,
      currentPage,
      itemsPerPage,
      sortBy,
      hasActiveFilters: Object.keys(selectedFilters).some(key =>
        selectedFilters[key] && (Array.isArray(selectedFilters[key]) ?
        selectedFilters[key].length > 0 : Object.keys(selectedFilters[key]).length > 0)
      ),
      searchTermLength: searchTerm.length,
      sessionDuration: 0 // Simplified to avoid dependency issues
    });

    // Track marketplace performance metrics
    if (nfts.length > 0) {
      const totalListings = nfts.length;
      const nftsWithBids = nfts.filter(nft => nft.numBids > 0).length;
      const averagePrice = nfts.reduce((sum, nft) => sum + (Number(nft.priceWei) / 1e18), 0) / totalListings;
      const totalBids = nfts.reduce((sum, nft) => sum + nft.numBids, 0);
      const rarityDist = nfts.reduce((acc, nft) => {
        acc[nft.rarity] = (acc[nft.rarity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      track('Marketplace Performance', {
        totalActiveListings: totalListings,
        nftsWithBids,
        bidToListingRatio: ((nftsWithBids / totalListings) * 100).toFixed(1),
        averagePriceETH: averagePrice.toFixed(4),
        totalActiveBids: totalBids,
        averageBidsPerNFT: (totalBids / totalListings).toFixed(2),
        legendaryCount: rarityDist['Legendary'] || 0,
        mythicCount: rarityDist['Mythic'] || 0,
        epicCount: rarityDist['Epic'] || 0,
        rareCount: rarityDist['Rare'] || 0,
        uncommonCount: rarityDist['Uncommon'] || 0,
        commonCount: rarityDist['Common'] || 0
      });
    }
  }, [activeView, currentPage, itemsPerPage, sortBy, nfts, selectedFilters, searchTerm]);

  // Track session summary when component unmounts or user leaves
  useEffect(() => {
    const handleBeforeUnload = () => {
      const sessionDuration = Math.floor((Date.now() - sessionMetrics.sessionStartTime) / 1000);

      track('Session Summary', {
        sessionDurationSeconds: sessionDuration,
        sessionDurationMinutes: Math.floor(sessionDuration / 60),
        totalPageViews: sessionMetrics.pageViews,
        uniqueNFTsViewed: sessionMetrics.uniqueNFTsViewed.size,
        totalBidVolumeETH: sessionMetrics.totalBidVolume,
        totalPurchaseVolumeETH: sessionMetrics.totalPurchaseVolume,
        totalTransactionVolumeETH: sessionMetrics.totalBidVolume + sessionMetrics.totalPurchaseVolume,
        engagementRate: sessionMetrics.uniqueNFTsViewed.size > 0 ?
          ((sessionMetrics.totalBidVolume + sessionMetrics.totalPurchaseVolume) / sessionMetrics.uniqueNFTsViewed.size).toFixed(4) : '0',
        averageTimePerNFT: sessionMetrics.uniqueNFTsViewed.size > 0 ?
          (sessionDuration / sessionMetrics.uniqueNFTsViewed.size).toFixed(1) : '0'
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Also track on component unmount
      handleBeforeUnload();
    };
  }, []); // Empty dependency array since we only want this to run once

  useEffect(() => {
    async function loadNFTs() {
      setIsLoading(true);

      // Add a small delay to ensure loading state is visible
      await new Promise(resolve => setTimeout(resolve, 100));

      try {
        if (isMetadataLoaded && !isLoadingAuctions) {

          // Map ALL metadata for NFTs - show entire collection
          // Apply auction data when available, show "Not for Sale" when not
          // Filter out cancelled/expired listings from being considered "for sale"
          const mappedNFTs: NFTGridItem[] = allMetadata
            .map((meta: any) => {
              const tokenId = meta.token_id?.toString() || "";
              const auction = auctionMap.get(Number(tokenId));
              // Use image URL from nft_urls.json, fallback to placeholder
              const imageUrl = imageUrlMap[tokenId] || FALLBACK_IMAGE;

              // Extract static content from combined_metadata.json
              const name = meta.name || `Satoshe Slugger #${parseInt(tokenId) + 1}`;
              const rank = meta.rank ?? "—";
              const rarityPercent = meta.rarity_percent ?? "--";
              const rarity = meta.rarity_tier ?? "Unknown";
              const numBids = auction?.totalBids ?? auction?.bidsCount ?? 0;
              const auctionStart = auction?.startTimeInSeconds ?? 0;

              return {
                id: tokenId,
                tokenId,
                name,
                image: imageUrl,
                bidPriceWei:
                  auction?.startingPrice && auction.startingPrice !== "0"
                    ? auction.startingPrice
                    : auction?.minimumBidAmount && auction.minimumBidAmount !== "0"
                    ? auction.minimumBidAmount
                    : "0",
                currentBidWei:
                  auction?.currentBidAmount && auction.currentBidAmount !== "0"
                    ? auction.currentBidAmount
                    : auction?.minimumBidAmount && auction.minimumBidAmount !== "0"
                    ? auction.minimumBidAmount
                    : auction?.startingPrice && auction.startingPrice !== "0"
                    ? auction.startingPrice
                    : "0",
                priceWei:
                  auction?.buyoutAmount && auction.buyoutAmount !== "0"
                    ? auction.buyoutAmount
                    : auction?.buyNowPrice && auction.buyNowPrice !== "0"
                    ? auction.buyNowPrice
                    : auction?.price && auction.price !== "0"
                    ? auction.price
                    : "0",
                // Add flag to indicate if NFT is for sale (exclude cancelled listings)
                isForSale: !!auction && !isCancelledListing(auction?.auctionId),
                // Add flag to indicate if NFT listing was cancelled
                isCancelled: !!auction && isCancelledListing(auction?.auctionId),
                auctionEnd: auction?.endTimeInSeconds ?? "",
                auctionStart,
                rank,
                rarity,
                rarityPercent,
                auctionId: auction?.auctionId ? (typeof auction.auctionId === 'bigint' ? auction.auctionId : BigInt(auction.auctionId)) : 0n,
                numBids,
                // Extract attribute values from metadata for filtering
                background: getAttribute(meta, "Background"),
                skinTone: getAttribute(meta, "Skin Tone"),
                shirt: getAttribute(meta, "Shirt"),
                eyewear: getAttribute(meta, "Eyewear"),
                hair: getAttribute(meta, "Hair"),
                headwear: getAttribute(meta, "Headwear"),
              };
            });

          // Debug: Count cancelled listings
          const cancelledCount = mappedNFTs.filter(nft => isCancelledListing(nft.auctionId)).length;
          const forSaleCount = mappedNFTs.filter(nft => nft.isForSale).length;
          console.log(`[NFT Grid] Total NFTs: ${mappedNFTs.length}, For Sale: ${forSaleCount}, Cancelled: ${cancelledCount}`);
          
          setNfts(mappedNFTs);
          // Set bid amounts (default to minimum bid, format as ETH)
          const initialBids: { [id: string]: string } = {};
          mappedNFTs.forEach((nft) => {
            initialBids[nft.id] = ""; // Always use empty string by default
          });
          setBidAmounts(initialBids);
          
          // Only set loading to false when we have successfully processed the data
          setIsLoading(false);
        } else {
          // Keep loading state true if metadata isn't loaded yet
        }
      } catch (error) {
        console.error("Error loading NFTs:", error);
        setNfts([]);
        setIsLoading(false);
      }
    }
    loadNFTs();
  }, [activeView, itemsPerPage, imageUrlMap, allMetadata, auctionMap, isMetadataLoaded, isLoadingAuctions]);

  useEffect(() => { setClientReady(true); }, []);

  // Time formatting
  const formatAuctionDate = (
    endTimeSeconds: string | number | bigint,
  ) => {
    if (!endTimeSeconds) return "N/A";
    const endDate = new Date(Number(endTimeSeconds) * 1000);
    return format(endDate, "MM/dd/yyyy");
  };
  const formatAuctionTime = (
    endTimeSeconds: string | number | bigint,
  ) => {
    if (!endTimeSeconds) return "N/A";
    const endDate = new Date(Number(endTimeSeconds) * 1000);
    return format(endDate, "h:mm a 'PT'");
  };

  const handleBidAmountChange = (
    id: string,
    value: string,
  ) => {
    setBidAmounts((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handlePlaceBid = async (nft: NFTGridItem) => {
    if (!account?.address) {
      alert("Please connect your wallet first");
      return;
    }
    setIsProcessingBid((prev) => ({ ...prev, [nft.id]: true }));
    try {
      // Let Thirdweb handle validation - just get the bid amount
      const amount = bidAmounts[nft.id] || fromWei(nft.bidPriceWei);
      
      // Get the real auction data
      const auction = auctionMap.get(Number(nft.tokenId));
      if (!auction) {
        alert("No active auction found for this NFT");
        setIsProcessingBid((prev) => ({ ...prev, [nft.id]: false }));
        return;
      }

      const tx = bidInAuction({
        contract: marketplace,
        auctionId: auction.auctionId,
        bidAmount: toWei(amount).toString(),
      });
      await new Promise((resolve, reject) => {
        sendBid(tx, {
          onSuccess: () => {
            // Increment bid count locally
            setAuctionMap(prev => {
              const newMap = new Map(prev);
              const updatedAuction = { ...auction, totalBids: auction.totalBids + 1 };
              newMap.set(Number(nft.tokenId), updatedAuction);
              return newMap;
            });
            resolve(true);
          },
          onError: reject,
        });
      });

      // Track successful bid with comprehensive business metrics
      const bidAmountETH = Number(amount);
      const bidAmountUSD = bidAmountETH * 3400; // Approximate ETH price

      track('NFT Bid Successful', {
        tokenId: nft.tokenId,
        bidAmountETH,
        bidAmountUSD,
        rarity: nft.rarity,
        rank: String(nft.rank),
        rarityPercent: String(nft.rarityPercent),
        previousBidCount: nft.numBids,
        auctionId: String(nft.auctionId),
        walletAddress: account.address.slice(0, 8),
        transactionType: 'bid',
        buyNowPriceETH: Number(nft.priceWei) / 1e18,
        bidToSalePriceRatio: (bidAmountETH / (Number(nft.priceWei) / 1e18) * 100).toFixed(1),
        background: nft.background || 'Unknown',
        skinTone: nft.skinTone || 'Unknown',
        shirt: nft.shirt || 'Unknown',
        eyewear: nft.eyewear || 'Unknown'
      });

            // Track aggregated bid metrics
      track('Bid Volume Metrics', {
        volume: bidAmountETH,
        currency: 'ETH',
        volumeUSD: bidAmountUSD,
        rarityTier: nft.rarity,
        priceRange: bidAmountETH < 0.1 ? 'Under 0.1 ETH' :
                   bidAmountETH < 0.5 ? '0.1-0.5 ETH' :
                   bidAmountETH < 1 ? '0.5-1 ETH' :
                   bidAmountETH < 5 ? '1-5 ETH' : 'Over 5 ETH',
        totalBidsOnToken: nft.numBids + 1
      });

      // Update session metrics
      setSessionMetrics(prev => ({
        ...prev,
        totalBidVolume: prev.totalBidVolume + bidAmountETH
      }));

      alert("Bid placed successfully!");
    } catch (error) {
      console.error("Error placing bid:", error);

      // Track failed bid attempts
      track('NFT Bid Failed', {
        tokenId: nft.tokenId,
        bidAmountETH: Number(bidAmounts[nft.id] || fromWei(nft.bidPriceWei)),
        rarity: nft.rarity,
        error: 'Transaction failed',
        walletAddress: account?.address?.slice(0, 8),
        rank: String(nft.rank)
      });

      alert("Failed to place bid. Please try again.");
    } finally {
      setIsProcessingBid((prev) => ({ ...prev, [nft.id]: false }));
    }
  };

  const handleBuyNow = async (nft: NFTGridItem) => {
    if (!account?.address) {
      alert("Please connect your wallet first");
      return;
    }
    setIsProcessingBuyNow((prev) => ({ ...prev, [nft.id]: true }));
    try {
      // Get the real auction data
      const auction = auctionMap.get(Number(nft.tokenId));
      if (!auction) {
        alert("No active auction found for this NFT");
        setIsProcessingBid((prev) => ({ ...prev, [nft.id]: false }));
        return;
      }

      const tx = buyoutAuction({
        contract: marketplace,
        auctionId: auction.auctionId,
      });
      await new Promise((resolve, reject) => {
        sendBuyout(tx, {
          onSuccess: () => {
            // Remove auction from map since it's completed
            setAuctionMap(prev => {
              const newMap = new Map(prev);
              newMap.delete(Number(nft.tokenId));
              return newMap;
            });
            resolve(true);
          },
          onError: reject,
        });
      });

      // Track successful NFT purchase with comprehensive business metrics
      const purchasePriceETH = Number(nft.priceWei) / 1e18;
      const purchasePriceUSD = purchasePriceETH * 3400; // Approximate ETH price

      track('NFT Purchase Successful', {
        tokenId: nft.tokenId,
        purchasePriceETH,
        purchasePriceUSD,
        rarity: nft.rarity,
        rank: String(nft.rank),
        rarityPercent: String(nft.rarityPercent),
        totalBidsOnToken: nft.numBids,
        auctionId: String(nft.auctionId),
        walletAddress: account.address.slice(0, 8),
        transactionType: 'purchase',
        background: nft.background || 'Unknown',
        skinTone: nft.skinTone || 'Unknown',
        shirt: nft.shirt || 'Unknown',
        eyewear: nft.eyewear || 'Unknown',
        hadBids: nft.numBids > 0 ? 'Yes' : 'No'
      });

      // Track sales volume and business metrics
      track('Sales Volume Metrics', {
        revenue: purchasePriceETH,
        currency: 'ETH',
        revenueUSD: purchasePriceUSD,
        rarityTier: nft.rarity,
        priceRange: purchasePriceETH < 0.1 ? 'Under 0.1 ETH' :
                   purchasePriceETH < 0.5 ? '0.1-0.5 ETH' :
                   purchasePriceETH < 1 ? '0.5-1 ETH' :
                   purchasePriceETH < 5 ? '1-5 ETH' : 'Over 5 ETH',
        marketplaceFeesETH: (purchasePriceETH * 0.025), // Assuming 2.5% fee
        marketplaceFeesUSD: (purchasePriceUSD * 0.025),
        sellerRevenueETH: (purchasePriceETH * 0.975),
        sellerRevenueUSD: (purchasePriceUSD * 0.975)
      });

      // Track NFT collection performance
      track('Collection Performance', {
        tokenId: nft.tokenId,
        soldPrice: purchasePriceETH,
        rarityTier: nft.rarity,
        rank: String(nft.rank),
        competitiveMetrics: nft.numBids > 0 ? 'High Interest' : 'Direct Sale'
      });

      // Update session metrics
      setSessionMetrics(prev => ({
        ...prev,
        totalPurchaseVolume: prev.totalPurchaseVolume + purchasePriceETH
      }));

      alert("NFT purchased successfully!");
    } catch (error) {
      console.error("Error buying NFT:", error);

      // Track failed purchase attempts
      track('NFT Purchase Failed', {
        tokenId: nft.tokenId,
        attemptedPriceETH: Number(nft.priceWei) / 1e18,
        rarity: nft.rarity,
        error: 'Transaction failed',
        walletAddress: account?.address?.slice(0, 8),
        rank: String(nft.rank)
      });

      alert("Failed to buy NFT. Please try again.");
    } finally {
      setIsProcessingBuyNow((prev) => ({ ...prev, [nft.id]: false }));
    }
  };

  // Before sorting and paginating, filter nfts:
  const filteredNFTs = nfts.filter(nft => {
    // Search by name or tokenId
    const matchesSearch =
      nft.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nft.tokenId.toString().includes(searchTerm);

  // View filter (Live vs Sold) - exclude cancelled listings from both tabs
  const matchesView = activeView === "forSale" 
    ? nft.isForSale 
    : !nft.isForSale && !nft.isCancelled;

    // Rarity filter
    const matchesRarity =
      !selectedFilters.rarity ||
      selectedFilters.rarity.length === 0 ||
      selectedFilters.rarity.includes(nft.rarity);

    // Background filter
    const matchesBackground =
      !selectedFilters.background ||
      selectedFilters.background.length === 0 ||
      selectedFilters.background.includes(nft.background);

    // Skin Tone filter
    const matchesSkinTone =
      !selectedFilters.skinTone ||
      selectedFilters.skinTone.length === 0 ||
      selectedFilters.skinTone.includes(nft.skinTone);

    // Shirt filter
    const matchesShirt =
      !selectedFilters.shirt ||
      selectedFilters.shirt.length === 0 ||
      selectedFilters.shirt.includes(nft.shirt);

        // Eyewear filter
    const matchesEyewear =
      !selectedFilters.eyewear ||
      selectedFilters.eyewear.length === 0 ||
      selectedFilters.eyewear.includes(nft.eyewear);

    // Hair filter (subcategory + color logic)
    const hairFilters = selectedFilters.hair || {};
    const hairSubcats = Object.keys(hairFilters);
    const matchesHair =
      hairSubcats.length === 0 ||
      hairSubcats.some(subcat => {
        const colors = hairFilters[subcat];
        const nftHair = nft.hair ? String(nft.hair) : "";
        if (!nftHair) return false;
        if (!colors || colors.length === 0) {
          // Match any variant of the subcategory (e.g., 'Ponytail ...')
          return nftHair.startsWith(subcat);
        } else {
          return (colors as string[]).some((color: string) => nftHair === `${subcat} ${color}`);
        }
      });

    // Headwear filter (subcategory + color logic)
    const headwearFilters = selectedFilters.headwear || {};
    const headwearSubcats = Object.keys(headwearFilters);
    const matchesHeadwear =
      headwearSubcats.length === 0 ||
      headwearSubcats.some(subcat => {
        const colors = headwearFilters[subcat];
        const nftHeadwear = nft.headwear ? String(nft.headwear) : "";
        if (!nftHeadwear) return false;
        if (!colors || colors.length === 0) {
          return nftHeadwear.startsWith(subcat);
        } else {
          return (colors as string[]).some((color: string) => nftHeadwear === `${subcat} ${color}`);
        }
      });

    return (
      matchesSearch &&
      matchesView &&
      matchesRarity &&
      matchesBackground &&
      matchesSkinTone &&
      matchesShirt &&
      matchesEyewear &&
      matchesHair &&
      matchesHeadwear
    );
  });
  // Then sort and paginate filteredNFTs
  const sortedNFTs = [...filteredNFTs].sort((a, b) => {
    switch (sortBy) {
      case "rank-asc":
        return Number(a.rank) - Number(b.rank);
      case "rank-desc":
        return Number(b.rank) - Number(a.rank);
      case "price-asc":
        return Number(a.priceWei) - Number(b.priceWei);
      case "price-desc":
        return Number(b.priceWei) - Number(a.priceWei);
      case "ending-soonest":
        // Sort by auction end time ascending (soonest first)
        return Number(a.auctionEnd ?? 0) - Number(b.auctionEnd ?? 0);
      default:
        return 0;
    }
  });

      // Apply proper pagination to the sorted and filtered results
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = itemsPerPage === 100000 ? sortedNFTs.length : startIndex + itemsPerPage;
  const paginatedNFTs = sortedNFTs.slice(startIndex, endIndex);

  // Calculate total pages based on filtered results
  const totalFilteredPages = itemsPerPage === 100000
    ? 1 // When "View All" is selected, always show 1 page
    : Math.ceil(sortedNFTs.length / itemsPerPage) || 1;

  // Reset to page 1 if current page exceeds total pages
  useEffect(() => {
    if (currentPage > totalFilteredPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalFilteredPages]);

  // After filteredNFTs is computed:
  const traitCounts = useMemo(() => {
    return computeTraitCounts(filteredNFTs, ["background", "skinTone", "shirt", "eyewear", "hair", "headwear", "rarity"]);
  }, [filteredNFTs]);

  // Use refs to track previous values and prevent unnecessary updates
  const prevFilteredCountRef = useRef<number>(0);
  const prevTraitCountsRef = useRef<Record<string, Record<string, number>>>({});

  // Notify parent of filtered count changes
  useEffect(() => {
    if (onFilteredCountChange && filteredNFTs.length !== prevFilteredCountRef.current) {
      prevFilteredCountRef.current = filteredNFTs.length;
      onFilteredCountChange(filteredNFTs.length);
    }
  }, [filteredNFTs.length, onFilteredCountChange]);

  // Notify parent of trait counts changes
  useEffect(() => {
    if (onTraitCountsChange) {
      // Deep comparison to check if trait counts actually changed
      const traitCountsString = JSON.stringify(traitCounts);
      const prevTraitCountsString = JSON.stringify(prevTraitCountsRef.current);

      if (traitCountsString !== prevTraitCountsString) {
        prevTraitCountsRef.current = traitCounts;
        onTraitCountsChange(traitCounts);
      }
    }
  }, [traitCounts, onTraitCountsChange]);

  // Debug logging removed to prevent errors

  // Debug: Show all unique eyewear values that actually exist
  if (nfts.length > 0) {
    const uniqueEyewear = [...new Set(nfts.map(nft => nft.eyewear).filter(Boolean))].sort();
    // Debug logging removed to prevent errors
  }



  if (isLoading) {
    // Show pulsating placeholder NFTs while loading
    return (
      <div className="w-full max-w-full">
        <div className="mb-6">
          <div className="mb-4">
            <h2 className="text-lg font-medium">NFT Collection</h2>
            <div className="text-sm font-medium text-brand-pink mt-1">Loading...</div>
          </div>
        </div>
        <div className="mt-8 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 justify-between">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="bg-neutral-800 rounded p-4 animate-pulse">
              <div className="aspect-square bg-neutral-700 rounded mb-3"></div>
              <div className="h-4 bg-neutral-700 rounded mb-2"></div>
              <div className="h-3 bg-neutral-700 rounded mb-1"></div>
              <div className="h-3 bg-neutral-700 rounded w-2/3"></div>
            </div>
          ))}
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={1}
          totalItems={0}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full">
      <div className="mb-6">
        <div className="mb-4">
          <h2 className="text-lg font-medium">
            NFT Collection
          </h2>
          {filteredNFTs.length > 0 && (
            <div className="text-sm font-medium text-brand-pink mt-1">
              {activeView === "forSale" 
                ? `${filteredNFTs.length} active listing${filteredNFTs.length !== 1 ? 's' : ''} found`
                : `${filteredNFTs.length} NFT${filteredNFTs.length !== 1 ? 's' : ''} found`
              }
            </div>
          )}
        </div>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex bg-neutral-800 rounded p-1">
            <button
              className={`px-3 py-1 text-sm rounded transition-colors ${
                activeView === "forSale"
                  ? "bg-brand-pink text-white"
                  : "text-neutral-300 hover:text-[#ff0099]"
              }`}
              onClick={() => setActiveView("forSale")}
            >
              Live
            </button>
            <button
              className={`px-3 py-1 text-sm rounded transition-colors ${
                activeView === "sold"
                  ? "bg-brand-pink text-white"
                  : "text-neutral-300 hover:text-[#ff0099]"
              }`}
              onClick={() => setActiveView("sold")}
            >
              Sold
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-500 w-16 flex-shrink-0 sm:w-16">
              Sort by:
            </span>
            <Select
              value={sortBy}
              onValueChange={(value) => {
                track('NFT Sort Changed', {
                  sortBy: value,
                  previousSort: sortBy,
                  totalNFTs: nfts.length,
                  activeView
                });
                setSortBy(value);
              }}
            >
              <SelectTrigger className="w-[180px] h-9 text-sm rounded">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent className="text-sm rounded">
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="rank-asc">Rank: Low to High</SelectItem>
                <SelectItem value="rank-desc">Rank: High to Low</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="ending-soonest">Ending Soonest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-500 w-12 flex-shrink-0 sm:w-12">
              Show:
            </span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(val) => {
                const newValue = Number.parseInt(val);
                track('Items Per Page Changed', {
                  itemsPerPage: newValue,
                  previousItemsPerPage: itemsPerPage,
                  totalNFTs: nfts.length,
                  activeView
                });
                setItemsPerPage(newValue);
              }}
            >
              <SelectTrigger className="w-[110px] h-9 text-sm rounded">
                <SelectValue placeholder="12 items" />
              </SelectTrigger>
              <SelectContent className="text-sm rounded">
                <SelectItem value="12">12 items</SelectItem>
                <SelectItem value="25">25 items</SelectItem>
                <SelectItem value="50">50 items</SelectItem>
                <SelectItem value="100">100 items</SelectItem>
                <SelectItem value="250">250 items</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      {/* Only render the grid if there are NFTs, otherwise show empty state */}
      {paginatedNFTs.length > 0 ? (
        <div className="mt-8 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 justify-between">
          {paginatedNFTs.map((nft) => {
            const bidPriceFormatted = displayPrice(nft.bidPriceWei);
            const currentBidFormatted = displayPrice(nft.currentBidWei);
            const buyNowFormatted = displayPrice(nft.priceWei);

            return (
              <div key={nft.id}>
                <NFTCard
                  image={nft.image}
                  name={nft.name}
                  rank={nft.rank}
                  rarity={nft.rarity}
                  rarityPercent={nft.rarityPercent}
                  bidPrice={bidPriceFormatted}
                  currentBid={currentBidFormatted}
                  buyNow={buyNowFormatted}
                  tokenId={nft.tokenId}
                  auctionEnd={nft.auctionEnd}
                  numBids={nft.numBids ?? 0}
                  activeView="forSale"
                  clientReady={true}
                  bidAmount={bidAmounts[nft.id]}
                  isProcessingBid={isProcessingBid[nft.id]}
                  isProcessingBuyNow={isProcessingBuyNow[nft.id]}
                  isForSale={nft.isForSale}
                  auctionId={nft.auctionId.toString()}
                  onBidAmountChange={(id, value) => handleBidAmountChange(nft.id, value)}
                  onPlaceBid={() => handlePlaceBid(nft)}
                  onBuyNow={() => handleBuyNow(nft)}
                  buyNowValue={Number(nft.priceWei) / 1e18}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-neutral-400 text-lg mb-2">No NFTs found</div>
          <div className="text-neutral-500 text-sm">
            {searchTerm
              ? `No NFTs match "${searchTerm}"`
              : "Try adjusting your filters or check back later"}
          </div>
        </div>
      )}
      <Pagination
        key={`pagination-${activeView}-${filteredNFTs.length}`}
        currentPage={currentPage}
        totalPages={totalFilteredPages}
        totalItems={filteredNFTs.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
      </div>
    </div>
  );
}
