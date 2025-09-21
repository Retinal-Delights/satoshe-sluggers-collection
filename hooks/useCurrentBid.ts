import { useState, useEffect } from "react";

interface UseCurrentBidParams {
  contractAddress: string;
  tokenId: string;
  chainId?: number;
}

export function useCurrentBid({ contractAddress, tokenId, chainId = 8453 }: UseCurrentBidParams) {
  const [currentBid, setCurrentBid] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchCurrentBid() {
      try {
        setIsLoading(true);
        setError(null);

        // Use thirdweb Insight API for Base chain event aggregation
        const baseUrl = "https://api.thirdweb.com/v1/contracts";
        const headers = {
          "Content-Type": "application/json",
          "x-secret-key": process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "",
        };

        // Fetch all BidPlaced events for this token/auction
        const response = await fetch(
          `${baseUrl}/${chainId}/${contractAddress}/events?eventSignature=event NewBid(uint256 indexed auctionId, address indexed bidder, address indexed assetContract, uint256 bidAmount, struct IEnglishAuctions.Auction auction)`,
          { headers }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch bid events: ${response.statusText}`);
        }

        const data = await response.json();
        const bidEvents = data.result || [];

        // Find the highest bid amount
        let highestBid = null;
        for (const event of bidEvents) {
          const bidAmount = event.data?.bidAmount;
          if (bidAmount) {
            if (!highestBid || Number(bidAmount) > Number(highestBid)) {
              highestBid = bidAmount;
            }
          }
        }

        // Convert from wei to ETH and format
        const bidEth = highestBid 
          ? (Number(highestBid) / 1e18).toFixed(5)
          : null;

        if (!cancelled) {
          setCurrentBid(bidEth);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error fetching current bid:", err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch current bid");
          setIsLoading(false);
        }
      }
    }

    fetchCurrentBid();
    
    // Poll every 15 seconds for real-time updates
    const interval = setInterval(fetchCurrentBid, 15000);
    
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [contractAddress, tokenId, chainId]);

  return { currentBid, isLoading, error };
}
