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

  // Single animation function optimized for functional loading buffer
  const animateGrid = (cells: NodeListOf<Element>, COLS: number, ROWS: number, isExit: boolean = false, href?: string) => {
    const grid = gridRef.current!;
    
    if (isExit) {
      // Exit: Show grid, animate squares in with proper timing for loading buffer
      gsap.set(grid, { display: "grid" });
      gsap.fromTo(cells, { opacity: 0 }, {
        opacity: 1,
        duration: 0.3, // Slower for better visual flow
        stagger: { 
          amount: 0.8, // Reduced stagger for faster completion
          from: "random",
          grid: [COLS, ROWS],
        },
        onComplete: () => {
          // Navigate after squares fill the screen
          if (href) {
            window.location.href = href;
          }
        }
      });
    } else {
      // Entrance: Animate squares out with proper timing to reveal page
      gsap.to(cells, {
        opacity: 0,
        duration: 0.3, // Slower for better visual flow
        stagger: { 
          amount: 0.8, // Reduced stagger for faster completion
          from: "random",
          grid: [COLS, ROWS],
        },
        onComplete: () => { 
          grid.style.display = "none";
        },
      });
    }
  };

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

    // Entrance animation on page load - optimized for functional loading buffer
    if (!prefersReduced) {
      // Start with grid visible and squares visible
      gsap.set(grid, { display: "grid" });
      gsap.set(cells, { opacity: 1 });
      
      // Animate squares out to reveal page with proper timing
      gsap.to(cells, {
        opacity: 0,
        duration: 0.3, // Slower for better visual flow
        stagger: { 
          amount: 0.8, // Reduced stagger for faster completion
          from: "random",
          grid: [COLS, ROWS],
        },
        onComplete: () => { 
          grid.style.display = "none";
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

    // Handle navigation clicks
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a") as HTMLAnchorElement | null;
      if (!a || isTransitioning) return;
      
      const href = a.getAttribute("href") || "";
      const isHash = href.startsWith("#");
      const newTab = a.target === "_blank";
      const download = a.hasAttribute("download");
      
      if (isHash || newTab || download) return;

      e.preventDefault();
      e.stopPropagation();
      setIsTransitioning(true);

      // Hide current page content
      const main = document.querySelector('main');
      if (main) {
        main.style.opacity = '0';
        main.style.transition = 'opacity 0.1s ease-out';
      }

      // Animate exit
      animateGrid(cells, COLS, ROWS, true, href);
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
      `}</style>
      <div ref={gridRef} className="load-grid" aria-hidden="true" />
    </>
  );
}
