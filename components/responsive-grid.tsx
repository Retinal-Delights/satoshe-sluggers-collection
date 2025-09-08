"use client"

import { ReactNode } from "react"

interface ResponsiveGridProps {
  children: ReactNode
  className?: string
  itemType?: "nft-card" | "attribute" | "generic"
  gap?: "sm" | "md" | "lg"
}

const gridClasses = {
  "nft-card": "grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 4xl:grid-cols-8",
  "attribute": "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3",
  "generic": "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
}

const gapClasses = {
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4"
}

export default function ResponsiveGrid({
  children,
  className = "",
  itemType = "generic",
  gap = "md"
}: ResponsiveGridProps) {
  return (
    <div className={`
      ${gridClasses[itemType]}
      ${gapClasses[gap]}
      justify-items-center
      ${className}
    `}>
      {children}
    </div>
  )
}
