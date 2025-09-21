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

        // Use Insight API for Base chain event aggregation
        const baseUrl = "https://api.thirdweb.com/v1/contracts";
        const headers = {
          "Content-Type": "application/json",
          "x-secret-key": process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "",
        };

        // Fetch placed bids count
        const placedResponse = await fetch(
          `${baseUrl}/${chainId}/${contractAddress}/events?eventSignature=event NewBid(uint256 indexed auctionId, address indexed bidder, address indexed assetContract, uint256 bidAmount, struct IEnglishAuctions.Auction auction)`,
          { headers }
        );
        
        const placedData = await placedResponse.json();
        const placedCount = placedData?.data?.length || 0;

        // Fetch cancelled auctions count (for this specific token)
        const cancelledResponse = await fetch(
          `${baseUrl}/${chainId}/${contractAddress}/events?eventSignature=event CancelledAuction(address indexed auctionCreator, uint256 indexed auctionId)`,
          { headers }
        );
        
        const cancelledData = await cancelledResponse.json();
        const cancelledCount = cancelledData?.data?.length || 0;

        // Calculate net bids (placed - cancelled)
        const netBidCount = Math.max(0, placedCount - cancelledCount);

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
