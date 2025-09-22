"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";

export default function PixelsTransition() {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Set client-side flag to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const grid = gridRef.current!;
    const mq = window.matchMedia("(max-width:768px)");
    const COLS = mq.matches ? 8 : 12;
    const ROWS = mq.matches ? 10 : 8;
    const TOTAL = COLS * ROWS;

    if (!grid.firstChild) {
      const frag = document.createDocumentFragment();
      for (let i = 0; i < TOTAL; i++) {
        const cell = document.createElement("div");
        cell.className = "load-grid__item";
        frag.appendChild(cell);
      }
      grid.appendChild(frag);
    }
    const cells = grid.querySelectorAll(".load-grid__item");

    // Entrance animation on page load - solid squares
    if (!prefersReduced) {
      // Hide page content initially
      const mainContent = document.querySelector('main');
      if (mainContent) {
        mainContent.classList.add('page-content-hidden');
      }
      
      gsap.to(cells, {
        opacity: 0,
        duration: 0.001,
        stagger: { 
          amount: 1.2, 
          from: "random",
          grid: [COLS, ROWS],
        },
        onComplete: () => { 
          grid.style.display = "none";
          // Show page content after animation
          if (mainContent) {
            mainContent.classList.remove('page-content-hidden');
            mainContent.classList.add('page-content-visible');
          }
        },
      });
    } else {
      grid.style.display = "none";
    }
  }, [pathname, isClient]);

  useEffect(() => {
    if (!isClient) return;
    
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const grid = gridRef.current!;
    const cells = grid?.querySelectorAll(".load-grid__item");
    const mq = window.matchMedia("(max-width:768px)");
    const COLS = mq.matches ? 8 : 12;
    const ROWS = mq.matches ? 10 : 8;

    if (!grid || !cells?.length || prefersReduced) return;

    // Exit animation for internal link clicks
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a") as HTMLAnchorElement | null;
      if (!a || isTransitioning) return;
      
      const href = a.getAttribute("href") || "";
      const isHash = href.startsWith("#");
      const newTab = a.target === "_blank";
      const download = a.hasAttribute("download");
      
      if (isHash || newTab || download) return;

      e.preventDefault();
      setIsTransitioning(true);

      // Show grid and animate out - solid squares
      gsap.set(grid, { display: "grid" });
      gsap.fromTo(cells, { opacity: 0 }, {
        opacity: 1,
        duration: 0.001,
        stagger: { 
          amount: 1.2, 
          from: "random",
          grid: [COLS, ROWS],
        },
        onComplete: () => {
          // Navigate after animation completes
          window.location.href = href;
        }
      });
    };
    
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [isTransitioning, isClient]);

  return (
    <>
      <style jsx global>{`
        .load-grid{
          position:fixed; 
          inset:0; 
          display:grid; 
          gap:0; 
          z-index:9999; 
          pointer-events:none;
          grid-template-columns:repeat(12,1fr);
          grid-template-rows:repeat(8,1fr);
        }
        @media (max-width:768px){
          .load-grid{ 
            grid-template-columns:repeat(8,1fr); 
            grid-template-rows:repeat(10,1fr); 
          }
        }
        .load-grid__item{ 
          background:#ff0099; 
          opacity:1;
        }
        .page-content-hidden {
          opacity: 0;
          visibility: hidden;
        }
        .page-content-visible {
          opacity: 1;
          visibility: visible;
          transition: opacity 0.3s ease-in-out;
        }
      `}</style>
      <div ref={gridRef} className="load-grid" aria-hidden="true" />
    </>
  );
}
