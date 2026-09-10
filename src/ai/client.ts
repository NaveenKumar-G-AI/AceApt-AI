import { tutorOutput, type TutorInput } from "./schemas";
export async function askTutor(input: TutorInput, signal: AbortSignal) {
  const response = await fetch("/api/tutor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
  const data: unknown = await response.json();
  if (!response.ok) {
    const error =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : "The tutor is unavailable. Please try again.";
    throw new Error(error);
  }
  return tutorOutput.parse(data);
}
