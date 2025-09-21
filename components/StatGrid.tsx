interface StatGridProps {
  rank: string | number;
  rarity: string;
  rarityPercent: string | number;
  tier: string;
  numBids: number | null;
}

export function StatGrid({ rank, rarity, rarityPercent, tier, numBids }: StatGridProps) {
  return (
    <div className="mt-3 flex flex-row justify-between text-xs text-neutral-400 gap-2 px-0.5">
      <span>Rank: <span className="text-neutral-100">{rank}</span></span>
      <span>Rarity: <span className="text-neutral-100">{rarityPercent}%</span></span>
      <span>Tier: <span className="text-neutral-100">{tier}</span></span>
      <span>Bids: <span className="text-neutral-100">{typeof numBids === "number" ? numBids : "—"}</span></span>
    </div>
  );
}
