import Link from "next/link";
export default function NotFound() {
  return (
    <section className="card">
      <h1>Let’s get back to learning</h1>
      <p>This page could not be found.</p>
      <Link className="button" href="/">
        Open workspace
      </Link>
    </section>
  );
}
