import { useFavorites } from "@/hooks/useFavorites";
import { NFTCard } from "./NFTCardNewDesign";
import { useBidCount } from "@/hooks/useBidCount";
import { useCurrentBid } from "@/hooks/useCurrentBid";
import { useBuyNowPrice } from "@/hooks/useBuyNowPrice";

interface NFTItem {
  tokenId: string;
  image: string;
  name: string;
  rank: string | number;
  rarity: string;
  rarityPercent: string | number;
  tier: string;
  startingPrice: string;
  buyNow: string;
  auctionEnd?: string | number | bigint;
  isForSale: boolean;
}

interface NFTCardContainerProps {
  items: NFTItem[];
  contractAddress: string;
  onBid?: (tokenId: string, bidAmount: string) => void;
  onBuyNow?: (tokenId: string) => void;
}

export function NFTCardContainer({ items, contractAddress, onBid, onBuyNow }: NFTCardContainerProps) {
  const { isFavorited, toggleFavorite, isConnected } = useFavorites();

  return (
    <div className="grid grid-cols-2 gap-6 w-full">
      {items.map(item => {
        const { bidCount: numBids } = useBidCount({ contractAddress, tokenId: item.tokenId });
        const { currentBid } = useCurrentBid({ contractAddress, tokenId: item.tokenId });
        const { buyNowPrice } = useBuyNowPrice({ contractAddress, tokenId: item.tokenId });

        return (
          <NFTCard
            key={item.tokenId}
            image={item.image}
            name={item.name}
            rank={item.rank}
            rarity={item.rarity}
            rarityPercent={item.rarityPercent}
            tier={item.tier}
            auctionEnd={item.auctionEnd}
            tokenId={item.tokenId}
            contractAddress={contractAddress}
            startingPrice={item.startingPrice}
            buyNow={buyNowPrice ?? item.buyNow}
            numBids={numBids}
            currentBid={currentBid}
            isFavorited={isFavorited(item.tokenId)}
            onFavorite={() => {
              if (!isConnected) return alert("Connect wallet to favorite NFTs.");
              toggleFavorite({
                tokenId: item.tokenId,
                name: item.name,
                image: item.image,
                rarity: item.rarity,
                rank: item.rank,
                rarityPercent: item.rarityPercent,
              });
            }}
            isForSale={item.isForSale}
            onBid={onBid ? (bidAmount) => onBid(item.tokenId, bidAmount) : undefined}
            onBuyNow={onBuyNow ? () => onBuyNow(item.tokenId) : undefined}
          />
        );
      })}
    </div>
  );
}
