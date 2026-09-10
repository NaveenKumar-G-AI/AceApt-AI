"use client";
import { useState } from "react";
import { SEED_FORMULAS } from "@/engines/formulas/seed";
import { classifyFormulaError } from "@/engines/formulas/errors/formulaErrorClassifier";
import type { TrainingActivityType } from "@/engines/formulas/types";
import {
  FORMULA_ACTIVITIES,
  FORMULA_LABELS,
  formulaTask,
  recallMatches,
  retentionEligible,
} from "@/lib/formulaActivities";
import { useLearning } from "./LearningProvider";
export function FormulaLab() {
  const { state, update } = useLearning();
  const [index, setIndex] = useState(0);
  const [activity, setActivity] = useState<TrainingActivityType>("APPLY");
  const [formula, setFormula] = useState("");
  const [value, setValue] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const task = formulaTask(index, activity);
  const recall = activity === "RECALL" || activity === "RETAIN";
  const selection = ["SELECT", "RECOGNIZE", "APPLY"].includes(activity);
  const delayedReady = retentionEligible(
    state.formulaResults,
    task.formula.formulaId,
    startedAt,
  );
  function reset() {
    setSubmitted(false);
    setFeedback("");
    setFormula("");
    setValue("");
    setMapping({});
  }
  function check() {
    if (submitted || (activity === "RETAIN" && !delayedReady)) return;
    const formulaCorrect = recall
      ? recallMatches(value, index)
      : selection
        ? formula === task.formula.formulaId
        : true;
    const mappingCorrect = Object.entries(task.context.mapping).every(
      ([key, expected]) =>
        mapping[key]?.trim() && Number(mapping[key]) === expected,
    );
    const numericCorrect =
      value.trim() !== "" &&
      Number.isFinite(Number(value)) &&
      Math.abs(Number(value) - task.expected) < 0.001;
    const error = !formulaCorrect
      ? classifyFormulaError({
          activityType: recall ? "RECALL" : "SELECT",
          formulaCorrect: false,
          chosenFormulaRelatedToExpected:
            formula.includes("interest") &&
            task.formula.formulaId.includes("interest"),
        })
      : classifyFormulaError({
          activityType: activity,
          mappingCorrect: activity === "MAP" ? mappingCorrect : undefined,
          arithmeticCorrect: ["APPLY", "TRANSFER"].includes(activity)
            ? numericCorrect
            : undefined,
          verificationCorrect:
            activity === "VERIFY" ? value === "invalid" : undefined,
        });
    const correct = !error;
    setSubmitted(true);
    setFeedback(
      correct
        ? "Correct formula and calculation. " +
            (recall
              ? task.formula.canonicalExpression
              : activity === "MAP"
                ? "The given quantities are mapped to the right variables."
                : task.explanation)
        : error === "FORMULA_CONDITION_ERROR"
          ? "Check the interest conditions: does earned interest become part of the next period?s balance?"
          : error === "FORMULA_RECALL_ERROR"
            ? "Recheck the relationship and its target variable. Use the listed symbols, =, and ordinary arithmetic operators."
            : error === "VARIABLE_MAPPING_ERROR"
              ? "Check each quantity against the meaning and units of its variable."
              : error === "FORMULA_VERIFICATION_ERROR"
                ? "Substitute the proposed answer back into the relationship. Does it satisfy the question?"
                : !formulaCorrect
                  ? "Choose the relationship whose assumptions match this problem."
                  : "The relationship is right; recheck the substitution and arithmetic.",
    );
    update((s) => ({
      ...s,
      formulaResults: [
        ...s.formulaResults,
        {
          id: crypto.randomUUID(),
          formulaId: task.formula.formulaId,
          activity,
          correct,
          at: new Date().toISOString(),
        },
      ].slice(-10000),
    }));
  }
  return (
    <>
      <div className="skill-grid">
        {SEED_FORMULAS.map((f) => (
          <article className="card" key={f.formulaId}>
            <span className="tag">{f.domain}</span>
            <h3>{f.canonicalName}</h3>
            <details>
              <summary>Study the relationship and conditions</summary>
              <div className="formula">{f.canonicalExpression}</div>
              <p>{f.meaning}</p>
              <p>{f.conditions.whenToUse}</p>
              <p>
                <strong>Watch out:</strong> {f.conditions.whenNotToUse}
              </p>
              {f.variables.map((v) => (
                <p key={v.symbol}>
                  {v.symbol}: {v.meaning} ({v.unit})
                </p>
              ))}
            </details>
            <details>
              <summary>Rearranged forms</summary>
              {f.derivedForms.map((d) => (
                <p key={d.targetVariable}>{d.expression}</p>
              ))}
            </details>
          </article>
        ))}
      </div>
      <section className="card guided-card">
        <div className="practice-config">
          <label>
            Formula family
            <select
              value={index}
              onChange={(e) => {
                setIndex(Number(e.target.value));
                reset();
              }}
            >
              {SEED_FORMULAS.map((f, i) => (
                <option key={f.formulaId} value={i}>
                  {f.canonicalName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Training activity
            <select
              value={activity}
              onChange={(e) => {
                setActivity(e.target.value as TrainingActivityType);
                reset();
              }}
            >
              {FORMULA_ACTIVITIES.map((a) => (
                <option key={a} value={a}>
                  {FORMULA_LABELS[a]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <span className="tag">{FORMULA_LABELS[activity]}</span>
        <h2>{task.prompt}</h2>
        {activity === "RETAIN" && !delayedReady ? (
          <p className="notice">
            Complete a successful activity for this formula, then return at
            least 24 hours after the latest success for a delayed recall check.
            Other activities are available now.
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              check();
            }}
          >
            {selection && (
              <label>
                Which relationship fits?
                <select
                  required
                  disabled={submitted}
                  value={formula}
                  onChange={(e) => setFormula(e.target.value)}
                >
                  <option value="">Select a formula</option>
                  {SEED_FORMULAS.map((f) => (
                    <option key={f.formulaId} value={f.formulaId}>
                      {f.canonicalName}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {activity === "MAP" ? (
              Object.entries(task.context.mapping).map(([symbol]) => (
                <label key={symbol}>
                  Value of {symbol}
                  <input
                    disabled={submitted}
                    required
                    inputMode="decimal"
                    value={mapping[symbol] ?? ""}
                    onChange={(e) =>
                      setMapping({ ...mapping, [symbol]: e.target.value })
                    }
                  />
                </label>
              ))
            ) : activity === "VERIFY" ? (
              <label>
                Does the proposed answer satisfy the problem?
                <select
                  required
                  value={value}
                  disabled={submitted}
                  onChange={(e) => setValue(e.target.value)}
                >
                  <option value="">Choose your check</option>
                  <option value="valid">Valid</option>
                  <option value="invalid">Invalid</option>
                </select>
              </label>
            ) : (
              !["SELECT", "RECOGNIZE"].includes(activity) && (
                <label>
                  {recall ? "Your recalled equation" : "Your numeric result"}
                  <input
                    required
                    maxLength={120}
                    disabled={submitted}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  />
                </label>
              )
            )}
            <button disabled={submitted}>Check formula &amp; result</button>
          </form>
        )}
        {feedback && (
          <p className="feedback" role="status">
            {feedback}
          </p>
        )}
        {submitted && (
          <button
            className="secondary"
            onClick={() => {
              setIndex((index + 1) % SEED_FORMULAS.length);
              reset();
            }}
          >
            Next formula challenge
          </button>
        )}
        <p className="muted small-text">
          {state.formulaResults.length} formula attempts saved. These practice
          activities are separate from diagnostic mastery evidence. Close the
          study panels before testing your recall.
        </p>
      </section>
    </>
  );
}
