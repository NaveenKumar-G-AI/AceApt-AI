import { z } from "zod";
export const tutorInput = z
  .object({
    action: z.enum(["hint", "explain", "reasoning", "similar", "tutor"]),
    message: z.string().trim().min(8).max(4000),
    questionId: z.string().max(100).optional(),
    context: z.string().max(4000).optional(),
    history: z
      .array(
        z.object({
          role: z.enum(["user", "model"]),
          text: z.string().max(4000),
        }),
      )
      .max(8)
      .default([]),
  })
  .strict();
export const tutorOutput = z.object({
  message: z.string().trim().min(1).max(12000),
  nextStep: z.string().max(2000).default(""),
});
export type TutorInput = z.infer<typeof tutorInput>;
