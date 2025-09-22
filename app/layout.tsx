import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import ScrollButtons from "@/components/scroll-buttons"
import { ThirdwebProvider } from "thirdweb/react"
// import { client } from "@/lib/thirdweb"
// import { base } from "thirdweb/chains"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Satoshe Sluggers",
  description: "Browse and collect unique Satoshe Sluggers NFTs",
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThirdwebProvider>
          <ThemeProvider>
            <div className="text-[1.125rem]">
              {children}
              <ScrollButtons />
            </div>
          </ThemeProvider>
        </ThirdwebProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}
