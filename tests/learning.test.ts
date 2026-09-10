import { describe, expect, it } from "vitest";
import {
  BANK,
  EMPTY,
  capability,
  nextQuestion,
  parseState,
  retention,
  SKILLS,
  skillSummary,
  type Attempt,
} from "@/lib/learning";
import { SEED_FORMULAS } from "@/engines/formulas/seed";
import { evaluateTeachBack } from "@/engines/teaching/teachBack";
import { advancedProfile } from "@/lib/diagnostics";
import { runPropertyBasedValidation } from "@/engines/shortcuts/validation";
import { checkAccuracyGuardrail } from "@/engines/speed/accuracyGuardrail";
import {
  breakEvenProbability,
  expectedValueOfAttempt,
} from "@/engines/decisions/domain/expectedValue";
const question = BANK[0];
function attempt(hints = 0, day = 1): Attempt {
  return {
    id: crypto.randomUUID(),
    questionId: question.id,
    answer: question.correctAnswer,
    correct: true,
    durationMs: 35000,
    hints,
    confidence: 4,
    at: `2026-09-${String(day).padStart(2, "0")}T10:00:00.000Z`,
    mode: "practice",
    sessionId: "session",
  };
}
describe("shared learning evidence", () => {
  it("starts empty without personal information", () => {
    expect(parseState(null)).toEqual(EMPTY);
    expect(capability([]).questionsAttempted).toBe(0);
  });
  it("rejects malformed or incompatible persistence instead of rendering it", () => {
    expect(() => parseState("{bad")).toThrow();
    expect(() =>
      parseState(JSON.stringify({ ...EMPTY, attempts: [{ correct: "true" }] })),
    ).toThrow();
  });
  it("preserves a resumable question and an actual graded attempt", () => {
    const a = attempt();
    expect(
      parseState(JSON.stringify({ ...EMPTY, attempts: [a] })).attempts,
    ).toEqual([a]);
  });
  it("does not infer independent capability from assisted answers", () => {
    expect(capability([attempt(2)]).questionsAttempted).toBe(0);
    expect(
      skillSummary([attempt(2)], question.skillNodeId).accuracy,
    ).toBeNull();
  });
  it("does not repeat a question inside a session", () => {
    const next = nextQuestion(
      [attempt()],
      "practice",
      question.skillNodeId,
      "session",
    );
    expect(next?.id).not.toBe(question.id);
  });
  it("permits deliberate review in a new session", () => {
    const missed = { ...attempt(), correct: false };
    expect(
      nextQuestion([missed], "revision", question.skillNodeId, "new-session")
        ?.id,
    ).toBe(question.id);
  });
  it("never calls one success retained mastery", () => {
    expect(retention([attempt()], question.skillNodeId).band).toBe(
      "INSUFFICIENT_EVIDENCE",
    );
  });
  it("has unique question IDs, valid answers and known skills", () => {
    expect(new Set(BANK.map((q) => q.id)).size).toBe(BANK.length);
    for (const q of BANK) {
      expect(q.options).toContain(q.correctAnswer);
      expect(SKILLS.some((s) => s.id === q.skillNodeId)).toBe(true);
    }
  });
});
describe("copied teaching and mathematical engines", () => {
  it("keeps advanced diagnostics incomplete without evidence and excludes hints", () => {
    expect(advancedProfile([]).overallStatus).toBe("incomplete");
    expect(advancedProfile([attempt(3)]).overallStatus).toBe("incomplete");
    const profile = advancedProfile([attempt(), attempt(0, 2), attempt(0, 3)]);
    expect(
      profile.skillProfiles.find((s) => s.skillNodeId === question.skillNodeId),
    ).toBeDefined();
  });
  it("rejects a wrong shortcut with a counterexample and accepts an equivalent one", () => {
    const domain = { variables: { x: { min: 0, max: 10000 } } };
    expect(runPropertyBasedValidation("x / 4", "x * 0.25", domain).status).toBe(
      "PASS",
    );
    const wrong = runPropertyBasedValidation("x / 5", "x * 0.25", domain);
    expect(wrong.status).toBe("FAIL");
    expect(wrong.failures.length).toBeGreaterThan(0);
  });
  it("flags declining accuracy before adding time pressure", () => {
    expect(
      checkAccuracyGuardrail([true, false, true, false, true], 0.85).breached,
    ).toBe(true);
    expect(
      checkAccuracyGuardrail([true, true, true, true, true], 0.85).breached,
    ).toBe(false);
  });
  it("validates every published rearranged formula", () => {
    for (const f of SEED_FORMULAS)
      for (const d of f.derivedForms) expect(d.validated).toBe(true);
  });
  it("requires the reference value in a teach-back", () => {
    expect(
      evaluateTeachBack("I add numbers", [
        "identifies_original_value",
        "selects_correct_reference",
      ]).passed,
    ).toBe(false);
    expect(
      evaluateTeachBack(
        "I divide the change by the original value to compare the increase with the starting amount.",
        [
          "identifies_original_value",
          "selects_correct_reference",
          "explains_reasoning",
        ],
      ).passed,
    ).toBe(true);
  });
  it("calculates simulation decisions with the documented scoring policy", () => {
    const scoring = { correctReward: 1, wrongPenalty: 0.25, blankValue: 0 };
    expect(breakEvenProbability(scoring)).toBe(0.2);
    expect(expectedValueOfAttempt(20, scoring)).toBe(0);
    expect(expectedValueOfAttempt(100, scoring)).toBe(1);
  });
});
