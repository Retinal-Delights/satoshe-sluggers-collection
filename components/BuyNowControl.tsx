interface BuyNowControlProps {
  buyNow: string;
  onBuyNow?: () => void;
}

export function BuyNowControl({ buyNow, onBuyNow }: BuyNowControlProps) {
  function handleBuyNow() {
    if (onBuyNow) {
      onBuyNow();
    } else {
      alert(`Buy Now: ${buyNow} ETH`);
    }
  }

  return (
    <div className="flex flex-col w-full mt-4">
      <div className="flex items-center justify-between mb-1 text-lg font-bold">
        <span>Buy Now</span>
        <span className="text-blue-400">{buyNow}</span>
      </div>
      <button
        className="w-full h-12 rounded-lg mt-1 bg-blue-500 hover:bg-blue-600 font-bold text-white text-lg transition-colors"
        onClick={handleBuyNow}
      >
        BUY NOW
      </button>
    </div>
  );
}
