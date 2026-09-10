import { describe, it, expect } from "vitest";
import {
  BANK,
  EMPTY,
  parseState,
  reviewQueue,
  type Attempt,
  type LearningState,
} from "@/lib/learning";
import { speedCoaching } from "@/lib/speed";
import { methodReliability } from "@/lib/methods";
import {
  formulaTask,
  recallMatches,
  retentionEligible,
  FORMULA_ACTIVITIES,
} from "@/lib/formulaActivities";
describe("integrated speed policy", () => {
  const q = BANK[0];
  const make = (i: number, correct = true, durationMs = 40000): Attempt => ({
    id: `a${i}`,
    questionId: q.id,
    answer: correct ? q.correctAnswer : "wrong",
    correct,
    durationMs,
    hints: 0,
    confidence: 3,
    at: new Date(Date.UTC(2026, 8, 1, 10, i)).toISOString(),
    mode: "speed",
    sessionId: "speed",
  });
  it("holds pressure until comparable independent evidence exists", () => {
    const result = speedCoaching(
      [make(0), { ...make(1), hints: 1 }],
      q,
      "speed",
    );
    expect(result.sampleSize).toBe(1);
    expect(result.decision.pressureAction).toBe("HOLD");
  });
  it("eases pressure when fast answers become inaccurate", () => {
    const result = speedCoaching(
      [
        make(0, true, 60000),
        make(1, true, 60000),
        make(2, true, 60000),
        make(3, false, 10000),
        make(4, false, 10000),
        make(5, false, 10000),
      ],
      q,
      "speed",
    );
    expect(result.decision.pressureAction).toBe("DECREASE");
    expect(result.decision.signal).toBe("RUSHING");
    expect(result.nextRatio).toBeGreaterThan(1);
  });
  it("reduces time targets cautiously when accuracy remains stable", () => {
    const result = speedCoaching(
      Array.from({ length: 5 }, (_, i) => make(i)),
      q,
      "speed",
    );
    expect(result.decision.pressureAction).toBe("INCREASE");
    expect(result.nextRatio).toBe(0.95);
  });
  it("clears a corrected review immediately and reschedules actual recall", () => {
    const missed = make(0, false);
    const corrected = make(1, true);
    const now = Date.parse(corrected.at);
    expect(reviewQueue([missed], now)).toHaveLength(1);
    expect(reviewQueue([missed, corrected], now)).toHaveLength(0);
    expect(reviewQueue([missed, corrected], now + 86400001)).toHaveLength(1);
  });
});
describe("personal method reliability", () => {
  const record = (
    i: number,
    mode: "baseline" | "shortcut",
    correct = true,
  ): LearningState["methodAttempts"][number] => ({
    id: `m${i}`,
    shortcutId: "quarter",
    base: 20 * (i + 1),
    correct,
    durationMs: mode === "baseline" ? 10000 : 7000,
    mode,
    at: new Date(Date.UTC(2026, 8, 1, 10, i)).toISOString(),
  });
  const baseline = Array.from({ length: 3 }, (_, i) => record(i, "baseline"));
  it("does not grant trust when a method is merely saved", () => {
    expect(methodReliability([], "quarter").state).toBe("EXPERIMENTAL");
  });
  it("requires baseline evidence for a time-saving trust claim", () => {
    const drills = Array.from({ length: 10 }, (_, i) =>
      record(i + 3, "shortcut"),
    );
    expect(methodReliability(drills, "quarter").state).toBe("RELIABLE");
    expect(methodReliability([...baseline, ...drills], "quarter").state).toBe(
      "TRUSTED",
    );
  });
  it("downgrades a previously trusted method after repeated failures", () => {
    const drills = Array.from({ length: 10 }, (_, i) =>
      record(i + 3, "shortcut"),
    );
    const failed = Array.from({ length: 3 }, (_, i) =>
      record(i + 13, "shortcut", false),
    );
    expect(
      methodReliability([...baseline, ...drills, ...failed], "quarter"),
    ).toMatchObject({ state: "NEEDS_REVIEW", regressed: true });
  });
  it("excludes implausibly fast and duplicate successful drill values", () => {
    const first = record(3, "shortcut");
    expect(
      methodReliability(
        [
          first,
          { ...first, id: "duplicate" },
          { ...record(4, "shortcut"), durationMs: 50 },
        ],
        "quarter",
      ).uses,
    ).toBe(1);
  });
});
describe("formula activity progression", () => {
  it("supplies authored contexts for all eight activities and three formula families", () => {
    for (const activity of FORMULA_ACTIVITIES)
      for (let i = 0; i < 3; i++) {
        const task = formulaTask(i, activity);
        expect(task.prompt.length).toBeGreaterThan(15);
        expect(Number.isFinite(task.expected)).toBe(true);
      }
  });
  it("checks recalled relationships numerically and rejects unsafe or wrong equations", () => {
    expect(recallMatches("D = T * S", 0)).toBe(true);
    expect(recallMatches("D = S / T", 0)).toBe(false);
    expect(recallMatches('D = import("x")', 0)).toBe(false);
    expect(recallMatches("D = S*T; D = 0", 0)).toBe(false);
  });
  it("unlocks delayed recall only after a genuine earlier success", () => {
    const now = Date.UTC(2026, 8, 10);
    const result = {
      id: "f",
      formulaId: "fx-simple-interest",
      activity: "APPLY" as const,
      correct: true,
      at: new Date(now - 86400001).toISOString(),
    };
    expect(retentionEligible([], result.formulaId, now)).toBe(false);
    expect(retentionEligible([result], result.formulaId, now)).toBe(true);
    expect(
      retentionEligible(
        [{ ...result, at: new Date(now).toISOString() }],
        result.formulaId,
        now,
      ),
    ).toBe(false);
  });
  it("migrates existing version-one progress without losing formula history", () => {
    const previous = {
      ...EMPTY,
      methodAttempts: undefined,
      speedTargets: undefined,
      formulaResults: [
        { id: "sdt", correct: true, at: "2026-09-01T00:00:00.000Z" },
      ],
    };
    const loaded = parseState(JSON.stringify(previous));
    expect(loaded.formulaResults[0].activity).toBe("APPLY");
    expect(loaded.methodAttempts).toEqual([]);
  });
});
