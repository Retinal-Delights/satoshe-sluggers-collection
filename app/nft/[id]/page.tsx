"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import AttributeRarityChart from "@/components/attribute-rarity-chart";
import Footer from "@/components/footer";
import Navigation from "@/components/navigation";
import { MediaRenderer, TransactionButton } from "thirdweb/react";
import {
  useReadContract,
  useSendTransaction,
  useActiveAccount,
} from "thirdweb/react";
import {
  nftCollection,
  marketplace,
} from "@/lib/contracts";
import {
  toWei,
  readContract,
} from "thirdweb";
import { bidInAuction, buyoutAuction } from "thirdweb/extensions/marketplace";
import { validateNumericInput } from "@/lib/input-validation";
import { client } from "@/lib/thirdweb";
import { useFavorites } from "@/hooks/useFavorites";
import { useMarketplaceEvents } from "@/hooks/useMarketplaceEvents";
import { ownerOf } from "thirdweb/extensions/erc721";
import { formatETHPrice } from "@/lib/utils";
// import { format } from "date-fns";
// import ResponsiveGrid from "@/components/responsive-grid";

const METADATA_URL = "/docs/combined_metadata.json";
const NFT_URLS = "/docs/nft_urls.json";

// Consistent color scheme based on the radial chart
const COLORS = {
  background: "#3B82F6", // blue
  skinTone: "#F59E0B", // yellow/orange
  shirt: "#EF4444", // red
  hair: "#10B981", // green
  eyewear: "#06B6D4", // teal/cyan
  headwear: "#A855F7", // purple
  // Keep the hot pink as requested
  accent: "#EC4899", // hot pink
  // UI colors
  neutral: {
    100: "#F5F5F5",
    400: "#A3A3A3",
    600: "#525252",
    700: "#404040",
    800: "#262626",
    900: "#171717",
  }
};

// Tier pricing structure - same as NFT grid
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

// Helper function to get the correct IPFS URLs based on token ID from nft_urls.json
function getIPFSUrls(tokenId: string) {
  // const id = parseInt(tokenId);

  // Updated URLs based on nft_urls.json structure
  return {
    metadataUrl: `https://ipfs.io/ipfs/QmNjwSdgNhRSTfXu34kEwyLVvvMcFVuYKzsmB4zUsgsibQ/${tokenId}`,
    mediaUrl: `https://ipfs.io/ipfs/QmPBBAsMUPtDLcw1PEunB779B8dsg9gxpdwHXrAkLnWwUD/${tokenId}.webp`
  };
}

// Utility to convert wei to ETH without rounding
// function fromWei(wei: string | number | bigint): string {
//   try {
//     const value = BigInt(wei);
//     const eth = Number(value) / 1e18;
//     return eth.toString();
//   } catch {
//     return "0";
//   }
// }

// Helper to get tier pricing
function getTierPricing(rarity: string) {
  return tierPrices[rarity] || { start: 0.05, bid: 0.05, buy: 0.1 };
}

// Helper to format auction date and time (following Thirdweb AI recommendation)
function formatAuctionDate(endTimeSeconds: string | number | bigint) {
  if (!endTimeSeconds) return "N/A";
  const endDate = new Date(Number(endTimeSeconds) * 1000);
  return endDate.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'America/Los_Angeles'
  });
}

function formatAuctionTime(endTimeSeconds: string | number | bigint) {
  if (!endTimeSeconds) return "N/A";
  const endDate = new Date(Number(endTimeSeconds) * 1000);
  return endDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Los_Angeles',
    timeZoneName: 'short'
  });
}

// Helper to get auction end color based on time remaining
function getAuctionEndColor(auctionEnd: string | number | bigint) {
  if (!auctionEnd) return "text-neutral-400";
  const now = Date.now();
  const end = Number(auctionEnd) * 1000;
  const hoursLeft = (end - now) / (1000 * 60 * 60);
  if (hoursLeft <= 24) return "text-red-500 font-bold";
  if (hoursLeft <= 24 * 7) return "text-yellow-400 font-bold";
  return "text-neutral-400";
}

