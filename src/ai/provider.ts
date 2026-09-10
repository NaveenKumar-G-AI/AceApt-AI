import { tutorOutput, type TutorInput } from "./schemas";
import { SYSTEM_PROMPT } from "./prompts";
import { BANK } from "@/lib/learning";
export class TutorError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super("The tutor is temporarily unavailable.");
  }
}
export async function generateTutor(
  input: TutorInput,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new TutorError("NOT_CONFIGURED", 503);
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  if (!/^[a-zA-Z0-9._-]+$/.test(model))
    throw new TutorError("NOT_CONFIGURED", 503);
  const question = input.questionId
    ? BANK.find((q) => q.id === input.questionId)
    : undefined;
  const timeout = AbortSignal.timeout(25000);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  try {
    const response = await fetcher(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        signal: combined,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: JSON.stringify({
                    ...input,
                    trustedQuestion: question
                      ? {
                          question: question.questionText,
                          solution: question.explanation,
                        }
                      : undefined,
                  }),
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 1600,
            responseMimeType: "application/json",
          },
        }),
      },
    );
    if (!response.ok)
      throw new TutorError(
        response.status === 429 ? "RATE_LIMIT" : "PROVIDER_UNAVAILABLE",
        response.status === 429 ? 429 : 503,
      );
    const body: unknown = await response.json();
    const parsed = providerResponse.safeParse(body);
    if (!parsed.success) throw new TutorError("INVALID_RESPONSE", 502);
    const candidate = parsed.data.candidates?.[0];
    if (candidate?.finishReason && candidate.finishReason !== "STOP")
      throw new TutorError("INVALID_RESPONSE", 502);
    const raw =
      candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    const output = tutorOutput.safeParse(
      JSON.parse(raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "")),
    );
    if (!output.success) throw new TutorError("INVALID_RESPONSE", 502);
    return output.data;
  } catch (error) {
    if (error instanceof TutorError) throw error;
    throw new TutorError(
      combined.aborted ? "TIMEOUT" : "INVALID_RESPONSE",
      combined.aborted ? 504 : 502,
    );
  }
}
import { z } from "zod";
const providerResponse = z.object({
  candidates: z
    .array(
      z.object({
        finishReason: z.string().optional(),
        content: z
          .object({
            parts: z
              .array(z.object({ text: z.string().optional() }))
              .optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});
