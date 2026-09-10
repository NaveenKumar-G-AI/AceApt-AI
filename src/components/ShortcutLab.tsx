"use client";
import { useState } from "react";
import { runPropertyBasedValidation } from "@/engines/shortcuts/validation";
import { useLearning } from "./LearningProvider";
import { METHOD_FAMILIES as families } from "@/lib/methods";
export function ShortcutLab() {
  const { update } = useLearning();
  const [family, setFamily] = useState(0);
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState("");
  const [passed, setPassed] = useState(false);
  const [saved, setSaved] = useState(false);
  function validate() {
    setSaved(false);
    setPassed(false);
    if (
      !/^[x\d\s.+*/()-]{1,120}$/.test(expression) ||
      expression.includes("**")
    ) {
      setResult(
        "Use x, numbers, parentheses, and + − * / only. Keep the expression under 120 characters.",
      );
      return;
    }
    const report = runPropertyBasedValidation(
      expression,
      families[family].canonical,
      { variables: { x: { min: 0, max: 10000 } } },
      { sampleCount: 200, seed: 42 },
    );
    setPassed(report.status === "PASS");
    setResult(
      report.status === "PASS"
        ? `All ${report.samplesTested} sampled and boundary values agreed for x between 0 and 10,000. This is a numerical check, not an algebraic proof or evidence that you can execute it reliably.`
        : `The methods disagree or are undefined for at least one checked value. Try x = ${report.failures[0]?.input.x.toFixed(2)} and compare both calculations.`,
    );
  }
  return (
    <section className="card">
      <h3>Check a numerical shortcut</h3>
      <p>
        Compare a method with a known relationship before saving it. In this
        exercise, x is the original quantity.
      </p>
      <label>
        Relationship
        <select
          value={family}
          onChange={(e) => {
            setFamily(Number(e.target.value));
            setResult("");
            setPassed(false);
            setSaved(false);
          }}
        >
          {families.map((f, i) => (
            <option key={f.name} value={i}>
              {f.name}
            </option>
          ))}
        </select>
      </label>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          validate();
        }}
      >
        <label>
          Your expression
          <input
            maxLength={120}
            required
            value={expression}
            onChange={(e) => {
              setExpression(e.target.value);
              setPassed(false);
              setSaved(false);
              setResult("");
            }}
            placeholder={`For example: ${families[family].example}`}
          />
        </label>
        <button>Check against sample values</button>
      </form>
      {result && (
        <p className="feedback" role="status">
          {result}
        </p>
      )}
      {passed && (
        <button
          className="secondary"
          disabled={saved}
          onClick={() => {
            update((s) => ({
              ...s,
              shortcuts: [
                ...s.shortcuts,
                {
                  id: crypto.randomUUID(),
                  title: families[family].name,
                  definition: {
                    family,
                    expression,
                    checkedAt: new Date().toISOString(),
                  },
                  method: `Expression: ${expression}\nCanonical relationship: ${families[family].canonical}\nNumerically checked on 200 samples plus boundary values for x from 0 to 10,000. Not an algebraic proof. Personal execution reliability has not been measured.`,
                },
              ].slice(-100),
            }));
            setSaved(true);
          }}
        >
          {saved ? "Saved to your methods" : "Save checked method"}
        </button>
      )}
    </section>
  );
}
