"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { spawn } from "child_process";
import path from "path";
import { revalidatePath } from "next/cache";

export type ScrapingStatusResponse = {
  success: boolean;
  data?: {
    competitions: {
      id: number;
      nom: string;
      scrapingStatus: string;
      equipe: string;
      saison: string;
      progress?: number;
    }[];
  };
  error?: string;
};

type ScrapingResult = {
  success: boolean;
  message: string;
  competitionCount?: number;
};

/**
 * Déclenche le scraping pour les compétitions spécifiées
 */
export async function triggerScraping(
  competitionIds: number[],
): Promise<ScrapingResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Non authentifié");
    }

    if (!competitionIds || competitionIds.length === 0) {
      throw new Error("IDs de compétition requis");
    }

    console.log(
      `🚀 Déclenchement du scraping pour ${competitionIds.length} compétition(s):`,
      competitionIds,
    );

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      throw new Error("Utilisateur introuvable");
    }

    // Récupérer les compétitions avec toutes les données nécessaires
    const competitions = await prisma.competition.findMany({
      where: {
        id: { in: competitionIds },
        competitionAccess: {
          some: { userId: user.id },
        },
      },
      include: {
        equipe: {
          select: {
            id: true,
            nom: true,
            ville: true,
            club: {
              select: {
                id: true,
                nom: true,
              },
            },
          },
        },
      },
    });

    if (competitions.length === 0) {
      throw new Error("Aucune compétition accessible trouvée");
    }

    // Vérifier que toutes les compétitions ont les données nécessaires
    const invalidCompetitions = competitions.filter((comp) => !comp.poule);
    if (invalidCompetitions.length > 0) {
      throw new Error(
        `Compétitions manquantes données obligatoires: ${invalidCompetitions.map((c) => c.nom).join(", ")} (poule manquante)`,
      );
    }

    // Construire la configuration du scraper selon le format attendu par Python
    const scraperConfigs = competitions.map((comp) => {
      const equipe = comp.equipe;

      return {
        competition_id: comp.id,
        nom_competition: comp.nom,
        niveau: comp.niveau,
        genre: comp.genre,
        saison: comp.saison,

        // Configuration technique pour le scraper
        id_champ: comp.idChamp,
        id_poule: comp.poule,
        journee_debut: comp.journeeDebut || 1,
        journee_fin: comp.journeeFin || 26,
        url_base: comp.urlBase,
        last_scrape: comp.lastScrape?.toISOString(),

        // Informations sur l'équipe
        equipe_config: {
          id: equipe?.id,
          nom: equipe?.nom,
          ville: equipe?.ville,
          club_nom: equipe?.club?.nom,
          club_id: equipe?.club?.id,
        },
      };
    });

    // Définir le chemin vers le script Python (maintenant dans handball-stats/backend)
    const backendPath = path.resolve(process.cwd(), "backend");
    const pythonScript = path.join(backendPath, "scraper", "main.py");

    // Configuration pour le scraper Python
    const config = {
      competitions: scraperConfigs,
      timestamp: new Date().toISOString(),
      user_id: user.id,
    };

    console.log("📋 Configuration scraper:", JSON.stringify(config, null, 2));

    return new Promise((resolve) => {
      // Lancer le processus Python avec la configuration
      const pythonProcess = spawn(
        "python",
        [pythonScript, "--mode", "full", "--config", JSON.stringify(config)],
        {
          cwd: backendPath,
          stdio: ["pipe", "pipe", "pipe"],
          env: { ...process.env },
        },
      );

      let output = "";
      let errorOutput = "";

      pythonProcess.stdout.on("data", (data) => {
        const message = data.toString();
        output += message;
        console.log("🐍 Python stdout:", message);
      });

      pythonProcess.stderr.on("data", (data) => {
        const message = data.toString();
        errorOutput += message;
        console.error("🐍 Python stderr:", message);
      });

      pythonProcess.on("close", (code) => {
        console.log(`🏁 Processus Python terminé avec code: ${code}`);

        // Revalider les pages qui pourraient avoir changé
        revalidatePath("/competitions/suivi");
        revalidatePath("/dashboard");

        if (code === 0) {
          resolve({
            success: true,
            message: `Scraping démarré avec succès pour ${competitions.length} compétition(s)`,
            competitionCount: competitions.length,
          });
        } else {
          resolve({
            success: false,
            message: `Erreur lors du scraping (code ${code}): ${errorOutput || "Erreur inconnue"}`,
          });
        }
      });

      pythonProcess.on("error", (error) => {
        console.error("❌ Erreur processus Python:", error);
        resolve({
          success: false,
          message: `Erreur lors du lancement du scraper: ${error.message}`,
        });
      });
    });
  } catch (error) {
    console.error("❌ Erreur triggerScraping:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Récupère le statut du scraping pour les compétitions
 */
export async function getScrapingStatus(
  competitionIds: string,
): Promise<ScrapingStatusResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Non authentifié");
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      throw new Error("Utilisateur introuvable");
    }

    // Parser les IDs
    const ids = competitionIds
      .split(",")
      .map((id) => parseInt(id.trim()))
      .filter((id) => !isNaN(id));

    if (ids.length === 0) {
      throw new Error("IDs de compétitions invalides");
    }

    // Récupérer les compétitions avec leur statut
    const competitions = await prisma.competition.findMany({
      where: {
        id: { in: ids },
        // Vérifier l'accès utilisateur
        equipe: {
          club: {
            userClubs: {
              some: { userId: user.id }
            }
          }
        }
      },
      include: {
        equipe: {
          select: {
            nom: true,
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    const formattedCompetitions = competitions.map((comp) => {
      // Utiliser le vrai progress de la DB
      let progress = comp.scrapingProgress || 0;
      
      // Fallback si pas de progress numérique
      if (!comp.scrapingProgress) {
        switch (comp.scrapingStatus) {
          case "PENDING":
            progress = 0;
            break;
          case "IN_PROGRESS":
            progress = 10; // Seulement si pas de vraie valeur
            break;
          case "COMPLETED":
            progress = 100;
            break;
          case "ERROR":
            progress = 0;
            break;
          default:
            progress = 0;
        }
      }

      return {
        id: comp.id,
        nom: comp.nom,
        scrapingStatus: comp.scrapingStatus,
        equipe: comp.equipe?.nom || 'Équipe inconnue',
        saison: comp.saison,
        progress,
      };
    });

    return {
      success: true,
      data: {
        competitions: formattedCompetitions,
      },
    };
  } catch (error) {
    console.error("Erreur récupération statut scraping:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}
