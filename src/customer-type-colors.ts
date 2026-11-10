/** Stable colors shared by table tags and form selections, independent of row order. */
export function customerTypeColors(label: string) {
  const key = label.trim().toLowerCase().replace(/\s+/g, " ");
  const known: Record<string, number> = {
    "c&i installer": 215,
    "residential installer": 145,
    "hybrid installer (resi & c&i)": 40,
    "energy retailer": 185,
    distributor: 270,
    "sub-distributor": 325,
    epc: 15,
  };
  // New lookup values receive a stable hue without requiring a code change.
  let hash = 0;
  for (const char of key)
    hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  const hue = known[key] ?? hash % 360;
  return {
    backgroundColor: `hsl(${hue} 75% 93%)`,
    color: `hsl(${hue} 65% 27%)`,
    borderColor: `hsl(${hue} 55% 80%)`,
  };
}
