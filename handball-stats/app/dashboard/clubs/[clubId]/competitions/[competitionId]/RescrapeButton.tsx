"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { rescrapeCompetition } from "@/app/actions/scraping-actions";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function RescrapeButton({
  competitionId,
}: {
  competitionId: number;
}) {
  const [loading, setLoading] = useState(false);

  const handleRescrape = async () => {
    setLoading(true);
    try {
      const result = await rescrapeCompetition([competitionId]);
      if (result.success) {
        toast.success("Synchronisation lancée !", {
          description:
            result.data?.message ||
            "Les données seront mises à jour dans quelques instants.",
        });
      } else {
        toast.error("Erreur", { description: result.error });
      }
    } catch (err) {
      toast.error("Erreur lors de la connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleRescrape}
      disabled={loading}
      variant="secondary"
      className={cn(
        "rounded-xl font-sport italic text-xs transition-all",
        loading && "opacity-80",
      )}
    >
      <RefreshCw className={cn("mr-2 h-3 w-3", loading && "animate-spin")} />
      {loading ? "Synchronisation..." : "Mettre à jour les données"}
    </Button>
  );
}
