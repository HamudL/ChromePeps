/**
 * Parst den Request-Body als JSON. `null` = kaputter/leerer Body — der
 * Caller antwortet darauf mit 400 bzw. lässt `schema.safeParse(null)`
 * scheitern (z.object lehnt null immer ab). Niemals `{}` als Fallback:
 * bei all-optionalen Schemas würde Garbage sonst still als "leeres
 * Update" durchgehen.
 */
export async function parseJsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
