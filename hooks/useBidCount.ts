import { useEffect, useState } from "react";

interface UseBidCountParams {
  contractAddress: string;
  tokenId: string;
  chainId?: number;
}

export function useBidCount({ contractAddress, tokenId, chainId = 8453 }: UseBidCountParams) {
  const [bidCount, setBidCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchCounts() {
      try {
        setIsLoading(true);
        setError(null);

        // Use internal API endpoint for bid count
        const response = await fetch(
          `/api/insight/bid-count?contract=${contractAddress}&tokenId=${tokenId}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch bid count: ${response.statusText}`);
        }

        const data = await response.json();
        const netBidCount = data.count || 0;

        if (!cancelled) {
          setBidCount(netBidCount);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching bid count:", err);
          setError(err instanceof Error ? err.message : "Failed to fetch bid count");
          setIsLoading(false);
        }
      }
    }

    fetchCounts();

    // Poll every 15 seconds for updates
    const interval = setInterval(fetchCounts, 15000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [contractAddress, tokenId, chainId]);

  return { bidCount, isLoading, error };
}
