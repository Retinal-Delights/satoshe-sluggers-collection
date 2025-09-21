import { useState, useEffect } from "react";
import { validateNumericInput } from "@/lib/input-validation";

interface BidControlProps {
  minNextBid: string | number;
  onBid: (bidAmount: string) => void;
  disabled?: boolean;
  currentBid?: string;
  tokenId?: string;
}

export function BidControl({ 
  minNextBid, 
  onBid, 
  disabled = false, 
  currentBid,
  tokenId 
}: BidControlProps) {
  const [bidValue, setBidValue] = useState<string>("");

  // Prepopulate input with minNextBid when it changes
  useEffect(() => {
    setBidValue(minNextBid?.toString() || "");
  }, [minNextBid]);

  const handleBidChange = (value: string) => {
    const validation = validateNumericInput(value, tokenId);
    if (validation.isValid) {
      setBidValue(validation.formattedValue);
    }
  };

  const handleBid = () => {
    if (isValid && !disabled) {
      onBid(bidValue);
    }
  };

  // Validate bid value
  const isValid =
    !isNaN(Number(bidValue)) && 
    Number(bidValue) > 0 && 
    Number(bidValue) >= Number(minNextBid);

  return (
    <div className="grid grid-cols-4 gap-2 mb-2 items-center">
      <div className="relative col-span-3 min-w-0">
        <input
          type="number"
          id={`bid-amount-${tokenId || 'default'}`}
          placeholder={minNextBid?.toString() || "0"}
          value={bidValue}
          onChange={(e) => handleBidChange(e.target.value)}
          className="w-full h-9 text-sm px-3 py-1 bg-neutral-900 border focus:outline-none text-neutral-100 placeholder:text-neutral-500 truncate"
          style={{
            borderColor: isValid ? "#FF0099" : "#EF4444",
            color: isValid ? "#FF0099" : "#EF4444",
            borderWidth: "1px",
            minWidth: 0,
            borderRadius: "4px"
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = isValid ? "#E6008A" : "#EF4444"}
          onBlur={(e) => e.currentTarget.style.borderColor = isValid ? "#FF0099" : "#EF4444"}
          step="0.00001"
          min={minNextBid?.toString() || "0"}
          disabled={disabled}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs pointer-events-none">
          ETH
        </div>
      </div>
      <button
        className="col-span-1 w-full h-9 text-sm font-medium text-white transition-all duration-200"
        style={{ 
          backgroundColor: isValid && !disabled ? "#FF0099" : "#6B7280",
          minWidth: 0,
          borderRadius: "4px"
        }}
        disabled={disabled || !isValid}
        onClick={handleBid}
        onMouseEnter={(e) => {
          if (isValid && !disabled) {
            e.currentTarget.style.backgroundColor = "#E6008A";
          }
        }}
        onMouseLeave={(e) => {
          if (isValid && !disabled) {
            e.currentTarget.style.backgroundColor = "#FF0099";
          }
        }}
      >
        BID
      </button>
    </div>
  );
}
