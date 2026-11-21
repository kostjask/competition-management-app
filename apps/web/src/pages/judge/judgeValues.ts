import { ScoringDecimalSchema, scoreFitsRange, scoringUnits, scoringDecimal, type JudgeScoringSheet, type ScoringValues } from "@dance/schemas";
import type { Locale } from "../../i18n/locale";

export type JudgeFields = Record<string, { value: string; comment: string }>;
export const savedFields = (sheet: JudgeScoringSheet, locale: Locale): JudgeFields => Object.fromEntries(sheet.values.map(v => [v.criterionId, {
  value: new Intl.NumberFormat(locale, { useGrouping: false }).format(Number(v.value)), comment: v.comment ?? "",
}]));
export const emptyField = { value: "", comment: "" };

export function readJudgeValues(sheet: JudgeScoringSheet, fields: JudgeFields) {
  const values: ScoringValues = [];
  const invalid: Record<string, "range" | "comment"> = {};
  for (const criterion of sheet.rubric.criteria) {
    const field = fields[criterion.id] ?? emptyField;
    const value = field.value.trim().replace(",", ".");
    const comment = field.comment.trim() || null;
    if (!value) {
      if (comment) invalid[criterion.id] = "comment";
    } else if (!ScoringDecimalSchema.safeParse(value).success || !scoreFitsRange(scoringUnits(value), scoringUnits(criterion.min), scoringUnits(criterion.max), scoringUnits(criterion.step))) {
      invalid[criterion.id] = "range";
    } else values.push({ criterionId: criterion.id, value: scoringDecimal(scoringUnits(value)), comment });
  }
  return { values, invalid, valid: Object.keys(invalid).length === 0, complete: values.length === sheet.rubric.criteria.length };
}
