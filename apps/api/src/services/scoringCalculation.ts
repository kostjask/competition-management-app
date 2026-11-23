import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { ScoringCalculationSchema } from "@dance/schemas";
import { exactTotal, type ExactCriterion } from "./scoringMath";

type FrozenSheet = {
  id: string;
  judgeId: string;
  revision: number;
  state: string;
  values: { criterionId: string; value: number }[];
};
type FrozenRecord = {
  id: string;
  performanceId: string;
  templateId: string;
  penalty: number;
  disqualified: boolean;
  reason: string | null;
  sheets: FrozenSheet[];
};
export const completeScoringRecord = (record: FrozenRecord) =>
  record.sheets.length > 0 && record.sheets.every(sheet => sheet.state === "LOCKED");

export function calculateScoringRecord(record: FrozenRecord, criteria: ExactCriterion[]) {
  const inputs = {
    policy: "normalized-v1",
    recordId: record.id,
    performanceId: record.performanceId,
    templateId: record.templateId,
    penalty: record.penalty,
    disqualified: record.disqualified,
    reason: record.reason,
    sheets: record.sheets.map(s => ({
      id: s.id, judgeId: s.judgeId, revision: s.revision,
      values: s.values.map(v => ({ criterionId: v.criterionId, value: v.value })),
    })),
    criteria: criteria.map(c => ({ id: c.id, min: c.min, max: c.max, step: c.step, weightBps: c.weightBps })),
  };
  const source = createHash("sha256").update(JSON.stringify(inputs)).digest("hex");
  const total = exactTotal(criteria, inputs.sheets.map(s => s.values), record.penalty);
  const calculation = ScoringCalculationSchema.parse({
    policy: inputs.policy, source, total: record.disqualified ? null : total, disqualified: record.disqualified,
  });
  return { inputs, calculation };
}

export async function retainScoringCalculations(db: Prisma.TransactionClient, results: ReturnType<typeof calculateScoringRecord>[]) {
  await db.scoringCalculation.createMany({
    data: results.map(({ calculation, inputs }) => ({
      recordId: inputs.recordId, source: calculation.source, inputs, result: calculation,
    })),
    skipDuplicates: true,
  });
}
