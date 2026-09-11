"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, Download, Trash2 } from "lucide-react";
import { PageHeading, Empty } from "./Workspace";
import { useLearning } from "./LearningProvider";
import { BANK, EMPTY, stateSchema } from "@/lib/learning";
import {
  breakEvenProbability,
  expectedValueOfAttempt,
} from "@/engines/decisions/domain/expectedValue";
const ShortcutLab = dynamic(
  () => import("./ShortcutLab").then((m) => m.ShortcutLab),
  { loading: () => <p>Opening shortcut checks?</p> },
);
const MethodTrainer = dynamic(() =>
  import("./MethodTrainer").then((m) => m.MethodTrainer),
);
export function Library() {
  const { state, update } = useLearning();
  const [title, setTitle] = useState("");
  const [method, setMethod] = useState("");
  const [probability, setProbability] = useState(50);
  const policy = { correctReward: 1, wrongPenalty: 0.25, blankValue: 0 };
  return (
    <>
      <PageHeading
        eyebrow="KEEP WHAT HELPS YOU THINK"
        title="Your personal library"
        description="Save useful questions and methods. A saved shortcut is a personal note until you verify it through practice."
      />
      <div className="section-title">
        <h2>Bookmarked questions</h2>
      </div>
      {!state.bookmarks.length ? (
        <Empty
          title="Keep a useful question close"
          description="Use the bookmark button while practising. Your saved questions will appear here."
          href="/practice"
        />
      ) : (
        <div className="skill-grid">
          {state.bookmarks.map((id) => {
            const q = BANK.find((q) => q.id === id);
            return q ? (
              <article className="card" key={id}>
                <h3>{q.questionText}</h3>
                <details>
                  <summary>Check the worked solution</summary>
                  <p>{q.explanation}</p>
                </details>
                <div className="button-row">
                  <Link
                    className="text-link"
                    href={`/practice?skill=${q.skillNodeId}`}
                  >
                    Practise this skill <ArrowRight size={14} />
                  </Link>
                  <button
                    className="icon-button"
                    aria-label="Remove saved question"
                    onClick={() =>
                      update((s) => ({
                        ...s,
                        bookmarks: s.bookmarks.filter((v) => v !== id),
                      }))
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ) : null;
          })}
        </div>
      )}
      <div className="section-title">
        <h2>My solving methods</h2>
      </div>
      <section className="card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim() || !method.trim()) return;
            update((s) => ({
              ...s,
              shortcuts: [
                ...s.shortcuts,
                {
                  id: crypto.randomUUID(),
                  title: title.trim(),
                  method: method.trim(),
                },
              ].slice(-100),
            }));
            setTitle("");
            setMethod("");
          }}
        >
          <label>
            Method name
            <input
              required
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Find 25% by dividing by four"
            />
          </label>
          <label>
            Method, conditions, and a worked example
            <textarea
              required
              maxLength={3000}
              rows={4}
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            />
          </label>
          <button>Save method</button>
        </form>
        {state.shortcuts.map((s) => (
          <article className="saved-method" key={s.id}>
            <div className="section-title">
              <h3>{s.title}</h3>
              <button
                className="icon-button"
                aria-label={`Delete ${s.title}`}
                onClick={() =>
                  update((state) => ({
                    ...state,
                    shortcuts: state.shortcuts.filter((v) => v.id !== s.id),
                  }))
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
            <span className="tag">Personal note · not verified</span>
            <p className="pre-wrap">{s.method}</p>
            {s.definition && <MethodTrainer method={s} />}
          </article>
        ))}
      </section>
      <div className="section-title">
        <h2>Verify a shortcut</h2>
      </div>
      <ShortcutLab />
      <div className="section-title">
        <h2>Decision practice</h2>
      </div>
      <section className="card">
        <h3>When is an attempt worth considering?</h3>
        <p>
          Explore the simulation’s scoring rule: +1 correct, −0.25 incorrect, 0
          blank. This is a learning exercise; your confidence estimate is not a
          measured probability.
        </p>
        <label>
          Assumed probability of being correct: {probability}%
          <input
            type="range"
            min="0"
            max="100"
            value={probability}
            onChange={(e) => setProbability(Number(e.target.value))}
          />
        </label>
        <div className="stat-row">
          <span>Expected score for an attempt</span>
          <strong>
            {expectedValueOfAttempt(probability, policy).toFixed(2)}
          </strong>
        </div>
        <p>
          The break-even point is {breakEvenProbability(policy) * 100}%.
          Consider evidence from elimination and time needed for other questions
          before deciding.
        </p>
      </section>
    </>
  );
}
export function Preferences() {
  const { state, update } = useLearning();
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const file = useRef<HTMLInputElement>(null);
  function exportProgress() {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "aceapt-progress.json";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importProgress(selected: File | undefined) {
    if (!selected) return;
    try {
      if (selected.size > 5000000) throw Error();
      const parsed = stateSchema.parse(JSON.parse(await selected.text()));
      update(() => parsed);
      setMessage("Progress imported.");
    } catch {
      setMessage(
        "This file is not a compatible PrepVista progress backup. Your existing progress is unchanged.",
      );
    }
    if (file.current) file.current.value = "";
  }
  return (
    <>
      <PageHeading
        eyebrow="MAKE THIS SPACE YOURS"
        title="Learning preferences"
        description="No personal information is needed. Choose an intention and a realistic daily practice time."
      />
      <section className="card settings-card">
        <label>
          Your preparation focus
          <select
            value={state.goal}
            onChange={(e) => update((s) => ({ ...s, goal: e.target.value }))}
          >
            {[
              "Build aptitude foundations",
              "Improve exam speed",
              "Improve accuracy",
              "Prepare consistently",
            ].map((goal) => (
              <option key={goal}>{goal}</option>
            ))}
          </select>
        </label>
        <label>
          Daily practice intention
          <select
            value={state.minutes}
            onChange={(e) =>
              update((s) => ({ ...s, minutes: Number(e.target.value) }))
            }
          >
            {[5, 10, 15, 20, 30, 45, 60, 90, 120].map((n) => (
              <option key={n} value={n}>
                {n} minutes
              </option>
            ))}
          </select>
        </label>
        <p className="muted">
          This is your intention, not measured learning evidence. There are no
          reminders or messages sent outside this workspace.
        </p>
        <h2>Your data, on this device</h2>
        <p>
          Progress is stored in this browser. Clearing site data removes it.
          Export a backup to keep it or move to another browser.
        </p>
        <div className="button-row">
          <button className="secondary" onClick={exportProgress}>
            <Download size={16} /> Export progress
          </button>
          <button className="secondary" onClick={() => file.current?.click()}>
            Import a backup
          </button>
        </div>
        <input
          className="sr-only"
          ref={file}
          type="file"
          accept="application/json,.json"
          onChange={(e) => {
            void importProgress(e.target.files?.[0]);
          }}
          aria-label="Import progress backup"
        />
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        <h2>Start fresh</h2>
        <button
          className="secondary"
          onClick={() => update((s) => ({ ...s, active: null }))}
        >
          Discard current session
        </button>
        <p>
          Resetting clears saved practice, bookmarks, formula attempts, and
          methods from this browser.
        </p>
        {confirm ? (
          <div className="button-row">
            <button
              className="danger"
              onClick={() => {
                update(() => structuredClone(EMPTY));
                setConfirm(false);
                setMessage("Local progress has been reset.");
              }}
            >
              Confirm reset
            </button>
            <button className="secondary" onClick={() => setConfirm(false)}>
              Keep my progress
            </button>
          </div>
        ) : (
          <button className="secondary" onClick={() => setConfirm(true)}>
            Reset local progress
          </button>
        )}
      </section>
    </>
  );
}
