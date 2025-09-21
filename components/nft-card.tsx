import Link from "next/link";
import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { track } from '@vercel/analytics';
import { TransactionButton } from "thirdweb/react";
import { bidInAuction, buyoutAuction } from "thirdweb/extensions/marketplace";
import { toWei } from "thirdweb";
import { marketplace } from "@/lib/contracts";
import { useBidCount } from "@/hooks/useBidCount";
import { BidControl } from "@/components/BidControl";

interface NFTCardProps {
  // Static props from combined_metadata.json
  image: string;
  name: string;
  rank: string | number;
  rarity: string;
  rarityPercent: string | number;
  tier?: string;
  startingPrice: string;
  buyNow: string;
  tokenId: string;
  auctionEnd?: string | number | bigint;
  contractAddress: string;
  
  // Live/connected wallet props
  isFavorited?: boolean;
  onFavorite?: () => void;
  isForSale: boolean;
  currentBid?: string;
  
  // Purchase handlers (from parent/page)
  onBid: (bidAmount: string) => void;
  onBuyNow: () => void;
  
  // Legacy props for backward compatibility
  activeView?: string;
  clientReady?: boolean;
  isProcessingBid?: boolean;
  isProcessingBuyNow?: boolean;
  auctionId?: string | number;
}

function getAuctionEndColor(auctionEnd: string | number | bigint) {
  if (!auctionEnd) return "text-neutral-400";
  const now = Date.now();
  const end = Number(auctionEnd) * 1000;
  const hoursLeft = (end - now) / (1000 * 60 * 60);
  if (hoursLeft <= 24) return "text-red-500 font-bold";
  if (hoursLeft <= 24 * 7) return "text-yellow-400 font-bold";
  return "text-neutral-400";
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

export default function NFTCard({
  // Static props
  image,
  name,
  rank,
  rarity,
  rarityPercent,
  tier,
  startingPrice,
  buyNow,
  tokenId,
  auctionEnd,
  contractAddress,
  
  // Live props
  isFavorited: propIsFavorited,
  onFavorite: propOnFavorite,
  isForSale,
  currentBid,
  
  // Handlers
  onBid,
  onBuyNow,
  
  // Legacy props
  activeView = "forSale",
  clientReady = true,
  isProcessingBid = false,
  isProcessingBuyNow = false,
  auctionId,
}: NFTCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
  const [countdown, setCountdown] = useState("");

  // DISABLED: Fetch current winning bid (prevents RPC charges)
  const fetchWinningBid = async (auctionId: string | number) => {
    console.log(`[DISABLED] Would fetch winning bid for auction ${auctionId} - RPC calls disabled to prevent charges`);
    return;
  };

  // Fetch winning bid on mount
  useEffect(() => {
    if (auctionId) {
      fetchWinningBid(auctionId);
    }
  }, [auctionId]);

  // DISABLED: Listen for new bid events (prevents RPC charges)
  // const { data: bidEvents } = useContractEvents({
  //   contract: marketplace,
  //   events: [newBidEvent()],
  // });

  // DISABLED: Listen for auction closed events (prevents RPC charges)
  // const { data: auctionClosedEvents } = useContractEvents({
  //   contract: marketplace,
  //   events: [auctionClosedEvent()],
  // });

  // DISABLED: Handle new bid events (prevents RPC charges)
  // useEffect(() => {
  //   // Event handling disabled to prevent RPC calls
  // }, [bidEvents, auctionId]);

  // DISABLED: Handle auction closed events (prevents RPC charges)
  // useEffect(() => {
  //   // Event handling disabled to prevent RPC calls
  // }, [auctionClosedEvents, auctionId]);

  // Transaction function for placing a bid
  const createBidTransaction = (bidAmount: string) => {
    if (!auctionId) {
      throw new Error("No auction ID available");
    }

    if (!bidAmount || Number(bidAmount) <= 0) {
      throw new Error("Please enter a valid bid amount");
    }

    return bidInAuction({
      contract: marketplace,
      auctionId: BigInt(auctionId),
      bidAmount: toWei(bidAmount).toString(),
    });
  };

  // Transaction function for buy now (buyout auction)
  const createBuyNowTransaction = () => {
    if (!auctionId) {
      throw new Error("No auction ID available");
    }

    return buyoutAuction({
      contract: marketplace,
      auctionId: BigInt(auctionId),
    });
  };
  const [isTilted, setIsTilted] = useState(false);
  const placeholder = "/placeholder-nft.webp";
  const showPlaceholder = !imgLoaded || imgError;
  const endColor = getAuctionEndColor(auctionEnd || 0);

  // Update countdown every minute
  useEffect(() => {
    const updateCountdown = () => {
      setCountdown(getAuctionCountdown(auctionEnd || 0));
    };

    updateCountdown(); // Initial update
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [auctionEnd]);

  // Live bid count from Insight API
  const { bidCount: numBids, isLoading: bidCountLoading } = useBidCount({ 
    contractAddress, 
    tokenId 
  });

  // Calculate minNextBid (5% over current bid, or starting price if none)
  const minNextBid = (
    Number(currentBid || 0) > 0
      ? Number(currentBid) * 1.05
      : Number(startingPrice)
  ).toFixed(5);

  // Favorites functionality
  const { isFavorited, toggleFavorite, isConnected } = useFavorites();
  const isFav = isFavorited(tokenId);

  // Mobile tilt interaction
  const handleMobileTilt = () => {
    setIsTilted(true);
    setTimeout(() => setIsTilted(false), 300);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation when clicking heart
    e.stopPropagation();

    if (!isConnected) {
      alert('Please connect your wallet to favorite NFTs');
      return;
    }

    const wasFavorited = isFav;
    toggleFavorite({
      tokenId,
      name,
      image,
      rarity,
      rank,
      rarityPercent,
    });

    // Track favorite action
    track(wasFavorited ? 'NFT Unfavorited' : 'NFT Favorited', {
      tokenId,
      name,
      rarity,
      rank: String(rank),
      rarityPercent: String(rarityPercent)
    });
  };

  return (
    <div 
      className="overflow-visible w-full max-w-sm mx-auto rounded-lg shadow-md flex flex-col h-full bg-neutral-900"
      onClick={handleMobileTilt}
    >
      <Link href={`/nft/${tokenId}`} className="block w-full">
        <div className="relative bg-neutral-900 w-full overflow-visible" style={{ aspectRatio: "0.9/1" }}>
          <img
            src={showPlaceholder ? placeholder : image}
            alt={name}
            width="100%"
            height="100%"
            className={`object-contain p-2 hover:scale-[1.02] hover:rotate-[5deg] hover:-translate-y-1 transition-all duration-300 ease-out relative z-20 ${showPlaceholder ? 'animate-pulse' : ''} ${isTilted ? 'scale-[1.02] rotate-[5deg] -translate-y-1' : ''}`}
            onLoad={() => {
              setImgLoaded(true);
              setImgLoading(false);
            }}
            onError={() => {
              setImgError(true);
              setImgLoading(false);
            }}
          />
          {imgLoading && !showPlaceholder && (
            <div className="absolute inset-0 bg-neutral-900/80 flex items-center justify-center">
              <div className="animate-pulse text-neutral-400 text-sm">Loading...</div>
            </div>
          )}
        </div>
      </Link>
      <div className="p-4 bg-neutral-900 text-neutral-100 flex-1 flex flex-col">
        <div className="mb-1">
          <h4 className="text-lg font-bold mb-2">{name}</h4>
        </div>
        {activeView === "forSale" && (
          <div className="flex flex-col flex-1">
            {clientReady && auctionEnd && (
              <div className="flex items-center justify-between mb-3">
                <div className={`text-sm ${endColor}`}>
                  {countdown}
                </div>
                <button
                  onClick={handleFavoriteClick}
                  className="flex-shrink-0 p-1 rounded-full hover:bg-neutral-800 transition-colors"
                  title={isFav ? "Remove from favorites" : "Add to favorites"}
                >
                  <Heart
                    className={`w-5 h-5 transition-colors ${
                      isFav
                        ? "fill-brand-pink text-brand-pink"
                        : "text-neutral-400 hover:text-brand-pink"
                    }`}
                  />
                </button>
              </div>
            )}
            <div className="space-y-1.5 text-sm mb-3 flex-1">
              <div className="flex justify-between">
                <span className="text-neutral-400">Rank:</span>
                <span className="text-neutral-100">{rank || '—'} of 7777</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Rarity:</span>
                <span className="text-neutral-100">{rarityPercent || '--'}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Tier:</span>
                <span className="text-neutral-100">{rarity || 'Unknown'}</span>
              </div>
              {isForSale ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Number of Bids:</span>
                    <span className="text-neutral-100">{numBids}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Starting Price:</span>
                    <span className="text-neutral-100 font-medium truncate max-w-[120px]">{startingPrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">{numBids && numBids > 0 ? "Current Bid:" : "Starting Bid:"}</span>
                    <span className="font-medium truncate max-w-[120px] text-green-500">{currentBid || startingPrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Buy Now:</span>
                    <span className="font-medium truncate max-w-[120px] text-blue-400">{buyNow}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Status:</span>
                  <span className="text-neutral-500">Not for Sale</span>
                </div>
              )}
            </div>
            {isForSale && (
              <>
                <BidControl
                  minNextBid={minNextBid}
                  onBid={onBid}
                  disabled={isProcessingBid}
                  currentBid={currentBid}
                  tokenId={tokenId}
                />
                <TransactionButton
                  transaction={createBuyNowTransaction}
                  onTransactionConfirmed={() => {
                    // Track buy now action
                    track('NFT Buy Now Clicked', {
                      tokenId,
                      buyNowPrice: buyNow.replace(' ETH', ''),
                      currentBid: currentBid || startingPrice,
                      rarity,
                      rank: String(rank),
                      numBids: String(numBids || 0)
                    });
                    onBuyNow();
                  }}
                  onError={(error) => {
                    console.error("Buy now failed:", error);
                    alert(error.message || "Failed to buy NFT. Please try again.");
                  }}
                  className="w-full text-sm py-1 h-9 text-white transition-all duration-300 ease-out font-medium hover:scale-[1.02] hover:shadow-lg"
                  style={{ 
                    backgroundColor: "#FF0099",
                    borderRadius: "4px"
                  }}
                >
                  BUY NOW
                </TransactionButton>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
