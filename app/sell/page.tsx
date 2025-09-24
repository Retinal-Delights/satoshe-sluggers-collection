"use client"

import { useState } from "react"
import Footer from "@/components/footer"
import Navigation from "@/components/navigation"
import { Construction, ExternalLink } from "lucide-react"
import Image from "next/image"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export default function SellPage() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!consentChecked) {
      alert("Please accept the Privacy Policy and Terms to continue.")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name: "Newsletter Signup",
          email: email,
          subject: "Sell Platform Updates Signup",
          message: "User signed up for sell platform updates via the sell page."
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign up')
      }

      // Reset form and show success message
      setEmail("")
      setConsentChecked(false)
      setSubmitted(true)

    } catch (error) {
      console.error('Error signing up:', error)
      alert(error instanceof Error ? error.message : 'Failed to sign up. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col pt-24 sm:pt-28 overflow-x-hidden">
      <Navigation activePage="sell" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex-grow">
        <div className="text-center mb-8">
          <div className="relative mb-8">
            <Image
              src="/10.webp"
              alt="Satoshe Sluggers NFT"
              width={600}
              height={100}
              className="rounded shadow-lg transform rotate-[-30deg] absolute left-0 -translate-x-1/3 -translate-y-12 z-10"
            />
          </div>
          <div className="flex justify-center mb-4">
            <Construction className="w-16 h-16 text-brand-pink" />
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold mb-4" style={{ color: "#fffbeb" }}>COMING SOON</h1>
          <p className="text-neutral-400 text-lg mb-6" style={{ color: "#fffbeb" }}>
            Ground crew is prepping the diamond for your listings.
          </p>
        </div>

        <div className="bg-card rounded p-8 mb-6 border border-neutral-700">
          <div className="text-center">
            <h2 className="text-xl font-medium mb-4 text-brand-pink">Alternative Selling Options</h2>
            <p className="text-neutral-300 mb-6" style={{ color: "#fffbeb" }}>
              Sell your Satoshe Sluggers NFTs on these established marketplaces:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <a
                href="https://rarible.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 p-4 bg-neutral-800 hover:bg-neutral-700 rounded border border-neutral-600 transition-colors"
              >
                <ExternalLink className="w-5 h-5 text-brand-pink" />
                <span className="font-medium" style={{ color: "#fffbeb" }}>Rarible</span>
              </a>
              
              <a
                href="https://opensea.io"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 p-4 bg-neutral-800 hover:bg-neutral-700 rounded border border-neutral-600 transition-colors"
              >
                <ExternalLink className="w-5 h-5 text-brand-pink" />
                <span className="font-medium" style={{ color: "#fffbeb" }}>OpenSea</span>
              </a>
            </div>
          </div>
        </div>

        <div className="bg-neutral-800/50 rounded p-6 border border-neutral-700 mb-8">
          <h3 className="text-lg font-medium mb-3 text-center" style={{ color: "#fffbeb" }}>What's Coming</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4">
              <div className="text-2xl text-brand-pink font-semibold mb-2">1</div>
              <h4 className="font-medium mb-1" style={{ color: "#fffbeb" }}>Easy Listing</h4>
              <p className="text-neutral-400 text-sm" style={{ color: "#fffbeb" }}>Simple interface to list your NFTs</p>
            </div>
            <div className="p-4">
              <div className="text-2xl text-brand-pink font-semibold mb-2">2</div>
              <h4 className="font-medium mb-1" style={{ color: "#fffbeb" }}>Auction Support</h4>
              <p className="text-neutral-400 text-sm" style={{ color: "#fffbeb" }}>Set up timed auctions for your NFTs</p>
            </div>
            <div className="p-4">
              <div className="text-2xl text-brand-pink font-semibold mb-2">3</div>
              <h4 className="font-medium mb-1" style={{ color: "#fffbeb" }}>Instant Sales</h4>
              <p className="text-neutral-400 text-sm" style={{ color: "#fffbeb" }}>Fixed price listings for quick sales</p>
            </div>
          </div>
        </div>

        {/* Newsletter Signup Form */}
        <div className="bg-card rounded p-8 border border-neutral-700 mb-8">
          <div className="text-center">
            <h3 className="text-xl font-medium mb-2 text-brand-pink">Stay Updated</h3>
            <p className="text-neutral-300 mb-6" style={{ color: "#fffbeb" }}>
              Get notified when our selling platform launches.
            </p>
            
            {submitted ? (
              <div className="text-center py-8" role="status" aria-live="polite">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold mb-2" style={{ color: "#fffbeb" }}>
                  You're Signed Up!
                </h2>
                <p className="text-neutral-300 mb-6" style={{ color: "#fffbeb" }}>Thanks for signing up! We'll notify you when our selling platform launches.</p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-6 py-3 bg-brand-pink hover:bg-brand-pink/90 text-white font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-brand-pink focus:ring-offset-2 focus:ring-offset-neutral-900"
                >
                  Sign Up Another Email
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="max-w-md mx-auto">
                <div className="flex gap-3 mb-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="flex-1 px-4 py-3 rounded border border-neutral-600 bg-neutral-800 text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-transparent transition-colors"
                    style={{ color: "#fffbeb" }}
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-brand-pink hover:bg-brand-pink/90 text-white font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-brand-pink focus:ring-offset-2 focus:ring-offset-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
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
                        Signing Up...
                      </>
                    ) : (
                      "Sign Up"
                    )}
                  </button>
                </div>

                {/* Terms and Privacy Checkbox */}
                <div className="flex items-start space-x-3 mb-4">
                  <Checkbox
                    id="terms-sell"
                    checked={consentChecked}
                    onCheckedChange={(checked) => setConsentChecked(checked === true)}
                    className="mt-1 h-5 w-5"
                    style={{
                      backgroundColor: consentChecked ? "#FF0099" : "transparent",
                      borderColor: "#FF0099"
                    }}
                    aria-describedby="terms-sell-desc"
                    required
                    aria-required="true"
                  />
                  <Label htmlFor="terms-sell" className="cursor-pointer text-sm !font-normal" id="terms-sell-desc" style={{ color: "#fffbeb" }}>
                    I accept the{" "}
                    <a
                      href="https://retinaldelights.io/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:opacity-80 focus:outline-2"
                      style={{ color: "#FF0099" }}
                      aria-label="Privacy Policy (opens in a new window)"
                    >
                      Privacy Policy
                    </a>{" "}
                    and{" "}
                    <a
                      href="https://retinaldelights.io/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:opacity-80 focus:outline-2"
                      style={{ color: "#FF0099" }}
                      aria-label="Terms of Service (opens in a new window)"
                    >
                      Terms
                    </a>
                    .{" "}
                    <span style={{ color: "#FF0099" }} aria-hidden="true">
                      *
                    </span>
                    <span className="sr-only">(required)</span>
                  </Label>
                </div>

                <p className="text-xs text-neutral-500 mt-3 text-left" style={{ color: "#fffbeb" }}>
                  We'll only send you updates about the marketplace. No spam, ever.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}