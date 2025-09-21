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

        // Use internal API endpoint for current bid
        const response = await fetch(
          `/api/insight/current-bid?contract=${contractAddress}&tokenId=${tokenId}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch current bid: ${response.statusText}`);
        }

        const data = await response.json();
        const bidEth = data.highest;

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
