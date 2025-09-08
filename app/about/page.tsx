"use client"

import Image from "next/image"
import Footer from "@/components/footer"
import Navigation from "@/components/navigation"

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col pt-24 sm:pt-28">
      <Navigation activePage="about" />

      <div className="flex-grow container mx-auto px-4 py-12 flex items-center justify-center">
        <div className="max-w-3xl w-full bg-neutral-100 rounded-lg overflow-hidden shadow-xl p-4 sm:p-6 md:p-8 border border-neutral-300">
          <Image
            src="/about.svg"
            alt="About Satoshe Sluggers"
            width={800}
            height={1000}
            className="w-full h-auto"
            priority
          />
        </div>
      </div>

      <Footer />
    </main>
  )
}
