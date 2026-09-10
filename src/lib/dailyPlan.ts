import { BANK, SKILLS, reviewQueue, type Attempt, type LearningState } from "./learning";
import { diagnoseAllTopics } from "@/engines/adaptation/engine/diagnosis";
import { buildCandidateActions } from "@/engines/adaptation/engine/candidateActions";
import { rankCandidates } from "@/engines/adaptation/engine/priority";
import { generatePlan } from "@/engines/adaptation/engine/plan";
import { STABLE_MIN } from "@/engines/adaptation/engine/constants";
import type { CandidateAction, Diagnosis, TopicCapabilityState } from "@/engines/adaptation/types";

const questions = new Map(BANK.map(q => [q.id, q]));
const domains = ["QUANTITATIVE", "LOGICAL", "VERBAL"];
const balancedSkills = Array.from({length: SKILLS.length}, (_, index) =>
  domains.flatMap(domain => SKILLS.filter(skill => skill.domain === domain)[index] ?? [])).flat();
const percent = (attempts: Attempt[]) => Math.round(100 * attempts.filter(a => a.correct).length / attempts.length);
export function localDay(time: number) {
  const d = new Date(time);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** One observation per question; repeat successes need a day without exposure. */
export function planningStates(state: LearningState): TopicCapabilityState[] {
  const history = [...state.attempts].sort((a, b) => a.at.localeCompare(b.at));
  return SKILLS.map(skill => {
    const all = history.filter(a => questions.get(a.questionId)?.skillNodeId === skill.id);
    const exposed = new Map<string, number>();
    const independent = new Map<string, Attempt>();
    const recall = new Map<string, Attempt>();
    const successes = new Map<string, number>();
    for (const a of all) {
      const time = Date.parse(a.at);
      const previous = exposed.get(a.questionId);
      const eligible = previous === undefined || time - previous >= 86400000;
      if (eligible && a.hints === 0) independent.set(a.questionId, a);
      exposed.set(a.questionId, time);
      const learnedAt = successes.get(a.questionId);
      if (eligible && a.hints === 0 && learnedAt !== undefined && time - learnedAt >= 86400000) recall.set(a.questionId, a);
      if (a.correct && a.hints === 0 && learnedAt === undefined) successes.set(a.questionId, time);
    }
    const fresh = [...independent.values()];
    const familiar = fresh.filter(a => questions.get(a.questionId)?.applicationType !== "TRANSFER");
    const transfer = fresh.filter(a => questions.get(a.questionId)?.applicationType === "TRANSFER");
    const timed = fresh.filter(a => a.correct && a.durationMs >= 1000);
    const speed = timed.length >= 3
      ? Math.round(timed.reduce((total, a) => total + Math.min(1, questions.get(a.questionId)!.estimatedTimeSeconds * 1000 / a.durationMs), 0) / timed.length * 100)
      : null;
    const recalled = [...recall.values()];
    return {
      topicId: skill.id, topicName: skill.displayName,
      mastery: familiar.length >= 2 && fresh.length >= 3 ? percent(familiar) : null,
      accuracy: fresh.length >= 3 ? percent(fresh) : null,
      retention: recalled.length >= 2 ? percent(recalled) : null,
      transfer: transfer.length >= 2 ? percent(transfer) : null,
      speed, consistency: null, momentum: "UNKNOWN", momentumTrendNote: null,
      stability: "UNKNOWN", regressionSuspected: false, regressionPossibleCauses: [],
      confidence: fresh.length < 3 ? "LOW" : fresh.length < 8 ? "MEDIUM" : "HIGH",
      persistentErrorPattern: null, persistentErrorSeverity: 0,
      goalRelevance: state.planFocus ? (state.planFocus === skill.id ? 1 : 0.2) : 0.5,
      prerequisiteTopicIds: skill.prerequisiteSkillId ? [skill.prerequisiteSkillId] : [],
      sampleSize: fresh.length, lastPracticedAt: all.at(-1)?.at ?? null,
    };
  });
}

function explain(d: Diagnosis, states: Map<string, TopicCapabilityState>): Diagnosis {
  const s = states.get(d.topicId)!;
  const notes: Record<Diagnosis["bottleneck"], string> = {
    LOW_EVIDENCE: `${s.sampleSize} distinct questions have independent evidence. A short check will add evidence before choosing a larger intervention.`,
    PREREQUISITE_GAP: `Independent results suggest reviewing ${d.redirectTopicName} before continuing ${s.topicName}.`,
    CONCEPT_GAP: `Familiar-question accuracy was ${s.mastery}% in independent evidence. Review the concept, then check it independently.`,
    RETENTION_DECAY: `Delayed unaided recall accuracy was ${s.retention}%. Revisit the method and retrieve it again.`,
    TRANSFER_GAP: `Familiar-question accuracy was ${s.mastery}%, compared with ${s.transfer}% on unfamiliar variations. Try a new representation.`,
    SPEED_LIMIT: `Independent accuracy was ${s.accuracy}%. Correct answers took longer than the authored time estimates; practise pacing while protecting accuracy.`,
    METHOD_ERROR: "Review the recurring method error, then try independently.",
    STABLE: "No specific bottleneck stands out from the available evidence.",
  };
  return {...d, notes: [notes[d.bottleneck]]};
}

export function dailyPlan(state: LearningState, now = Date.now()) {
  const states = planningStates(state);
  const byId = new Map(states.map(s => [s.topicId, s]));
  const diagnoses = diagnoseAllTopics(states).map(d => {
    const s = byId.get(d.topicId)!;
    // The source's quiet fallback also says STABLE. Missing dimensions must
    // remain unknown and trigger verification rather than a mastery claim.
    const strong = s.mastery !== null && s.mastery >= STABLE_MIN.mastery
      && s.retention !== null && s.retention >= STABLE_MIN.retention
      && s.transfer !== null && s.transfer >= STABLE_MIN.transfer
      && s.accuracy !== null && s.accuracy >= STABLE_MIN.accuracy;
    if (d.bottleneck === "STABLE" && !strong) {
      return {...d, bottleneck: "LOW_EVIDENCE" as const, severity: 0.3,
        notes: ["Current answers show no clear bottleneck. More independent evidence is needed before treating this skill as stable."]};
    }
    return explain(d, byId);
  });
  const ranked = rankCandidates(buildCandidateActions(diagnoses), byId);
  // Equal priorities rotate across domains instead of inheriting bank order.
  ranked.sort((a, b) => b.priorityScore - a.priorityScore ||
    balancedSkills.findIndex(s => s.id === a.topicId) - balancedSkills.findIndex(s => s.id === b.topicId));
  // An explicit speed preference affects only already-supported pacing needs.
  if (state.goal === "Improve exam speed") ranked.sort((a, b) =>
    Number(b.actionType === "TIMED_PRACTICE") - Number(a.actionType === "TIMED_PRACTICE") || b.priorityScore - a.priorityScore);
  const spent = state.attempts.filter(a => localDay(Date.parse(a.at)) === localDay(now))
    .reduce((sum, a) => sum + a.durationMs, 0) / 60000;
  const remaining = Math.max(0, state.minutes - spent);
  const plan = remaining === 0 ? null : generatePlan({studentId: "local", totalMinutes: state.minutes,
    remainingMinutes: remaining, rankedCandidates: ranked, allStatesById: byId});
  return {plan, spent, remaining, diagnoses, states};
}

export function actionDestination(action: CandidateAction, attempts: Attempt[] = []) {
  const skill = SKILLS.find(s => s.id === action.topicId);
  if ((action.actionType === "LEARN" || action.actionType === "REVIEW") && skill)
    return `/learn?domain=${skill.domain}#skill-${skill.id}`;
  const mode = action.actionType === "TIMED_PRACTICE" ? "speed"
    : action.actionType === "RECALL" && reviewQueue(attempts).some(item => questions.get(item.questionId)?.skillNodeId === skill?.id) ? "revision"
    : action.actionType === "TRANSFER_CHALLENGE" || action.actionType === "CHALLENGE" ? "transfer"
    : action.actionType === "METHOD_REPAIR" ? "accuracy" : "practice";
  return `/practice?mode=${mode}${skill ? `&skill=${encodeURIComponent(skill.id)}` : ""}`;
}

export const actionLabels: Record<CandidateAction["actionType"], string> = {
  LEARN: "Rebuild the concept", REVIEW: "Review a prerequisite", RECALL: "Retrieve the method",
  PRACTICE: "Practise independently", TRANSFER_CHALLENGE: "Try an unfamiliar variation",
  METHOD_REPAIR: "Check the method", VERIFY: "Check your understanding", MIX: "Mixed practice",
  CHALLENGE: "Stretch your understanding", TIMED_PRACTICE: "Build pace carefully", ASSESS: "Assess your progress", REST: "Take a break",
};
