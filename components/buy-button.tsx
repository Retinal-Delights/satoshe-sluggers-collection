"use client";

import { TransactionButton } from "thirdweb/react";
import { buyoutAuction } from "thirdweb/extensions/marketplace";
import { Button } from "@/components/ui/button";
import { marketplace } from "@/lib/contracts";

interface BuyButtonProps {
  listingId: bigint;
  buyNowPrice?: string;
  className?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function BuyButton({ 
  listingId, 
  buyNowPrice,
  className,
  onSuccess,
  onError 
}: BuyButtonProps) {
  const createBuyNowTransaction = () => {
    return buyoutAuction({
      contract: marketplace,
      auctionId: listingId,
    });
  };

  return (
    <TransactionButton
      transaction={createBuyNowTransaction}
      onTransactionConfirmed={onSuccess}
      onError={onError}
      className={`w-full h-8 text-sm font-medium text-white ${className || ""}`}
      style={{ 
        backgroundColor: "#3B82F6",
        borderRadius: "4px"
      }}
    >
      Buy Now
    </TransactionButton>
  );
}
