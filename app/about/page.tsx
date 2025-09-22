"use client"

import Image from "next/image"
import Footer from "@/components/footer"
import Navigation from "@/components/navigation"

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col pt-24 sm:pt-28">
      <Navigation activePage="about" />

      <div className="flex-grow container mx-auto px-4 py-12 pb-16 flex items-center justify-center">
        <div className="max-w-3xl w-full rounded-lg overflow-hidden shadow-xl p-4 sm:p-6 md:p-8 border border-neutral-700" style={{ backgroundColor: "#fafafa" }}>
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
