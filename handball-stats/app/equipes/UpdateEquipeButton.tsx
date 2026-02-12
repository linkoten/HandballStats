"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { enrichCompetition } from "@/lib/competitionConfigMap";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function UpdateEquipeButton({
  equipeId,
  competitions,
}: {
  equipeId: number;
  competitions: any[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>("");
  const [results, setResults] = useState<any[]>([]);

  const handleUpdate = async () => {
    setLoading(true);
    setStatus("Lancement de la mise à jour...");

    try {
      // Préparer les infos à envoyer au scrapper
      const payload = {
        equipeId,
        competitions: competitions.map((c) =>
          enrichCompetition({
            id: c.id,
            nom: c.nom,
            saison: c.saison,
          }),
        ),
      };

      console.log("Payload envoyé au scrapper:", payload);

      // Lancer la requête en arrière-plan sans attendre la réponse
      fetch("/api/update-equipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch((err) => {
        console.error("Erreur lors de la mise à jour:", err);
      });

      // Redirection immédiate vers la page de suivi
      router.push(`/equipes/suivi-update?equipeId=${equipeId}`);
    } catch (err) {
      setStatus("Erreur lors de la mise à jour");
      setProgress(0);
      console.log("Erreur update:", err);
      setLoading(false);
    }
  };

  return (
    <div className="mt-6">
      <Button
        onClick={handleUpdate}
        disabled={loading}
        className="bg-primary text-white font-bold px-6 py-2 rounded"
      >
        {loading ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          "🔄 Mettre à jour l'équipe (incrémental)"
        )}
      </Button>
      {loading && (
        <div className="mt-4">
          <Progress value={progress} className="h-2 bg-primary/20" />
          <p className="mt-2 text-primary font-semibold animate-pulse">
            {status}
          </p>
        </div>
      )}
      {results.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-bold mb-2 text-primary">
            Résultats de la mise à jour
          </h2>
          <ul className="space-y-3">
            {results.map((res: any) => (
              <li
                key={res.competitionId}
                className={`p-4 rounded border ${res.success ? "border-green-500 bg-green-50 text-green-700" : "border-red-500 bg-red-50 text-red-700"}`}
              >
                <span className="font-semibold">
                  Compétition #{res.competitionId} :
                </span>{" "}
                {res.success ? (
                  <>
                    <CheckCircle2 className="inline h-4 w-4 text-green-500 ml-2" />{" "}
                    Succès
                  </>
                ) : (
                  <>
                    <AlertCircle className="inline h-4 w-4 text-red-500 ml-2" />{" "}
                    Erreur : {res.error || "Erreur inconnue"}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
