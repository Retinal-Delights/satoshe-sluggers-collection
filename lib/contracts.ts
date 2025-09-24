import { getContract } from "thirdweb";
import { base } from "thirdweb/chains";
import { client } from "./thirdweb";

// NFT Collection contract
export const nftCollection = getContract({
  address: process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS || "0xYourNFTCollectionAddress",
  chain: base,
  client,
});

// Marketplace contract - using Thirdweb v5 marketplace extension
// No need for custom ABI, the extension handles it
export const marketplace = getContract({
  address: process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || "0xYourMarketplaceAddress",
  chain: base,
  client,
});
