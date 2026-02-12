// Appel API pour récupérer l'URL d'embed Metabase
export async function getMetabaseEmbedUrl({
  resource = "dashboard",
  id = 1,
  params = {},
}) {
  const url = new URL(
    "/api/metabase-embed-url",
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  );
  url.searchParams.set("resource", resource);
  url.searchParams.set("id", String(id));
  // Pour les filtres dynamiques (ex: club_id)
  // On peut passer les params en JSON stringifié si besoin
  // url.searchParams.set("params", JSON.stringify(params));

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error("Erreur API Metabase");
  const data = await res.json();
  return data.iframe_url;
}
