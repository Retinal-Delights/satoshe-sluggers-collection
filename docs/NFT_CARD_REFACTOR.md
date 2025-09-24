# NFT Card Refactor - Containerized Pattern

## Overview
Refactored the NFTCard component to use a containerized, modular pattern that separates static data from live data and provides composable bid/buy controls.

## Key Changes

### 1. Created `useBidCount.ts` Hook
- **Purpose**: Fetches live bid count using thirdweb Insight API
- **Chain**: Base (8453) only
- **Features**: 
  - Real-time bid counting via event aggregation
  - Automatic polling every 15 seconds
  - Error handling and loading states
  - Calculates net bids (placed - cancelled)

### 2. Created `useCurrentBid.ts` Hook
- **Purpose**: Fetches live current highest bid using thirdweb Insight API
- **Chain**: Base (8453) only
- **Features**:
  - Real-time highest bid detection via event aggregation
  - Automatic polling every 15 seconds
  - Error handling and loading states
  - Converts wei to ETH with proper formatting
  - Immune to local state issues

### 3. Created `BidControl.tsx` Component
- **Purpose**: Modular bid input and button component
- **Features**:
  - Auto-populates with minimum next bid (5% over current)
  - Real-time validation
  - Brand-aligned styling (#FF0099 primary pink)
  - Composable and reusable

### 4. Refactored `NFTCard.tsx` (as `NFTCardNew.tsx`)
- **Purpose**: Containerized NFT card with clear separation of concerns
- **Pattern**: Static + Live + Controls
- **Features**:
  - Static props from metadata JSON
  - Live props from wallet/auction state
  - Modular BidControl integration
  - Real-time bid counting via useBidCount
  - Live current bid via useCurrentBid
  - Brand-aligned styling (#FF0099 primary pink)
  - Base chain optimized (8453)
  - Immune to local state issues

## Architecture Benefits

### ✅ Containerized Design
- Clear separation between static metadata and live auction data
- Modular components that can be composed differently
- Easy to test and maintain

### ✅ Real-time Data
- Live bid counts via Insight API (no RPC charges)
- Automatic polling for updates
- Source-of-truth accuracy

### ✅ Brand Consistency
- Primary pink (#FF0099) for all interactive elements
- Hover states (#E6008A)
- Consistent with style guide

### ✅ Base Chain Optimized
- All event filters use chain ID 8453
- Insight API calls optimized for Base
- No cross-chain confusion

## Usage Example

```tsx
import NFTCard from "@/components/NFTCardNew";

<NFTCard
  // Static props from combined_metadata.json
  image="/images/1.webp"
  name="Satoshe Slugger #1"
  rank={1}
  rarity="Legendary"
  rarityPercent={0.01}
  startingPrice="0.1"
  buyNow="1.0"
  tokenId="1"
  contractAddress="0xYourMarketplaceAddress"
  
  // Live props from wallet/auction state
  isFavorited={false}
  isForSale={true}
  currentBid="0.15"
  
  // Handlers
  onBid={(bidAmount) => console.log("Bid:", bidAmount)}
  onBuyNow={() => console.log("Buy now")}
  onFavorite={() => console.log("Toggle favorite")}
/>
```

## Migration Path

1. **Replace existing NFTCard**: Rename `NFTCardNew.tsx` to `NFTCard.tsx`
2. **Update imports**: Change import paths in parent components
3. **Update props**: Map existing props to new interface
4. **Test integration**: Verify all functionality works correctly

## Files Created/Modified

- ✅ `hooks/useBidCount.ts` - New Insight API hook
- ✅ `components/BidControl.tsx` - New modular component
- ✅ `components/NFTCardNew.tsx` - New containerized card
- ✅ `components/NFTCardExample.tsx` - Usage example
- ✅ `docs/NFT_CARD_REFACTOR.md` - This documentation

## Next Steps

1. Test the new components in your development environment
2. Update parent components to use the new interface
3. Replace the old NFTCard with the new containerized version
4. Verify all functionality works as expected
