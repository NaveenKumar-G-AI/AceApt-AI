import { tutorInput } from "@/ai/schemas";
import { generateTutor, TutorError } from "@/ai/provider";
export const runtime = "nodejs";
const requests = new Map<string, { count: number; until: number }>();
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json(
      { error: "This request could not be accepted." },
      { status: 403 },
    );
  const id =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  for (const [key, value] of requests)
    if (value.until < now) requests.delete(key);
  const entry = requests.get(id) ?? { count: 0, until: now + 60000 };
  if (entry.count >= 12 || requests.size > 5000)
    return Response.json(
      { error: "Please wait a minute before asking again." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  entry.count++;
  requests.set(id, entry);
  try {
    const reader = request.body?.getReader();
    if (!reader)
      return Response.json(
        { error: "Add an aptitude question to continue." },
        { status: 400 },
      );
    let length = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 48000) {
        await reader.cancel();
        return Response.json(
          { error: "Please shorten your question." },
          { status: 413 },
        );
      }
      chunks.push(value);
    }
    const parsed = tutorInput.safeParse(
      JSON.parse(Buffer.concat(chunks).toString("utf8")),
    );
    if (!parsed.success)
      return Response.json(
        { error: "Add a question of 8–4,000 characters and try again." },
        { status: 400 },
      );
    const result = await generateTutor(parsed.data, request.signal);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SyntaxError)
      return Response.json(
        { error: "This request could not be read." },
        { status: 400 },
      );
    const status = error instanceof TutorError ? error.status : 503;
    return Response.json(
      {
        error:
          status === 429
            ? "The tutor is busy. Please wait a minute and try again."
            : "ACEAPT couldn't generate this explanation right now. Try again or continue with the available solution steps.",
      },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
