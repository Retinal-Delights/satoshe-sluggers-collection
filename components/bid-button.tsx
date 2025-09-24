"use client";

import { TransactionButton } from "thirdweb/react";
import { useState, useMemo, useEffect } from "react";
import { bidInAuction, getWinningBid } from "thirdweb/extensions/marketplace";
import { readContract } from "thirdweb";
import { marketplace } from "@/lib/contracts";
import { validateNumericInput } from "@/lib/input-validation";
import { toWei } from "thirdweb";

interface BidButtonProps {
  listingId: bigint;
  className?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function BidButton({ 
  listingId, 
  className,
  onSuccess,
  onError 
}: BidButtonProps) {
  const [bidAmount, setBidAmount] = useState("");
  const [auctionData, setAuctionData] = useState<{
    currentBid: string;
    minimumNextBid: string;
    currentBidDisplay: string;
    minimumNextBidDisplay: string;
    minimumNextBidEth: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch auction data once on mount to prevent re-renders
  useEffect(() => {
    const fetchAuctionData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get winning bid (current highest bid)
        const winningBid = await getWinningBid({
          contract: marketplace,
          auctionId: listingId,
        });

        // For now, use a default minimum bid - you can fetch this from contract if needed
        const defaultMinimumBid = "1000000000000000000"; // 1 ETH in wei
        const currentBid = winningBid?.bidAmountWei?.toString() || "0";
        const minimumNextBid = defaultMinimumBid; // You can fetch this from contract
        
        setAuctionData({
          currentBid,
          minimumNextBid,
          currentBidDisplay: currentBid !== "0" ? `${(Number(currentBid) / 1e18).toFixed(5)} ETH` : "No bids yet",
          minimumNextBidDisplay: `${(Number(minimumNextBid) / 1e18).toFixed(5)} ETH`,
          minimumNextBidEth: Number(minimumNextBid) / 1e18
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch auction data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuctionData();
  }, [listingId]);

  const handleBidChange = (value: string) => {
    const validation = validateNumericInput(value);
    if (validation.isValid) {
      setBidAmount(validation.formattedValue);
    }
  };

  const createBidTransaction = useMemo(() => {
    return () => {
      if (!auctionData) {
        throw new Error("Auction data not available");
      }

      const amount = bidAmount;
      
      if (!amount) {
        throw new Error("Please enter a bid amount");
      }

      // Validate bid amount
      const validation = validateNumericInput(amount);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      return bidInAuction({
        contract: marketplace,
        auctionId: listingId,
        bidAmount: toWei(amount).toString(),
      });
    };
  }, [auctionData, bidAmount, listingId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-8 text-sm text-neutral-400">
        Loading auction info...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-8 text-sm text-red-500">
        Error: {error}
      </div>
    );
  }

  if (!auctionData) {
    return (
      <div className="flex items-center justify-center h-8 text-sm text-neutral-400">
        Auction not found
      </div>
    );
  }

  const isInvalidBid = bidAmount !== "" && (
    !isFinite(Number(bidAmount)) ||
    Number(bidAmount) < auctionData.minimumNextBidEth
  );

  return (
    <div className={`space-y-2 ${className || ""}`}>
      {/* Live auction info */}
      <div className="text-xs text-neutral-400 space-y-1">
        <div>Current bid: {auctionData.currentBidDisplay}</div>
        <div>Minimum bid: {auctionData.minimumNextBidDisplay}</div>
      </div>

      {/* Bid input and button */}
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <input
            type="number"
            value={bidAmount}
            min={auctionData.minimumNextBidEth}
            step="0.00001"
            onChange={(e) => handleBidChange(e.target.value)}
            placeholder={`Enter at least ${auctionData.minimumNextBidDisplay}`}
            className="w-full h-8 text-sm px-3 py-1 bg-neutral-900 border focus:outline-none text-neutral-100 placeholder:text-neutral-500 truncate font-medium"
            style={{
              borderColor: isInvalidBid ? "#EF4444" : "#10B981",
              color: isInvalidBid ? "#EF4444" : "#10B981",
              borderWidth: "1px",
              minWidth: 0,
              borderRadius: "4px"
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = isInvalidBid ? "#DC2626" : "#059669"}
            onBlur={(e) => e.currentTarget.style.borderColor = isInvalidBid ? "#EF4444" : "#10B981"}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs pointer-events-none">
            ETH
          </div>
        </div>
        <TransactionButton
          transaction={createBidTransaction}
          onTransactionConfirmed={onSuccess}
          onError={onError}
          disabled={!bidAmount || isInvalidBid}
          className="w-full h-8 text-sm font-medium"
          style={{ 
            color: "#fffbeb",
            backgroundColor: "#10B981",
            borderRadius: "4px"
          }}
        >
          {isLoading ? "Bidding..." : "Place Bid"}
        </TransactionButton>
      </div>

      {error && (
        <div className="text-red-500 text-xs">
          {error}
        </div>
      )}
    </div>
  );
}
