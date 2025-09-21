import { useState } from "react";
import NFTCard from "./NFTCardNew";

// Example usage of the new containerized NFTCard component
export function NFTCardExample() {
  const [bidAmount, setBidAmount] = useState<string>("");
  const [isProcessingBid, setIsProcessingBid] = useState(false);
  const [isProcessingBuyNow, setIsProcessingBuyNow] = useState(false);

  // Example static data (would come from combined_metadata.json)
  const nftData = {
    image: "/images/1.webp",
    name: "Satoshe Slugger #1",
    rank: 1,
    rarity: "Legendary",
    rarityPercent: 0.01,
    tier: "Legendary",
    startingPrice: "0.1",
    buyNow: "1.0",
    tokenId: "1",
    auctionEnd: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
    contractAddress: "0xF0f26455b9869d4A788191f6AEdc78410731072C",
  };

  // Example live data (would come from wallet/auction state)
  const liveData = {
    isFavorited: false,
    isForSale: true,
    currentBid: "0.15",
    auctionId: "123",
  };

  const handleBid = (bidAmount: string) => {
    console.log("Placing bid:", bidAmount);
    setIsProcessingBid(true);
    // Your bid logic here
    setTimeout(() => {
      setIsProcessingBid(false);
      setBidAmount(bidAmount);
    }, 2000);
  };

  const handleBuyNow = () => {
    console.log("Buying now");
    setIsProcessingBuyNow(true);
    // Your buy now logic here
    setTimeout(() => {
      setIsProcessingBuyNow(false);
    }, 2000);
  };

  const handleFavorite = () => {
    console.log("Toggling favorite");
    // Your favorite logic here
  };

  return (
    <div className="max-w-sm">
      <NFTCard
        // Static props from metadata
        {...nftData}
        
        // Live props from wallet/auction state
        {...liveData}
        onFavorite={handleFavorite}
        
        // Handlers
        onBid={handleBid}
        onBuyNow={handleBuyNow}
        
        // Processing states
        isProcessingBid={isProcessingBid}
        isProcessingBuyNow={isProcessingBuyNow}
      />
    </div>
  );
}
