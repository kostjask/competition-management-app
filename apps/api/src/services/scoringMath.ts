import { scoringDecimal } from "@dance/schemas";

type Fraction = { n: bigint; d: bigint };
const gcd = (a: bigint, b: bigint): bigint => b === 0n ? a : gcd(b, a % b);
const fraction = (n: bigint, d: bigint): Fraction => { const g = gcd(n < 0n ? -n : n, d); return { n: n / g, d: d / g }; };
const add = (a: Fraction, b: Fraction) => fraction(a.n * b.d + b.n * a.d, a.d * b.d);
export type ExactCriterion = { id: string; min: number; max: number; step: number; weightBps: number };
// Reduced rational arithmetic: no intermediate binary float or decimal rounding.
export function exactTotal(criteria: ExactCriterion[], sheets: { criterionId: string; value: number }[][], penalty: number): string {
  if (!criteria.length || !sheets.length || criteria.reduce((s, c) => s + c.weightBps, 0) !== 10000 || !Number.isSafeInteger(penalty) || penalty < 0 || penalty > 100000) throw new Error("Incomplete scoring sources");
  let panel = fraction(0n, 1n);
  for (const sheet of sheets) {
    if (sheet.length !== criteria.length || new Set(sheet.map(v => v.criterionId)).size !== sheet.length) throw new Error("Incomplete scoring sources");
    for (const criterion of criteria) {
      const value = sheet.find(v => v.criterionId === criterion.id)?.value;
      if (value === undefined || !Number.isSafeInteger(value) || criterion.max <= criterion.min || criterion.step <= 0 || value < criterion.min || value > criterion.max || (value - criterion.min) % criterion.step !== 0) throw new Error("Invalid scoring value");
      panel = add(panel, fraction(BigInt(value - criterion.min) * BigInt(criterion.weightBps) * 1000n, BigInt(criterion.max - criterion.min) * 100n * BigInt(sheets.length)));
    }
  }
  const adjusted = panel.n - BigInt(penalty) * panel.d;
  const rounded = adjusted <= 0n ? 0n : (2n * adjusted + panel.d) / (2n * panel.d);
  return scoringDecimal(Number(rounded));
}
export function competitionRanks<T extends { total: string | null; disqualified: boolean }>(rows: T[]): (T & { rank: number | null })[] {
  const sorted = [...rows].sort((a, b) => a.disqualified || a.total === null ? b.disqualified || b.total === null ? 0 : 1 : b.disqualified || b.total === null ? -1 : Number(b.total) - Number(a.total));
  let rank = 0, previous: string | null = null;
  return sorted.map((row, i) => {
    if (row.disqualified || row.total === null) return { ...row, rank: null };
    if (row.total !== previous) rank = i + 1;
    previous = row.total; return { ...row, rank };
  });
}
