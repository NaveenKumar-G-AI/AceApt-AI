"use client";
import { useMemo } from "react";
import Link from "next/link";
import { advancedProfile } from "@/lib/diagnostics";
import { SKILLS, type Attempt } from "@/lib/learning";
import { computeStability } from "@/engines/accuracy/stability";
export function AdvancedInsights({ attempts }: { attempts: Attempt[] }) {
  const profile = useMemo(() => advancedProfile(attempts), [attempts]);
  const sessions = Object.groupBy(
    attempts.filter((a) => a.hints === 0 && a.answer !== null),
    (a) => a.sessionId,
  );
  const stability = computeStability(
    Object.values(sessions)
      .filter((group): group is Attempt[] => !!group && group.length >= 3)
      .map(
        (group) => (group.filter((a) => a.correct).length / group.length) * 100,
      ),
  );
  return (
    <>
      <div className="section-title">
        <h2>Reasoning, pace & confidence</h2>
      </div>
      <div className="card">
        <p>
          These signals use unaided answers, discount repeated exposure and
          unusual timing, and stay cautious when evidence is limited.
        </p>
        <div className="topic-grid">
          {profile.speedProfile.map((speed) => (
            <div key={speed.scopeNodeId}>
              <h3>{speed.scopeNodeId.toLowerCase()}</h3>
              <p>Pace: {speed.label.replaceAll("_", " ")}</p>
              <p>
                Confidence pattern:{" "}
                {profile.confidenceCalibration
                  .find((c) => c.scopeNodeId === speed.scopeNodeId)
                  ?.pattern.replaceAll("_", " ") ?? "not enough evidence"}
              </p>
            </div>
          ))}
        </div>
        <p>
          Session accuracy consistency:{" "}
          {stability.consistency.replaceAll("_", " ")} ({stability.sampleSize}{" "}
          sessions with at least three unaided answers). Different question
          mixes can affect this comparison.
        </p>
        {profile.bottlenecks.map((b) => (
          <p className="notice" key={b.skillNodeId}>
            {b.note}
          </p>
        ))}
        {profile.recommendedNextStep
          .filter((r) => SKILLS.some((s) => s.id === r.skillNodeId))
          .slice(0, 3)
          .map((r) => (
            <div className="activity" key={r.skillNodeId}>
              <div>
                <h3>
                  {SKILLS.find((s) => s.id === r.skillNodeId)?.displayName}
                </h3>
                <p>{r.rationale}</p>
              </div>
              <Link
                className="button secondary"
                href={`/practice?skill=${r.skillNodeId}`}
              >
                Work on this
              </Link>
            </div>
          ))}
      </div>
    </>
  );
}
