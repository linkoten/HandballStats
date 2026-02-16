export interface CompetitionConfig {
  url: string;
  equipe: string;
  equipe_bdd: string;
  competition_name: string;
  poule: string;
  max_journees: string;
  saison: string;
  phase?: string;
  equipeId?: number;
}

export async function triggerScrapingOnRender(
  competitions: CompetitionConfig[],
) {
  const response = await fetch("https://ton-scrapper.onrender.com/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ competitions }),
  });
  return await response.json();
}

// Exemple d’utilisation :
// const competitions: CompetitionConfig[] = [ ... ];
// triggerScrapingOnRender(competitions).then(console.log);
