import { useState, useEffect } from "react";

interface BidControlProps {
  minNextBid: string;
  currentBid?: string;
  startingPrice: string;
  tokenId: string;
  contractAddress: string;
  onBid?: (bidAmount: string) => void;
}

export function BidControl({ minNextBid, currentBid, startingPrice, tokenId, contractAddress, onBid }: BidControlProps) {
  const [bid, setBid] = useState(minNextBid);

  useEffect(() => { 
    setBid(minNextBid); 
  }, [minNextBid]);

  const isValid = !isNaN(Number(bid)) && Number(bid) >= Number(minNextBid);

  function handleBid() {
    if (!isValid || !onBid) return;
    onBid(bid);
  }

  return (
    <div className="flex flex-col gap-2 items-stretch">
      <div className="text-xs text-neutral-400 mb-1">
        Minimum Next Bid: <span className="text-green-500 font-bold">{minNextBid}</span>
      </div>
      <div className="flex flex-row items-center gap-2">
        <input
          type="number"
          value={bid}
          min={minNextBid}
          step="0.00001"
          className="w-full px-3 py-2 rounded border focus:outline-none text-green-500 border-green-500 bg-neutral-900 text-sm"
          onChange={e => setBid(e.target.value)}
        />
        <button
          className={`h-10 px-4 rounded font-bold text-white transition-colors w-32
            ${isValid ? "bg-emerald-500 hover:bg-emerald-600" : "bg-emerald-700 cursor-not-allowed"}`}
          disabled={!isValid}
          onClick={handleBid}
        >
          BID
        </button>
      </div>
      <div className="text-xs text-neutral-500 mt-1">
        Starting Price: {startingPrice}
      </div>
    </div>
  );
}
