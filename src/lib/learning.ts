import { z } from "zod";
import { QUESTIONS } from "@/data/seed/questions";
import { SKILLS } from "@/data/seed/skills";
import { validateQuestion } from "@/lib/domain/validation/questionValidator";
import { computeCapabilityState } from "@/lib/domain/capabilityState";
import { selectNextQuestion } from "@/lib/domain/selectionEngine";
import type { JoinedAttempt } from "@/lib/db/repo";
import type { Question, QuestionPurpose } from "@/lib/domain/types";
import { buildRetentionEvidence } from "@/engines/retention/engine/evidence";
import { calculateRetentionStrength } from "@/engines/retention/engine/retentionStrength";
import type { RetrievalAttempt } from "@/engines/retention/domain/types";

const skillsById = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
export const BANK: Question[] = QUESTIONS.filter(
  (q) => validateQuestion(q, skillsById).valid,
).map((q) => ({
  ...q,
  validationStatus: "VALIDATED",
  validationNotes: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
}));
export { SKILLS };
export const modes = [
  "practice",
  "diagnostic",
  "simulation",
  "speed",
  "accuracy",
  "revision",
  "transfer",
] as const;
export type Mode = (typeof modes)[number];
export const attemptSchema = z.object({
  id: z.string(),
  questionId: z.string(),
  answer: z.string().nullable(),
  correct: z.boolean(),
  durationMs: z.number().min(0).max(86400000),
  hints: z.number().int().min(0).max(20),
  confidence: z.number().int().min(1).max(5),
  at: z.iso.datetime(),
  mode: z.enum(modes),
  sessionId: z.string(),
});
export type Attempt = z.infer<typeof attemptSchema>;
export const activeSchema = z.object({
  id: z.string(),
  mode: z.enum(modes),
  skillId: z.string(),
  questionId: z.string(),
  startedAt: z.number(),
  elapsedMs: z.number().min(0).max(86400000).default(0),
  deadline: z.number().nullable(),
  answer: z.string(),
  hints: z.number(),
  confidence: z.number(),
  submitted: z.boolean(),
  complete: z.boolean(),
});
export type ActiveSession = z.infer<typeof activeSchema>;
export const stateSchema = z.object({
  version: z.literal(1),
  attempts: z.array(attemptSchema).max(10000),
  bookmarks: z.array(z.string()).max(500),
  goal: z.string().max(100),
  minutes: z.number().int().min(5).max(120),
  planFocus: z.string().max(100).default(""),
  shortcuts: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().max(100),
        method: z.string().max(3000),
        definition: z
          .object({
            family: z.number().int().min(0).max(2),
            expression: z.string().max(120),
            checkedAt: z.iso.datetime(),
          })
          .optional(),
      }),
    )
    .max(100),
  active: activeSchema.nullable(),
  speedTargets: z.record(z.string(), z.number().min(0.65).max(2)).default({}),
  methodAttempts: z
    .array(
      z.object({
        id: z.string(),
        shortcutId: z.string(),
        base: z.number().min(0).max(10000),
        correct: z.boolean(),
        durationMs: z.number().min(0).max(86400000),
        mode: z.enum(["baseline", "shortcut"]),
        at: z.iso.datetime(),
      }),
    )
    .max(10000)
    .default([]),
  formulaResults: z
    .array(
      z.object({
        id: z.string(),
        correct: z.boolean(),
        at: z.iso.datetime(),
        formulaId: z.string().optional(),
        activity: z
          .enum([
            "RECOGNIZE",
            "RECALL",
            "SELECT",
            "MAP",
            "APPLY",
            "VERIFY",
            "TRANSFER",
            "RETAIN",
          ])
          .default("APPLY"),
      }),
    )
    .max(10000),
});
export type LearningState = z.infer<typeof stateSchema>;
export const EMPTY: LearningState = {
  version: 1,
  attempts: [],
  bookmarks: [],
  goal: "Build aptitude foundations",
  minutes: 20,
  planFocus: "",
  shortcuts: [],
  active: null,
  speedTargets: {},
  methodAttempts: [],
  formulaResults: [],
};
export function parseState(raw: string | null): LearningState {
  if (!raw) return structuredClone(EMPTY);
  return stateSchema.parse(JSON.parse(raw));
}
export function joined(attempts: Attempt[]): JoinedAttempt[] {
  return attempts.flatMap((a, i) => {
    const q = BANK.find((q) => q.id === a.questionId);
    if (!q) return [];
    const purpose: QuestionPurpose = i === 0 ? "BASELINE" : "VERIFICATION";
    return [
      {
        question: q,
        presentation: {
          id: a.id,
          sessionId: a.sessionId,
          questionId: q.id,
          purpose,
          rationale: "Adaptive learning",
          sequenceIndex: i,
          captureConfidence: true,
          presentedAt: a.at,
        },
        response: {
          id: a.id,
          sessionId: a.sessionId,
          presentationId: a.id,
          questionId: q.id,
          status: a.answer === null ? "SKIPPED" : "ANSWERED",
          studentAnswer: a.answer,
          isCorrect: a.answer === null ? null : a.correct,
          confidenceLevel:
            (
              [
                null,
                "GUESSING",
                "NOT_SURE",
                "SOMEWHAT_CONFIDENT",
                "CONFIDENT",
                "VERY_CONFIDENT",
              ] as const
            )[a.confidence] ?? null,
          questionStartedAt: new Date(
            Date.parse(a.at) - a.durationMs,
          ).toISOString(),
          questionAnsweredAt: a.at,
          responseDurationMs: a.durationMs,
          createdAt: a.at,
        },
      },
    ];
  });
}
/** Assisted answers never count as independent capability evidence. */
export function capability(attempts: Attempt[]) {
  return computeCapabilityState(
    "local",
    joined(attempts.filter((a) => a.hints === 0)),
    SKILLS,
  );
}
export function nextQuestion(
  attempts: Attempt[],
  mode: Mode,
  skillId = "",
  sessionId = "",
): Question | null {
  let pool = BANK.filter((q) => !skillId || q.skillNodeId === skillId);
  if (mode === "transfer")
    pool = pool.filter((q) => q.applicationType === "TRANSFER");
  const current = attempts.filter((a) => a.sessionId === sessionId);
  if (mode === "revision") {
    const missed = new Set(
      reviewQueue(attempts).map((item) => item.questionId),
    );
    pool = pool.filter((q) => missed.has(q.id));
  }
  const fresh = pool.filter((q) => !current.some((a) => a.questionId === q.id));
  if (!fresh.length) return null;
  const state = capability(
    mode === "diagnostic" || mode === "simulation" ? current : attempts,
  );
  // Repetition is permitted across sessions, while each session stays novel.
  state.askedQuestionIds = current.map((a) => a.questionId);
  return selectNextQuestion(state, fresh, SKILLS)?.question ?? fresh[0];
}
export function skillSummary(attempts: Attempt[], skillId: string) {
  const all = attempts.filter(
    (a) => BANK.find((q) => q.id === a.questionId)?.skillNodeId === skillId,
  );
  const independent = all.filter((a) => a.hints === 0 && a.answer !== null);
  const correct = independent.filter((a) => a.correct).length;
  return {
    all,
    independent,
    accuracy: independent.length
      ? Math.round((correct / independent.length) * 100)
      : null,
    averageSeconds: independent.length
      ? Math.round(
          independent.reduce((s, a) => s + a.durationMs, 0) /
            independent.length /
            1000,
        )
      : null,
  };
}
export function retention(attempts: Attempt[], skillId: string) {
  const raw: RetrievalAttempt[] = skillSummary(attempts, skillId).all.map(
    (a) => {
      const q = BANK.find((q) => q.id === a.questionId)!;
      return {
        id: a.id,
        studentId: "local",
        conceptId: skillId,
        sessionId: a.sessionId,
        mode: q.applicationType === "TRANSFER" ? "transfer" : "standard",
        correct: a.correct,
        latencyMs: a.durationMs,
        hintsUsed: a.hints,
        explanationRequested: a.hints >= 6,
        context: {
          templateId: q.id,
          difficultyBand:
            q.difficulty < 2 ? "easy" : q.difficulty < 4 ? "medium" : "hard",
          method: q.applicationType,
          topicWrapper: q.skillNodeId,
          timed: a.mode === "speed" || a.mode === "simulation",
        },
        createdAt: a.at,
      };
    },
  );
  const evidence = buildRetentionEvidence(
    "local",
    skillId,
    raw,
    null,
    new Date().toISOString(),
  );
  return { ...calculateRetentionStrength(evidence, raw), evidence };
}
export function recommendedSkills(attempts: Attempt[]) {
  return SKILLS.map((skill) => ({
    skill,
    ...skillSummary(attempts, skill.id),
  })).sort((a, b) => {
    const priority = (x: typeof a) =>
      x.independent.length >= 2 && x.accuracy !== null && x.accuracy < 60
        ? 0
        : x.all.length === 0
          ? 1
          : 2;
    return priority(a) - priority(b) || (a.accuracy ?? 0) - (b.accuracy ?? 0);
  });
}
/** A transparent spaced-review schedule, not a learned forgetting prediction. */
export function reviewQueue(attempts: Attempt[], now = Date.now()) {
  const grouped = Object.groupBy(
    attempts.filter((a) => BANK.some((q) => q.id === a.questionId)),
    (a) => a.questionId,
  );
  return Object.entries(grouped)
    .flatMap(([questionId, values]) => {
      const history = [...(values ?? [])].sort((a, b) =>
        a.at.localeCompare(b.at),
      );
      const latest = history.at(-1);
      if (!latest) return [];
      if (!latest.correct || latest.hints > 0 || latest.confidence < 3)
        return [
          {
            questionId,
            reason:
              latest.hints > 0
                ? "Try without assistance"
                : latest.correct
                  ? "Verify your reasoning after a low-confidence answer"
                  : "Revisit the missed step",
            priority: 0,
            dueAt: latest.at,
          },
        ];
      let successes = 0;
      for (let i = history.length - 1; i >= 0; i--) {
        const a = history[i];
        if (!a.correct || a.hints > 0 || a.confidence < 3) break;
        successes++;
      }
      const days = [1, 3, 7, 14][Math.min(successes - 1, 3)];
      const dueAt = new Date(
        Date.parse(latest.at) + days * 86400000,
      ).toISOString();
      return now >= Date.parse(dueAt)
        ? [
            {
              questionId,
              reason: "Time for a spaced recall check",
              priority: 1,
              dueAt,
            },
          ]
        : [];
    })
    .sort((a, b) => a.priority - b.priority || a.dueAt.localeCompare(b.dueAt));
}
