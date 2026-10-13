import type { Sql } from "./db";
import type { PersonalizationInput } from "./validation";
import { newCheckoutRef } from "./tokens";

export type PersonalizationRow = {
  id: string;
  checkout_ref: string;
  child_name: string;
  age_group: PersonalizationInput["age_group"];
  illustration_style: PersonalizationInput["illustration_style"];
  status: string;
};

/** Cria a personalização ANTES do pagamento. O status de pagamento só muda via webhook. */
export async function createPersonalization(sql: Sql, input: PersonalizationInput): Promise<PersonalizationRow> {
  const rows = await sql.query<PersonalizationRow>(
    `insert into public.personalizations (checkout_ref, child_name, age_group, illustration_style)
     values ($1, $2, $3, $4)
     returning id, checkout_ref, child_name, age_group, illustration_style, status`,
    [newCheckoutRef(), input.child_name, input.age_group, input.illustration_style],
  );
  return rows[0];
}

/**
 * Limpeza (LGPD / minimização): remove personalizações nunca pagas após N dias
 * e capturas de diagnóstico expiradas.
 */
export async function purgeStaleData(sql: Sql, unpaidDays = 30): Promise<{ personalizations: number; captures: number }> {
  const p = await sql.query(
    `delete from public.personalizations p
      where p.status = 'pending_payment'
        and p.created_at < now() - make_interval(days => $1)
        and not exists (select 1 from public.orders o where o.personalization_id = p.id)
      returning p.id`,
    [unpaidDays],
  );
  const c = await sql.query(`delete from public.webhook_captures where expires_at < now() returning id`);
  return { personalizations: p.length, captures: c.length };
}
