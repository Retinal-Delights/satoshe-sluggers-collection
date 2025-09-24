import Link from "next/link";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Heart } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { track } from '@vercel/analytics';
import { validateNumericInput } from "@/lib/input-validation";
import { TransactionButton, useSendTransaction, useActiveAccount } from "thirdweb/react";
import { bidInAuction, buyoutAuction, getAuction, getWinningBid } from "thirdweb/extensions/marketplace";
import { toWei } from "thirdweb";
import { marketplace } from "@/lib/contracts";
import { ethers } from "ethers";

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

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
  numBids: number;
  activeView: string;
  bidAmount: string;
  isProcessingBuyNow: boolean;
  isForSale: boolean;
  currentBid: string;
  bidPrice: string;
  auctionId?: string | number;
  
  // Purchase handlers (from parent/page)
  onBid: (bidAmount: string) => void;
  onBuyNow: () => void;
  onBidAmountChange: (id: string, value: string) => void;
  onPlaceBid: () => void;
  buyNowValue?: number;
  buyNowWei?: string;
  minimumBidWei?: string;
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
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function NFTCard({
  image, name, rank, rarity, rarityPercent, bidPrice, currentBid, buyNow,
  tokenId, auctionEnd, numBids, activeView, bidAmount,
  isProcessingBuyNow, isForSale, auctionId, onBidAmountChange,
  onPlaceBid, onBuyNow, buyNowValue, buyNowWei, minimumBidWei,
}: NFTCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
  const [countdown, setCountdown] = useState("");
  const [bidCount, setBidCount] = useState<number>(numBids);
  const [isProcessingBid, setIsProcessingBid] = useState(false);

  // Direct ethers.js bidding to bypass Thirdweb SDK bug
  const handleDirectBid = async () => {
    if (!auctionId) throw new Error("No auction ID available");
    if (!account?.address) throw new Error("Please connect your wallet first");

    setIsProcessingBid(true);
    
    try {
      // Get provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Create contract instance using the marketplace contract address
      const contract = new ethers.Contract(
        marketplace.address,
        [
          "function bidInAuction(uint256 auctionId, uint256 bidAmount) external payable",
          "function buyoutAuction(uint256 auctionId) external payable"
        ],
        signer
      );

      // Parse bid amount
      let userInput = bidAmount && bidAmount !== "" ? bidAmount : "0.00001";
      const bidWei = ethers.parseEther(userInput);
      const auctionIdBigInt = typeof auctionId === "bigint" ? auctionId : BigInt(auctionId);

      // Call contract directly - bypasses Thirdweb's buggy validation
      const tx = await contract.bidInAuction(auctionIdBigInt, bidWei, { 
        value: bidWei 
      });
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      // Update UI
      setBidCount(prev => prev + 1);
      track('NFT Bid Placed', {
        tokenId,
        bidAmount: userInput,
        currentBid: (currentBid || '0 ETH').replace(' ETH', ''),
        buyNow: buyNow.replace(' ETH', ''),
        rarity,
        rank: String(rank),
        numBids: String(bidCount + 1)
      });
      
      alert(`Bid placed successfully! Transaction: ${tx.hash}`);
      
    } catch (error: unknown) {
      console.error("Direct bid failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to place bid. Please try again.";
      alert(errorMessage);
    } finally {
      setIsProcessingBid(false);
    }
  };

  const { isFavorited, toggleFavorite, isConnected } = useFavorites();
  const isFav = isFavorited(tokenId);
  const account = useActiveAccount();

  const { mutate: sendBuyout } = useSendTransaction();

  // Countdown update for the UI
  useEffect(() => {
    const updateCountdown = () => setCountdown(getAuctionCountdown(auctionEnd || 0));
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [auctionEnd]);

  useEffect(() => { setBidCount(numBids); }, [numBids]);

  // Min bid for UI display of default
  const minIncrement = 0.05; // 5%
  const currentBidValue = Number((currentBid || '0 ETH').replace(' ETH', ''));
  const minimumBidDisplay = numBids > 0
    ? (currentBidValue * (1 + minIncrement))
    : currentBidValue;
  const formatBidAmount = (amount: number) => parseFloat(amount.toFixed(5)).toString();
  const displayBidAmount = bidAmount === "" ? formatBidAmount(minimumBidDisplay) : bidAmount;
  const placeholder = "/placeholder-nft.webp";
  const showPlaceholder = !imgLoaded || imgError;

  function handleFavoriteClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isConnected) {
      alert('Please connect your wallet to favorite NFTs');
      return;
    }
    const wasFav = isFav;
    toggleFavorite({ tokenId, name, image, rarity, rank, rarityPercent });
    track(wasFav ? 'NFT Unfavorited' : 'NFT Favorited', {
      tokenId, name, rarity, rank: String(rank), rarityPercent: String(rarityPercent)
    });
  }

  return (
    <div className="overflow-visible w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl mx-auto rounded-lg shadow-md flex flex-col h-full bg-neutral-900">
      <Link href={`/nft/${tokenId}`} className="block w-full">
        <div className="relative bg-neutral-900 w-full overflow-visible" style={{ aspectRatio: "0.9/1" }}>
          <img
            src={showPlaceholder ? placeholder : image}
            alt={name}
            width="100%"
            height="100%"
            className={`object-contain p-2 hover:scale-[1.02] hover:rotate-[5deg] hover:-translate-y-1 transition-all duration-300 ease-out relative z-20 ${showPlaceholder ? 'animate-pulse' : ''}`}
            onLoad={() => { setImgLoaded(true); setImgLoading(false); }}
            onError={() => { setImgError(true); setImgLoading(false); }}
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
              <Heart className={`w-5 h-5 transition-colors ${isFav ? "fill-brand-pink text-brand-pink" : "text-neutral-400 hover:text-brand-pink"}`} />
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
            <div className="space-y-0.5 text-xs md:text-sm mb-3 flex-1 leading-tight">
              <div className="flex justify-between"><span className="text-neutral-400">Rank:</span><span className="text-neutral-400">{rank || '—'} of 7777</span></div>
              <div className="flex justify-between"><span className="text-neutral-400">Rarity:</span><span className="text-neutral-400">{rarityPercent || '--'}%</span></div>
              <div className="flex justify-between"><span className="text-neutral-400">Tier:</span><span className="text-neutral-400">{rarity || 'Unknown'}</span></div>
              <div className="flex justify-between"><span className="text-neutral-400">Bids:</span><span className="text-neutral-400">{bidCount}</span></div>
              {!isForSale && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Status:</span><span className="text-neutral-500">Not for Sale</span>
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
                        placeholder={formatBidAmount(minimumBidDisplay)}
                        value={displayBidAmount}
                        onChange={(e) => {
                          const validation = validateNumericInput(e.target.value, tokenId);
                          if (validation.isValid) {
                            onBidAmountChange(tokenId, validation.formattedValue);
                            if (validation.formattedValue !== (currentBid || '0 ETH').replace(' ETH', '')) {
                              track('Bid Amount Modified', {
                                tokenId,
                                newBidAmount: validation.formattedValue,
                                currentBid: (currentBid || '0 ETH').replace(' ETH', ''),
                                rarity
                              });
                            }
                          }
                        }}
                        className="w-full text-xs md:text-sm px-3 bg-neutral-900 border focus:outline-none text-[#10B981] placeholder:text-neutral-500 font-medium"
                        style={{ height: "32px", borderColor: "#10B981", borderWidth: "1px", borderRadius: "4px" }}
                        onFocus={e => e.currentTarget.style.borderColor = "#059669"}
                        onBlur={e => e.currentTarget.style.borderColor = "#10B981"}
                        step="0.00001"
                        min={(currentBid || '0 ETH').replace(' ETH', '')}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs pointer-events-none">
                        ETH
                      </div>
                    </div>
                          <button
                            onClick={handleDirectBid}
                            disabled={isProcessingBid}
                            className="px-3 text-xs md:text-sm font-black border rounded disabled:opacity-50 disabled:cursor-not-allowed"
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
                            {isProcessingBid ? "BIDDING..." : "BID"}
                          </button>
                  </div>
                  <div className="text-xs text-neutral-400 whitespace-nowrap">Min: {formatBidAmount(minimumBidDisplay)} ETH</div>
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
                        if (!auctionId) { alert("No auction ID available"); return; }
                        try {
                          const tx = buyoutAuction({
                            contract: marketplace,
                            auctionId: typeof auctionId === "bigint" ? auctionId : BigInt(auctionId),
                          });
                          await new Promise((resolve, reject) => {
                            sendBuyout(tx, {
                              onSuccess: () => {
                                track('NFT Buy Now Clicked', {
                                  tokenId,
                                  buyNowPrice: buyNow.replace(' ETH', ''),
                                  currentBid: (currentBid || '0 ETH').replace(' ETH', ''),
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