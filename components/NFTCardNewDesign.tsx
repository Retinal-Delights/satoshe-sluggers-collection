import { Heart } from "lucide-react";
import { StatGrid } from "./StatGrid";
import { BidControl } from "./BidControlNew";
import { BuyNowControl } from "./BuyNowControl";
import { LazyImage } from "./LazyImage";
import { getAuctionCountdown, getAuctionEndColor } from "@/utils/auction-timer";

interface NFTCardProps {
  image: string;
  name: string;
  rank: string | number;
  rarity: string;
  rarityPercent: string | number;
  tier: string;
  startingPrice: string;
  buyNow: string;
  auctionEnd?: string | number | bigint;
  tokenId: string;
  contractAddress: string;
  numBids: number | null;
  currentBid?: string | null;
  isFavorited: boolean;
  onFavorite: () => void;
  isForSale: boolean;
  onBid?: (bidAmount: string) => void;
  onBuyNow?: () => void;
}

export function NFTCard({
  image, name, rank, rarity, rarityPercent, tier,
  startingPrice, buyNow, auctionEnd, tokenId, contractAddress,
  numBids, currentBid, isFavorited, onFavorite, isForSale,
  onBid, onBuyNow
}: NFTCardProps) {
  // Safely compute minimum next bid (5% up or startingPrice) and avoid NaN
  const cleanCurrentBid = currentBid ? currentBid.replace(' ETH', '') : '0';
  const cleanStartingPrice = startingPrice ? startingPrice.replace(' ETH', '') : '0';
  
  const minNextBid = (
    Number(cleanCurrentBid || 0) > 0
      ? (Number(cleanCurrentBid) * 1.05)
      : Number(cleanStartingPrice)
  ).toFixed(5);

  const endColor = getAuctionEndColor(auctionEnd || 0);

  return (
    <div className="w-full max-w-sm rounded-xl shadow bg-neutral-900 flex flex-col overflow-hidden">
      <LazyImage 
        src={image} 
        alt={name} 
        className="w-full aspect-square object-cover"
      />
      <div className="px-5 pt-4 flex flex-col flex-1">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-xl">{name}</h2>
          <button title={isFavorited ? "Unfavorite" : "Favorite"} onClick={onFavorite}>
            <Heart className={`w-6 h-6 cursor-pointer transition-colors ${isFavorited ? "fill-pink-500 text-pink-500" : "text-neutral-400 hover:text-pink-400"}`} />
          </button>
        </div>
        <div className={`mt-2 text-xs font-semibold ${endColor}`}>{getAuctionCountdown(auctionEnd || 0)}</div>
        <StatGrid {...{ rank, rarity, rarityPercent, tier, numBids }} />
        {isForSale && (
          <>
            <div className="mt-5">
              <BidControl
                minNextBid={minNextBid}
                currentBid={currentBid ?? undefined}
                startingPrice={startingPrice}
                tokenId={tokenId}
                contractAddress={contractAddress}
                onBid={onBid}
              />
            </div>
            <div className="my-4" />
            <BuyNowControl buyNow={buyNow} onBuyNow={onBuyNow} />
          </>
        )}
        {!isForSale && (
          <div className="text-neutral-500 text-center mt-7">Not for Sale</div>
        )}
      </div>
    </div>
  );
}
