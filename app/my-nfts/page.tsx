"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Footer from "@/components/footer"
import Navigation from "@/components/navigation"
import { MediaRenderer } from "thirdweb/react"
import { useActiveAccount } from "thirdweb/react"
import { client } from "@/lib/thirdweb"
import { useFavorites } from "@/hooks/useFavorites"
import { useMarketplaceEvents } from "@/hooks/useMarketplaceEvents"
import { Heart } from "lucide-react"
import { Insight } from "thirdweb"
import { base } from "thirdweb/chains"
import { nftCollection, marketplace } from "@/lib/contracts"
import { getWinningBid, getAllAuctions, bidInAuction } from "thirdweb/extensions/marketplace"
import { sendTransaction, readContract } from "thirdweb"
import { ownerOf } from "thirdweb/extensions/erc721"

// Types for NFT data
interface BidNFT {
  id: string;
  name: string;
  image: string;
  price: string;
  yourBid: string;
  rarity: string;
  auctionId?: string;
}

export default function MyNFTsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")

  const [activeTab, setActiveTab] = useState(tabParam || "owned")
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingOwned, setIsLoadingOwned] = useState(false)
  const [bidsPlacedNFTs, setBidsPlacedNFTs] = useState<BidNFT[]>([])

  const [ownedNFTs, setOwnedNFTs] = useState<any[]>([])
  const [allMetadata, setAllMetadata] = useState<any[]>([])
  const [imageUrlMap, setImageUrlMap] = useState<{ [tokenId: string]: string }>({})
  const [bidAmounts, setBidAmounts] = useState<{ [auctionId: string]: string }>({})
  const [isIncreasingBid, setIsIncreasingBid] = useState<{ [auctionId: string]: boolean }>({})

  const account = useActiveAccount()
  const { favorites } = useFavorites()
  const { getCurrentBid, getBidCount, getAuctionStatus, refreshAuctionBid } = useMarketplaceEvents()

  useEffect(() => {
    // Set active tab from URL parameter if available
    if (tabParam) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  // Load metadata and image URLs
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [metadataData, urlData] = await Promise.all([
          fetch("/docs/combined_metadata.json").then((r) => r.json()),
          fetch("/docs/nft_urls.json").then((r) => r.json())
        ]);

        setAllMetadata(metadataData || []);

        // Create image URL map
        const map: { [tokenId: string]: string } = {};
        (urlData || []).forEach((item: any) => {
          if (item.tokenId !== undefined && item["Media Image URL"]) {
            map[item.tokenId.toString()] = item["Media Image URL"];
          }
        });
        setImageUrlMap(map);
      } catch (error) {
        console.error("Error loading metadata:", error);
      }
    };
    loadMetadata();
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      if (!account?.address) {
        setOwnedNFTs([]);
        setBidsPlacedNFTs([]);
        setIsLoading(false);
        return;
      }

      // Wait for imageUrlMap to be loaded before processing owned NFTs
      if (Object.keys(imageUrlMap).length === 0) {
        return;
      }

      try {
        setIsLoading(true);
        
        // Fetch owned NFTs by checking ownership of each token in the collection
        setIsLoadingOwned(true);
        const ownedTokenIds: string[] = [];
        const totalSupply = 7777; // Total number of NFTs in the collection
        
        // Check ownership for each token (in batches to avoid overwhelming the RPC)
        const batchSize = 50;
        for (let i = 0; i < totalSupply; i += batchSize) {
          const batchPromises = [];
          const endIndex = Math.min(i + batchSize, totalSupply);
          
          for (let tokenId = i; tokenId < endIndex; tokenId++) {
            batchPromises.push(
              readContract({
                contract: nftCollection,
                method: "function ownerOf(uint256 tokenId) view returns (address)",
                params: [BigInt(tokenId)],
              }).then((owner: string) => {
                if (owner.toLowerCase() === account.address.toLowerCase()) {
                  return tokenId.toString();
                }
                return null;
              }).catch(() => null)
            );
          }
          
          const batchResults = await Promise.all(batchPromises);
          const batchOwned = batchResults.filter(id => id !== null);
          ownedTokenIds.push(...batchOwned);
        }
        
        // Process the owned NFTs
        const processedNFTs = ownedTokenIds.map((tokenId) => {
          const metadata = allMetadata[parseInt(tokenId)] || {};
          
          return {
            id: tokenId,
            tokenId: tokenId,
            name: metadata.name || `Satoshe Slugger #${parseInt(tokenId) + 1}`,
            image: imageUrlMap[tokenId] || "/placeholder-nft.webp",
            rarity: metadata.rarity_tier || "Unknown",
            description: metadata.description || "",
            attributes: metadata.attributes || [],
            isListed: false,
            currentPrice: "0",
          };
        });

        setOwnedNFTs(processedNFTs);
        setIsLoadingOwned(false);
        
        // DISABLED: Fetch user's active bids and listed NFTs (prevents RPC charges)
    // await fetchUserBids(account.address);
        
      } catch (error) {
        console.error("Error loading user data:", error);
        setOwnedNFTs([]);
        setBidsPlacedNFTs([]);
        setIsLoadingOwned(false);
      } finally {
        setIsLoading(false);
      }
    };
    loadUserData();
  }, [account?.address, imageUrlMap])

  // Listen for marketplace events and refresh data
  useEffect(() => {
    if (!account?.address) return;

    // DISABLED: Set up a timer to refresh data (prevents RPC charges)
    // const refreshInterval = setInterval(() => {
    //   refreshUserData();
    // }, 30000);

    // return () => clearInterval(refreshInterval);
  }, [account?.address])

  const handleListForSale = (nftId: string) => {
    router.push(`/list-nft/${nftId}`)
  }


  // Refresh all user data (called when events occur)
  const refreshUserData = async () => {
    if (!account?.address) return;
    
    
    // Refresh owned NFTs using the same batch approach
    const ownedTokenIds: string[] = [];
    const totalSupply = 7777;
    
    const batchSize = 50;
    for (let i = 0; i < totalSupply; i += batchSize) {
      const batchPromises = [];
      const endIndex = Math.min(i + batchSize, totalSupply);
      
      for (let tokenId = i; tokenId < endIndex; tokenId++) {
        batchPromises.push(
          readContract({
            contract: nftCollection,
            method: "function ownerOf(uint256 tokenId) view returns (address)",
            params: [BigInt(tokenId)],
          }).then((owner: string) => {
            if (owner.toLowerCase() === account.address.toLowerCase()) {
              return tokenId.toString();
            }
            return null;
          }).catch(() => null)
        );
      }
      
      const batchResults = await Promise.all(batchPromises);
      ownedTokenIds.push(...batchResults.filter(id => id !== null));
    }
    
    const processedNFTs = ownedTokenIds.map((tokenId) => {
      const metadata = allMetadata[parseInt(tokenId)] || {};
      
      return {
        id: tokenId,
        tokenId: tokenId,
        name: metadata.name || `Satoshe Slugger #${parseInt(tokenId) + 1}`,
        image: imageUrlMap[tokenId] || "/placeholder-nft.webp",
        rarity: metadata.rarity_tier || "Unknown",
        description: metadata.description || "",
        attributes: metadata.attributes || [],
        isListed: false,
        currentPrice: "0",
      };
    });

    setOwnedNFTs(processedNFTs);
    
    // DISABLED: Refresh bids and listed NFTs (prevents RPC charges)
    // await fetchUserBids(account.address);
  };


  // Fetch user's active bids
  const fetchUserBids = async (userAddress: string) => {
    try {
      
      // Get all active auctions
      const allAuctions = await getAllAuctions({
        contract: marketplace,
      });


      const userBids: BidNFT[] = [];

      // Check each auction to see if user has the winning bid
      for (const auction of allAuctions) {
        try {
          const winningBid = await getWinningBid({
            contract: marketplace,
            auctionId: auction.id,
          });

          // Check if user is the current highest bidder
          if (winningBid?.bidderAddress?.toLowerCase() === userAddress.toLowerCase()) {
            const tokenId = auction.tokenId?.toString();
            if (tokenId) {
              const metadata = allMetadata[parseInt(tokenId)] || {};
              
              userBids.push({
                id: auction.id.toString(),
                name: metadata.name || `Satoshe Slugger #${parseInt(tokenId) + 1}`,
                image: imageUrlMap[tokenId] || "/placeholder-nft.webp",
                price: auction.buyoutBidAmount ? (Number(auction.buyoutBidAmount) / 1e18).toFixed(6) : "0",
                yourBid: winningBid.bidAmountWei ? (Number(winningBid.bidAmountWei) / 1e18).toFixed(6) : "0",
                rarity: metadata.rarity_tier || "common",
                auctionId: auction.id.toString(),
              });
            }
          }
        } catch (error) {
          console.error(`Error checking auction ${auction.id}:`, error);
        }
      }

      setBidsPlacedNFTs(userBids);
    } catch (error) {
      console.error("Error fetching user bids:", error);
      setBidsPlacedNFTs([]);
    }
  };

  // Handle increasing bid
  const handleIncreaseBid = async (auctionId: string, currentBid: string) => {
    if (!account) {
      alert("Please connect your wallet first");
      return;
    }

    const newBidAmount = bidAmounts[auctionId];
    if (!newBidAmount || parseFloat(newBidAmount) <= parseFloat(currentBid)) {
      alert("New bid amount must be higher than current bid");
      return;
    }

    try {
      setIsIncreasingBid(prev => ({ ...prev, [auctionId]: true }));

      const transaction = bidInAuction({
        contract: marketplace,
        auctionId: BigInt(auctionId),
        bidAmount: (parseFloat(newBidAmount) * 1e18).toString(),
      });

      await sendTransaction({ transaction, account });
      
      alert("Bid increased successfully!");
      
      // Refresh the bids data
      if (account.address) {
        await fetchUserBids(account.address);
      }
      
      // Clear the input
      setBidAmounts(prev => ({ ...prev, [auctionId]: "" }));
    } catch (error) {
      console.error("Error increasing bid:", error);
      alert("Failed to increase bid. Please try again.");
    } finally {
      setIsIncreasingBid(prev => ({ ...prev, [auctionId]: false }));
    }
  };

  // Get the active NFTs based on the selected tab
  const getActiveNFTs = () => {
    if (activeTab === "owned") {
      return ownedNFTs.map((nft: any) => ({
        id: nft.tokenId || nft.id,
        name: nft.name || `Satoshe Slugger #${(parseInt(nft.tokenId || nft.id) + 1)}`,
        image: nft.image || imageUrlMap[nft.tokenId || nft.id] || "/placeholder-nft.webp",
        price: "0",
        highestBid: "",
        rarity: nft.rarity || "common",
        isListed: false,
      }))
    } else if (activeTab === "favorites") {
      // Convert favorites to the expected format
      return favorites.map((fav) => ({
        id: fav.tokenId,
        name: fav.name,
        image: fav.image,
        price: "0",
        highestBid: "",
        rarity: fav.rarity,
        isListed: false,
      }))
    } else {
      return bidsPlacedNFTs
    }
  }

  const activeNFTs = getActiveNFTs()

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col">
        <Navigation activePage="my-nfts" />
        <div className="flex-grow flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
        <Footer />
      </main>
    )
  }

  if (!account?.address) {
    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col pt-24 sm:pt-28">
        <Navigation activePage="my-nfts" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-grow">
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold mb-4">Connect Your Wallet</h1>
            <p className="text-neutral-400 mb-6">
              Please connect your wallet to view your Satoshe Sluggers NFTs
            </p>
            <Button 
              onClick={() => router.push("/nfts")} 
              className="bg-brand-pink hover:bg-brand-pink-hover transition-colors"
              style={{ color: "#fffbeb" }}
            >
              Browse All NFTs
            </Button>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col pt-24 sm:pt-28">
      <Navigation activePage="my-nfts" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-grow">
        {/* Header with title */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: "#fffbeb" }}>My NFTs</h1>
            <p className="text-neutral-400 text-sm">Manage your Satoshe Sluggers collection</p>
          </div>
        </div>

        {/* Tabs navigation */}
        <div className="mb-6">
          <div className="flex border-b border-neutral-700">
            <button
              className={`py-2 px-4 ${activeTab === "owned" ? "border-b-2 border-brand-pink font-medium" : "text-neutral-400 hover:text-[#ff0099]"} transition-colors`}
              style={activeTab === "owned" ? { color: "#fffbeb" } : {}}
              onClick={() => setActiveTab("owned")}
            >
              Owned ({ownedNFTs?.length || 0})
            </button>
            <button
              className={`py-2 px-4 flex items-center gap-2 ${activeTab === "favorites" ? "border-b-2 border-brand-pink font-medium" : "text-neutral-400 hover:text-[#ff0099]"} transition-colors`}
              style={activeTab === "favorites" ? { color: "#fffbeb" } : {}}
              onClick={() => setActiveTab("favorites")}
            >
              <Heart className={`w-4 h-4 ${activeTab === "favorites" ? "fill-brand-pink text-brand-pink" : ""}`} />
              Favorites ({favorites.length})
            </button>
            <button
              className={`py-2 px-4 ${activeTab === "bids" ? "border-b-2 border-brand-pink font-medium" : "text-neutral-400 hover:text-[#ff0099]"} transition-colors`}
              style={activeTab === "bids" ? { color: "#fffbeb" } : {}}
              onClick={() => setActiveTab("bids")}
            >
              Bids Placed ({bidsPlacedNFTs.length})
            </button>
          </div>
        </div>

        {/* NFT Grid */}
        {activeTab === "owned" && isLoadingOwned ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: "#ff0099" }}></div>
            <p className="text-neutral-400">Checking your NFTs...</p>
          </div>
        ) : activeNFTs.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-neutral-400 mb-4">
              {activeTab === "favorites"
                ? "Favorite your first NFT! Click to Browse."
                : activeTab === "owned"
                ? "Mint A Slugger"
                : activeTab === "bids"
                ? "Make your first bid with the browse button"
                : "No NFTs found in this category"
              }
            </p>
            {(activeTab === "owned" || activeTab === "favorites" || activeTab === "bids") && (
              <Button onClick={() => router.push("/nfts")} className="bg-brand-pink hover:bg-brand-pink-hover transition-colors" style={{ color: "#fffbeb" }}>
                Browse NFTs
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeNFTs.map((nft) => (
              <div key={nft.id} className="rounded-md overflow-hidden">
                {/* NFT Image */}
                <div className="relative w-full" style={{ aspectRatio: "0.9/1" }}>
                  <Badge
                    className={`absolute top-3 right-3 z-10 text-xs ${
                      nft.rarity === "uncommon"
                        ? "bg-blue-500"
                        : nft.rarity === "rare"
                          ? "bg-purple-600"
                          : "bg-neutral-500"
                    }`}
                  >
                    {nft.rarity}
                  </Badge>
                  <div className="w-full h-full flex items-center justify-center">
                    <MediaRenderer
                      src={nft.image || "/placeholder-nft.webp"}
                      alt={nft.name}
                      width="250"
                      height="278"
                      className="max-w-full max-h-full object-contain"
                      client={client}
                    />
                  </div>
                </div>

                {/* NFT Details */}
                <div className="p-4">
                  <h3 className="font-medium text-base mb-3">{nft.name}</h3>
                  {activeTab === "bids" ? (
                    // For bids placed NFTs
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <p className="text-neutral-400 text-sm">Price</p>
                        <p className="font-medium text-base">{nft.price} ETH</p>
                      </div>
                      <div className="text-right">
                        <p className="text-neutral-400 text-sm">Your Bid</p>
                        <p className="font-medium text-base">{(nft as BidNFT).yourBid} ETH</p>
                      </div>
                    </div>
                  ) : activeTab === "favorites" ? (
                    // For favorites - no price display, keep it simple
                    <div className="mb-4">
                      {/* No text, just spacing */}
                    </div>
                  ) : (
                    // For owned and listed NFTs
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <p className="text-neutral-400 text-sm">Price</p>
                        <p className="font-medium text-base">{nft.price} ETH</p>
                      </div>
                      {"highestBid" in nft && nft.highestBid && (
                        <div className="text-right">
                          <p className="text-neutral-400 text-sm">Highest Bid</p>
                          <p className="font-medium text-base">{nft.highestBid} ETH</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action buttons based on tab */}

                  {activeTab === "favorites" && (
                    <Button
                      onClick={() => router.push(`/nft/${nft.id}`)}
                      className="w-full bg-brand-pink hover:bg-brand-pink-hover text-sm py-2 transition-colors"
                      style={{ color: "#fffbeb" }}
                    >
                      View on Marketplace
                    </Button>
                  )}


                  {activeTab === "bids" && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.001"
                          min={parseFloat((nft as BidNFT).yourBid) + 0.001}
                          placeholder={`Min: ${(parseFloat((nft as BidNFT).yourBid) + 0.001).toFixed(3)} ETH`}
                          value={bidAmounts[(nft as BidNFT).auctionId || nft.id] || ""}
                          onChange={(e) => setBidAmounts(prev => ({ ...prev, [(nft as BidNFT).auctionId || nft.id]: e.target.value }))}
                          className="flex-1 px-3 py-2 text-sm border border-neutral-600 rounded bg-neutral-800 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          style={{ color: "#fffbeb" }}
                        />
                        <Button
                          onClick={() => handleIncreaseBid((nft as BidNFT).auctionId || nft.id, (nft as BidNFT).yourBid)}
                          disabled={isIncreasingBid[(nft as BidNFT).auctionId || nft.id] || !bidAmounts[(nft as BidNFT).auctionId || nft.id]}
                          className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 disabled:bg-neutral-600 disabled:cursor-not-allowed"
                          style={{ color: "#fffbeb" }}
                        >
                          {isIncreasingBid[(nft as BidNFT).auctionId || nft.id] ? "..." : "Increase"}
                        </Button>
                      </div>
                      <Button
                        onClick={() => router.push(`/nft/${(nft as BidNFT).id}`)}
                        variant="outline"
                        className="w-full text-sm py-2 border-neutral-600 text-neutral-400 hover:bg-neutral-700"
                        style={{ color: "#fffbeb" }}
                      >
                        View Auction
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </main>
  )
}
