import { notFound } from "next/navigation";
import { Workspace } from "@/components/Workspace";
import { views } from "@/lib/routes";
export function generateStaticParams() {
  return views.filter((view) => view !== "dashboard").map((view) => ({ view }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  if (!views.includes(view as (typeof views)[number])) notFound();
  return <Workspace view={view as (typeof views)[number]} />;
}
