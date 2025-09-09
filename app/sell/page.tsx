"use client"

import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import Footer from "@/components/footer"
import Navigation from "@/components/navigation"
import ConnectWalletButton from "@/components/connect-wallet-button"
import { useActiveAccount } from "thirdweb/react"

export default function SellPage() {
  const router = useRouter()
  const account = useActiveAccount()

  const navigateToMyNFTs = () => {
    router.push("/my-nfts")
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col pt-24 sm:pt-28">
      <Navigation activePage="sell" />

      <div className="max-w-4xl mx-auto px-3 py-8 flex-grow">
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">SELL YOUR NFTs</h1>
          <p className="text-neutral-400 text-sm">List your Satoshe Sluggers NFTs for sale on our marketplace</p>
        </div>

        <div className="bg-card rounded-lg p-6 mb-8 border border-neutral-700">
          <div className="text-center mb-6">
            <h2 className="text-lg font-medium mb-2">Connect Your Wallet</h2>
            <p className="text-neutral-400 text-sm mb-4">
              {account
                ? "Your wallet is connected. You can now list your NFTs for sale."
                : "Connect your wallet to get started with selling your NFTs"}
            </p>

            {account ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 bg-neutral-700 px-4 py-2 rounded-md">
                  <Image src="/profile-icon-yellow.png" alt="Profile" width={24} height={24} className="rounded-full" />
                  <span className="text-sm font-medium">
                    {`${account.address.slice(0, 6)}...${account.address.slice(-4)}`}
                  </span>
                </div>
                <Button
                  onClick={navigateToMyNFTs}
                  className="relative z-10 text-base px-6 py-3 font-medium text-brand-pink border-brand-pink border-2 hover:text-white hover:border-brand-pink hover:bg-brand-pink transition-all duration-300 shadow-[0_0_15px_rgba(255,0,153,0.5)] hover:shadow-[0_0_25px_rgba(255,0,153,0.7)] bg-neutral-900/80 rounded"
                >
                  View My NFTs
                </Button>
              </div>
            ) : (
              <ConnectWalletButton />
            )}
          </div>

          <div className="border-t border-neutral-700 pt-6 mt-6">
            <h3 className="text-base font-medium mb-4">How It Works</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-neutral-800 p-4 rounded-lg border border-neutral-700">
                <div className="text-xl text-brand-pink font-bold mb-2">1</div>
                <h4 className="text-base font-medium mb-1">Connect</h4>
                <p className="text-neutral-400 text-xs">Connect your wallet to our platform</p>
              </div>

              <div className="bg-neutral-800 p-4 rounded-lg border border-neutral-700">
                <div className="text-xl text-brand-pink font-bold mb-2">2</div>
                <h4 className="text-base font-medium mb-1">List</h4>
                <p className="text-neutral-400 text-xs">Set your price and list your NFTs</p>
              </div>

              <div className="bg-neutral-800 p-4 rounded-lg border border-neutral-700">
                <div className="text-xl text-brand-pink font-bold mb-2">3</div>
                <h4 className="text-base font-medium mb-1">Sell</h4>
                <p className="text-neutral-400 text-xs">Get paid when your NFTs sell</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
