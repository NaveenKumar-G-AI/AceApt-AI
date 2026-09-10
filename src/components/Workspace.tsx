"use client";
import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Target,
  Clock,
  Sparkles,
  Check,
  Network,
  Bookmark,
  RotateCcw,
  TrendingUp,
} from "lucide-react";
import { useLearning } from "./LearningProvider";
import {
  BANK,
  SKILLS,
  recommendedSkills,
  reviewQueue,
  skillSummary,
  retention,
} from "@/lib/learning";
import { Practice } from "./Practice";
import { Tutor } from "./Tutor";
import { Learn } from "./Learn";
import { Library, Preferences } from "./Library";
import { views } from "@/lib/routes";
import { AdvancedInsights } from "./AdvancedInsights";
import { DailyPlan } from "./DailyPlan";
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function Empty({
  title,
  description,
  href,
  label,
}: {
  title: string;
  description: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <BookOpen size={25} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {href && (
        <Link href={href} className="button secondary">
          {label ?? "Start practice"} <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}
export function Workspace({ view }: { view: (typeof views)[number] }) {
  const { ready } = useLearning();
  if (!ready)
    return (
      <div className="loading" role="status">
        Opening your learning workspace…
      </div>
    );
  switch (view) {
    case "dashboard":
      return <Dashboard />;
    case "practice":
      return <Suspense fallback={<p>Opening practice?</p>}><Practice /></Suspense>;
    case "learn":
      return <Suspense fallback={<p>Opening learning…</p>}><Learn /></Suspense>;
    case "tutor":
      return <Tutor />;
    case "skills":
      return <Skills />;
    case "progress":
      return <Progress />;
    case "revision":
      return <Revision />;
    case "library":
      return <Library />;
    case "settings":
      return <Preferences />;
  }
}
function Dashboard() {
  const { state } = useLearning();
  const attempts = state.attempts;
  const answered = attempts.filter((a) => a.answer !== null);
  const next = recommendedSkills(attempts)[0];
  const accuracy = answered.length
    ? Math.round(
        (answered.filter((a) => a.correct).length / answered.length) * 100,
      )
    : null;
  return (
    <>
      <PageHeading
        eyebrow="MAKE ROOM FOR A LITTLE PROGRESS"
        title={
          attempts.length
            ? "Welcome back to your learning space."
            : "Your next breakthrough starts here."
        }
        description="Understand the idea. Try it yourself. Get just enough help to move forward."
      >
        <Link className="button secondary" href="/practice?mode=diagnostic">
          <Target size={17} /> Check my starting point
        </Link>
      </PageHeading>
      <div className="dashboard-grid">
        <section className="focus-card">
          <div className="tag">
            <span className="status-dot" /> YOUR NEXT STEP
          </div>
          <h2>
            {state.active && !state.active.complete
              ? "Pick up where you left off."
              : attempts.length
                ? `Keep building ${next.skill.displayName.toLowerCase()}.`
                : "Start small. Think clearly. Build confidence."}
          </h2>
          <p>
            {attempts.length
              ? "Your next practice adapts to the evidence from your attempts. Take your time and make the reasoning your own."
              : "A few questions help you find your starting point. There’s no score to live up to, and no account to create."}
          </p>
          <Link className="button" href="/practice">
            {state.active && !state.active.complete
              ? "Continue session"
              : "Start practising"}{" "}
            <ArrowRight size={18} />
          </Link>
          <div className="focus-meta">
            <Clock size={15} />
            <span>Your daily intention: {state.minutes} minutes</span>
            <span className="separator">/</span>
            <span>At your pace</span>
          </div>
          <div className="orbit" aria-hidden="true">
            <div className="orbit-ring" />
            <div className="orbit-ring small" />
            <span className="orbit-center">
              <Sparkles size={38} />
            </span>
            <span className="orbit-label one">Think</span>
            <span className="orbit-label two">Understand</span>
            <span className="orbit-label three">Solve</span>
          </div>
        </section>
        <section className="card daily-card">
          <div className="section-kicker">YOUR LEARNING SNAPSHOT</div>
          <h3>A little effort adds up.</h3>
          <div className="stat-row">
            <span>Questions attempted</span>
            <strong>{attempts.length}</strong>
          </div>
          <div className="stat-row">
            <span>Answer accuracy</span>
            <strong>{accuracy === null ? "—" : `${accuracy}%`}</strong>
          </div>
          <div className="stat-row">
            <span>Time practising</span>
            <strong>
              {Math.round(
                attempts.reduce((s, a) => s + a.durationMs, 0) / 60000,
              )}{" "}
              <small>min</small>
            </strong>
          </div>
          <p className="muted small-text">
            {attempts.length
              ? "Includes assisted practice. See progress for independent evidence."
              : "Your story starts with your first attempt. No progress is assumed."}
          </p>
          <Link className="text-link" href="/progress">
            See your progress <ArrowUpRight size={16} />
          </Link>
        </section>
      </div>
      <DailyPlan />
      <div className="section-title">
        <h2>How would you like to learn?</h2>
        <span>Choose what you need today</span>
      </div>
      <div className="action-grid">
        {[
          {
            href: "/learn",
            title: "Make the concept click",
            text: "Explore ideas, work through a problem, and explain it in your own words.",
            Icon: BookOpen,
            color: "peach",
          },
          {
            href: "/practice",
            title: "Put your thinking to work",
            text: "Practise at your level with useful hints and clear feedback.",
            Icon: Target,
            color: "mint",
          },
          {
            href: "/tutor",
            title: "Untangle a tricky question",
            text: "Share where you’re stuck. Your tutor helps you find the next step.",
            Icon: Sparkles,
            color: "lavender",
          },
        ].map(({ href, title, text, Icon, color }) => (
          <Link href={href} className="card action-card" key={href}>
            <span className={`icon-tile ${color}`}>
              <Icon size={24} />
            </span>
            <h3>{title}</h3>
            <p>{text}</p>
            <span className="circle-arrow">
              <ArrowUpRight size={18} />
            </span>
          </Link>
        ))}
      </div>
      <div className="section-title">
        <h2>Find your focus</h2>
        <Link href="/skills" className="text-link">
          Explore the skill map <ArrowRight size={15} />
        </Link>
      </div>
      <div className="topic-grid">
        {["QUANTITATIVE", "LOGICAL", "VERBAL"].map((domain, i) => (
          <Link
            href={`/learn?domain=${domain}`}
            className="card topic-card"
            key={domain}
          >
            <span className="topic-number">0{i + 1}</span>
            <div>
              <h3>
                {
                  [
                    "Quantitative aptitude",
                    "Logical reasoning",
                    "Verbal ability",
                  ][i]
                }
              </h3>
              <p>
                {SKILLS.filter((s) => s.domain === domain).length} skills ·
                Concepts to application
              </p>
            </div>
            <ArrowUpRight size={20} />
          </Link>
        ))}
      </div>
    </>
  );
}
function Skills() {
  const { state } = useLearning();
  return (
    <>
      <PageHeading
        eyebrow="SEE HOW IDEAS CONNECT"
        title="Your skill map"
        description="A strong foundation makes the next concept easier. Evidence comes from your unaided attempts."
      />
      <div className="legend">
        <span className="tag">New</span>
        <span className="tag">Building evidence</span>
        <span className="tag">Practising independently</span>
      </div>
      {["QUANTITATIVE", "LOGICAL", "VERBAL"].map((domain) => (
        <section key={domain}>
          <div className="section-title">
            <h2>{domain.charAt(0) + domain.slice(1).toLowerCase()}</h2>
          </div>
          <div className="skill-grid">
            {SKILLS.filter((s) => s.domain === domain).map((skill) => {
              const summary = skillSummary(state.attempts, skill.id);
              const prerequisite = SKILLS.find(
                (s) => s.id === skill.prerequisiteSkillId,
              );
              return (
                <article className="card skill-card" key={skill.id}>
                  <Network size={21} />
                  <h3>{skill.displayName}</h3>
                  <p>{skill.description}</p>
                  <div className="progress-track">
                    <div style={{ width: `${summary.accuracy ?? 0}%` }} />
                  </div>
                  <span className="small-text muted">
                    {summary.independent.length === 0
                      ? "Not assessed"
                      : `${summary.independent.length} unaided attempts · ${summary.accuracy}% accuracy`}
                  </span>
                  {prerequisite && (
                    <Link
                      className="prerequisite"
                      href={`/practice?skill=${prerequisite.id}`}
                    >
                      Foundation: {prerequisite.displayName}
                    </Link>
                  )}
                  <Link
                    className="text-link"
                    href={`/practice?skill=${skill.id}`}
                  >
                    Practise skill <ArrowRight size={15} />
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
function Progress() {
  const { state } = useLearning();
  const attempts = state.attempts;
  const independent = attempts.filter(
    (a) => a.hints === 0 && a.answer !== null,
  );
  return (
    <>
      <PageHeading
        eyebrow="EVIDENCE, NOT ASSUMPTIONS"
        title="Small steps. Visible progress."
        description="Practice accuracy is a learning signal, not a prediction of exam results or a claim of mastery."
      />
      {!attempts.length ? (
        <Empty
          title="Your progress begins with an attempt"
          description="Try a diagnostic or a practice session. Your topic evidence and review needs will appear here."
          href="/practice"
        />
      ) : (
        <>
          <div className="stats-grid">
            <section className="card">
              <TrendingUp />
              <h2>
                {independent.length
                  ? Math.round(
                      (independent.filter((a) => a.correct).length /
                        independent.length) *
                        100,
                    ) + "%"
                  : "—"}
              </h2>
              <p>Unaided accuracy</p>
            </section>
            <section className="card">
              <Check />
              <h2>{independent.length}</h2>
              <p>Unaided answers</p>
            </section>
            <section className="card">
              <Sparkles />
              <h2>{attempts.filter((a) => a.hints > 0).length}</h2>
              <p>Assisted attempts</p>
            </section>
          </div>
          <div className="section-title">
            <h2>Your next learning path</h2>
          </div>
          <div className="card">
            <ol className="learning-path">
              {recommendedSkills(attempts)
                .slice(0, 4)
                .map(({ skill, accuracy, independent }, i) => (
                  <li key={skill.id}>
                    <span>{i + 1}</span>
                    <div>
                      <h3>{skill.displayName}</h3>
                      <p>
                        {independent.length < 2
                          ? "Gather more evidence with a few varied problems."
                          : accuracy !== null && accuracy < 60
                            ? "Revisit the foundation, then attempt a fresh variation."
                            : "Keep the skill active with independent practice."}
                      </p>
                    </div>
                    <Link
                      href={`/practice?skill=${skill.id}`}
                      className="button secondary"
                    >
                      Practise
                    </Link>
                  </li>
                ))}
            </ol>
          </div>
          <div className="section-title">
            <h2>Topic evidence & retention</h2>
          </div>
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Skill</th>
                  <th>Unaided attempts</th>
                  <th>Accuracy</th>
                  <th>Average time</th>
                  <th>Retention evidence</th>
                </tr>
              </thead>
              <tbody>
                {SKILLS.filter(
                  (s) => skillSummary(attempts, s.id).all.length,
                ).map((s) => {
                  const info = skillSummary(attempts, s.id);
                  const memory = retention(attempts, s.id);
                  return (
                    <tr key={s.id}>
                      <td>{s.displayName}</td>
                      <td>{info.independent.length}</td>
                      <td>
                        {info.accuracy === null ? "—" : `${info.accuracy}%`}
                      </td>
                      <td>
                        {info.averageSeconds === null
                          ? "—"
                          : `${info.averageSeconds}s`}
                      </td>
                      <td>{memory.band.toLowerCase().replaceAll("_", " ")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <AdvancedInsights attempts={attempts} />
          <div className="section-title">
            <h2>Recent activity</h2>
          </div>
          <div className="card">
            {attempts
              .slice(-8)
              .reverse()
              .map((a) => (
                <div className="activity" key={a.id}>
                  <span className={a.correct ? "result-good" : "result-review"}>
                    {a.correct
                      ? "Correct"
                      : a.answer === null
                        ? "Skipped"
                        : "Review"}
                  </span>
                  <div>
                    {BANK.find((q) => q.id === a.questionId)?.questionText}
                    <p className="small-text muted">
                      {a.mode} · {Math.round(a.durationMs / 1000)}s ·{" "}
                      {a.hints ? "assisted" : "unaided"}
                    </p>
                  </div>
                  <time>{new Date(a.at).toLocaleDateString()}</time>
                </div>
              ))}
          </div>
        </>
      )}
    </>
  );
}
function Revision() {
  const { state } = useLearning();
  const queue = reviewQueue(state.attempts);
  const missed = queue.map((item) => item.questionId);
  return (
    <>
      <PageHeading
        eyebrow="MAKE IT STICK"
        title="Return. Recall. Rebuild."
        description="Revisit mistakes and assisted answers. Try recalling the method before opening the solution."
      >
        <Link className="button secondary" href="/practice?mode=revision">
          <RotateCcw size={16} /> Start a review
        </Link>
      </PageHeading>
      {!missed.length ? (
        <Empty
          title="Your review list is clear"
          description="Missed, assisted, or low-confidence answers appear here. Successful reviews return after 1, 3, 7, then 14 days."
          href="/practice"
        />
      ) : (
        <div className="skill-grid">
          {missed.map((id) => {
            const q = BANK.find((q) => q.id === id);
            if (!q) return null;
            return (
              <article key={id} className="card">
                <Bookmark size={20} />
                <h3>
                  {SKILLS.find((s) => s.id === q.skillNodeId)?.displayName}
                </h3>
                <p>{q.questionText}</p>
                <p className="small-text muted">
                  {queue.find((item) => item.questionId === id)?.reason}
                </p>
                <details>
                  <summary>Recall first, then check the method</summary>
                  <p>{q.explanation}</p>
                </details>
                <Link
                  className="text-link"
                  href={`/practice?mode=revision&skill=${q.skillNodeId}`}
                >
                  Try again <ArrowRight size={15} />
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
