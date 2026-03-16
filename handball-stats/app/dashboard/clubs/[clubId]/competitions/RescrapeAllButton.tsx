"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { rescrapeClubCurrentSaison } from "@/app/actions/scraping-actions";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function RescrapeAllButton({
  clubId,
  saison = "2025-2026",
  variant = "default",
  className,
}: {
  clubId: number;
  saison?: string;
  variant?: "default" | "outline";
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleRescrape = async () => {
    setLoading(true);
    try {
      const result = await rescrapeClubCurrentSaison(clubId, saison);
      if (result.success) {
        toast.success("Synchronisation lancée !", {
          description:
            result.data?.message ||
            "Les données seront mises à jour dans quelques instants.",
        });
      } else {
        toast.error("Erreur", { description: result.error });
      }
    } catch {
      toast.error("Erreur lors de la connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleRescrape}
      disabled={loading}
      variant={variant}
      size="lg"
      className={cn(
        "rounded-2xl font-sport italic font-black uppercase tracking-tight text-sm px-5 shadow-lg transition-all",
        variant === "default" && "shadow-secondary/30",
        loading && "opacity-80",
        className,
      )}
    >
      <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
      {loading ? "Synchronisation en cours…" : `Tout mettre à jour (${saison})`}
    </Button>
  );
}
