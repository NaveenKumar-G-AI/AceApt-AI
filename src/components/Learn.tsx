"use client";
import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Lightbulb } from "lucide-react";
import { BANK, SKILLS } from "@/lib/learning";
import { PageHeading } from "./Workspace";
import { SAMPLE_QUESTIONS } from "@/engines/hints/domain/sampleData";
import {
  AssessmentMode,
  DependencyState,
  MistakeSignal,
  TriggerType,
} from "@/engines/hints/domain/types";
import { decide } from "@/engines/hints/policy/hintPolicyEngine";
import {
  generateChangeAmountProblem,
  generatePercentageProblem,
} from "@/engines/teaching/questionBank";
import { evaluateTeachBack } from "@/engines/teaching/teachBack";
import dynamic from "next/dynamic";
const FormulaLab = dynamic(
  () => import("./FormulaLab").then((m) => m.FormulaLab),
  { loading: () => <p>Opening the formula lab?</p> },
);
export function Learn() {
  const params = useSearchParams();
  const domain = params.get("domain");
  return <LearnContent key={params.toString()} initialDomain={domain && ["QUANTITATIVE", "LOGICAL", "VERBAL"].includes(domain) ? domain : "ALL"}/>;
}
function LearnContent({initialDomain}: {initialDomain: string}) {
  const [tab, setTab] = useState("concepts");
  const [domain, setDomain] = useState(initialDomain);
  return (
    <>
      <PageHeading
        eyebrow="UNDERSTAND BEFORE YOU MEMORISE"
        title="Make the method your own."
        description="Explore a concept, practise the reasoning one step at a time, and test it in a new problem."
      />
      <div className="tabs" role="tablist" aria-label="Learning mode">
        {[
          ["concepts", "Concept library"],
          ["guided", "Guided solving"],
          ["socratic", "Think it through"],
          ["formulas", "Formula lab"],
        ].map(([id, title]) => (
          <button
            role="tab"
            aria-selected={tab === id}
            key={id}
            className={tab === id ? "selected" : ""}
            onClick={() => setTab(id)}
          >
            {title}
          </button>
        ))}
      </div>
      {tab === "concepts" ? (
        <>
          <label className="filter-label">
            Explore a domain
            <select value={domain} onChange={(e) => setDomain(e.target.value)}>
              <option value="ALL">All aptitude skills</option>
              <option value="QUANTITATIVE">Quantitative</option>
              <option value="LOGICAL">Logical</option>
              <option value="VERBAL">Verbal</option>
            </select>
          </label>
          <div className="skill-grid">
            {SKILLS.filter((s) => domain === "ALL" || s.domain === domain).map(
              (s) => (
                <article className="card" key={s.id} id={`skill-${s.id}`}>
                  <span className="tag">{s.domain.toLowerCase()}</span>
                  <h3>{s.displayName}</h3>
                  <p>{s.description}</p>
                  {s.prerequisiteSkillId && (
                    <p className="small-text">
                      Build on:{" "}
                      {
                        SKILLS.find((p) => p.id === s.prerequisiteSkillId)
                          ?.displayName
                      }
                    </p>
                  )}
                  <details>
                    <summary>Explore a worked example</summary>
                    <p>
                      {BANK.find((q) => q.skillNodeId === s.id)?.questionText}
                    </p>
                    <p>
                      {BANK.find((q) => q.skillNodeId === s.id)?.explanation}
                    </p>
                  </details>
                  <Link className="text-link" href={`/practice?skill=${s.id}`}>
                    Try it yourself <ArrowRight size={15} />
                  </Link>
                </article>
              ),
            )}
          </div>
        </>
      ) : tab === "guided" ? (
        <Guided />
      ) : tab === "socratic" ? (
        <Socratic />
      ) : (
        <FormulaLab />
      )}
    </>
  );
}
function Guided() {
  const [id, setId] = useState(SAMPLE_QUESTIONS[0].problemId);
  return (
    <>
      <label className="filter-label">
        Choose a problem
        <select value={id} onChange={(e) => setId(e.target.value)}>
          {SAMPLE_QUESTIONS.map((q) => (
            <option key={q.problemId} value={q.problemId}>
              {q.skillId.toLowerCase().replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <GuidedProblem key={id} id={id} />
    </>
  );
}
function GuidedProblem({ id }: { id: string }) {
  const q = SAMPLE_QUESTIONS.find((q) => q.problemId === id)!;
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [hint, setHint] = useState("");
  const [count, setCount] = useState(0);
  const [passed, setPassed] = useState(false);
  const current = q.solutionSteps[step];
  const strategy =
    q.skillId === "PERCENTAGE"
      ? [
          "Compare the increase with the original value",
          "Compare the increase with the new value",
        ]
      : q.skillId === "PROBABILITY"
        ? [
            "Count all equally likely outcomes first",
            "Add the probabilities without counting outcomes",
          ]
        : [
            "Start with the fixed position and strongest constraint",
            "Place the least constrained person first",
          ];
  function check() {
    const mistake =
      q.classifyMistake?.(current.stepId, answer.trim()) ??
      MistakeSignal.NO_ATTEMPT;
    setCount((c) => c + 1);
    if (mistake === MistakeSignal.NONE) {
      setPassed(true);
      setFeedback("This step is correct. " + current.explanation);
    } else {
      setFeedback(
        mistake === MistakeSignal.WRONG_REFERENCE_VALUE
          ? "Check your reference value: a percentage change uses the original amount."
          : mistake === MistakeSignal.WRONG_FORMULA ||
              mistake === MistakeSignal.WRONG_STRATEGY
            ? "Reconsider which relationship or constraint should guide this step."
            : "Recheck the calculation or deduction in this step.",
      );
    }
  }
  function requestHint() {
    const policy = decide({
      studentId: "local",
      sessionId: "guided",
      problemId: id,
      stepId: current.stepId,
      skillId: q.skillId,
      difficulty: q.difficulty,
      trigger: TriggerType.EXPLICIT_REQUEST,
      attemptCountOnStep: count,
      sameErrorStreak: count,
      timeOnStepMs: 0,
      medianTimeForStepMs: 60000,
      priorHintsThisStep: [],
      priorOutcomesThisStep: [],
      dependencyState: DependencyState.UNKNOWN,
      assessmentMode: AssessmentMode.GUIDED,
      hintsExplicitlyPermittedInAssessment: false,
    });
    setHint(
      policy.shouldOffer
        ? step === 0
          ? "Identify what stays fixed. Use that as your starting point, then test each possible approach."
          : "Use your chosen relationship, substitute the given values, and check one operation at a time."
        : "Try a step yourself first.",
    );
  }
  return (
    <section className="card guided-card">
      <span className="tag">
        Step {step + 1} of {q.solutionSteps.length}
      </span>
      <h2>{q.prompt}</h2>
      <h3>{current.title}</h3>
      {step === 0 ? (
        <label>
          Choose an approach
          <select
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={passed}
          >
            <option value="">Choose an approach</option>
            <option value="opt_wrong">{strategy[1]}</option>
            <option value="opt_correct">{strategy[0]}</option>
          </select>
        </label>
      ) : (
        <label>
          Your result
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={passed}
            placeholder={
              q.skillId === "LOGICAL_PUZZLE"
                ? "Person’s letter"
                : "Numeric result"
            }
          />
        </label>
      )}
      <div className="button-row">
        <button disabled={!answer || passed} onClick={check}>
          Check this step
        </button>
        <button className="secondary" onClick={requestHint} disabled={passed}>
          <Lightbulb size={16} /> A small hint
        </button>
        {passed && step < q.solutionSteps.length - 1 && (
          <button
            onClick={() => {
              setStep((s) => s + 1);
              setAnswer("");
              setPassed(false);
              setFeedback("");
              setHint("");
              setCount(0);
            }}
          >
            Next step
          </button>
        )}
      </div>
      {hint && <p className="hint">{hint}</p>}
      {feedback && (
        <p role="status" className="feedback">
          {feedback}
        </p>
      )}
      {passed && step === q.solutionSteps.length - 1 && (
        <div className="feedback correct">
          <h3>You worked through the method.</h3>
          <p>
            The answer is {q.finalAnswer}. Guided completion is not counted as
            unaided mastery.
          </p>
          <Link className="button" href="/practice?mode=transfer">
            Try an independent variation
          </Link>
        </div>
      )}
    </section>
  );
}
function Socratic() {
  const [problem] = useState(() => generatePercentageProblem());
  const [verify] = useState(() =>
    generateChangeAmountProblem(Math.random, problem),
  );
  const [stage, setStage] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [done, setDone] = useState(false);
  const base = Number(problem.variables.base);
  const prompts = [
    `Which number is the original, or base, value?`,
    `What is the increase in the original value?`,
    `What is the new total?`,
    `Explain why percentage change is divided by the original value, rather than the final value.`,
    verify.prompt,
  ];
  function check() {
    if (stage === 3) {
      const result = evaluateTeachBack(answer, [
        "identifies_original_value",
        "selects_correct_reference",
        "explains_reasoning",
      ]);
      if (!result.passed) {
        setFeedback(
          "Explain which value is the base, why you divide by it, and how that creates a percentage. This is a simple coverage check, not a complete reasoning assessment.",
        );
        return;
      }
    } else {
      const expected = [
        base,
        Number(problem.variables.changeAmount),
        problem.trustedAnswer,
        0,
        verify.trustedAnswer,
      ][stage];
      if (
        !answer.trim() ||
        !Number.isFinite(Number(answer)) ||
        Math.abs(Number(answer) - expected) > 0.01
      ) {
        setFeedback(
          stage === 0
            ? "Look for the amount before the increase."
            : stage === 1
              ? "Apply the percentage to the original amount."
              : stage === 2
                ? "Add the increase to the original amount."
                : "This question asks for the increase itself. Try applying the percentage to the base.",
        );
        return;
      }
    }
    setFeedback(
      stage === 4
        ? "You solved a new variation independently. Keep practising across different contexts."
        : "Good. Now take the next reasoning step.",
    );
    setAnswer("");
    if (stage === 4) setDone(true);
    else setStage((s) => s + 1);
  }
  return (
    <section className="card guided-card">
      <span className="tag">Understand → reason → verify</span>
      <h2>{problem.prompt}</h2>
      <p>
        We’ll work through the idea, then you’ll explain it and try a different
        question. This exercise is not an exam score.
      </p>
      {!done && (
        <>
          <h3>{prompts[stage]}</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              check();
            }}
          >
            <label>
              Your reasoning or answer
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                required
                maxLength={2000}
                rows={3}
              />
            </label>
            <button disabled={!answer.trim()}>Try this step</button>
          </form>
        </>
      )}
      {feedback && (
        <p className="feedback" role="status">
          {feedback}
        </p>
      )}
      {done && (
        <Link className="button" href="/practice?skill=Q_PCT_A">
          Practise percentage application <ArrowRight size={16} />
        </Link>
      )}
    </section>
  );
}
