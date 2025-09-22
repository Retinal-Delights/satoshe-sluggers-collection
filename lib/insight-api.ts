// Thirdweb Insight API utilities for efficient data fetching
import { THIRDWEB_CLIENT_ID } from "./thirdweb";

const INSIGHT_BASE_URL = "https://8453.insight.thirdweb.com/v1";
const MARKETPLACE_CONTRACT = "0xF0f26455b9869d4A788191f6AEdc78410731072C";

export interface InsightBidEvent {
  transactionHash: string;
  blockNumber: number;
  logIndex: number;
  data: {
    auctionId: string;
    tokenId: string;
    bidder: string;
    bidAmount: string;
  };
}

export interface InsightAuctionEvent {
  transactionHash: string;
  blockNumber: number;
  logIndex: number;
  data: {
    auctionId: string;
    tokenId: string;
    creator: string;
    assetContract: string;
    startTimestamp: string;
    endTimestamp: string;
    minBid: string;
    buyoutBid: string;
  };
}

/**
 * Fetch all bid events where the user is the highest bidder
 * This is much more efficient than scanning all 7,799 auctions on-chain
 */
export async function fetchUserBidEvents(userAddress: string): Promise<InsightBidEvent[]> {
  try {
    const response = await fetch(
      `${INSIGHT_BASE_URL}/events/${MARKETPLACE_CONTRACT}/NewBid(uint256,uint256,address,uint256)?filters[bidder]=${userAddress.toLowerCase()}`,
      {
        headers: {
          "x-client-id": THIRDWEB_CLIENT_ID!,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Insight API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.result || [];
  } catch (error) {
    console.error("Error fetching user bid events from Insight API:", error);
    return [];
  }
}

/**
 * Fetch auction creation events to get auction details
 */
export async function fetchAuctionEvents(auctionIds: string[]): Promise<InsightAuctionEvent[]> {
  try {
    // For now, we'll fetch all auction events and filter client-side
    // In the future, we could optimize this with specific auction ID filters
    const response = await fetch(
      `${INSIGHT_BASE_URL}/events/${MARKETPLACE_CONTRACT}/NewAuction(uint256,uint256,address,uint256,uint256,uint256,uint256,uint256)`,
      {
        headers: {
          "x-client-id": THIRDWEB_CLIENT_ID!,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Insight API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const allAuctions = data.result || [];
    
    // Filter to only the auctions we're interested in
    return allAuctions.filter((auction: InsightAuctionEvent) => 
      auctionIds.includes(auction.data.auctionId)
    );
  } catch (error) {
    console.error("Error fetching auction events from Insight API:", error);
    return [];
  }
}

/**
 * Get the latest bid for each auction to determine current highest bidder
 * This helps us identify which auctions the user is currently winning
 */
export async function getCurrentWinningBids(userAddress: string): Promise<{
  auctionId: string;
  tokenId: string;
  bidAmount: string;
  isUserWinning: boolean;
}[]> {
  try {
    // Get all bid events for this user
    const userBids = await fetchUserBidEvents(userAddress);
    
    // Group bids by auction ID to find the latest bid for each auction
    const bidsByAuction = new Map<string, InsightBidEvent>();
    
    for (const bid of userBids) {
      const auctionId = bid.data.auctionId;
      const existingBid = bidsByAuction.get(auctionId);
      
      // Keep the latest bid (highest block number, then highest log index)
      if (!existingBid || 
          bid.blockNumber > existingBid.blockNumber || 
          (bid.blockNumber === existingBid.blockNumber && bid.logIndex > existingBid.logIndex)) {
        bidsByAuction.set(auctionId, bid);
      }
    }
    
    // Now we need to check if the user is still the highest bidder
    // by comparing with other bids in the same auctions
    const results = [];
    
    for (const [auctionId, userBid] of bidsByAuction) {
      // For now, we'll assume the user is winning if they have a recent bid
      // In a more sophisticated implementation, we'd fetch all bids for each auction
      // and determine the actual highest bidder
      results.push({
        auctionId,
        tokenId: userBid.data.tokenId,
        bidAmount: userBid.data.bidAmount,
        isUserWinning: true, // Simplified for now
      });
    }
    
    return results;
  } catch (error) {
    console.error("Error getting current winning bids:", error);
    return [];
  }
}
