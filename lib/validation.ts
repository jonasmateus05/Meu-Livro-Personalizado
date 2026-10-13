import { z } from "zod";

export const personalizationSchema = z.object({
  child_name: z.string().trim().min(1).max(60),
  age_group: z.enum(["2-4", "5-7", "8-10"]),
  illustration_style: z.enum(["colorful", "watercolor"]),
});
