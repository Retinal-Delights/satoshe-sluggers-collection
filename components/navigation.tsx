"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { MobileMenu } from "@/components/mobile-menu"
import ConnectWalletButton from "@/components/connect-wallet-button"
import { useActiveAccount } from "thirdweb/react"

interface NavigationProps {
  activePage?: "home" | "about" | "nfts" | "sell" | "my-nfts" | "contact"
}

export default function Navigation({ activePage = "home" }: NavigationProps) {
  const account = useActiveAccount()

  return (
    <header className="border-b border-neutral-700 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between bg-background fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center">
        <Link href="/" className="flex items-center">
          <Image
            src="/retinal-delights-nav-brand-white.svg"
            alt="Retinal Delights"
            width={200}
            height={50}
            className="w-auto h-10 sm:h-12"
          />
        </Link>
      </div>
      <nav className="hidden lg:flex items-center gap-6 lg:gap-7 xl:gap-8 absolute left-1/2 transform -translate-x-1/2">
        <Link
          href="/"
          className={`text-base font-medium relative group ${
            activePage === "home" ? "text-[#fffbeb]" : "text-neutral-400 hover:text-[#fffbeb]"
          }`}
        >
          HOME
          <span className={`absolute bottom-0 left-0 h-0.5 bg-neutral-100 transition-all duration-300 ease-out ${
            activePage === "home" ? "w-full" : "w-0 group-hover:w-full"
          }`}></span>
        </Link>
        <Link
          href="/about"
          className={`text-base font-medium relative group ${
            activePage === "about" ? "text-[#fffbeb]" : "text-neutral-400 hover:text-[#fffbeb]"
          }`}
        >
          ABOUT
          <span className={`absolute bottom-0 left-0 h-0.5 bg-neutral-100 transition-all duration-300 ease-out ${
            activePage === "about" ? "w-full" : "w-0 group-hover:w-full"
          }`}></span>
        </Link>
        <Link
          href="/nfts"
          className={`text-base font-medium relative group ${
            activePage === "nfts" ? "text-[#fffbeb]" : "text-neutral-400 hover:text-[#fffbeb]"
          }`}
        >
          NFTS
          <span className={`absolute bottom-0 left-0 h-0.5 bg-neutral-100 transition-all duration-300 ease-out ${
            activePage === "nfts" ? "w-full" : "w-0 group-hover:w-full"
          }`}></span>
        </Link>
        <Link
          href="/sell"
          className={`text-base font-medium relative group ${
            activePage === "sell" ? "text-[#fffbeb]" : "text-neutral-400 hover:text-[#fffbeb]"
          }`}
        >
          SELL
          <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-neutral-100 transition-all duration-300 ease-out group-hover:w-full"></span>
        </Link>
        <Link
          href="/contact"
          className={`text-base font-medium relative group ${
            activePage === "contact" ? "text-[#fffbeb]" : "text-neutral-400 hover:text-[#fffbeb]"
          }`}
        >
          CONTACT
          <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-neutral-100 transition-all duration-300 ease-out group-hover:w-full"></span>
        </Link>
        {account && (
          <Link
            href="/my-nfts"
            className={`text-base font-medium relative group ${
              activePage === "my-nfts" ? "text-[#fffbeb]" : "text-neutral-400 hover:text-[#fffbeb]"
            }`}
          >
            MY NFTS
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-neutral-100 transition-all duration-300 ease-out group-hover:w-full"></span>
          </Link>
        )}
      </nav>
      <div className="flex items-center gap-3">
        <div className="hidden lg:block">
          <ConnectWalletButton />
        </div>
        <MobileMenu isWalletConnected={!!account} />
      </div>
    </header>
  )
}
