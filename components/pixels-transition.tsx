"use client";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export default function PixelsTransition() {
  const gridRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
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

    // Entrance animation on page load
    if (!prefersReduced) {
      gsap.to(cells, {
        opacity: 0,
        duration: 0.001,
        stagger: { amount: 0.5, from: "random" },
        onComplete: () => (grid.style.display = "none"),
      });
    } else {
      grid.style.display = "none";
    }

    // Exit animation for internal link clicks
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a") as HTMLAnchorElement | null;
      if (!a) return;
      
      const href = a.getAttribute("href") || "";
      const sameHost = a.hostname === window.location.hostname;
      const isHash = href.startsWith("#");
      const newTab = a.target === "_blank";
      const download = a.hasAttribute("download");
      
      if (!sameHost || isHash || newTab || download) return;

      e.preventDefault();

      if (prefersReduced) {
        window.location.href = href;
        return;
      }

      // Show grid and animate out
      gsap.set(grid, { display: "grid" });
      gsap.fromTo(cells, { opacity: 0 }, {
        opacity: 1,
        duration: 0.001,
        stagger: { amount: 0.5, from: "random" },
        onComplete: () => (window.location.href = href)
      });
    };
    
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

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
