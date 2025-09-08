import { getContract } from "thirdweb";
import { base } from "thirdweb/chains";
import { client } from "./thirdweb";

// NFT Collection contract
export const nftCollection = getContract({
  address: process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS || "0xE3f1694adCe46ffcF82D15dd88859147c72f7C5a",
  chain: base,
  client,
});

// Marketplace contract - using Thirdweb v5 marketplace extension
// No need for custom ABI, the extension handles it
export const marketplace = getContract({
  address: process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || "0xF0f26455b9869d4A788191f6AEdc78410731072C",
  chain: base,
  client,
});
