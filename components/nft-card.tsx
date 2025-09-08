import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { format, differenceInHours, differenceInDays } from "date-fns";
import { Heart } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { track } from '@vercel/analytics';
import { validateNumericInput } from "@/lib/input-validation";

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
  onBidAmountChange,
  onPlaceBid,
  onBuyNow,
  buyNowValue,
}: NFTCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
  const [countdown, setCountdown] = useState("");
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
    <div className="overflow-visible w-full max-w-sm mx-auto rounded-lg shadow-md flex flex-col h-full bg-neutral-900">
      <Link href={`/nft/${tokenId}`} className="block w-full">
        <div className="relative bg-neutral-900 w-full overflow-visible" style={{ aspectRatio: "0.9/1" }}>
          <img
            src={showPlaceholder ? placeholder : image}
            alt={name}
            width="100%"
            height="100%"
            className={`object-contain p-2 hover:scale-[1.02] hover:rotate-[5deg] hover:-translate-y-1 transition-all duration-300 ease-out relative z-20 ${showPlaceholder ? 'animate-pulse' : ''}`}
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
                        ? "fill-[#ff0099] text-[#ff0099]"
                        : "text-neutral-400 hover:text-[#ff0099]"
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
                    <span className="font-medium truncate max-w-[120px]" style={{ color: "#10B981" }}>{currentBid}</span>
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
                <div className="relative w-full mb-2">
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
                      borderWidth: "1px"
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
                <div className="flex flex-col gap-2">
              <Button
                className="w-full text-sm py-1 h-9 text-white rounded-sm transition-all duration-300 ease-out font-medium hover:scale-[1.02] hover:shadow-lg"
                style={{ backgroundColor: "#10B981" }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#059669"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#10B981"}
                onClick={() => {
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
                  onPlaceBid();
                }}
                disabled={isProcessingBid}
              >
                {isProcessingBid ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  "PLACE BID"
                )}
              </Button>
              <Button
                className="w-full text-sm py-1 h-9 text-white rounded-sm transition-all duration-300 ease-out font-medium hover:scale-[1.02] hover:shadow-lg"
                style={{ backgroundColor: "#3B82F6" }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#2563EB"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#3B82F6"}
                onClick={() => {
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
                disabled={isProcessingBuyNow}
              >
                {isProcessingBuyNow ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  "BUY NOW"
                )}
              </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
