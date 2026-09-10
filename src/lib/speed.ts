import { BANK, type Attempt } from "./learning";
import type { Question } from "./domain/types";
import {
  classifySpeedState,
  computeBaseline,
} from "@/engines/speed/core/speedAnalysis";
import { evaluateTrainingPolicy } from "@/engines/speed/core/trainingPolicy";
import {
  TrainingMode,
  type SpeedAttemptRecord,
  type Difficulty,
} from "@/engines/speed/types/domain";
export function speedScope(q: Question) {
  return `${q.skillNodeId}:${q.difficulty}:${q.applicationType === "TRANSFER" ? "TRANSFER" : "FAMILIAR"}`;
}
export function speedCoaching(
  attempts: Attempt[],
  question: Question,
  sessionId: string,
  targetRatio = 1,
) {
  const comparable = attempts.filter((a) => {
    const q = BANK.find((q) => q.id === a.questionId);
    return (
      q &&
      speedScope(q) === speedScope(question) &&
      a.hints === 0 &&
      a.answer !== null &&
      a.durationMs >= 1000
    );
  });
  const records: SpeedAttemptRecord[] = comparable.map((a) => {
    const q = BANK.find((q) => q.id === a.questionId)!;
    const expected = q.estimatedTimeSeconds * 1000;
    const speed = classifySpeedState(a.durationMs, expected, a.correct);
    return {
      id: a.id,
      clientAttemptId: a.id,
      sessionId: a.sessionId,
      studentId: "local",
      question: {
        questionId: q.id,
        skillId: q.skillNodeId,
        difficulty: (q.difficulty === 1
          ? "EASY"
          : q.difficulty === 2
            ? "MEDIUM"
            : "HARD") as Difficulty,
      },
      responseTimeMs: a.durationMs,
      correct: a.correct,
      independent: true,
      hintLevel: 0,
      noveltyLevel: q.applicationType === "TRANSFER" ? "TRANSFER" : "FAMILIAR",
      confidenceRating: a.confidence,
      expectedTimeMs: expected,
      expectedTimeSource: "AUTHOR_ESTIMATE",
      relativeSpeed: speed.relativeSpeed,
      performanceState: speed.state,
      createdAt: new Date(a.at),
    };
  });
  const baseline = computeBaseline(
    { scopeType: "SKILL", scopeId: speedScope(question) },
    records,
  );
  const referenceMs =
    baseline?.averageMs ?? question.estimatedTimeSeconds * 1000;
  const policyRecords = baseline
    ? records.map((a) => {
        const classified = classifySpeedState(
          a.responseTimeMs,
          baseline.averageMs,
          a.correct,
        );
        return {
          ...a,
          expectedTimeMs: baseline.averageMs,
          expectedTimeSource: "PERSONAL_BASELINE" as const,
          relativeSpeed: classified.relativeSpeed,
          performanceState: classified.state,
        };
      })
    : records;
  const targetMs = Math.round(referenceMs * targetRatio);
  const decision = evaluateTrainingPolicy({
    recentAttempts: policyRecords,
    sessionAttempts: policyRecords.filter((a) => a.sessionId === sessionId),
    baseline,
    guardrailAccuracy: 0.85,
    currentTargetMs: targetMs,
    currentMode: TrainingMode.BALANCED,
  });
  const nextRatio =
    decision.nextTargetMs === null
      ? targetRatio
      : Math.min(2, Math.max(0.65, decision.nextTargetMs / referenceMs));
  return {
    decision,
    targetMs,
    nextRatio,
    sampleSize: records.length,
    baseline,
  };
}
