"use client";
import React, { useState } from "react";
// Suppression de l'import ScrapingFeedback, déplacé vers la page des compétitions

export default function ScrapeEquipesButton({ equipes }: { equipes: any[] }) {
  const [loadingScrape, setLoadingScrape] = useState(false);
  // Suppression du state results, feedback déplacé

  const handleScrape = async () => {
    setLoadingScrape(true);
    // Suppression du feedback scraping
    try {
      const equipeIds = equipes?.map((e: any) => e.id) ?? [];
      const res = await fetch("/api/scrape-equipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equipeIds }),
      });
      const data = await res.json();
      // Suppression du feedback scraping
    } catch (err) {
      alert("Erreur lors du scraping");
    } finally {
      setLoadingScrape(false);
    }
  };

  return (
    <div className="mb-6">
      <button
        onClick={handleScrape}
        className="px-6 py-2 bg-primary text-white rounded font-bold hover:bg-primary/80 transition"
        disabled={loadingScrape}
      >
        {loadingScrape ? "Chargement..." : "🔄 Récupérer les nouvelles données"}
      </button>
      {loadingScrape && (
        <div className="mt-4 flex items-center gap-2 text-primary animate-pulse">
          <span className="font-bold">Scraping en cours...</span>
          <span className="text-xl">⏳</span>
        </div>
      )}
      {/* Feedback supprimé, voir page compétitions */}
    </div>
  );
}
