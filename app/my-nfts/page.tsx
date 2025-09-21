"use client"

import { useState, useEffect } from "react"
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
import { getWinningBid, getAllAuctions } from "thirdweb/extensions/marketplace"

// Types for NFT data
interface ListedNFT {
  id: string;
  tokenId: string;
  name: string;
  image: string;
  price: string;
  highestBid: string;
  rarity: string;
  isListed: boolean;
}

interface BidNFT {
  id: string;
  name: string;
  image: string;
  price: string;
  yourBid: string;
  rarity: string;
}

export default function MyNFTsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")

  const [activeTab, setActiveTab] = useState(tabParam || "owned")
  const [isLoading, setIsLoading] = useState(true)
  const [listedNFTs, setListedNFTs] = useState<ListedNFT[]>([])
  const [bidsPlacedNFTs, setBidsPlacedNFTs] = useState<BidNFT[]>([])

  const [ownedNFTs, setOwnedNFTs] = useState<any[]>([])
  const [allMetadata, setAllMetadata] = useState<any[]>([])
  const [imageUrlMap, setImageUrlMap] = useState<{ [tokenId: string]: string }>({})

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
      setIsLoading(true);
      try {
        if (!account?.address) {
          setOwnedNFTs([]);
          setListedNFTs([]);
          setBidsPlacedNFTs([]);
          return;
        }

        
        // Fetch owned NFTs from the specific collection
        const ownedNFTsData = await Insight.getOwnedNFTs({
          client,
          chains: [base],
          ownerAddress: account.address,
        });

        
        // Filter NFTs to only include those from our collection
        const filteredNFTs = ownedNFTsData.filter((nft: any) => 
          nft.contractAddress?.toLowerCase() === nftCollection.address.toLowerCase()
        );
        
        
        // Process the NFT data to match our interface
        const processedNFTs = filteredNFTs.map((nft: any) => {
          const tokenId = nft.tokenId?.toString() || nft.id?.toString();
          const metadata = allMetadata[parseInt(tokenId)] || {};
          
          return {
            id: tokenId,
            tokenId: tokenId,
            name: nft.name || metadata.name || `Satoshe Slugger #${parseInt(tokenId) + 1}`,
            image: nft.image || imageUrlMap[tokenId] || "/placeholder-nft.webp",
            rarity: metadata.rarity_tier || "common",
            description: nft.description || metadata.description || "",
            attributes: nft.attributes || metadata.attributes || [],
            // Add auction/listing status if available
            isListed: false, // TODO: Check if this NFT is currently listed
            currentPrice: "0", // TODO: Get current price if listed
          };
        });

        setOwnedNFTs(processedNFTs);
        
        // DISABLED: Fetch user's active bids and listed NFTs (prevents RPC charges)
        // await Promise.all([
        //   fetchUserBids(account.address),
        //   fetchUserListedNFTs(account.address)
        // ]);
        
      } catch (error) {
        console.error("Error loading user data:", error);
        setOwnedNFTs([]);
        setListedNFTs([]);
        setBidsPlacedNFTs([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadUserData();
  }, [account?.address, allMetadata, imageUrlMap])

  // Listen for marketplace events and refresh data
  useEffect(() => {
    if (!account?.address) return;

    // DISABLED: Set up a timer to refresh data (prevents RPC charges)
    // const refreshInterval = setInterval(() => {
    //   refreshUserData();
    // }, 30000);

    // return () => clearInterval(refreshInterval);
  }, [account?.address, allMetadata, imageUrlMap])

  const handleListForSale = (nftId: string) => {
    router.push(`/list-nft/${nftId}`)
  }

  const handleCancelListing = async (listingId: string) => {
    // In a real app, this would call the contract to cancel the listing
    alert(`Listing for NFT #${listingId} has been canceled`)
  }

  // Refresh all user data (called when events occur)
  const refreshUserData = async () => {
    if (!account?.address) return;
    
    
    // Refresh owned NFTs
    const ownedNFTsData = await Insight.getOwnedNFTs({
      client,
      chains: [base],
      ownerAddress: account.address,
    });

    const processedNFTs = ownedNFTsData.map((nft: any) => {
      const tokenId = nft.tokenId?.toString() || nft.id?.toString();
      const metadata = allMetadata[parseInt(tokenId)] || {};
      
      return {
        id: tokenId,
        tokenId: tokenId,
        name: nft.name || metadata.name || `Satoshe Slugger #${parseInt(tokenId) + 1}`,
        image: nft.image || imageUrlMap[tokenId] || "/placeholder-nft.webp",
        rarity: metadata.rarity_tier || "common",
        description: nft.description || metadata.description || "",
        attributes: nft.attributes || metadata.attributes || [],
        isListed: false,
        currentPrice: "0",
      };
    });

    setOwnedNFTs(processedNFTs);
    
    // DISABLED: Refresh bids and listed NFTs (prevents RPC charges)
    // await Promise.all([
    //   fetchUserBids(account.address),
    //   fetchUserListedNFTs(account.address)
    // ]);
  };

  // Fetch user's listed NFTs (auctions they created)
  const fetchUserListedNFTs = async (userAddress: string) => {
    try {
      
      // Get all active auctions
      const allAuctions = await getAllAuctions({
        contract: marketplace,
      });

      const userListedNFTs: ListedNFT[] = [];

      // Check each auction to see if user is the creator
      for (const auction of allAuctions) {
        try {
          // Check if user is the auction creator
          if ((auction as any).seller?.toLowerCase() === userAddress.toLowerCase()) {
            const tokenId = auction.tokenId?.toString();
            if (tokenId) {
              const metadata = allMetadata[parseInt(tokenId)] || {};
              
              // Get current winning bid if any
              let currentBid = "0";
              try {
                const winningBid = await getWinningBid({
                  contract: marketplace,
                  auctionId: auction.id,
                });
                if (winningBid?.bidAmountWei) {
                  currentBid = (Number(winningBid.bidAmountWei) / 1e18).toString();
                }
              } catch (error) {
                console.error(`Error fetching winning bid for auction ${auction.id}:`, error);
              }
              
              userListedNFTs.push({
                id: auction.id.toString(),
                tokenId: tokenId,
                name: metadata.name || `Satoshe Slugger #${parseInt(tokenId) + 1}`,
                image: imageUrlMap[tokenId] || "/placeholder-nft.webp",
                price: auction.buyoutBidAmount ? (Number(auction.buyoutBidAmount) / 1e18).toString() : "0",
                highestBid: currentBid,
                rarity: metadata.rarity_tier || "common",
                isListed: true,
              });
            }
          }
        } catch (error) {
          console.error(`Error checking auction ${auction.id}:`, error);
        }
      }

      setListedNFTs(userListedNFTs);
    } catch (error) {
      console.error("Error fetching user listed NFTs:", error);
      setListedNFTs([]);
    }
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
                price: auction.buyoutBidAmount ? (Number(auction.buyoutBidAmount) / 1e18).toString() : "0",
                yourBid: winningBid.bidAmountWei ? (Number(winningBid.bidAmountWei) / 1e18).toString() : "0",
                rarity: metadata.rarity_tier || "common",
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
    } else if (activeTab === "listed") {
      return listedNFTs
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
              className="bg-brand-pink hover:bg-brand-pink-hover text-white transition-colors"
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
            <h1 className="text-2xl font-bold mb-1">My NFTs</h1>
            <p className="text-neutral-400 text-sm">Manage your Satoshe Sluggers collection</p>
          </div>
        </div>

        {/* Tabs navigation */}
        <div className="mb-6">
          <div className="flex border-b border-neutral-700">
            <button
              className={`py-2 px-4 ${activeTab === "owned" ? "border-b-2 border-brand-pink text-white font-medium" : "text-neutral-400 hover:text-[#ff0099]"} transition-colors`}
              onClick={() => setActiveTab("owned")}
            >
              Owned ({ownedNFTs?.length || 0})
            </button>
            <button
              className={`py-2 px-4 ${activeTab === "listed" ? "border-b-2 border-brand-pink text-white font-medium" : "text-neutral-400 hover:text-[#ff0099]"} transition-colors`}
              onClick={() => setActiveTab("listed")}
            >
              Listed ({listedNFTs.length})
            </button>
            <button
              className={`py-2 px-4 flex items-center gap-2 ${activeTab === "favorites" ? "border-b-2 border-brand-pink text-white font-medium" : "text-neutral-400 hover:text-[#ff0099]"} transition-colors`}
              onClick={() => setActiveTab("favorites")}
            >
              <Heart className={`w-4 h-4 ${activeTab === "favorites" ? "fill-brand-pink text-brand-pink" : ""}`} />
              Favorites ({favorites.length})
            </button>
            <button
              className={`py-2 px-4 ${activeTab === "bids" ? "border-b-2 border-brand-pink text-white font-medium" : "text-neutral-400 hover:text-[#ff0099]"} transition-colors`}
              onClick={() => setActiveTab("bids")}
            >
              Bids Placed ({bidsPlacedNFTs.length})
            </button>
          </div>
        </div>

        {/* NFT Grid */}
        {activeNFTs.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-neutral-400 mb-4">
              {activeTab === "favorites"
                ? "No favorite NFTs yet. Start favoriting NFTs by clicking the heart icon on any NFT card!"
                : "No NFTs found in this category"
              }
            </p>
            {(activeTab === "owned" || activeTab === "favorites") && (
              <Button onClick={() => router.push("/nfts")} className="bg-brand-pink hover:bg-brand-pink-hover text-white transition-colors">
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
                  {activeTab === "owned" && !(nft as ListedNFT).isListed && (
                    <Button
                      onClick={() => handleListForSale(nft.id)}
                      className="w-full bg-brand-pink hover:bg-brand-pink-hover text-white text-sm py-2 transition-colors"
                    >
                      List for Sale
                    </Button>
                  )}

                  {activeTab === "favorites" && (
                    <Button
                      onClick={() => router.push(`/nft/${nft.id}`)}
                      className="w-full bg-brand-pink hover:bg-brand-pink-hover text-white text-sm py-2 transition-colors"
                    >
                      View on Marketplace
                    </Button>
                  )}

                  {activeTab === "listed" && (
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => handleCancelListing(nft.id)}
                        variant="outline"
                        className="w-full text-sm py-2 border-red-500 text-red-500 hover:bg-red-500/10"
                      >
                        Cancel Listing
                      </Button>
                      <Button
                        onClick={() => handleListForSale(nft.id)}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm py-2"
                      >
                        Update Listing
                      </Button>
                    </div>
                  )}

                  {activeTab === "bids" && (
                    <Button
                      variant="outline"
                      className="w-full text-sm py-2 border-blue-500 text-blue-500 hover:bg-blue-500/10"
                      onClick={() => {/* TODO: Implement increase bid functionality */}}
                    >
                      Increase Bid
                    </Button>
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
