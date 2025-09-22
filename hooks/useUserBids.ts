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
  const [isFetching, setIsFetching] = useState(false); // Prevent multiple simultaneous calls
  
  const account = useActiveAccount();

  // Fetch bids when account changes
  useEffect(() => {
    const fetchBids = async () => {
      if (!account?.address) {
        setBids([]);
        setIsLoading(false);
        setIsFetching(false);
        return;
      }

      // Prevent multiple simultaneous calls
      if (isFetching) return;
      
      try {
        setIsFetching(true);
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
        setIsFetching(false);
      }
    };

    fetchBids();
  }, [account?.address]);

  // Refresh function for manual updates
  const refresh = useCallback(async () => {
    if (!account?.address) {
      setBids([]);
      return;
    }

    // Prevent multiple simultaneous calls
    if (isFetching) return;

    try {
      setIsFetching(true);
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
      setIsFetching(false);
    }
  }, [account?.address]);

  return {
    bids,
    isLoading,
    error,
    refresh,
    hasBids: bids.length > 0,
  };
}
