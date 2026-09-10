import { describe, expect, it } from "vitest";
import { BANK, EMPTY, SKILLS, parseState, type Attempt } from "@/lib/learning";
import { actionDestination, dailyPlan, planningStates } from "@/lib/dailyPlan";

const now = new Date(2026, 8, 10, 12).getTime();
function attempt(questionId: string, options: Partial<Attempt> = {}): Attempt {
  const q = BANK.find(q => q.id === questionId)!;
  return {id:crypto.randomUUID(), questionId, answer:q.correctAnswer, correct:true,
    durationMs:30000, hints:0, confidence:4, at:new Date(now).toISOString(),
    mode:"practice", sessionId:"test", ...options};
}
describe("adaptive daily path", () => {
  it("adds the optional path focus to older backups", () => {
    const legacy = {...EMPTY, planFocus:undefined};
    expect(parseState(JSON.stringify(legacy)).planFocus).toBe("");
  });
  it("starts with bounded evidence checks rather than invented weakness", () => {
    const result = dailyPlan(EMPTY, now);
    expect(result.diagnoses.every(d => d.bottleneck === "LOW_EVIDENCE")).toBe(true);
    expect(result.plan!.items.reduce((total, i) => total + i.action.estimatedMinutes, 0)).toBeLessThanOrEqual(EMPTY.minutes);
    expect(result.plan!.allStable).toBe(false);
    expect(result.states.every(s => s.mastery === null && s.retention === null)).toBe(true);
    expect(new Set(result.plan!.items.slice(0,3).map(i => SKILLS.find(s => s.id === i.action.topicId)!.domain)).size).toBe(3);
  });
  it("uses the explicit focus to choose among equal evidence checks", () => {
    const focus = SKILLS.at(-1)!.id;
    const result = dailyPlan({...EMPTY, planFocus:focus}, now);
    expect(result.plan!.items[0].action.topicId).toBe(focus);
    expect(actionDestination(result.plan!.items[0].action)).toContain(`skill=${focus}`);
  });
  it("does not count assisted or immediately repeated questions as independent breadth", () => {
    const q = BANK[0];
    const attempts = Array.from({length:10}, (_, i) => attempt(q.id, {hints:i === 0 ? 1 : 0}));
    const states = planningStates({...EMPTY, attempts});
    expect(states.find(s => s.topicId === q.skillNodeId)?.sampleSize).toBe(0);
  });
  it("can replace old failures with delayed independent success without increasing breadth", () => {
    const skill = SKILLS.find(s => BANK.filter(q => q.skillNodeId === s.id && q.applicationType !== "TRANSFER").length >= 3)!;
    const questions = BANK.filter(q => q.skillNodeId === skill.id && q.applicationType !== "TRANSFER").slice(0,3);
    const old = questions.map(q => attempt(q.id, {correct:false, at:new Date(now - 2 * 86400000).toISOString()}));
    const before = planningStates({...EMPTY, attempts:old}).find(s => s.topicId === skill.id)!;
    const after = planningStates({...EMPTY, attempts:[...old, ...questions.map(q => attempt(q.id))]}).find(s => s.topicId === skill.id)!;
    expect(before.mastery).toBe(0);
    expect(after.mastery).toBe(100);
    expect(after.sampleSize).toBe(3);
    expect(after.retention).toBeNull();
  });
  it("counts recall only after prior independent success and a day without exposure", () => {
    const skill = SKILLS.find(s => BANK.filter(q => q.skillNodeId === s.id).length >= 2)!;
    const qs = BANK.filter(q => q.skillNodeId === skill.id).slice(0,2);
    const attempts = qs.flatMap(q => [attempt(q.id, {at:new Date(now - 2 * 86400000).toISOString()}), attempt(q.id)]);
    const measured = planningStates({...EMPTY, attempts}).find(s => s.topicId === skill.id)!;
    expect(measured.retention).toBe(100);
    const recent = qs.map(q => attempt(q.id, {hints:2, at:new Date(now - 60000).toISOString()}));
    expect(planningStates({...EMPTY, attempts:[...attempts, ...recent]}).find(s => s.topicId === skill.id)!.retention).toBeNull();
  });
  it("does not prescribe speed from fast but inaccurate answers", () => {
    const attempts = BANK.map(q => attempt(q.id, {correct:false, durationMs:1000}));
    const result = dailyPlan({...EMPTY, attempts, goal:"Improve exam speed"}, now);
    expect(result.diagnoses.some(d => d.bottleneck === "SPEED_LIMIT")).toBe(false);
  });
  it("routes supported concept gaps to an existing lesson", () => {
    const skill = SKILLS.find(s => !s.prerequisiteSkillId && BANK.filter(q => q.skillNodeId === s.id && q.applicationType !== "TRANSFER").length >= 3)!;
    const attempts = BANK.filter(q => q.skillNodeId === skill.id && q.applicationType !== "TRANSFER").slice(0,3).map(q => attempt(q.id, {correct:false}));
    const result = dailyPlan({...EMPTY, attempts, planFocus:skill.id}, now);
    expect(result.diagnoses.find(d => d.topicId === skill.id)?.bottleneck).toBe("CONCEPT_GAP");
    const action = result.plan!.items.find(i => i.action.topicId === skill.id)!.action;
    expect(actionDestination(action)).toBe(`/learn?domain=${skill.domain}#skill-${skill.id}`);
  });
  it("offers pacing when enough independent correct answers were slow", () => {
    const skill = SKILLS.find(s => BANK.filter(q => q.skillNodeId === s.id && q.applicationType !== "TRANSFER").length >= 3)!;
    const attempts = BANK.filter(q => q.skillNodeId === skill.id && q.applicationType !== "TRANSFER").slice(0,3).map(q => attempt(q.id, {durationMs:q.estimatedTimeSeconds * 3000}));
    const result = dailyPlan({...EMPTY, minutes:120, attempts, goal:"Improve exam speed"}, now);
    expect(result.plan!.items[0].action.actionType).toBe("TIMED_PRACTICE");
    expect(actionDestination(result.plan!.items[0].action)).toContain("mode=speed");
  });
  it("subtracts today's measured duration and resets the budget on another day", () => {
    const state = {...EMPTY, minutes:5, attempts:[attempt(BANK[0].id, {durationMs:300000})]};
    expect(dailyPlan(state, now).plan).toBeNull();
    expect(dailyPlan(state, now + 86400000).remaining).toBe(5);
    expect(dailyPlan({...state, attempts:[attempt(BANK[0].id, {durationMs:240000})]}, now).plan!.exceedsBudget).toBe(true);
  });
});
