import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { format, differenceInHours, differenceInDays } from "date-fns";
import { Heart, Clock } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { track } from '@vercel/analytics';
import { validateNumericInput } from "@/lib/input-validation";
import { TransactionButton, useContractEvents, useSendTransaction } from "thirdweb/react";
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
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
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
  const [bidCount, setBidCount] = useState<number>(numBids);

  // DISABLED: Fetch current winning bid (prevents RPC charges)
  const fetchWinningBid = async (auctionId: string | number) => {
    // RPC calls disabled to prevent charges
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

    const amount = bidAmount || formatBidAmount(minimumBidAmount);
    
    // Parse current bid amount from the currentBid prop (in ETH)
    const currentBidEth = parseFloat(currentBid.replace(/[^\d.-]/g, '')) || 0;
    
    // Calculate minimum required bid
    // If no bids have been placed (numBids === 0), use minimum bid amount
    // If bids exist, use current bid + 5% buffer
    const bidBufferBps = 500; // 5% buffer (500 basis points)
    const minRequiredBid = numBids === 0 
      ? minimumBidAmount 
      : currentBidEth + (currentBidEth * bidBufferBps / 10000);
    
    if (!amount || Number(amount) < minRequiredBid) {
      const requiredBid = formatBidAmount(minRequiredBid);
      const currentBidText = numBids === 0 ? 'minimum bid' : 'current highest bid + 5% buffer';
      throw new Error(`Bid must be at least ${requiredBid} ETH (${currentBidText})`);
    }

    // Check if bid is above buyout amount
    if (typeof buyNowValue === 'number' && Number(amount) > buyNowValue) {
      console.log(`[DEBUG] Bid validation failed:`, {
        bidAmount: amount,
        bidAmountNumber: Number(amount),
        buyNowValue,
        comparison: Number(amount) > buyNowValue
      });
      throw new Error(`Bid amount is above the buyout amount of ${buyNowValue} ETH`);
    }

    // Validate bid amount
    const validation = validateNumericInput(amount);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    console.log(`[DEBUG] bidInAuction call:`, {
      auctionId,
      bidAmount: amount,
      bidAmountWei: toWei(amount).toString(),
      buyNowValue,
      buyNowValueWei: buyNowValue ? toWei(buyNowValue.toString()).toString() : 'undefined'
    });
    
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

  // Sync bid count with prop changes
  useEffect(() => {
    setBidCount(numBids);
  }, [numBids]);

  // Calculate minimum bid amount with 5% increment if bids exist
  const minIncrement = 0.05; // 5%
  const currentBidValue = Number(currentBid.replace(' ETH', ''));
  const minimumBidAmount = numBids > 0 ? currentBidValue * (1 + minIncrement) : currentBidValue;
  
  // Format minimum bid amount to show up to 5 decimal places, removing trailing zeros
  const formatBidAmount = (amount: number) => {
    return parseFloat(amount.toFixed(5)).toString();
  };
  
  // Auto-populate bid amount with minimum bid amount
  const defaultBidAmount = bidAmount || formatBidAmount(minimumBidAmount);
  const displayBidAmount = bidAmount === "" ? formatBidAmount(minimumBidAmount) : bidAmount;
  const isInvalidBid = 
    bidAmount !== "" && (
      !isFinite(Number(bidAmount)) ||
      Number(bidAmount) < minimumBidAmount ||
      (typeof buyNowValue === 'number' && BigInt(Math.floor(Number(bidAmount) * 1e18)) >= BigInt(Math.floor(buyNowValue * 1e18)))
    );

  // Favorites functionality
  const { isFavorited, toggleFavorite, isConnected } = useFavorites();
  const isFav = isFavorited(tokenId);
  
  // Transaction hooks
  const { mutate: sendBuyout } = useSendTransaction();

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
      className="overflow-visible w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl mx-auto rounded-lg shadow-md flex flex-col h-full bg-neutral-900"
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
      <div className="p-3 bg-neutral-900 flex-1 flex flex-col" style={{ color: "#fffbeb" }}>
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm md:text-base lg:text-lg font-medium leading-tight whitespace-nowrap pr-2" style={{ color: "#fffbeb" }}>{name}</h4>
            <button
              onClick={handleFavoriteClick}
              className="p-1 rounded-full hover:bg-neutral-800 transition-colors"
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
          {auctionEnd && (
                  <div className="text-xs md:text-sm text-neutral-400 mb-2">
                    Ends: {countdown}
                  </div>
          )}
        </div>
        {activeView === "forSale" && (
          <div className="flex flex-col flex-1">
            <div className="space-y-1 text-xs md:text-sm mb-3 flex-1 leading-tight">
              <div className="flex justify-between">
                <span className="text-neutral-400">Rank:</span>
                <span className="text-neutral-400">{rank || '—'} of 7777</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Rarity:</span>
                <span className="text-neutral-400">{rarityPercent || '--'}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Tier:</span>
                <span className="text-neutral-400">{rarity || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Bids:</span>
                <span className="text-neutral-400">{bidCount}</span>
              </div>
              {!isForSale && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Status:</span>
                  <span className="text-neutral-500">Not for Sale</span>
                </div>
              )}
            </div>
            {isForSale && (
              <>
                {/* Bidding Section */}
                <div className="pt-2 mb-2 p-3 bg-card rounded" style={{ color: "#fffbeb" }}>
                  <div className="text-xs mb-2 font-normal">Enter your max bid</div>
                  
                  <div className="flex gap-2 mb-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        id={`bid-amount-${tokenId}`}
                        placeholder={formatBidAmount(minimumBidAmount)}
                        value={bidAmount || formatBidAmount(minimumBidAmount)}
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
                        className="w-full text-xs md:text-sm px-3 bg-neutral-900 border focus:outline-none text-[#10B981] placeholder:text-neutral-500 font-medium"
                        style={{
                          height: "32px",
                          borderColor: "#10B981",
                          borderWidth: "1px",
                          borderRadius: "4px"
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
                        // Increment bid count
                        setBidCount(prev => prev + 1);
                        
                        // Track bid placement
                        track('NFT Bid Placed', {
                          tokenId,
                          bidAmount: bidAmount || currentBid.replace(' ETH', ''),
                          currentBid: currentBid.replace(' ETH', ''),
                          buyNow: buyNow.replace(' ETH', ''),
                          rarity,
                          rank: String(rank),
                          numBids: String(bidCount + 1)
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
                      className="px-3 text-xs md:text-sm font-black border rounded"
                      style={{ 
                        color: "#fffbeb",
                        height: "32px",
                        backgroundColor: "#10B981",
                        minWidth: "50px",
                        borderRadius: "4px",
                        borderColor: "#10B981",
                        borderWidth: "1px"
                      }}
                    >
                      BID
                    </TransactionButton>
                  </div>
                  
                  <div className="text-xs text-neutral-400 whitespace-nowrap">Min: {formatBidAmount(minimumBidAmount)} ETH</div>
                </div>

                {/* Buy Now Section */}
                <div className="pt-2 p-3 bg-card rounded">
                  <div className="flex items-end justify-between">
                    <div>
                    <div className="text-xs md:text-sm mb-0.5" style={{ color: "#fffbeb" }}>Buy Now</div>
                    <div className="text-sm md:text-base font-medium leading-tight" style={{ color: "#3B82F6" }}>{buyNow.replace(' ETH', '')} ETH</div>
                    </div>
                    <button
                      onClick={async () => {
                        if (!auctionId) {
                          alert("No auction ID available");
                          return;
                        }
                        
                        try {
                          const tx = buyoutAuction({
                            contract: marketplace,
                            auctionId: BigInt(auctionId),
                          });
                          
                          await new Promise((resolve, reject) => {
                            sendBuyout(tx, {
                              onSuccess: () => {
                                // Track buy now action
                                track('NFT Buy Now Clicked', {
                                  tokenId,
                                  buyNowPrice: buyNow.replace(' ETH', ''),
                                  currentBid: currentBid.replace(' ETH', ''),
                                  rarity,
                                  rank: String(rank),
                                  numBids: String(numBids)
                                });
                                resolve(true);
                              },
                              onError: (error) => {
                                console.error(`[Buy Now] Transaction failed for token ${tokenId}:`, error);
                                reject(error);
                              },
                            });
                          });
                          
                          alert(`NFT purchased successfully for ${buyNow.replace(' ETH', '')} ETH!`);
                        } catch (error) {
                          console.error(`[Buy Now] Error in buy now flow for token ${tokenId}:`, error);
                          alert(error instanceof Error ? error.message : "Failed to buy NFT. Please try again.");
                        }
                      }}
                      className="px-3 text-xs md:text-sm font-normal border rounded"
                      style={{ 
                        color: "#fffbeb",
                        height: "32px",
                        backgroundColor: "#3B82F6",
                        minWidth: "50px",
                        borderRadius: "4px",
                        borderColor: "#3B82F6",
                        borderWidth: "1px"
                      }}
                    >
                      BUY
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
