import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { format, differenceInHours, differenceInDays } from "date-fns";
import { Heart } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { track } from '@vercel/analytics';
import { validateNumericInput } from "@/lib/input-validation";
import { TransactionButton, useContractEvents } from "thirdweb/react";
import { bidInAuction, buyoutAuction, newBidEvent, auctionClosedEvent, getWinningBid } from "thirdweb/extensions/marketplace";
import { toWei } from "thirdweb";
import { marketplace } from "@/lib/contracts";
import { useMarketplaceEvents } from "@/hooks/useMarketplaceEvents";

interface NFTCardProps {
  image: string;
  name: string;
  rank: string | number;
  rarity: string;
  rarityPercent: string | number;
  bidPrice: string;
  currentBid: string;
  buyNow: string;
  tokenId: string;
  auctionEnd?: string | number | bigint;
  numBids: number;
  activeView: string;
  clientReady: boolean;
  bidAmount: string;
  isProcessingBid: boolean;
  isProcessingBuyNow: boolean;
  isForSale: boolean;
  auctionId?: string | number;
  onBidAmountChange: (id: string, value: string) => void;
  onPlaceBid: () => void;
  onBuyNow: () => void;
  buyNowValue?: number;
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
  image,
  name,
  rank,
  rarity,
  rarityPercent,
  bidPrice,
  currentBid,
  buyNow,
  tokenId,
  auctionEnd,
  numBids,
  activeView,
  clientReady,
  bidAmount,
  isProcessingBid,
  isProcessingBuyNow,
  isForSale,
  auctionId,
  onBidAmountChange,
  onPlaceBid,
  onBuyNow,
  buyNowValue,
}: NFTCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
  const [countdown, setCountdown] = useState("");
  const [currentBidAmount, setCurrentBidAmount] = useState<string>(currentBid);

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
  const createBidTransaction = () => {
    if (!auctionId) {
      throw new Error("No auction ID available");
    }

    const amount = bidAmount || currentBid.replace(' ETH', '');
    
    if (!amount || Number(amount) <= 0) {
      throw new Error("Please enter a valid bid amount");
    }

    // Validate bid amount
    const validation = validateNumericInput(amount);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    return bidInAuction({
      contract: marketplace,
      auctionId: BigInt(auctionId),
      bidAmount: toWei(amount).toString(),
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

  // Auto-populate bid amount with current bid price if not set
  const defaultBidAmount = bidAmount || currentBid.replace(' ETH', '');
  const displayBidAmount = bidAmount === "" ? currentBid.replace(' ETH', '') : bidAmount;
  const isInvalidBid =
    bidAmount !== "" && (
      !isFinite(Number(bidAmount)) ||
      Number(bidAmount) < Number(bidPrice.replace(' ETH', '')) ||
      (typeof buyNowValue === 'number' && Number(bidAmount) >= buyNowValue)
    );

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
                    <span className="text-neutral-100 font-medium truncate max-w-[120px]">{bidPrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">{numBids > 0 ? "Current Bid:" : "Starting Bid:"}</span>
                    <span className="font-medium truncate max-w-[120px]" style={{ color: "#10B981" }}>{currentBidAmount} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Buy Now:</span>
                    <span className="font-medium truncate max-w-[120px]" style={{ color: "#3B82F6" }}>{buyNow}</span>
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
                <div className="grid grid-cols-4 gap-2 mb-2 items-center">
                  <div className="relative col-span-3 min-w-0">
                    <input
                      type="number"
                      id={`bid-amount-${tokenId}`}
                      placeholder={currentBid.replace(' ETH', '')}
                      value={bidAmount || currentBid.replace(' ETH', '')}
                      onChange={(e) => {
                        const validation = validateNumericInput(e.target.value, tokenId);
                        if (validation.isValid) {
                          onBidAmountChange(tokenId, validation.formattedValue);
                          // Track bid amount changes
                          if (validation.formattedValue !== currentBid.replace(' ETH', '')) {
                            track('Bid Amount Modified', {
                              tokenId,
                              newBidAmount: validation.formattedValue,
                              currentBid: currentBid.replace(' ETH', ''),
                              rarity
                            });
                          }
                        }
                      }}
                      className="w-full h-9 text-sm px-3 py-1 rounded-sm bg-neutral-900 border focus:outline-none text-neutral-100 placeholder:text-neutral-500 truncate"
                      style={{
                        borderColor: "#10B981",
                        color: "#10B981",
                        borderWidth: "1px",
                        minWidth: 0
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = "#059669"}
                      onBlur={(e) => e.currentTarget.style.borderColor = "#10B981"}
                      step="0.00001"
                      min={currentBid.replace(' ETH', '')}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs pointer-events-none">
                      ETH
                    </div>
                  </div>
                  <TransactionButton
                    transaction={createBidTransaction}
                    onTransactionConfirmed={async () => {
                      // Track bid placement
                      track('NFT Bid Placed', {
                        tokenId,
                        bidAmount: bidAmount || currentBid.replace(' ETH', ''),
                        currentBid: currentBid.replace(' ETH', ''),
                        buyNow: buyNow.replace(' ETH', ''),
                        rarity,
                        rank: String(rank),
                        numBids: String(numBids)
                      });
                      // Refresh the winning bid to show the new current bid
                      if (auctionId) {
                        await fetchWinningBid(auctionId);
                      }
                      onPlaceBid();
                    }}
                    onError={(error) => {
                      console.error("Bid failed:", error);
                      alert(error.message || "Failed to place bid. Please try again.");
                    }}
                    className="col-span-1 !w-full !min-w-0 !h-9 rounded-sm text-sm font-medium bg-emerald-500 hover:bg-emerald-600"
                    style={{ 
                      backgroundColor: "#10B981",
                      minWidth: 0
                    }}
                  >
                    BID
                  </TransactionButton>
                </div>
                <TransactionButton
                  transaction={createBuyNowTransaction}
                  onTransactionConfirmed={() => {
                    // Track buy now action
                    track('NFT Buy Now Clicked', {
                      tokenId,
                      buyNowPrice: buyNow.replace(' ETH', ''),
                      currentBid: currentBid.replace(' ETH', ''),
                      rarity,
                      rank: String(rank),
                      numBids: String(numBids)
                    });
                    onBuyNow();
                  }}
                  onError={(error) => {
                    console.error("Buy now failed:", error);
                    alert(error.message || "Failed to buy NFT. Please try again.");
                  }}
                  className="w-full text-sm py-1 h-9 text-white rounded-sm transition-all duration-300 ease-out font-medium hover:scale-[1.02] hover:shadow-lg hover:bg-blue-600"
                  style={{ backgroundColor: "#3B82F6" }}
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
