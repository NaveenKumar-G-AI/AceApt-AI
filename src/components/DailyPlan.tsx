"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useLearning } from "./LearningProvider";
import { SKILLS } from "@/lib/learning";
import { actionDestination, actionLabels, dailyPlan } from "@/lib/dailyPlan";

export function DailyPlan() {
  const {state, update} = useLearning();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => {window.clearInterval(timer); window.removeEventListener("focus", refresh);};
  }, []);
  const {plan, spent, remaining} = dailyPlan(state, now);
  return <section className="daily-plan" aria-labelledby="daily-plan-title">
    <div className="section-title">
      <h2 id="daily-plan-title">Your adaptive daily path</h2>
      <Link href="/settings" className="text-link">Adjust daily intention <ArrowRight size={15}/></Link>
    </div>
    <div className="card">
      <div className="plan-controls">
        <div><strong>{Math.ceil(remaining)} of {state.minutes} minutes available</strong>
          <p className="small-text muted">{Math.floor(spent)} minutes of recorded question time today. Lesson reading is not timed.</p></div>
        <label>Path focus<select value={state.planFocus} onChange={e => update(s => ({...s, planFocus:e.target.value}))}>
          <option value="">Balance all skills</option>
          {SKILLS.map(s => <option key={s.id} value={s.id}>{s.displayName}</option>)}
        </select></label>
      </div>
      {state.active && !state.active.complete && <p className="notice">You have an unfinished session. <Link className="text-link" href="/practice">Continue it</Link> or choose a new action below.</p>}
      {!plan ? <p role="status">You have reached your daily practice intention. Take a break, or choose more practice when you feel ready.</p> : <>
        {plan.exceedsBudget && <p className="notice">Your next useful action needs about {plan.items[0]?.action.estimatedMinutes} minutes, slightly more than today&apos;s remaining intention. You can pause whenever you need.</p>}
        <ol className="plan-list">{plan.items.map(({action}) => <li key={action.id}>
          <div><span className="tag">About {action.estimatedMinutes} min</span>
            <h3>{actionLabels[action.actionType]} · {action.topicName}</h3>
            <p>{action.rationale[0]}</p></div>
          <Link className="button secondary" href={actionDestination(action, state.attempts)} aria-label={`${actionLabels[action.actionType]}: ${action.topicName}`}>Open action <ArrowRight size={15}/></Link>
        </li>)}</ol>
        <p className="muted small-text">This path updates after your answers. Activity times and ranking weights are planning estimates. Independent evidence uses distinct questions; repeat successes require at least a day without exposure. Opening a lesson does not count as mastery.</p>
      </>}
    </div>
  </section>;
}
