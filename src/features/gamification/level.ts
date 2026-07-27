export interface LevelDefinition {
  level: number;
  name: string;
  minTotalXp: number;
}

/** Find the highest level whose min_total_xp <= totalXp. */
export function levelForXp(totalXp: number, levels: LevelDefinition[]): number {
  if (levels.length === 0) return 1;
  const sorted = [...levels].sort((a, b) => a.minTotalXp - b.minTotalXp);
  let current = sorted[0]!.level;
  for (const def of sorted) {
    if (totalXp >= def.minTotalXp) current = def.level;
    else break;
  }
  return current;
}
