// Exemple d'appel à l'API FastAPI Render depuis Node.js (Next.js, server action, etc.)

const fetch = require("node-fetch"); // ou global fetch en ESM

async function triggerScrapingOnRender(competitions) {
  const response = await fetch("https://ton-scrapper.onrender.com/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ competitions }),
  });
  const data = await response.json();
  return data;
}

// Exemple d'utilisation :
// const competitions = [
//   {
//     url: 'https://www.ffhandball.fr/competitions/...',
//     equipe: 'ASCR 1',
//     equipe_bdd: 'ASCR 1',
//     competition_name: 'Nationale 2',
//     poule: 'poule-123456',
//     max_journees: '22',
//     saison: '2024/2025',
//     phase: '',
//     equipeId: 123
//   }
// ];
// triggerScrapingOnRender(competitions).then(console.log);

module.exports = triggerScrapingOnRender;
