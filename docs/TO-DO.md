---

# 🚀 NFT English Auction Gallery – To-Do List

**Assumption:**

You have all dependencies and installs complete (`pnpm`, shadcn/ui, thirdweb SDK, all contracts deployed to Base).

---

## 1. Environment Prep ✔️

- Verify contracts (NFT collection & auction marketplace) deployed and addresses copied.
- Confirm `.env.local` has:
    - NFT collection contract address
    - Marketplace address
    - Client ID (from thirdweb dashboard)
    - Chain ID: 8453
    - RPC URL: [https://8453.rpc.thirdweb.com](https://8453.rpc.thirdweb.com/)

---

## 2. Base UI Skeleton

**What you need:**

- `/components/Layout/Navbar.tsx` (nav + ConnectButton, using shadcn nav)
- `/components/Layout/Sidebar.tsx` (filters/search, shadcn sidebar/checkboxes/toggles)
- Main grid shell in `/pages/index.tsx` (just a placeholder div called NFTGrid for now)

**Next:**

- Wire up header/navigation, position ConnectButton on right.
- Add placeholder side panel for future filters.
- Add a grid area for NFT cards.

---

## 3. Data Layer/Provider

**What you need:**

- `/providers/AuctionNFTProvider.tsx` (context/provider for loading all auction + NFT meta in batch)

**How to approach:**

- Use the thirdweb Insight API (or batch SDK methods if preferred) to fetch:
    - All live English Auctions for your NFT collection contract (use Insight `/v1/events`).
    - All NFT metadata for those tokenIds (Insight `/nfts` endpoint).
- On load, merge auction data and NFT metadata by tokenId.
- Save this in a React Context/provider so any child (grid/sidebar) can filter/sort/paginate.

---

## 4. NFT Card & Grid

**What you need:**

- `/components/Grid/NFTCard.tsx` (one card per NFT+auction)
- `/components/Grid/NFTGrid.tsx` (renders paginated batch of NFTCard)
- shadcn Card, Badge, Button, Accordion, Timer, etc.

**How to build:**

- Start with hardcoded/mock data; render a card with image, name, tokenId, auction price, time left, Bid/Buy buttons.
- Once visual is good, replace with actual prop-driven data from provider.
- Add loading skeletons for initial grid load.

---

## 5. Sidebar Search/Filter/Sort

**What you need:**

- shadcn Checkbox, Toggle, Select, Input (for price, rarity, attribute filters)
- Filtering/sorting logic that always works over the **full in-memory dataset** from provider

**Approach:**

- Add simple search (by name/tokenId) and price-low-to-high sort first, then extend to attributes as needed.
- Connect controls to alter the filtered/sorted slice served to NFTGrid.

---

## 6. Pagination

**What you need:**

- shadcn Pagination component and Select/dropdown for "NFTs per page" (25, 50, 100, 250)
- Logic to slice the global filtered list for current page only

**Approach:**

- Store perPage and currentPage in local state or context.
- Update visible NFTs in grid according to those settings.

---

## 7. Live Data/Updates

**What you need:**

- Simple polling function in provider to refetch auction state every 10–30s
- Optional: setup Insight webhook backend and frontend socket for push notifications (skip for MVP if too complex)

**Approach:**

- On interval, re-fetch auction events and update merged dataset; update timer/prices as new data arrives.

---

## 8. Auction Actions (Bid/Buyout)

**What you need:**

- Integrate Bid/Buyout buttons into NFTCard
- Use thirdweb v5 SDK extensions for calling bid/buyout: [`bidOnAuction`, `buyoutAuction` from marketplace/auction extension](https://portal.thirdweb.com/typescript/extensions/marketplace-v3)
- Handle wallet connect/state via ConnectButton

**Approach:**

- When user clicks bid/buyout, call the relevant function with tokenId/auctionId info.
- Show shadcn alert/snackbar for errors or success.

---

## 9. Polishing & QA

- Walk through: load, paginate, filter, bid, buyout as a user.
- Test with different wallets if possible.
- Style grid/cards/sidebar to taste.
- Comment/document any hairy code (especially filtering logic, auction state update, and bad listing ID exclusion).
- Re-read README and onboarding instructions to make sure nothing critical left out.

---

## 10. Deploy

- Deploy to Vercel or hosting of choice.
- Test in prod, verify .env settings and wallet connection.

---

# 💡 Summary Roadmap

1. UI skeleton (nav, sidebar, grid)
2. Auction/NFT provider: load and merge all relevant data **in batch**
3. Build NFTCard/grid with real props and mock data; add loading/skeletons
4. Filters and sidebar UI for in-memory search/sort
5. Pagination logic
6. Bid/Buyout actions via SDK
7. Polling for live state
8. Polish/deploy