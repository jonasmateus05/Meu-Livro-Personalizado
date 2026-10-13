import { z } from "zod";
import { checkChildName } from "./names";

export const AGE_GROUPS = ["2-4", "5-7", "8-10"] as const;
export const ILLUSTRATION_STYLES = ["colorful", "watercolor"] as const;

export type AgeGroup = (typeof AGE_GROUPS)[number];
export type IllustrationStyle = (typeof ILLUSTRATION_STYLES)[number];

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  "2-4": "2 a 4 anos",
  "5-7": "5 a 7 anos",
  "8-10": "8 a 10 anos",
};

export const STYLE_LABELS: Record<IllustrationStyle, string> = {
  colorful: "Coloridas e vibrantes",
  watercolor: "Aquarela suave",
};

export const personalizationSchema = z
  .object({
    child_name: z.string().max(200),
    age_group: z.enum(AGE_GROUPS),
    illustration_style: z.enum(ILLUSTRATION_STYLES),
    // Campo-isca contra robôs: humanos não preenchem (fica escondido no formulário).
    website: z.string().max(0).optional(),
  })
  .transform((input, ctx) => {
    const check = checkChildName(input.child_name);
    if (!check.ok) {
      ctx.addIssue({ code: "custom", path: ["child_name"], message: check.reason });
      return z.NEVER;
    }
    return {
      child_name: check.name,
      age_group: input.age_group,
      illustration_style: input.illustration_style,
    };
  });

export type PersonalizationInput = z.output<typeof personalizationSchema>;
