"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="card">
      <h1>This screen needs a fresh start</h1>
      <p>Your saved progress is still on this device.</p>
      <button onClick={reset}>Try again</button>
    </section>
  );
}
