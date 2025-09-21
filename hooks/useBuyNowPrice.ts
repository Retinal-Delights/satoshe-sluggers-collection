import { useState, useEffect } from "react";

interface UseBuyNowPriceParams {
  contractAddress: string;
  tokenId: string;
  chainId?: number;
}

export function useBuyNowPrice({ contractAddress, tokenId, chainId = 8453 }: UseBuyNowPriceParams) {
  const [buyNowPrice, setBuyNowPrice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchBuyNowPrice() {
      try {
        setIsLoading(true);
        setError(null);

        // Use internal API endpoint for buy now price
        const response = await fetch(
          `/api/insight/buy-now?contract=${contractAddress}&tokenId=${tokenId}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch buy now price: ${response.statusText}`);
        }

        const data = await response.json();
        const buyNow = data.buyNow;

        if (!cancelled) {
          setBuyNowPrice(buyNow);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error fetching buy now price:", err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch buy now price");
          setIsLoading(false);
        }
      }
    }

    fetchBuyNowPrice();
    
    // Poll every 30 seconds for buy now price updates
    const interval = setInterval(fetchBuyNowPrice, 30000);
    
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [contractAddress, tokenId, chainId]);

  return { buyNowPrice, isLoading, error };
}
