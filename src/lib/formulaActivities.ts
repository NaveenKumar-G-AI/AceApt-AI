import { SEED_FORMULAS } from "@/engines/formulas/seed";
import { validateDerivedForm } from "@/engines/formulas/validation/formulaValidator";
import type { TrainingActivityType } from "@/engines/formulas/types";
import type { LearningState } from "./learning";
export const FORMULA_ACTIVITIES: TrainingActivityType[] = [
  "RECOGNIZE",
  "RECALL",
  "SELECT",
  "MAP",
  "APPLY",
  "VERIFY",
  "TRANSFER",
  "RETAIN",
];
export const FORMULA_LABELS: Record<TrainingActivityType, string> = {
  RECOGNIZE: "Recognize the relationship",
  RECALL: "Recall the formula",
  SELECT: "Choose the right conditions",
  MAP: "Map quantities to variables",
  APPLY: "Apply and calculate",
  VERIFY: "Verify an answer",
  TRANSFER: "Transfer to a new situation",
  RETAIN: "Delayed recall",
};
const contexts = [
  {
    prompt:
      "A vehicle moves at 60 km/h for 2 hours. Find the distance in kilometres.",
    answer: 120,
    mapping: { S: 60, T: 2 },
    explanation: "D = S × T = 60 × 2 = 120 km.",
    transfer:
      "A cyclist covers 45 km in 90 minutes at a constant speed. Find the speed in km/h.",
    transferAnswer: 30,
    transferExplanation:
      "90 minutes = 1.5 hours. S = D / T = 45 / 1.5 = 30 km/h.",
    condition: "A constant speed and travel duration are given.",
  },
  {
    prompt: "Find simple interest on 1,000 at 10% per year for 2 years.",
    answer: 200,
    mapping: { P: 1000, R: 10, T: 2 },
    explanation: "SI = P × R × T / 100 = 200.",
    transfer:
      "Simple interest of 360 is earned on 1,200 over 3 years. Find the annual percentage rate.",
    transferAnswer: 10,
    transferExplanation:
      "R = SI × 100 / (P × T) = 360 × 100 / (1,200 × 3) = 10%.",
    condition:
      "The interest earned each year is paid out and does not earn further interest.",
  },
  {
    prompt:
      "Find compound interest on 1,000 at 10% per year for 2 years, compounded annually.",
    answer: 210,
    mapping: { P: 1000, R: 10, T: 2 },
    explanation: "A = 1,000 × 1.1² = 1,210. Interest = A − P = 210.",
    transfer:
      "An investment grows to 1,210 in 2 years at 10% annually, with annual compounding. Find its original principal.",
    transferAnswer: 1000,
    transferExplanation: "P = A / (1 + R/100)^T = 1,210 / 1.21 = 1,000.",
    condition:
      "Interest is added to the balance at each annual compounding date.",
  },
];
export function formulaTask(index: number, activity: TrainingActivityType) {
  const formula = SEED_FORMULAS[index];
  const context = contexts[index];
  return {
    formula,
    context,
    prompt:
      activity === "SELECT"
        ? context.condition
        : activity === "RECOGNIZE"
          ? `Which formula family describes this? ${formula.meaning}`
          : activity === "RECALL" || activity === "RETAIN"
            ? `Write the canonical relationship for ${formula.canonicalName}. Include the target variable and an equals sign.`
            : activity === "VERIFY"
              ? `${context.prompt} A proposed answer is ${context.answer + 20}. Is it valid?`
              : activity === "TRANSFER"
                ? context.transfer
                : context.prompt,
    expected: activity === "TRANSFER" ? context.transferAnswer : context.answer,
    explanation:
      activity === "TRANSFER"
        ? context.transferExplanation
        : context.explanation,
  };
}
export function recallMatches(expression: string, formulaIndex: number) {
  const formula = SEED_FORMULAS[formulaIndex];
  const normalized = expression
    .replaceAll("×", "*")
    .replaceAll("÷", "/")
    .trim();
  if (
    !/^[A-Z\d\s.+*/()^=-]{1,120}$/.test(normalized) ||
    normalized.split("=").length !== 2
  )
    return false;
  const allowed = new Set(formula.variables.map((v) => v.symbol));
  if ((normalized.match(/[A-Z]+/g) ?? []).some((v) => !allowed.has(v)))
    return false;
  const target = formula.canonicalExpression.split("=")[0].trim();
  if (normalized.split("=")[0].trim() !== target) return false;
  return validateDerivedForm(
    formula.canonicalExpression,
    { targetVariable: target, expression: normalized },
    [...allowed],
  ).valid;
}
export function retentionEligible(
  results: LearningState["formulaResults"],
  formulaId: string,
  now: number,
) {
  const latest = results
    .filter((r) => r.formulaId === formulaId && r.correct)
    .sort((a, b) => b.at.localeCompare(a.at))[0];
  return !!latest && now - Date.parse(latest.at) >= 86400000;
}
