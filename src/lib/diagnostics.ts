import { BANK, SKILLS, type Attempt } from "./learning";
import { buildStudentProfile } from "@/engines/diagnostics/engine/studentProfileBuilder";
import { computeEvidence } from "@/engines/diagnostics/engine/evidenceQuality";
import type {
  Blueprint,
  BlueprintNode,
  QuestionDifficulty,
  RawResponseInput,
} from "@/engines/diagnostics/types/domain";
const nodes: BlueprintNode[] = [];
function add(
  id: string,
  label: string,
  level: BlueprintNode["level"],
  parentNodeId: string | null,
) {
  if (!nodes.some((n) => n.id === id))
    nodes.push({
      id,
      label,
      level,
      parentNodeId,
      blueprintId: "aptitude",
      code: id,
      minEvidenceCount: 3,
      targetDifficultyWeight: {
        easy: 0.3,
        medium: 0.4,
        hard: 0.2,
        very_hard: 0.1,
      },
    });
}
for (const s of SKILLS) {
  const topic = s.domain + ":" + s.topic;
  const subtopic = topic + ":" + (s.subtopic || s.topic);
  add(s.domain, s.domain.toLowerCase(), "domain", null);
  add(topic, s.topic, "topic", s.domain);
  add(subtopic, s.subtopic || s.topic, "subtopic", topic);
  add(s.id, s.displayName, "skill", subtopic);
}
const blueprint: Blueprint = {
  id: "aptitude",
  name: "Aptitude foundations",
  mode: "first_diagnostic",
  nodes,
};
export function advancedProfile(attempts: Attempt[]) {
  const seen = new Map<string, number>();
  const responses = attempts.flatMap((a) => {
    const q = BANK.find((q) => q.id === a.questionId);
    if (!q) return [];
    const prior = seen.get(q.id) ?? 0;
    seen.set(q.id, prior + 1);
    if (a.hints > 0) return [];
    const difficulty: QuestionDifficulty = (
      ["easy", "medium", "hard", "very_hard"] as const
    )[q.difficulty - 1];
    const response: RawResponseInput = {
      clientResponseId: a.id,
      questionId: q.id,
      skillNodeId: q.skillNodeId,
      answer: a.answer,
      isCorrect: a.answer === null ? null : a.correct,
      questionDifficulty: difficulty,
      expectedDurationMs: q.estimatedTimeSeconds * 1000,
      startedAt: new Date(Date.parse(a.at) - a.durationMs).toISOString(),
      completedAt: a.at,
      durationMs: a.durationMs,
      confidence: a.confidence as 1 | 2 | 3 | 4 | 5,
      hintUsed: false,
      attemptNumber: prior + 1,
      wasPreviouslyExposed: prior > 0,
    };
    const evidence = computeEvidence({ response, priorExposureCount: prior });
    return [
      {
        skillNodeId: q.skillNodeId,
        isCorrect: response.isCorrect,
        durationMs: a.durationMs,
        expectedDurationMs: response.expectedDurationMs,
        difficulty,
        confidence: a.confidence,
        evidenceWeight: evidence.evidenceWeight,
        createdAt: a.at,
      },
    ];
  });
  const prerequisites = new Map(
    SKILLS.filter((s) => s.prerequisiteSkillId).map((s) => [
      s.id,
      [s.prerequisiteSkillId!],
    ]),
  );
  return buildStudentProfile({
    sessionId: "local",
    studentId: "local",
    blueprint,
    responses,
    prerequisiteGraph: prerequisites,
  });
}
