import Link from "next/link"
import Image from "next/image"
import { Heart } from "lucide-react"
import { Separator } from "@/components/ui/separator"

const legalLinks = [
  {
    label: "TERMS OF SERVICE",
    href: "https://app.termly.io/policy-viewer/policy.html?policyUUID=ea0f70ba-b648-4ebc-b19e-1951104cefa6",
  },
  {
    label: "PRIVACY POLICY",
    href: "https://app.termly.io/policy-viewer/policy.html?policyUUID=3267dd16-a550-4879-8bf0-d03877fe1938",
  },
  {
    label: "COOKIES POLICY",
    href: "https://app.termly.io/policy-viewer/policy.html?policyUUID=367cac94-e5d6-495a-a856-f39363a6d17e",
  },
  { label: "NFT LICENSE AGREEMENT", href: "https://www.retinaldelights.io/nft-license-agreement" },
  { label: "DISCLAIMER", href: "https://www.retinaldelights.io/disclaimer" },
  {
    label: "ACCEPTABLE USE POLICY",
    href: "https://app.termly.io/policy-viewer/policy.html?policyUUID=eebdec60-dcf1-4cdc-8e47-7977dbda5260",
  },
]

export default function Footer() {

  return (
    <footer className="border-t border-neutral-700 bg-background">
      <div className="container mx-auto py-6 px-4 text-center">
        <div className="flex flex-col items-center justify-center gap-6">
          <div className="flex items-center justify-center py-2">
            <Image
              src="/retinal_delights-horizontal-brand-offwhite.svg"
              alt="Retinal Delights"
              width={240}
              height={60}
              className="h-14 sm:h-16 md:h-18 w-auto max-h-18"
            />
          </div>

          <div className="flex flex-wrap justify-center gap-3 text-[10px] text-neutral-400 max-w-3xl">
            <div className="flex flex-wrap justify-center gap-3 mb-1">
              {legalLinks.slice(0, 3).map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#ff0099] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {legalLinks.slice(3).map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#ff0099] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

        </div>

        <Separator className="my-4 max-w-3xl mx-auto opacity-20 border-brand-pink" />

        <div className="flex flex-col items-center text-xs text-neutral-400">
          <div className="mb-1">
            Created with <Heart className="inline-block h-3 w-3 mx-1 text-brand-pink fill-brand-pink" /> in Los Angeles by{" "}
            <a
              href="https://kristenwoerdeman.com"
              className="font-medium text-brand-pink hover:text-[#ff0099] transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Kristen
            </a>
          </div>

          <div className="font-medium">
            2025 ©{" "}
            <a
              href="https://retinaldelights.io"
              className="text-brand-pink hover:text-[#ff0099] transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Retinal Delights, Inc.
            </a>{" "}
            All Rights Reserved.
          </div>
        </div>
      </div>

    </footer>
  )
}
