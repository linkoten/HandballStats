import jwt from "jsonwebtoken";

const METABASE_URL =
  process.env.NEXT_PUBLIC_METABASE_URL ?? "http://localhost:3001";
const EMBED_SECRET = process.env.METABASE_EMBED_SECRET ?? "";

/**
 * Génère une URL d'embed signée (JWT HS256) pour un dashboard Metabase.
 * À appeler UNIQUEMENT côté serveur (server component ou route handler).
 *
 * @param dashboardId  ID numérique du dashboard (ex: 33)
 * @param params       Paramètres verrouillés dans le JWT (ex: { club_id: 5 })
 * @param expiryMin    Durée de validité en minutes (défaut: 10)
 */
export function signMetabaseDashboardUrl(
  dashboardId: number,
  params: Record<string, string | number | number[] | null> = {},
  expiryMin = 10,
): string {
  if (!EMBED_SECRET) {
    console.warn(
      "[Metabase] METABASE_EMBED_SECRET is not set — embed will fail.",
    );
  }

  const payload = {
    resource: { dashboard: dashboardId },
    params,
    exp: Math.round(Date.now() / 1000) + expiryMin * 60,
  };

  const token = jwt.sign(payload, EMBED_SECRET, { algorithm: "HS256" });
  return `${METABASE_URL}/embed/dashboard/${token}#bordered=false&titled=false`;
}
