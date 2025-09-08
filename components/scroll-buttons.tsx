"use client"

import { useState, useEffect } from "react"
import { ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ScrollButtons() {
  const [showScrollUp, setShowScrollUp] = useState(false)
  const [showScrollDown, setShowScrollDown] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const handleScroll = () => {
      // Clear any existing timeout
      clearTimeout(timeoutId)
      
      // Debounce the scroll handler to prevent rapid state changes
      timeoutId = setTimeout(() => {
        const scrollY = window.scrollY
        const windowHeight = window.innerHeight
        const documentHeight = document.documentElement.scrollHeight
        
        // Show scroll-up button when user has scrolled down a bit
        const shouldShowUp = scrollY > 300
        setShowScrollUp(shouldShowUp)
        
        // Show scroll-down button only when there's content below the current viewport
        // Add a buffer to prevent flickering
        const shouldShowDown = scrollY + windowHeight < documentHeight - 200
        setShowScrollDown(shouldShowDown)
      }, 50) // 50ms debounce
    }

    // Initial check with a slight delay to ensure DOM is ready
    const initialCheck = () => {
      setTimeout(() => {
        handleScroll()
        setIsInitialized(true)
      }, 100)
    }
    initialCheck()

    // Add scroll event listener with passive option for better performance
    window.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("resize", handleScroll, { passive: true })

    // Clean up
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", handleScroll)
    }
  }, [])

  // Custom smooth scroll function with slower, more controlled animation
  const smoothScrollTo = (targetY: number, duration: number = 2000) => {
    const startY = window.scrollY
    const distance = targetY - startY
    const startTime = performance.now()

    const easeInOutCubic = (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    }

    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeInOutCubic(progress)
      
      window.scrollTo(0, startY + distance * easedProgress)
      
      if (progress < 1) {
        requestAnimationFrame(animateScroll)
      }
    }

    requestAnimationFrame(animateScroll)
  }

  const scrollToTop = () => {
    const currentScrollY = window.scrollY
    const duration = Math.max(1000, currentScrollY * 0.5) // Proportional duration, minimum 1 second
    smoothScrollTo(0, duration)
  }

  const scrollToBottom = () => {
    const currentScrollY = window.scrollY
    const documentHeight = document.documentElement.scrollHeight
    const windowHeight = window.innerHeight
    const remainingDistance = documentHeight - currentScrollY - windowHeight
    const duration = Math.max(1000, remainingDistance * 0.5) // Proportional duration, minimum 1 second
    smoothScrollTo(documentHeight, duration)
  }

  // Don't render anything until initialized to prevent flashing
  if (!isInitialized) {
    return null
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {showScrollUp && (
        <Button
          onClick={scrollToTop}
          size="icon"
          className="rounded-full bg-[#ff0099] hover:bg-[#ff0099]/80 shadow-lg transition-all duration-300 hover:scale-105"
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-5 w-5 text-white" />
        </Button>
      )}
      {showScrollDown && (
        <Button
          onClick={scrollToBottom}
          size="icon"
          className="rounded-full bg-[#ff0099] hover:bg-[#ff0099]/80 shadow-lg transition-all duration-300 hover:scale-105"
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="h-5 w-5 text-white" />
        </Button>
      )}
    </div>
  )
}