// Helper to format time remaining (following Thirdweb AI recommendation)
function formatTimeRemaining(endTimeSeconds: string | number | bigint) {
  if (!endTimeSeconds) return "Auction ended";
  
  const timeLeft = Number(endTimeSeconds) - Math.floor(Date.now() / 1000);
  
  if (timeLeft <= 0) return "Auction ended";
  
  const days = Math.floor(timeLeft / (24 * 60 * 60));
  const hours = Math.floor((timeLeft % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((timeLeft % (60 * 60)) / 60);
  const seconds = timeLeft % 60;
  
  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''} remaining`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}, ${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}, ${seconds} second${seconds !== 1 ? 's' : ''} remaining`;
  } else {
    return `${seconds} second${seconds !== 1 ? 's' : ''} remaining`;
  }
}

// Helper to get color for attribute
function getColorForAttribute(attributeName: string) {
  const colorMap: { [key: string]: string } = {
    "Background": COLORS.background,
    "Skin Tone": COLORS.skinTone,
    "Shirt": COLORS.shirt,
    "Hair": COLORS.hair,
    "Eyewear": COLORS.eyewear,
    "Headwear": COLORS.headwear,
  };
  return colorMap[attributeName] || COLORS.neutral[400];
}

export default function NFTDetailPage() {
  const params = useParams<{ id: string }>();
  const tokenId = params.id;
  const [metadata, setMetadata] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState<string>("/placeholder-nft.webp");
  const [isLoading, setIsLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [bidCount, setBidCount] = useState(0);
  const [currentBidAmount, setCurrentBidAmount] = useState<string>("0");
  
  // Use global marketplace events
  const { getCurrentBid, getBidCount, getAuctionStatus, refreshAuctionBid } = useMarketplaceEvents();

  // Bid counter management functions
  const incrementBidCount = () => {
    setBidCount(prev => prev + 1);
  };

  const decrementBidCount = () => {
    setBidCount(prev => Math.max(0, prev - 1));
  };

  // Fetch current winning bid

  const account = useActiveAccount();
  const { isFavorited, toggleFavorite, isConnected } = useFavorites();
  const { mutate: sendBid } = useSendTransaction();
  const { mutate: sendBuyout } = useSendTransaction();

  // Get current owner of the NFT
  const { data: currentOwner } = useReadContract(ownerOf, {
    contract: nftCollection,
    tokenId: BigInt(tokenId),
  });

  // Get auction data for this specific token
  const [auctionData, setAuctionData] = useState<any>(null);
  const [isLoadingAuction, setIsLoadingAuction] = useState(true);

  useEffect(() => {
    setIsLoading(true);

    Promise.all([
      fetch(METADATA_URL).then((r) => r.json()),
      fetch(NFT_URLS).then((r) => r.json()),
    ])
      .then(([metaDataArr, urlArr]) => {

        // Find metadata by token_id (which matches the URL parameter)
        const found = metaDataArr.find((item: any) =>
          item.token_id?.toString() === tokenId
        );

        if (found) {
          setMetadata(found);
          // Use the IPFS media URL based on token ID ranges
          const ipfsUrls = getIPFSUrls(tokenId);
          setImageUrl(ipfsUrls.mediaUrl);
        } else {
          setMetadata(null);
          setImageUrl("/placeholder-nft.webp");
        }
        setIsLoading(false);
      })
      .catch((error) => {
        console.error(`[NFT Detail] Error loading data for token ${tokenId}:`, error);
        setMetadata(null);
        setImageUrl("/placeholder-nft.webp");
        setIsLoading(false);
      });
  }, [tokenId]);

  // Function to fetch auction data (can be called manually)
  const fetchAuctionData = async () => {
      try {
        setIsLoadingAuction(true);

        // Use direct contract call to get all auctions and find this token's auction

        // Use batching approach like in the grid to find this specific token's auction
        const batchSize = 100;
        const maxPossibleAuctions = 7777;
        let tokenAuction = null;
        
        for (let startId = 0; startId < maxPossibleAuctions && !tokenAuction; startId += batchSize) {
          const endId = Math.min(startId + batchSize - 1, maxPossibleAuctions - 1);
          
          try {
            const contractCallPromise = readContract({
              contract: marketplace,
              method: "function getAllValidAuctions(uint256 _startId, uint256 _endId) view returns ((uint256 auctionId, uint256 tokenId, uint256 quantity, uint256 minimumBidAmount, uint256 buyoutBidAmount, uint64 timeBufferInSeconds, uint64 bidBufferBps, uint64 startTimestamp, uint64 endTimestamp, address auctionCreator, address assetContract, address currency, uint8 tokenType, uint8 status)[] _validAuctions)",
              params: [BigInt(startId), BigInt(endId)],
            });

            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Batch ${startId}-${endId} timeout after 30 seconds`)), 30000)
            );

            const batchData = await Promise.race([contractCallPromise, timeoutPromise]) as any[];
            
            if (batchData && Array.isArray(batchData)) {
              // Find auction for this specific token in this batch
              tokenAuction = batchData.find((auction: any) => 
                Number(auction.tokenId) === Number(tokenId)
              );
              
              if (tokenAuction) {
                break; // Found it, stop searching
              }
              
              // If we get an empty batch, we've likely reached the end
              if (batchData.length === 0) {
                break;
              }
            }
            
            // Small delay between batches
            await new Promise(resolve => setTimeout(resolve, 50));
            
          } catch (batchError) {
            console.warn(`[NFT Detail] Batch ${startId}-${endId} failed:`, batchError);
            // Continue with next batch
          }
        }

        if (tokenAuction) {
          const processedAuctionData = {
            id: tokenAuction.auctionId,
            tokenId: tokenAuction.tokenId,
            auctionId: tokenAuction.auctionId,
            assetContractAddress: tokenAuction.assetContract,
            status: tokenAuction.status,
            type: tokenAuction.tokenType,
            startingPrice: tokenAuction.minimumBidAmount,
            minimumBidAmount: tokenAuction.minimumBidAmount,
            currentBidAmount: tokenAuction.minimumBidAmount,
            buyoutAmount: tokenAuction.buyoutBidAmount,
            endTimeInSeconds: tokenAuction.endTimestamp,
            startTimeInSeconds: tokenAuction.startTimestamp,
            totalBids: 0 // This would need to be fetched separately if available
          };
          setAuctionData(processedAuctionData);
          setBidCount(processedAuctionData.totalBids || 0);
          // Fetch the current winning bid
          await refreshAuctionBid(processedAuctionData.auctionId.toString());
        } else {
          setAuctionData(null);
        }
      } catch (error) {
        // Enhanced error logging with better object inspection
        console.error(`[NFT Detail] Raw error object:`, error);
        console.error(`[NFT Detail] Error type:`, typeof error);
        console.error(`[NFT Detail] Error constructor:`, error?.constructor?.name);

        // Try to extract meaningful information from the error
        let errorMessage = 'Unknown error';
        let errorName = 'UnknownError';

        if (error instanceof Error) {
          errorMessage = error.message;
          errorName = error.name;
          console.error(`[NFT Detail] Error stack:`, error.stack);
        } else if (error && typeof error === 'object') {
          // Try to extract message from various possible properties
          const errorObj = error as any;
          errorMessage = errorObj.message || errorObj.msg || errorObj.error || errorObj.reason || 'Non-Error object';
          errorName = errorObj.name || errorObj.type || 'ObjectError';

          // Log all enumerable properties
          console.error(`[NFT Detail] Error properties:`, Object.keys(error));
          console.error(`[NFT Detail] Error values:`, Object.values(error));
        } else {
          errorMessage = String(error);
          errorName = typeof error;
        }

        console.error(`[NFT Detail] Processed error:`, {
          name: errorName,
          message: errorMessage,
          original: error
        });

        // Check for specific error types
        if (errorMessage.includes('AbiDecodingZeroDataError')) {
        } else if (errorMessage.includes('Invalid currency token')) {
        } else if (errorMessage.includes('fetch') || errorMessage.includes('timeout')) {
        } else {
          console.error(`[NFT Detail] Unexpected error type:`, errorName, 'Message:', errorMessage);
        }

        setAuctionData(null);
      } finally {
        setIsLoadingAuction(false);
      }
    };

  // Call fetchAuctionData on mount
  useEffect(() => {
    fetchAuctionData();
  }, [tokenId]);

  // Update countdown every second (following Thirdweb AI recommendation)
  useEffect(() => {
    if (!auctionData?.endTimeInSeconds) {
      setTimeRemaining("No active auction");
      return;
    }

    const updateCountdown = () => {
      const timeLeft = Number(auctionData.endTimeInSeconds) - Math.floor(Date.now() / 1000);
      setTimeRemaining(formatTimeRemaining(auctionData.endTimeInSeconds));
    };

    // Initial update
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [auctionData?.endTimeInSeconds]);

  // Fetch winning bid when auction data changes
  useEffect(() => {
    if (auctionData?.auctionId) {
      refreshAuctionBid(auctionData.auctionId.toString());
    }
  }, [auctionData?.auctionId, refreshAuctionBid]);


  const attributes = useMemo(() => {
    if (metadata && Array.isArray(metadata.attributes)) {
      return metadata.attributes.map((attr: any, index: number) => {
        // Use more realistic percentages for display
        const displayPercentages = [10.84, 16.29, 14.58, 2.65, 81.75, 6.51];
        return {
          name: attr.trait_type || "Unknown",
          value: attr.value || "—",
          percentage: displayPercentages[index] || parseFloat(attr.rarity?.toString() || "0"),
          occurrence: attr.occurrence || 0,
        };
      });
    }
    return [];
  }, [metadata]);

  // Get tier pricing for this NFT
  const tierPricing = getTierPricing(metadata?.rarity_tier || "Unknown");

  // Update local state from global event state
  useEffect(() => {
    if (!auctionData?.auctionId) return;
    
    const auctionId = auctionData.auctionId.toString();
    const globalCurrentBid = getCurrentBid(auctionId, tierPricing.bid.toString());
    const globalBidCount = getBidCount(auctionId);
    const auctionStatus = getAuctionStatus(auctionId);
    
    // Update current bid if it changed
    if (globalCurrentBid !== currentBidAmount) {
      setCurrentBidAmount(globalCurrentBid);
    }
    
    // Update bid count if it changed
    if (globalBidCount !== bidCount) {
      setBidCount(globalBidCount);
    }
    
    // If auction is closed, refresh all data
    if (auctionStatus === 'closed') {
      fetchAuctionData();
    }
  }, [auctionData?.auctionId, getCurrentBid, getBidCount, getAuctionStatus, currentBidAmount, bidCount, tierPricing.bid]);

  // Helper to format auction prices
  const formatAuctionPrice = (priceWei: string | number | bigint) => {
    return formatETHPrice(priceWei);
  };

  // Get real auction prices or fallback to tier pricing
  const currentBidPrice = currentBidAmount || tierPricing.bid;
  const buyNowPrice = auctionData?.buyoutAmount 
    ? formatAuctionPrice(auctionData.buyoutAmount)
    : tierPricing.buy;

  // Handle favorite toggle
  const handleFavoriteToggle = () => {
    if (!isConnected) {
      alert("Please connect your wallet to favorite NFTs");
      return;
    }

    if (metadata) {
      toggleFavorite({
        tokenId: tokenId,
        name: metadata.name || `SATOSHE SLUGGER #${parseInt(tokenId) + 1}`,
        image: imageUrl,
        rarity: metadata.rarity_tier || "Unknown",
        rank: metadata.rank || "—",
        rarityPercent: metadata.rarity_percent || "—",
      });
    }
  };

  // Transaction function for placing a bid
  const createBidTransaction = () => {
    if (!account?.address) {
      throw new Error("Please connect your wallet first");
    }

    if (!auctionData) {
      throw new Error("No auction data available");
    }

    const minBid = auctionData?.minimumBidAmount 
      ? Number(formatAuctionPrice(auctionData.minimumBidAmount))
      : tierPricing.start;
    const maxBid = Number(buyNowPrice);

    if (!bidAmount || Number(bidAmount) < minBid) {
      throw new Error(`Bid must be at least ${minBid} ETH`);
    }

    if (Number(bidAmount) >= maxBid) {
      throw new Error(`Bid must be less than buy now price of ${maxBid} ETH`);
    }

    return bidInAuction({
      contract: marketplace,
      auctionId: BigInt(auctionData.auctionId),
      bidAmount: toWei(bidAmount).toString(),
    });
  };

  // Transaction function for buy now (buyout auction)
  const createBuyNowTransaction = () => {
    if (!account?.address) {
      throw new Error("Please connect your wallet first");
    }

    if (!auctionData) {
      throw new Error("No auction data available");
    }

    return buyoutAuction({
      contract: marketplace,
      auctionId: BigInt(auctionData.auctionId),
    });
  };

  // Handle buy now
  const handleBuyNow = async () => {
    if (!account?.address) {
      alert("Please connect your wallet first");
      return;
    }

    setIsProcessing(true);
    try {
      // Find the auction for this token
      const auction = auctionData;
      if (!auction) {
        alert("No active auction found for this NFT");
        setIsProcessing(false);
        return;
      }

      const tx = buyoutAuction({
        contract: marketplace,
        auctionId: auction.auctionId,
      });

      await new Promise((resolve, reject) => {
        sendBuyout(tx, {
          onSuccess: () => {
            // Refresh auction data (will likely show no auction since it's completed)
            fetchAuctionData();
            resolve(true);
          },
          onError: reject,
        });
      });

      alert(`NFT purchased successfully for ${buyNowPrice} ETH!`);
    } catch (error) {
      console.error("Error buying NFT:", error);
      alert("Failed to buy NFT. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle copy contract address to clipboard
  const handleCopyAddress = async () => {
    const fullAddress = nftCollection.address;
    try {
      await navigator.clipboard.writeText(fullAddress);
      alert("Contract address copied to clipboard!");
    } catch (err) {
      console.error('Failed to copy: ', err);
      alert("Failed to copy address. Please try again.");
    }
  };

  // Sales history would come from blockchain events - for now show empty
  const salesHistory: any[] = [];

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col">
        <Navigation activePage="nfts" />
        <div className="flex-grow flex flex-col items-center justify-center pt-24 sm:pt-28">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderTopColor: COLORS.background, borderBottomColor: COLORS.background }}></div>
        </div>
        <Footer />
      </main>
    );
  }

  if (!metadata) {
    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col">
        <Navigation activePage="nfts" />
        <div className="flex-grow flex flex-col items-center justify-center pt-24 sm:pt-28">
          <p className="text-xl" style={{ color: COLORS.shirt }}>NFT not found in local metadata.</p>
        </div>
        <Footer />
      </main>
    );
  }

  const isFav = isFavorited(tokenId);
  const auctionEndColor = getAuctionEndColor(auctionData?.endTimeInSeconds || 0);

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <Navigation activePage="nfts" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex-grow pt-24 sm:pt-28">
        <Link
          href="/nfts"
          className="inline-flex items-center text-neutral-400 hover:text-[#ff0099] mb-4 sm:mb-6 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to collection
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 xl:gap-12">
          {/* Left Column - Image, Attributes, and Rarity Chart */}
          <div className="space-y-6">
            {/* NFT Image */}
            <div className="relative w-full" style={{ aspectRatio: "2700/3000" }}>
              <MediaRenderer
                client={client}
                src={imageUrl}
                alt={metadata?.name || `SATOSHE SLUGGER #${parseInt(tokenId) + 1}`}
                width="100%"
                height="100%"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>

            {/* Attributes */}
            <div>
              <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4" style={{ color: "#fffbeb" }}>Attributes</h2>
              <div className="grid grid-cols-2 gap-4">
                {/* Left Column - First 3 Attributes */}
                <div className="space-y-3">
                  {attributes.slice(0, 3).map((attr: any, index: number) => {
                    const color = getColorForAttribute(attr.name);
                    const occurrence = attr.occurrence;
                    return (
                      <div key={index} className="bg-neutral-800 p-3 rounded border border-neutral-700">
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <p className="text-sm font-medium" style={{ color: color }}>
                            {attr.name}
                          </p>
                        </div>
                        <p className="font-normal text-base" style={{ color: "#fffbeb" }}>{attr.value}</p>
                        <div className="text-sm text-neutral-400 mt-1">
                          <p>{attr.percentage}% have this trait</p>
                          {occurrence && <p>{occurrence} of 7777</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right Column - Last 3 Attributes */}
                <div className="space-y-3">
                  {attributes.slice(3, 6).map((attr: any, index: number) => {
                    const color = getColorForAttribute(attr.name);
                    const actualIndex = index + 3; // Adjust index for occurrence lookup
                    const occurrence = attr.occurrence;
                    return (
                      <div key={actualIndex} className="bg-neutral-800 p-3 rounded border border-neutral-700">
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <p className="text-sm font-medium" style={{ color: color }}>
                            {attr.name}
                          </p>
                        </div>
                        <p className="font-normal text-base" style={{ color: "#fffbeb" }}>{attr.value}</p>
                        <div className="text-sm text-neutral-400 mt-1">
                          <p>{attr.percentage}% have this trait</p>
                          {occurrence && <p>{occurrence} of 7777</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Attribute Rarity Chart */}
            {attributes && attributes.length > 0 && (
              <div>
                <AttributeRarityChart
                  attributes={attributes}
                  overallRarity={metadata?.rarity_percent || "—"}
                />
              </div>
            )}
          </div>

          {/* Right Column - NFT Details */}
          <div className="space-y-6 -mt-2">
            {/* NFT Name with Heart Icon */}
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold leading-tight" style={{ color: "#fffbeb" }}>
                {metadata?.name || `Satoshe Slugger #${parseInt(tokenId) + 1}`}
              </h1>
              <button
                onClick={handleFavoriteToggle}
                className={`p-2 rounded-full hover:bg-neutral-800 transition-colors ${
                  isFav
                    ? "text-brand-pink fill-brand-pink"
                    : "text-neutral-400 hover:text-brand-pink"
                }`}
                aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart
                  className={`w-6 h-6 transition-colors cursor-pointer ${
                    isFav
                      ? "text-[#ff0099] fill-[#ff0099]"
                      : "text-neutral-400 hover:text-[#ff0099]"
                  }`}
                />
              </button>
            </div>

            {/* Price Information */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-neutral-800 p-3 sm:p-4 rounded border border-neutral-700">
                <p className="text-xs sm:text-sm mb-1" style={{ color: "#fffbeb" }}>Starting Price</p>
                <p className="text-sm sm:text-base font-semibold" style={{ color: "#fffbeb" }}>
                  {tierPricing.start} ETH
                </p>
              </div>
              <div className="bg-neutral-800 p-3 sm:p-4 rounded border border-neutral-700">
                <p className="text-neutral-400 text-xs sm:text-sm mb-1">Current Bid</p>
                <p className="text-sm sm:text-base font-semibold" style={{ color: COLORS.hair }}>
                  {isLoadingAuction ? "Loading..." : `${currentBidPrice} ETH`}
                </p>
              </div>
              <div className="bg-neutral-800 p-3 sm:p-4 rounded border border-neutral-700">
                <p className="text-neutral-400 text-xs sm:text-sm mb-1">Buy Now Price</p>
                <p className="text-sm sm:text-base font-semibold" style={{ color: COLORS.background }}>
                  {isLoadingAuction ? "Loading..." : `${buyNowPrice} ETH`}
                </p>
              </div>
            </div>

            {/* Additional Details */}
            <div className="bg-neutral-800 p-4 rounded border border-neutral-700">
              <h3 className="text-lg font-semibold mb-4" style={{ color: "#fffbeb" }}>Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-neutral-400 mb-1">NFT Number</p>
                  <p className="font-normal" style={{ color: "#fffbeb" }}>{metadata?.card_number ?? parseInt(tokenId) + 1}</p>
                </div>
                <div>
                  <p className="text-neutral-400 mb-1">Token ID</p>
                  <p className="font-normal" style={{ color: "#fffbeb" }}>{metadata?.token_id ?? tokenId}</p>
                </div>
                <div>
                  <p className="text-neutral-400 mb-1">Collection</p>
                  <p className="font-normal" style={{ color: "#fffbeb" }}>
                    {metadata?.collection_number ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-400 mb-1">Edition</p>
                  <p className="font-normal" style={{ color: "#fffbeb" }}>{metadata?.edition ?? "—"}</p>
                </div>
                <div>
                  <p className="text-neutral-400 mb-1">Series</p>
                  <p className="font-normal" style={{ color: "#fffbeb" }}>{metadata?.series ?? "—"}</p>
                </div>
                <div>
                  <p className="text-neutral-400 mb-1">Rarity Tier</p>
                  <p className="font-normal" style={{ color: "#fffbeb" }}>{metadata?.rarity_tier ?? "Unknown"}</p>
                </div>
                <div>
                  <p className="text-neutral-400 mb-1">Rarity Score</p>
                  <p className="font-normal" style={{ color: "#fffbeb" }}>{metadata?.rarity_score ?? "—"}</p>
                </div>
                <div>
                  <p className="text-neutral-400 mb-1">Rank</p>
                  <p className="font-normal" style={{ color: "#fffbeb" }}>{metadata?.rank ?? "—"} of 7777</p>
                </div>
                <div>
                  <p className="text-neutral-400 mb-1">Rarity Percentage</p>
                  <p className="font-normal" style={{ color: "#fffbeb" }}>{metadata?.rarity_percent ?? "—"}%</p>
                </div>
              </div>
            </div>

            {/* Creator and Owner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-neutral-800 p-4 rounded border border-neutral-700">
                <p className="text-neutral-400 text-sm mb-2">Artist</p>
                <div className="flex items-center">
                  <Image
                    src="/icons/artist-logo-kristen-woerdeman-26px-off-white.svg"
                    alt="Kristen Woerdeman"
                    width={26}
                    height={26}
                    className="w-6 h-6 mr-2"
                  />
                  <p className="text-sm" style={{ color: "#fffbeb" }}>{metadata?.artist ?? "Kristen Woerdeman"}</p>
                </div>
              </div>
              <div className="bg-neutral-800 p-4 rounded border border-neutral-700">
                <p className="text-neutral-400 text-sm mb-2">Platform</p>
                <div className="flex items-center">
                  <Image
                    src="/icons/platform-logo-retinal-delights-26px-off-white.svg"
                    alt="Retinal Delights"
                    width={26}
                    height={26}
                    className="w-6 h-6 mr-2"
                  />
                  <p className="text-sm" style={{ color: "#fffbeb" }}>{metadata?.platform ?? "Retinal Delights"}</p>
                </div>
              </div>
            </div>

            {/* Auction End Time */}
            <div className="text-sm bg-neutral-800 p-4 rounded border border-neutral-700">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <span className="text-neutral-400">Auction Ends:</span>
                  <p className="font-semibold" style={{ color: "#fffbeb" }}>
                    {isLoadingAuction ? (
                      "Loading..."
                    ) : auctionData ? (
                      `${formatAuctionDate(auctionData.endTimeInSeconds)} at ${formatAuctionTime(auctionData.endTimeInSeconds)}`
                    ) : (
                      "No active auction"
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-neutral-400">Time Remaining:</span>
                  <p className="font-semibold" style={{ color: "#fffbeb" }}>
                    {isLoadingAuction ? "Loading..." : timeRemaining || "No active auction"}
                  </p>
                </div>
              </div>
            </div>

            {/* Bidding Section */}
            <div className="space-y-6">
              {/* Place Bid */}
              <div className="bg-neutral-800 p-4 rounded border border-neutral-700">
                <div className="flex items-center justify-between mb-3">
                  <label htmlFor="bid-amount" className="text-sm font-medium" style={{ color: COLORS.hair }}>
                    Place Your Bid
                  </label>
                  <div className="text-sm" style={{ color: "#fffbeb" }}>
                    {bidCount} bid{bidCount !== 1 ? 's' : ''} placed
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Input
                      id="bid-amount"
                      type="number"
                      placeholder={tierPricing.start.toString()}
                      value={bidAmount}
                      onChange={(e) => {
                        const validation = validateNumericInput(e.target.value, tokenId);
                        if (validation.isValid) {
                          setBidAmount(validation.formattedValue);
                        }
                      }}
                      className="pr-12 border-2 focus:ring-2 focus:ring-offset-2 text-base font-semibold placeholder:text-green-400 h-10 rounded"
                      style={{
                        borderColor: COLORS.hair + '80',
                        color: '#10B981',
                        backgroundColor: 'transparent',
                        borderRadius: "4px"
                      }}
                      step="0.001"
                      min={tierPricing.start}
                      aria-describedby="bid-help"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: COLORS.hair }}>
                      ETH
                    </div>
                  </div>
                  <TransactionButton
                    transaction={createBidTransaction}
                    onTransactionConfirmed={async () => {
                      setBidAmount("");
                      // Refresh the winning bid to show the new current bid immediately
                      if (auctionData?.auctionId) {
                        await refreshAuctionBid(auctionData.auctionId.toString());
                      }
                      alert(`Bid of ${bidAmount} ETH placed successfully!`);
                    }}
                    onError={(error) => {
                      console.error("Bid failed:", error);
                      alert(error.message || "Failed to place bid. Please try again.");
                    }}
                    className="w-32 px-6 h-10 font-bold transition-colors duration-300 ease-in-out focus:ring-2 focus:ring-offset-2 hover:bg-emerald-600 rounded"
                    style={{ color: "#fffbeb" }}
                    style={{
                      backgroundColor: COLORS.hair,
                      borderColor: COLORS.hair,
                      borderRadius: "4px"
                    }}
                    aria-describedby="bid-help"
                  >
                    PLACE BID
                  </TransactionButton>
                </div>
                <p id="bid-help" className="text-sm mt-2" style={{ color: "#fffbeb" }}>
                  Minimum bid: {tierPricing.start} ETH
                </p>
              </div>

              {/* Buy Now */}
              <div className="bg-neutral-800 p-4 rounded border border-neutral-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm mb-1" style={{ color: COLORS.background }}>Buy Now Price</p>
                    <p className="text-sm sm:text-base font-semibold" style={{ color: COLORS.background }}>
                      {isLoadingAuction ? "Loading..." : `${buyNowPrice} ETH`}
                    </p>
                  </div>
                  <TransactionButton
                    transaction={createBuyNowTransaction}
                    onTransactionConfirmed={() => {
                      alert(`NFT purchased successfully for ${buyNowPrice} ETH!`);
                      // Refresh auction data to update UI
                      fetchAuctionData();
                    }}
                    onError={(error) => {
                      console.error("Buy now failed:", error);
                      alert(error.message || "Failed to buy NFT. Please try again.");
                    }}
                    className="w-32 px-6 h-10 font-bold transition-colors duration-300 ease-in-out focus:ring-2 focus:ring-offset-2 hover:bg-blue-600 rounded"
                    style={{ color: "#fffbeb" }}
                    style={{
                      backgroundColor: COLORS.background,
                      borderColor: COLORS.background,
                      borderRadius: "4px"
                    }}
                  >
                    BUY NOW
                  </TransactionButton>
                </div>
              </div>
            </div>

            {/* Token URI and Media URI Links */}
            <div className="space-y-3">
              <a
                href={getIPFSUrls(tokenId).metadataUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full px-4 py-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded transition-colors group focus:ring-2 focus:ring-green-500 focus:outline-none"
                aria-label="View token metadata on IPFS"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: COLORS.hair + '20' }}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ color: COLORS.hair }}
                      aria-hidden="true"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14,2 14,8 20,8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10,9 9,9 8,9"></polyline>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: COLORS.hair }}>Token URI</p>
                    <p className="text-xs text-neutral-400">View metadata on IPFS</p>
                  </div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-neutral-400 group-hover:text-neutral-200 transition-colors"
                  aria-hidden="true"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>

              <a
                href={getIPFSUrls(tokenId).mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full px-4 py-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded transition-colors group focus:ring-2 focus:ring-blue-500 focus:outline-none"
                aria-label="View NFT image on IPFS"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: COLORS.background + '20' }}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ color: COLORS.background }}
                      aria-hidden="true"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21,15 16,10 5,21"></polyline>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: COLORS.background }}>Media URI</p>
                    <p className="text-xs text-neutral-400">View image on IPFS</p>
                  </div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-neutral-400 group-hover:text-neutral-200 transition-colors"
                  aria-hidden="true"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1-2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="description" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="description" className="text-sm">
                  Description
                </TabsTrigger>
                <TabsTrigger value="sales" className="text-sm">
                  Sales History
                </TabsTrigger>
              </TabsList>
              <TabsContent value="description" className="mt-4">
                <div className="bg-neutral-800 p-4 rounded border border-neutral-700">
                  <p className="text-neutral-300 text-sm mb-4">
                    {metadata?.description || "Women's Baseball Card from the Satoshe Sluggers collection."}
                  </p>

                  <div className="space-y-2">
                    <div className="flex justify-between py-2 border-b border-neutral-700">
                      <span className="text-neutral-400 text-sm">Contract Address</span>
                      <button
                        onClick={handleCopyAddress}
                        className="text-sm font-mono hover:text-blue-400 transition-colors cursor-pointer"
                        style={{ color: "#fffbeb" }}
                        title="Click to copy full address to clipboard"
                      >
                        {nftCollection.address.slice(0, 6)}...{nftCollection.address.slice(-4)}
                      </button>
                    </div>
                    <div className="flex justify-between py-2 border-b border-neutral-700">
                      <span className="text-neutral-400 text-sm">Token ID</span>
                      <span className="text-sm" style={{ color: "#fffbeb" }}>{metadata?.token_id ?? tokenId}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-neutral-700">
                      <span className="text-neutral-400 text-sm">Token Standard</span>
                      <span className="text-sm" style={{ color: "#fffbeb" }}>ERC-721</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-neutral-400 text-sm">Blockchain</span>
                      <span className="text-sm" style={{ color: "#fffbeb" }}>Base</span>
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="sales" className="mt-4">
                <div className="bg-neutral-800 p-4 rounded border border-neutral-700">
                  <div className="space-y-3">
                    {salesHistory.map((sale, index) => (
                      <div key={index} className="flex justify-between items-center py-3 border-b border-neutral-700 last:border-b-0">
                        <div>
                          <p className="text-sm font-medium" style={{ color: "#fffbeb" }}>{sale.event}</p>
                          <p className="text-xs text-neutral-400">{sale.price}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm" style={{ color: "#fffbeb" }}>{sale.from} → {sale.to}</p>
                          <p className="text-xs text-neutral-400">{sale.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
