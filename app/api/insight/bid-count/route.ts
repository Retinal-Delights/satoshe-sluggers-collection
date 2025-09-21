import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.THIRDWEB_CLIENT_ID!;
const BASE_CHAIN_ID = "8453";

// Count BidPlaced and BidCancelled for a given contract/tokenId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contract = searchParams.get('contract');
    const tokenId = searchParams.get('tokenId');

    if (!contract || !tokenId) {
      return NextResponse.json({ error: 'Missing contract or tokenId' }, { status: 400 });
    }

        // Count NewBid events for this auction
        const placed = await fetch(
          `https://${BASE_CHAIN_ID}.insight.thirdweb.com/v1/events/${contract}/NewBid(address,address,uint256,tuple)?aggregate=count()&filters[auctionId]=${tokenId}`,
          { headers: { "x-client-id": API_KEY } }
        ).then(r => r.json());

        // Response: total number of bids
        const count = placed?.aggregations?.[0]?.count || 0;
    
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error fetching bid count:', error);
    return NextResponse.json({ error: 'Failed to fetch bid count' }, { status: 500 });
  }
}
