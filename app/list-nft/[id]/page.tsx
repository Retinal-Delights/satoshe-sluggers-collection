"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Footer from "@/components/footer"
import Navigation from "@/components/navigation"
import { MediaRenderer, useActiveAccount } from "thirdweb/react"
import React from "react"
import { client } from "@/lib/thirdweb"
import { validateNumericInput } from "@/lib/input-validation"

export default function ListNFTPage() {
  const router = useRouter()
  const { id: tokenId } = useParams<{ id: string }>()
  const [nft, setNft] = useState(null)
  const [listingType, setListingType] = useState("fixed")
  const [price, setPrice] = useState("")
  const [minBid, setMinBid] = useState("")
  const [buyoutPrice, setBuyoutPrice] = useState("")
  const [duration, setDuration] = useState("7")
  const [enableBuyout, setEnableBuyout] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [termsAccepted, setTermsAccepted] = useState(false)

  const [metadata, setMetadata] = useState<any>(null)
  const [imageUrl, setImageUrl] = useState<string>("/placeholder-nft.webp")

  const account = useActiveAccount()

  useEffect(() => {
    const loadNFT = async () => {
      setIsLoading(true)
      try {
        const [metadataData, urlData] = await Promise.all([
          fetch("/docs/combined_metadata.json").then((r) => r.json()),
          fetch("/docs/nft_urls.json").then((r) => r.json())
        ]);

        const found = metadataData.find((item: any) =>
          item.token_id?.toString() === tokenId
        );
        setMetadata(found || null);

        const urlObj = urlData.find((item: any) => item.tokenId?.toString() === tokenId);
        setImageUrl((urlObj && urlObj["Media Image URL"]) || "/placeholder-nft.webp");

        // Set nft to a simple object for compatibility
        setNft(found);
      } catch (error) {
        console.error("Error loading NFT:", error);
        setNft(null);
      } finally {
        setIsLoading(false)
      }
    }

    if (tokenId) {
      loadNFT()
    }
  }, [tokenId, account?.address])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!account?.address) {
      alert("Please connect your wallet first")
      return
    }

    if (!termsAccepted) {
      alert("Please accept the terms and conditions")
      return
    }

    setIsSubmitting(true)

    try {
      // TODO: Implement real marketplace listing functionality
      alert("Listing functionality not yet implemented. This would create a real marketplace listing.")
      setIsSubmitting(false)
      router.push("/my-nfts?tab=listed")
    } catch (error) {
      console.error("Error listing NFT:", error)
      alert(`Failed to list NFT: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col">
        <Navigation activePage="my-nfts" />
        <div className="flex-grow flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <Navigation activePage="my-nfts" />

      <div className="max-w-4xl mx-auto px-4 py-8 flex-grow">
        <Link href="/my-nfts" className="inline-flex items-center text-neutral-400 hover:text-neutral-100 mb-4 text-sm">
          <ArrowLeft className="h-3 w-3 mr-1" />
          Back to My NFTs
        </Link>

        <h1 className="text-2xl font-bold mb-6">List NFT for Sale</h1>

        <div className="grid md:grid-cols-2 gap-8">
          {/* NFT Preview */}
          <div>
            <div className="bg-neutral-800 rounded-lg overflow-hidden">
              <div className="relative w-full" style={{ aspectRatio: "0.9/1" }}>
                <MediaRenderer
                  src={imageUrl}
                  alt={`Satoshe Slugger #${tokenId}`}
                  width="100%"
                  height="100%"
                  className="object-contain p-2"
                  client={client}
                />
              </div>
              <div className="p-4">
                <h2 className="text-lg font-medium mb-2">Satoshe Slugger #{tokenId}</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-neutral-400">Owner</p>
                    <p className="font-medium">
                      {account?.address ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}` : "Unknown"}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-400">Token ID</p>
                    <p className="font-medium">{tokenId}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Listing Form */}
          <div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Listing Type</h3>
                <Tabs defaultValue="fixed" onValueChange={setListingType} className="w-full">
                  <TabsList className="grid grid-cols-3 mb-4">
                    <TabsTrigger value="fixed">Fixed Price</TabsTrigger>
                    <TabsTrigger value="auction">Timed Auction</TabsTrigger>
                    <TabsTrigger value="both">Auction + Buy Now</TabsTrigger>
                  </TabsList>

                  <TabsContent value="fixed" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fixed-price">Price (ETH)</Label>
                      <div className="relative">
                        <Input
                          id="fixed-price"
                          type="number"
                          placeholder="0.00"
                          value={price}
                          onChange={(e) => {
                            const validation = validateNumericInput(e.target.value, tokenId);
                            if (validation.isValid) {
                              setPrice(validation.formattedValue);
                            }
                          }}
                          step="0.00001"
                          min="0.00001"
                          required={listingType === "fixed"}
                          className="pr-12"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                          ETH
                        </div>
                      </div>
                      <p className="text-xs text-neutral-400">Set the price at which you want to sell your NFT.</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="auction" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="min-bid">Minimum Bid (ETH)</Label>
                      <div className="relative">
                        <Input
                          id="min-bid"
                          type="number"
                          placeholder="0.00"
                          value={minBid}
                          onChange={(e) => {
                            const validation = validateNumericInput(e.target.value, tokenId);
                            if (validation.isValid) {
                              setMinBid(validation.formattedValue);
                            }
                          }}
                          step="0.00001"
                          min="0.00001"
                          required={listingType === "auction"}
                          className="pr-12"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                          ETH
                        </div>
                      </div>
                      <p className="text-xs text-neutral-400">Set the minimum bid for your auction.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration</Label>
                      <Select value={duration} onValueChange={setDuration}>
                        <SelectTrigger id="duration">
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 day</SelectItem>
                          <SelectItem value="3">3 days</SelectItem>
                          <SelectItem value="7">7 days</SelectItem>
                          <SelectItem value="14">14 days</SelectItem>
                          <SelectItem value="30">30 days</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-neutral-400">Set how long your auction will run for.</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="both" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="auction-min-bid">Minimum Bid (ETH)</Label>
                      <div className="relative">
                        <Input
                          id="auction-min-bid"
                          type="number"
                          placeholder="0.00"
                          value={minBid}
                          onChange={(e) => {
                            const validation = validateNumericInput(e.target.value, tokenId);
                            if (validation.isValid) {
                              setMinBid(validation.formattedValue);
                            }
                          }}
                          step="0.00001"
                          min="0.00001"
                          required={listingType === "both"}
                          className="pr-12"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                          ETH
                        </div>
                      </div>
                      <p className="text-xs text-neutral-400">Set the minimum bid for your auction.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="buyout-price">Buy Now Price (ETH)</Label>
                      <div className="relative">
                        <Input
                          id="buyout-price"
                          type="number"
                          placeholder="0.00"
                          value={buyoutPrice}
                          onChange={(e) => {
                            const validation = validateNumericInput(e.target.value, tokenId);
                            if (validation.isValid) {
                              setBuyoutPrice(validation.formattedValue);
                            }
                          }}
                          step="0.00001"
                          min="0.00001"
                          required={listingType === "both"}
                          className="pr-12"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                          ETH
                        </div>
                      </div>
                      <p className="text-xs text-neutral-400">Set the price for instant purchase (buyout).</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="both-duration">Duration</Label>
                      <Select value={duration} onValueChange={setDuration}>
                        <SelectTrigger id="both-duration">
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 day</SelectItem>
                          <SelectItem value="3">3 days</SelectItem>
                          <SelectItem value="7">7 days</SelectItem>
                          <SelectItem value="14">14 days</SelectItem>
                          <SelectItem value="30">30 days</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-neutral-400">Set how long your auction will run for.</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Fees</h3>
                <div className="bg-neutral-800 p-4 rounded-md space-y-2">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Platform Fee</span>
                    <span>2.5%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Creator Royalty</span>
                    <span>5%</span>
                  </div>
                  <div className="border-t border-neutral-700 my-2 pt-2 flex justify-between font-medium">
                    <span>You Receive</span>
                    <span className="text-blue-400">
                      {listingType === "fixed" && price
                        ? (Number(price) * 0.925).toFixed(5) + " ETH"
                        : listingType === "auction" && minBid
                          ? (Number(minBid) * 0.925).toFixed(5) + " ETH (minimum)"
                          : listingType === "both" && minBid
                            ? (Number(minBid) * 0.925).toFixed(5) + " ETH (minimum)"
                            : "0.00 ETH"}
                    </span>
                  </div>
                  {listingType === "both" && buyoutPrice && (
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Buyout Amount</span>
                      <span className="text-green-400">{(Number(buyoutPrice) * 0.925).toFixed(5)} ETH</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  className="mt-1 h-5 w-5"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  required
                />
                <Label htmlFor="terms" className="text-sm cursor-pointer leading-relaxed pl-2">
                  I agree to the{" "}
                  <a
                    href="https://app.termly.io/policy-viewer/policy.html?policyUUID=ea0f70ba-b648-4ebc-b19e-1951104cefa6"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="https://app.termly.io/policy-viewer/policy.html?policyUUID=3267dd16-a550-4879-8bf0-d03877fe1938"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    NFT Listing Policy
                  </a>
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                disabled={isSubmitting || !account?.address}
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </>
                ) : !account?.address ? (
                  "Connect Wallet to List"
                ) : listingType === "fixed" ? (
                  "List for Sale"
                ) : listingType === "auction" ? (
                  "Create Auction"
                ) : (
                  "Create Auction with Buy Now"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
