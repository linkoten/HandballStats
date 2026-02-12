// Mapping entre nom/saison et config complète pour enrichir les compétitions
// À adapter selon tes besoins (extraction depuis config.py ou une source JSON)

export const BASE_URLS = [
  {
    nom: "+16 ANS EXCELLENCE FEMININE BRETAGNE",
    saison: "2025/2026",
    url: "https://www.ffhandball.fr/competitions/saison-2025-2026-21/regional/16-ans-excellence-feminine-bretagne-27853/",
    equipe: "ASC RENNAIS",
    equipe_bdd: "ASCR Handball 1 F",
    poule: "poule-168469",
    max_journees: 22,
  },
  {
    nom: "+16 ANS 1ERE DIVISION TERRITORIALE FEMININE (P/10)",
    saison: "2024/2025",
    url: "https://www.ffhandball.fr/competitions/saison-2024-2025-20/regional/16-ans-1ere-division-territoriale-feminine-p-10-25551/",
    equipe: "ASC RENNAIS",
    equipe_bdd: "ASCR Handball 1 F",
    poule: "poule-147801",
    max_journees: 18,
  },
  {
    nom: "+16 ANS 1ERE DIVISION TERRITORIALE FEMININE",
    saison: "2023/2024",
    url: "https://www.ffhandball.fr/competitions/saison-2023-2024-19/regional/16-ans-1ere-division-territoriale-feminine-22363/",
    equipe: "ASC RENNAIS",
    equipe_bdd: "ASCR Handball 1 F",
    poule: "poule-127201",
    max_journees: 18,
  },
  // Ajoute les autres configs nécessaires...
];

export function enrichCompetition(competition: any) {
  const found = BASE_URLS.find(
    (c) => c.nom === competition.nom && c.saison === competition.saison,
  );
  return {
    ...competition,
    ...(found || {}),
  };
}
