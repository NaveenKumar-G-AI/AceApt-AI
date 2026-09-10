"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Bookmark,
  Check,
  Clock,
  Lightbulb,
  Target,
} from "lucide-react";
import { useLearning } from "./LearningProvider";
import { PageHeading, Empty } from "./Workspace";
import {
  BANK,
  SKILLS,
  modes,
  nextQuestion,
  type Mode,
  type Attempt,
  type LearningState,
} from "@/lib/learning";
import { evaluateStoppingCondition } from "@/lib/domain/selectionEngine";
import { capability } from "@/lib/learning";
import { TutorBox } from "./Tutor";
import { checkAccuracyGuardrail } from "@/engines/speed/accuracyGuardrail";
import { speedCoaching, speedScope } from "@/lib/speed";
const modeInfo: Record<Mode, { title: string; description: string }> = {
  practice: {
    title: "Adaptive practice",
    description: "Build fluency with feedback and graduated hints.",
  },
  diagnostic: {
    title: "Find my starting point",
    description:
      "14–28 adaptive questions across the three domains. No assistance.",
  },
  simulation: {
    title: "Exam simulation",
    description:
      "10 questions in 12 minutes. +1 correct, −0.25 incorrect, 0 skipped.",
  },
  speed: {
    title: "Speed training",
    description:
      "Five questions with a suggested time target. Accuracy comes first.",
  },
  accuracy: {
    title: "Accuracy training",
    description:
      "Five deliberate attempts. Check the reference, units and calculation.",
  },
  revision: {
    title: "Recall & revision",
    description:
      "Revisit missed or assisted questions before checking their method.",
  },
  transfer: {
    title: "Transfer challenge",
    description: "Use familiar ideas in unfamiliar variations.",
  },
};
export function Practice(){
  const params=useSearchParams();const requested=params.get('mode');const initialMode=modes.includes(requested as Mode)?requested as Mode:'practice';const skill=params.get('skill')||'';
  return <PracticeSession key={params.toString()} initialMode={initialMode} initialSkill={initialMode==='diagnostic'||initialMode==='simulation'?'':SKILLS.some(s=>s.id===skill)?skill:''} hasSelection={params.has('mode')||params.has('skill')}/>;
}
function PracticeSession({initialMode,initialSkill,hasSelection}:{initialMode:Mode;initialSkill:string;hasSelection:boolean}){
  const {state,update}=useLearning();
  const [mode,setMode]=useState<Mode>(initialMode);const [skill,setSkill]=useState(initialSkill);
  const [message,setMessage]=useState('');
  const [completedOnEntry]=useState(()=>state.active?.complete?state.active.id:null);
  const [keepSession, setKeepSession] = useState(false);
  const [now, setNow] = useState(0);
  const active = state.active?.id===completedOnEntry && hasSelection ? null : state.active;
  const q = BANK.find((q) => q.id === active?.questionId);
  const coaching =
    active?.mode === "speed" && q
      ? speedCoaching(
          state.attempts,
          q,
          active.id,
          state.speedTargets[speedScope(q)] ?? 1,
        )
      : null;
  const sessionAttempts = state.attempts.filter(
    (a) => a.sessionId === active?.id,
  );
  const assessment =
    active?.mode === "diagnostic" || active?.mode === "simulation";
  const sessionId = active?.id;
  const questionId = active?.questionId;
  useEffect(() => {
    if (!sessionId || !questionId) return;
    let running = false;
    const resume = () => {
      if (running || document.hidden) return;
      running = true;
      const time = Date.now();
      update((s) =>
        s.active?.id === sessionId &&
        s.active.questionId === questionId &&
        !s.active.submitted &&
        !s.active.complete
          ? { ...s, active: { ...s.active, startedAt: time } }
          : s,
      );
    };
    const pause = () => {
      if (!running) return;
      running = false;
      const time = Date.now();
      update((s) =>
        s.active?.id === sessionId &&
        s.active.questionId === questionId &&
        !s.active.submitted &&
        !s.active.complete
          ? {
              ...s,
              active: {
                ...s.active,
                elapsedMs: Math.min(
                  86400000,
                  s.active.elapsedMs + Math.max(0, time - s.active.startedAt),
                ),
                startedAt: time,
              },
            }
          : s,
      );
    };
    const visibility = () => (document.hidden ? pause() : resume());
    resume();
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", pause);
    return () => {
      pause();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", pause);
    };
  }, [sessionId, questionId, update]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (active?.deadline && !active.complete && Date.now() >= active.deadline) {
      update((s) =>
        s.active?.id === active.id
          ? { ...s, active: { ...s.active, complete: true } }
          : s,
      );
    }
  }, [now, active, update]);
  function start() {
    const id = crypto.randomUUID();
    const selected = nextQuestion(
      state.attempts,
      mode,
      mode === "diagnostic" || mode === "simulation" ? "" : skill,
      id,
    );
    if (!selected) {
      setMessage(
        "No questions match this selection. Choose another skill or start adaptive practice.",
      );
      return;
    }
    const time = Date.now();
    update((s) => ({
      ...s,
      active: {
        id,
        mode,
        skillId: mode === "diagnostic" || mode === "simulation" ? "" : skill,
        questionId: selected.id,
        startedAt: time,
        elapsedMs: 0,
        deadline: mode === "simulation" ? time + 720000 : null,
        answer: "",
        hints: 0,
        confidence: 3,
        submitted: false,
        complete: false,
      },
    }));
    setMessage("");
  }
  function change(patch: Partial<NonNullable<LearningState["active"]>>) {
    update((s) => (s.active ? { ...s, active: { ...s.active, ...patch } } : s));
  }
  function submit(skip: boolean, time: number) {
    if (
      !active ||
      !q ||
      active.submitted ||
      active.complete ||
      (!skip && !active.answer)
    )
      return;
    const attempt: Attempt = {
      id: crypto.randomUUID(),
      questionId: q.id,
      sessionId: active.id,
      answer: skip ? null : active.answer,
      correct: !skip && active.answer === q.correctAnswer,
      durationMs: Math.max(
        0,
        Math.min(86400000, active.elapsedMs + time - active.startedAt),
      ),
      hints: active.hints,
      confidence: active.confidence,
      at: new Date(time).toISOString(),
      mode: active.mode,
    };
    update((s) =>
      s.active?.submitted || s.active?.complete
        ? s
        : {
            ...s,
            attempts: [...s.attempts, attempt].slice(-10000),
            active: s.active ? { ...s.active, submitted: true } : null,
          },
    );
  }
  function next(time: number) {
    if (!active) return;
    if (active.mode === "speed" && q && coaching)
      update((s) => ({
        ...s,
        speedTargets: {
          ...s.speedTargets,
          [speedScope(q)]: coaching.nextRatio,
        },
      }));
    const diagnosticDone =
      active.mode === "diagnostic" &&
      evaluateStoppingCondition(
        capability(sessionAttempts),
        SKILLS,
        BANK.length,
      ).stop;
    const count =
      active.mode === "simulation" ? 10 : active.mode === "diagnostic" ? 28 : 5;
    if (sessionAttempts.length >= count || diagnosticDone) {
      change({ complete: true });
      return;
    }
    const selected = nextQuestion(
      state.attempts,
      active.mode,
      active.skillId,
      active.id,
    );
    if (!selected) {
      change({ complete: true });
      return;
    }
    change({
      questionId: selected.id,
      startedAt: time,
      elapsedMs: 0,
      answer: "",
      hints: 0,
      confidence: 3,
      submitted: false,
    });
  }
  const elapsed = active
    ? Math.max(
        0,
        Math.floor(
          (active.submitted
            ? (sessionAttempts.find((a) => a.questionId === active.questionId)
                ?.durationMs ?? 0)
            : active.elapsedMs +
              Math.max(0, (now || active.startedAt) - active.startedAt)) / 1000,
        ),
      )
    : 0;
  if (
    active &&
    !active.complete &&
    hasSelection &&
    !keepSession &&
    (active.mode !== mode ||
      active.skillId !== (mode === "diagnostic" || mode === "simulation" ? "" : skill))
  )
    return (
      <>
        <PageHeading
          eyebrow="CONTINUE OR CHANGE YOUR FOCUS"
          title="A practice session is already open."
          description="Your recorded attempts are saved. You can continue this session or replace its unfinished question with your selected practice."
        />
        <section className="card">
          <h2>Current session: {modeInfo[active.mode].title}</h2>
          <p>
            Selected session: {modeInfo[mode].title}
            {skill
              ? ` · ${SKILLS.find((s) => s.id === skill)?.displayName ?? "selected skill"}`
              : ""}
          </p>
          <div className="button-row">
            <button onClick={() => setKeepSession(true)}>
              Continue current session
            </button>
            <button className="secondary" onClick={start}>
              Start selected session
            </button>
          </div>
          {message && (
            <p className="notice" role="status">
              {message}
            </p>
          )}
        </section>
      </>
    );
  if (!active)
    return (
      <>
        <PageHeading
          eyebrow="YOUR PRACTICE STUDIO"
          title="A little challenge. A lot of learning."
          description="Choose a mode, set your focus, and take the next step at your own pace."
        />
        <div className="mode-grid">
          {modes.map((m) => (
            <button
              key={m}
              className={`mode-card ${mode === m ? "selected" : ""}`}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
            >
              <Target size={22} />
              <h3>{modeInfo[m].title}</h3>
              <p>{modeInfo[m].description}</p>
              {mode === m && <Check className="selection-check" size={18} />}
            </button>
          ))}
        </div>
        <div className="card practice-config">
          <label>
            Focus area
            <select
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              disabled={mode === "diagnostic" || mode === "simulation"}
            >
              <option value="">All skills</option>
              {SKILLS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayName}
                </option>
              ))}
            </select>
          </label>
          <p>
            {mode === "diagnostic" || mode === "simulation"
              ? "This mode covers quantitative, logical, and verbal reasoning."
              : "A regular session contains up to five questions. You can pause by navigating away."}
          </p>
          <button onClick={start}>
            Start session <ArrowRight size={17} />
          </button>
        </div>
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
      </>
    );
  if (active.complete) {
    const correct = sessionAttempts.filter((a) => a.correct).length;
    const wrong = sessionAttempts.filter(
      (a) => a.answer !== null && !a.correct,
    ).length;
    return (
      <>
        <PageHeading
          eyebrow="SESSION COMPLETE"
          title="Every attempt gives you a next step."
          description={`${sessionAttempts.length} questions attempted. Your history has been updated on this device.`}
        />
        <div className="stats-grid">
          <div className="card">
            <h2>{correct}</h2>
            <p>Correct answers</p>
          </div>
          <div className="card">
            <h2>{sessionAttempts.filter((a) => a.hints > 0).length}</h2>
            <p>Assisted attempts</p>
          </div>
          <div className="card">
            <h2>
              {active.mode === "simulation"
                ? (correct - wrong * 0.25).toFixed(2)
                : sessionAttempts.length
                  ? Math.round((correct / sessionAttempts.length) * 100) + "%"
                  : "—"}
            </h2>
            <p>
              {active.mode === "simulation"
                ? "Simulation score / 10"
                : "Session accuracy"}
            </p>
          </div>
        </div>
        <div className="card">
          <h2>Reflect on the method</h2>
          <p>
            A single session doesn’t establish mastery. Come back to these ideas
            in varied questions and after a delay.
          </p>
          {sessionAttempts.map((a) => {
            const question = BANK.find((q) => q.id === a.questionId)!;
            return (
              <details key={a.id}>
                <summary>
                  {a.correct ? "Correct" : "Review"} · {question.questionText}
                </summary>
                <p>
                  Your answer: {a.answer ?? "Skipped"} · Correct answer:{" "}
                  {question.correctAnswer}
                </p>
                <p>{question.explanation}</p>
              </details>
            );
          })}
          <div className="button-row">
            <button onClick={() => update((s) => ({ ...s, active: null }))}>
              Choose next practice
            </button>
            <Link className="button secondary" href="/progress">
              View learning path
            </Link>
          </div>
        </div>
      </>
    );
  }
  if (!q)
    return (
      <Empty
        title="This question is no longer available"
        description="Reset the session in Preferences to choose another practice."
        href="/settings"
        label="Open preferences"
      />
    );
  const last = sessionAttempts.find((a) => a.questionId === q.id);
  const bookmarked = state.bookmarks.includes(q.id);
  return (
    <>
      <PageHeading
        eyebrow={modeInfo[active.mode].title.toUpperCase()}
        title={
          assessment
            ? "Let your own reasoning lead."
            : "Take the next step yourself."
        }
        description={
          assessment
            ? "Hints and feedback become available after the assessment."
            : "Think it through, try an answer, and use a hint when you need one."
        }
      >
        <button
          className="button secondary"
          onClick={() => change({ complete: true })}
        >
          Finish session
        </button>
      </PageHeading>
      <div className="runner-layout">
        <section className="card question-card">
          <div className="question-meta">
            <span className="tag">
              Question {sessionAttempts.length + (active.submitted ? 0 : 1)}
            </span>
            <span>
              <Clock size={15} />
              {active.deadline
                ? `${Math.max(0, Math.ceil((active.deadline - (now || active.startedAt)) / 1000))}s remaining`
                : `${elapsed}s`}
            </span>
            <button
              className="icon-button"
              aria-label={bookmarked ? "Remove bookmark" : "Bookmark question"}
              onClick={() =>
                update((s) => ({
                  ...s,
                  bookmarks: bookmarked
                    ? s.bookmarks.filter((id) => id !== q.id)
                    : [...s.bookmarks, q.id],
                }))
              }
            >
              <Bookmark size={19} fill={bookmarked ? "currentColor" : "none"} />
            </button>
          </div>
          {!assessment && (
            <div className="eyebrow">
              {SKILLS.find((s) => s.id === q.skillNodeId)?.displayName} · Level{" "}
              {q.difficulty}
            </div>
          )}
          <h2 className="question-text">{q.questionText}</h2>
          {active.mode === "speed" && (
            <p className="notice">
              Practice target:{" "}
              {Math.round(
                (coaching?.targetMs ?? q.estimatedTimeSeconds * 1000) / 1000,
              )}
              s (
              {coaching?.baseline
                ? "based on your comparable attempts"
                : "authored estimate"}
              ).{" "}
              {sessionAttempts.length >= 3 &&
              checkAccuracyGuardrail(
                sessionAttempts.slice(-5).map((a) => a.correct),
                0.85,
              ).breached
                ? "Accuracy has dropped below the 85% practice guardrail. Slow down and rebuild a reliable method. "
                : ""}{" "}
              {elapsed > q.estimatedTimeSeconds
                ? "Keep reasoning carefully; don’t rush into a guess."
                : "Find a clean method before increasing speed."}
              {coaching && (
                <>
                  <br />
                  {coaching.decision.message}{" "}
                  <span className="small-text">
                    {coaching.sampleSize} comparable unaided attempts. Targets
                    adapt only within the same skill, difficulty and transfer
                    category.
                  </span>
                </>
              )}
            </p>
          )}
          {active.mode === "accuracy" && (
            <p className="notice">
              Before submitting: check the original value, units, arithmetic,
              and whether your answer is plausible.
            </p>
          )}
          <fieldset className="options" disabled={active.submitted}>
            <legend className="sr-only">Choose your answer</legend>
            {q.options.map((option, i) => (
              <label
                key={option}
                className={`answer-option ${active.answer === option ? "chosen" : ""}`}
              >
                <input
                  type="radio"
                  name="answer"
                  value={option}
                  checked={active.answer === option}
                  onChange={() => change({ answer: option })}
                />
                <span className="option-letter">
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{option}</span>
              </label>
            ))}
          </fieldset>
          <label className="confidence-label">
            How confident are you?
            <select
              disabled={active.submitted}
              value={active.confidence}
              onChange={(e) => change({ confidence: Number(e.target.value) })}
            >
              {[
                "Guessing",
                "Not sure",
                "Somewhat confident",
                "Confident",
                "Very confident",
              ].map((label, i) => (
                <option key={label} value={i + 1}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="button-row">
            {active.submitted ? (
              <button onClick={() => next(Date.now())}>
                Continue <ArrowRight size={16} />
              </button>
            ) : (
              <>
                <button
                  onClick={() => submit(false, Date.now())}
                  disabled={!active.answer}
                >
                  Submit answer
                </button>
                <button
                  className="secondary"
                  onClick={() => submit(true, Date.now())}
                >
                  Skip for now
                </button>
              </>
            )}
          </div>
          {active.submitted &&
            (assessment ? (
              <p className="notice" role="status">
                Answer recorded. Continue with the next question.
              </p>
            ) : (
              <div
                className={`feedback ${last?.correct ? "correct" : "review"}`}
                role="status"
              >
                <h3>
                  {last?.correct
                    ? "That’s right. Make the method yours."
                    : "Let’s find the useful lesson."}
                </h3>
                <p>
                  Correct answer: <strong>{q.correctAnswer}</strong>
                </p>
                <p>{q.explanation}</p>
                {last?.confidence === 1 && last.correct && (
                  <p>
                    You reported guessing. Explain the method before treating
                    this as understanding.
                  </p>
                )}
              </div>
            ))}
        </section>
        <aside className="practice-help">
          {assessment ? (
            <section className="card">
              <Target size={25} />
              <h3>A clear starting point</h3>
              <p>
                Work independently. Skipping is useful information too. You can
                review all solution steps when you finish.
              </p>
            </section>
          ) : (
            <>
              <section className="card">
                <Lightbulb size={23} />
                <h3>A nudge, when you need it.</h3>
                <p>
                  Start with the idea, then ask for a little more direction.
                </p>
                <button
                  className="secondary"
                  disabled={active.submitted || active.hints >= 3}
                  onClick={() =>
                    change({ hints: Math.min(3, active.hints + 1) })
                  }
                >
                  Show a hint
                </button>
                {active.hints > 0 && (
                  <p className="hint" role="status">
                    {active.hints === 1
                      ? `What does this ask you to find? Identify the given information and connect it to ${SKILLS.find((s) => s.id === q.skillNodeId)?.concept?.toLowerCase() ?? "the relevant concept"}.`
                      : active.hints === 2
                        ? "Break the problem into one operation at a time. Check which value or condition each operation uses."
                        : (q.expectedReasoning ??
                          "Write down your first step, check it, and then continue.")}
                  </p>
                )}
              </section>
              <TutorBox
                key={q.id}
                questionId={q.id}
                context={q.questionText}
                onRequest={() => {
                  if (!active.submitted)
                    change({ hints: Math.max(active.hints, 4) });
                }}
              />
            </>
          )}
        </aside>
      </div>
    </>
  );
}
