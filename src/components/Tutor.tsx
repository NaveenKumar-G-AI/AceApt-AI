"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Sparkles, X } from "lucide-react";
import { askTutor } from "@/ai/client";
import type { TutorInput } from "@/ai/schemas";
import { PageHeading } from "./Workspace";
type Message = { role: "user" | "model"; text: string };
export function TutorBox({
  questionId,
  context = "",
  onRequest,
}: {
  questionId?: string;
  context?: string;
  onRequest?: () => void;
}) {
  return (
    <section className="card">
      <Sparkles size={22} />
      <h3>Think with ACEAPT</h3>
      <TutorChat
        questionId={questionId}
        context={context}
        compact
        onRequest={onRequest}
      />
    </section>
  );
}
export function Tutor() {
  return (
    <>
      <PageHeading
        eyebrow="A THINKING PARTNER, NOT AN ANSWER KEY"
        title="Let’s work through it."
        description="Share an aptitude question and what you’ve tried. Ask for a nudge, a reasoning check, or a full explanation."
      />
      <section className="card tutor-page">
        <div className="tutor-intro">
          <span className="icon-tile mint">
            <Sparkles size={28} />
          </span>
          <h2>Where does your reasoning get stuck?</h2>
          <p>
            I’ll help you understand the next step, then give you room to try
            it.
          </p>
        </div>
        <TutorChat />
      </section>
    </>
  );
}
function TutorChat({
  questionId,
  context = "",
  compact = false,
  onRequest,
}: {
  questionId?: string;
  context?: string;
  compact?: boolean;
  onRequest?: () => void;
}) {
  const [message, setMessage] = useState("");
  const [action, setAction] = useState<TutorInput["action"]>("hint");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const requestActive = useRef(false);
  useEffect(() => () => controller.current?.abort(), []);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (requestActive.current || message.trim().length < 8) return;
    requestActive.current = true;
    controller.current = new AbortController();
    const signal = AbortSignal.any([
      controller.current.signal,
      AbortSignal.timeout(30000),
    ]);
    setBusy(true);
    setError("");
    onRequest?.();
    const text = message.trim();
    try {
      const result = await askTutor(
        {
          action,
          message: text,
          questionId,
          context,
          history: messages
            .slice(-8)
            .map((m) => ({ ...m, text: m.text.slice(0, 4000) })),
        },
        signal,
      );
      setMessages((current) =>
        [
          ...current,
          { role: "user" as const, text },
          {
            role: "model" as const,
            text:
              result.message +
              (result.nextStep ? "\n\n" + result.nextStep : ""),
          },
        ].slice(-16),
      );
      setMessage("");
    } catch (err) {
      setError(
        controller.current.signal.aborted
          ? "Request cancelled. You can keep working."
          : signal.aborted
            ? "The tutor took too long. Try again when you’re ready."
            : err instanceof Error
              ? err.message
              : "The tutor is unavailable. Please try again.",
      );
    } finally {
      requestActive.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <div className="chat-messages" aria-live="polite">
        {messages.map((m, i) => (
          <article className={`chat-message ${m.role}`} key={i}>
            <strong>{m.role === "user" ? "You" : "ACEAPT"}</strong>
            <p>{m.text}</p>
          </article>
        ))}
      </div>
      {!compact && !messages.length && (
        <div className="suggestions">
          {[
            "A price rises 20% then falls 20%. I think it is unchanged. Where is my mistake?",
            "How do I combine two ratios that share a quantity?",
            "Give me a hint for finding the remainder when 47 is divided by 6.",
          ].map((text) => (
            <button
              className="secondary"
              key={text}
              onClick={() => setMessage(text)}
            >
              {text}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={send}>
        <label>
          Type of help
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as TutorInput["action"])}
            disabled={busy}
          >
            <option value="hint">Give me a hint</option>
            <option value="reasoning">Check my reasoning</option>
            <option value="explain">Explain the full method</option>
            <option value="similar">Suggest a similar problem</option>
          </select>
        </label>
        <label
          className="sr-only"
          htmlFor={compact ? "question-help" : "tutor-message"}
        >
          Your question and reasoning
        </label>
        <textarea
          id={compact ? "question-help" : "tutor-message"}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Here’s the question, and what I’ve tried…"
          maxLength={4000}
          minLength={8}
          rows={compact ? 4 : 5}
          required
          disabled={busy}
        />
        <div className="button-row">
          <button disabled={busy || message.trim().length < 8} type="submit">
            {busy ? "Thinking…" : "Ask ACEAPT"} <ArrowUp size={16} />
          </button>
          {busy && (
            <button
              type="button"
              className="secondary"
              onClick={() => controller.current?.abort()}
            >
              <X size={15} /> Cancel
            </button>
          )}
        </div>
      </form>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      <p className="small-text muted">
        AI explanations can make mistakes. Check the method against the
        question. Generated exercises do not count toward measured progress.
      </p>
    </>
  );
}
