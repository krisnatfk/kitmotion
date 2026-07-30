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

/** XP may keep growing, but milestone levels cap visible progress until passed. */
export function levelWithMilestoneGate(earnedLevel: number, maxUnlockedLevel: number): number {
  return Math.max(1, Math.min(earnedLevel, Math.max(10, maxUnlockedLevel)));
}

export function pendingMilestoneLevel(earnedLevel: number, maxUnlockedLevel: number): number | null {
  const gate = Math.max(10, Math.floor(maxUnlockedLevel / 10) * 10);
  return earnedLevel > gate ? gate : null;
}
