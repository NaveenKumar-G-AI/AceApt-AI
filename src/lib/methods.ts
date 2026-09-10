import { computeTrustState, TRUST_THRESHOLDS } from "@/engines/shortcuts/trust";
import type { TrustState } from "@/engines/shortcuts/domain/enums";
import type { LearningState } from "./learning";
export const METHOD_FAMILIES = [
  {
    name: "25% of a quantity",
    canonical: "x * 0.25",
    example: "x / 4",
    calculate: (x: number) => x * 0.25,
  },
  {
    name: "15% of a quantity",
    canonical: "x * 0.15",
    example: "x / 10 + x / 20",
    calculate: (x: number) => x * 0.15,
  },
  {
    name: "A 20% increase",
    canonical: "x * 1.2",
    example: "x + x / 5",
    calculate: (x: number) => x * 1.2,
  },
];
export function methodReliability(
  all: LearningState["methodAttempts"],
  shortcutId: string,
) {
  const attempts = all
    .filter((a) => a.shortcutId === shortcutId)
    .sort((a, b) => a.at.localeCompare(b.at));
  const uses: typeof attempts = [];
  const baseline: typeof attempts = [];
  let state: TrustState = "EXPERIMENTAL";
  let regressed = false;
  let savedRatio: number | null = null;
  for (const a of attempts) {
    if (a.mode === "baseline") {
      if (a.correct && a.durationMs >= 1000) baseline.push(a);
      continue;
    }
    if (a.durationMs < 1000) continue;
    // Repeated drill values are practice, not independent reliability evidence.
    if (
      a.correct &&
      uses.some((previous) => previous.base === a.base && previous.correct)
    )
      continue;
    uses.push(a);
    const recent = uses.slice(-TRUST_THRESHOLDS.REGRESSION_WINDOW);
    const baselineMs =
      baseline.length >= 3
        ? baseline.reduce((s, v) => s + v.durationMs, 0) / baseline.length
        : null;
    savedRatio = baselineMs
      ? 1 -
        uses.reduce((s, v) => s + v.durationMs, 0) / uses.length / baselineMs
      : null;
    const result = computeTrustState({
      usageCount: uses.length,
      successCount: uses.filter((v) => v.correct).length,
      accuracy: uses.filter((v) => v.correct).length / uses.length,
      avgTimeSavedRatio: savedRatio,
      recentWindowAccuracy:
        recent.length >= 5
          ? recent.filter((v) => v.correct).length / recent.length
          : null,
      previousState: state,
    });
    state = result.state;
    regressed = result.regressed || regressed;
  }
  return {
    state,
    regressed,
    uses: uses.length,
    accuracy: uses.length
      ? uses.filter((v) => v.correct).length / uses.length
      : null,
    baselineCount: baseline.length,
    timeSavedRatio: savedRatio,
  };
}
