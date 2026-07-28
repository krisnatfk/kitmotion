import { z } from "zod";

export const runPointSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  timestamp: z.number().int().nonnegative(),
  elapsedSeconds: z.number().int().nonnegative().max(24 * 60 * 60),
  accuracy: z.number().finite().nonnegative().max(1000),
  altitude: z.number().finite().min(-500).max(9000).nullable(),
  segment: z.number().int().nonnegative().max(1000),
});

export const finalizeRunSchema = z.object({
  clientSessionId: z.string().uuid(),
  startedAt: z.string().datetime(),
  durationSeconds: z.number().int().positive().max(24 * 60 * 60),
  route: z.array(runPointSchema).min(1).max(20_000),
}).superRefine((data, context) => {
  for (let index = 1; index < data.route.length; index += 1) {
    const previous = data.route[index - 1];
    const current = data.route[index];
    if (!previous || !current) continue;
    if (current.timestamp < previous.timestamp || current.elapsedSeconds < previous.elapsedSeconds) {
      context.addIssue({ code: "custom", path: ["route", index], message: "Urutan titik GPS tidak valid" });
      break;
    }
  }
});

export type FinalizeRunInput = z.infer<typeof finalizeRunSchema>;
