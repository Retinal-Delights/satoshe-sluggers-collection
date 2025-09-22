// React hook for efficiently fetching user's active bids using Insight API
import { useState, useEffect, useCallback } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { getCurrentWinningBids } from '@/lib/insight-api';

export interface UserBid {
  auctionId: string;
  tokenId: string;
  bidAmount: string;
  isUserWinning: boolean;
  auctionData: any;
}

export function useUserBids() {
  const [bids, setBids] = useState<UserBid[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const account = useActiveAccount();

  const fetchBids = useCallback(async () => {
    if (!account?.address) {
      setBids([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const winningBids = await getCurrentWinningBids(account.address);
      setBids(winningBids);
    } catch (err) {
      console.error('Error fetching user bids:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch bids');
      setBids([]);
    } finally {
      setIsLoading(false);
    }
  }, [account?.address]);

  // Fetch bids when account changes
  useEffect(() => {
    fetchBids();
  }, [fetchBids]);

  // Refresh function for manual updates
  const refresh = useCallback(() => {
    fetchBids();
  }, [fetchBids]);

  return {
    bids,
    isLoading,
    error,
    refresh,
    hasBids: bids.length > 0,
  };
}
