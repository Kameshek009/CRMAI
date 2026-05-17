import { z } from "zod";
import { OPERATORS } from "./types";

export const conditionSchema = z.object({
  field: z.string().min(1).max(120),
  operator: z.enum(OPERATORS),
  value: z.unknown().optional(),
});

export const createRuleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  condition: conditionSchema,
  weight: z.number().int().min(-100).max(100),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(10_000).optional(),
});

export const updateRuleSchema = createRuleSchema.partial();
