import { z } from "zod";

const persistedMillisecondsSchema = z
  .number()
  .finite()
  .nonnegative()
  .transform((value) => Math.round(value))
  .pipe(z.number().int().nonnegative());

/** Per-repetition payload sent from the client and validated server-side. */
export const repPayloadSchema = z.object({
  repNumber: z.number().int().positive(),
  startedOffsetMs: persistedMillisecondsSchema,
  completedOffsetMs: persistedMillisecondsSchema,
  isValid: z.boolean(),
  formScore: z.number().min(0).max(100).nullable(),
  rangeScore: z.number().min(0).max(100).nullable(),
  tempoScore: z.number().min(0).max(100).nullable(),
  stabilityScore: z.number().min(0).max(100).nullable(),
  metrics: z.record(z.string(), z.unknown()).default({}),
  issueCodes: z.array(z.string()).default([]),
});

export const feedbackPayloadSchema = z.object({
  code: z.string(),
  severity: z.enum(["info", "warning", "critical"]),
  message: z.string(),
  occurrenceCount: z.number().int().positive(),
  firstOffsetMs: persistedMillisecondsSchema.nullable(),
  lastOffsetMs: persistedMillisecondsSchema.nullable(),
});

export const finalizeSessionSchema = z.object({
  clientSessionId: z.string().uuid(),
  exerciseSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  durationSeconds: z.number().int().nonnegative().max(24 * 60 * 60),
  targetReps: z.number().int().nonnegative().nullable(),
  targetSeconds: z.number().int().nonnegative().nullable(),
  totalReps: z.number().int().nonnegative(),
  validReps: z.number().int().nonnegative(),
  invalidReps: z.number().int().nonnegative(),
  subScores: z.object({
    formScore: z.number().min(0).max(100),
    rangeScore: z.number().min(0).max(100),
    consistencyScore: z.number().min(0).max(100),
    tempoScore: z.number().min(0).max(100),
    stabilityScore: z.number().min(0).max(100),
  }),
  repetitions: z.array(repPayloadSchema),
  feedback: z.array(feedbackPayloadSchema).default([]),
  sensorSummary: z
    .object({
      source: z.enum(["none", "iot-necklace"]),
      sampleCount: z.number().int().nonnegative(),
      connectedDurationMs: persistedMillisecondsSchema,
    })
    .nullable()
    .default(null),
});

export type FinalizeSessionInput = z.infer<typeof finalizeSessionSchema>;
export type RepPayload = z.infer<typeof repPayloadSchema>;
export type FeedbackPayload = z.infer<typeof feedbackPayloadSchema>;
