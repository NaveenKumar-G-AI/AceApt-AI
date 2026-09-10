"use client";
import { useEffect, useState } from "react";
import { METHOD_FAMILIES, methodReliability } from "@/lib/methods";
import type { LearningState } from "@/lib/learning";
import { useLearning } from "./LearningProvider";
export function MethodTrainer({
  method,
}: {
  method: LearningState["shortcuts"][number];
}) {
  const { state, update } = useLearning();
  const [mode, setMode] = useState<"baseline" | "shortcut">("baseline");
  const [drill, setDrill] = useState<{
    base: number;
    startedAt: number;
  } | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [interrupted, setInterrupted] = useState(false);
  useEffect(() => {
    const handler = () => {
      if (document.hidden) setInterrupted(true);
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);
  if (!method.definition) return null;
  const family = METHOD_FAMILIES[method.definition.family];
  const profile = methodReliability(state.methodAttempts, method.id);
  function start() {
    const used = new Set(
      state.methodAttempts
        .filter((a) => a.shortcutId === method.id && a.mode === mode)
        .map((a) => a.base),
    );
    const available = Array.from(
      { length: 100 },
      (_, i) => (i + 1) * 20,
    ).filter((x) => !used.has(x));
    if (!available.length) {
      setResult(
        "You’ve completed every value in this drill range. Use topic practice for new contexts.",
      );
      return;
    }
    setDrill({
      base: available[Math.floor(Math.random() * available.length)],
      startedAt: Date.now(),
    });
    setAnswer("");
    setResult("");
    setSubmitted(false);
    setInterrupted(false);
  }
  function submit(time: number) {
    if (!drill || submitted || !answer.trim()) return;
    const correct =
      Number.isFinite(Number(answer)) &&
      Math.abs(Number(answer) - family.calculate(drill.base)) < 0.001;
    const durationMs = Math.max(0, Math.min(86400000, time - drill.startedAt));
    if (!interrupted)
      update((s) => ({
        ...s,
        methodAttempts: [
          ...s.methodAttempts,
          {
            id: crypto.randomUUID(),
            shortcutId: method.id,
            base: drill.base,
            correct,
            durationMs,
            mode,
            at: new Date(time).toISOString(),
          },
        ].slice(-10000),
      }));
    setSubmitted(true);
    setResult(
      `${correct ? "Correct." : "Check the relationship."} The result is ${family.calculate(drill.base)}.${interrupted ? " This drill was interrupted, so it was not added to timing or reliability evidence." : ` ${Math.round(durationMs / 1000)} seconds recorded.`}`,
    );
  }
  return (
    <div className="method-training">
      <h3>Does this method work reliably for you?</h3>
      <p className="small-text">
        Current evidence:{" "}
        <strong>{profile.state.toLowerCase().replaceAll("_", " ")}</strong> ·{" "}
        {profile.uses} eligible shortcut uses · {profile.baselineCount} baseline
        successes
        {profile.accuracy !== null
          ? ` · ${Math.round(profile.accuracy * 100)}% accuracy`
          : ""}
      </p>
      {profile.timeSavedRatio !== null && (
        <p className="small-text">
          Measured time change compared with your earlier standard-method
          baseline: {Math.round(profile.timeSavedRatio * 100)}% faster
          {profile.timeSavedRatio < 0 ? " (negative means slower)" : ""}.
        </p>
      )}
      <p className="small-text">
        Record at least three standard-method successes first, then try the
        shortcut on fresh values. Saving a method does not make it reliable.
        Drills under one second or interrupted drills do not establish
        reliability.
      </p>
      <label>
        How will you solve this drill?
        <select
          value={mode}
          disabled={!!drill && !submitted}
          onChange={(e) => {
            setMode(e.target.value as "baseline" | "shortcut");
            setDrill(null);
            setResult("");
          }}
        >
          <option value="baseline">Use the standard method</option>
          <option value="shortcut">Use my saved shortcut</option>
        </select>
      </label>
      {(!drill || submitted) && (
        <button className="secondary" onClick={start}>
          {drill ? "Start another method drill" : "Start method drill"}
        </button>
      )}
      {drill && !submitted && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(Date.now());
          }}
        >
          <h3>
            {family.name}: x = {drill.base}
          </h3>
          <label>
            Calculated result
            <input
              inputMode="decimal"
              required
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
          </label>
          <button>Record this drill</button>
        </form>
      )}
      {result && (
        <p className="feedback" role="status">
          {result}
        </p>
      )}
    </div>
  );
}
