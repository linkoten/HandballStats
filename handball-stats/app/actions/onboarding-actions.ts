"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { safeCreate } from "@/lib/sequence-safety";
import { spawn } from "child_process";
import path from "path";

/**
 * Lance le processus de scraping pour les compétitions
 */
async function startScrapingProcess(competitionIds: number[]) {
  try {
    console.log(
      "🔄 Démarrage du scraping pour les compétitions:",
      competitionIds,
    );

    // Récupérer les compétitions avec toutes leurs données
    const competitions = await prisma.competition.findMany({
      where: { id: { in: competitionIds } },
      include: {
        equipe: {
          select: {
            id: true,
            nom: true,
          },
        },
      },
    });

    if (competitions.length === 0) {
      console.error(
        "❌ Aucune compétition trouvée avec ces IDs:",
        competitionIds,
      );
      return;
    }

    // Construire la configuration pour le script Python
    const config = competitions.map((comp) => ({
      competitionId: comp.id,
      equipeId: comp.equipeId,
      url: comp.baseUrl,
      equipe: comp.equipeFFHB || comp.equipe?.nom || "Inconnue",
      equipe_bdd: comp.equipe?.nom || "Inconnue",
      competition_name: comp.nom,
      poule: comp.poule || "",
      max_journees: comp.max_journees || 18,
      saison: comp.saison,
      phase: comp.phase || "Poule",
    }));

    console.log("📊 Configuration du scraping:", {
      competitionsCount: config.length,
      competitions: config.map((c) => ({
        competitionId: c.competitionId,
        nom: c.competition_name,
        url: c.url,
        equipe: c.equipe,
        equipe_bdd: c.equipe_bdd,
        saison: c.saison,
        poule: c.poule,
        max_journees: c.max_journees,
      })),
    });

    // Chemin vers le script Python de scraping
    const backendPath = path.join(process.cwd(), "backend");
    const scrapingScript = path.join(backendPath, "scraper", "main.py");

    console.log("📁 Chemin backend:", backendPath);
    console.log("🐍 Script Python:", scrapingScript);

    // Mettre à jour le statut des compétitions
    await prisma.competition.updateMany({
      where: { id: { in: competitionIds } },
      data: { scrapingStatus: "IN_PROGRESS" },
    });

    // Construire la commande Python avec la configuration JSON
    const configJson = JSON.stringify(config);
    console.log(
      "⚡ Commande Python avec config:",
      configJson.substring(0, 100) + "...",
    );

    // Lancer le processus Python avec capture des logs temps réel
    // Passer la config via stdin pour éviter les problèmes d'échappement
    const pythonArgs = [scrapingScript, "--config", "-"]; // "-" signifie lire depuis stdin
    const pythonProcess = spawn("python", pythonArgs, {
      cwd: backendPath,
      stdio: ["pipe", "pipe", "pipe"], // stdin pipe pour envoyer la config
      shell: true,
    });

    console.log(`🚀 Processus Python lancé avec PID: ${pythonProcess.pid}`);

    // Envoyer la configuration via stdin puis fermer
    if (pythonProcess.stdin) {
      pythonProcess.stdin.write(configJson);
      pythonProcess.stdin.end();
    }

    // Capturer stdout en temps réel
    pythonProcess.stdout?.on("data", (data) => {
      const message = data.toString().trim();
      if (message) {
        console.log(`[PYTHON] ${message}`);
      }
    });

    // Capturer stderr en temps réel
    pythonProcess.stderr?.on("data", (data) => {
      const error = data.toString().trim();
      if (error) {
        console.warn(`[PYTHON ERROR] ${error}`);
      }
    });

    // Gérer la fin du processus
    pythonProcess.on("close", (code) => {
      if (code === 0) {
        console.log("✅ Scraping terminé avec succès");
        // Mettre à jour le statut en SUCCESS
        prisma.competition.updateMany({
          where: { id: { in: competitionIds } },
          data: { scrapingStatus: "COMPLETED" },
        });
      } else {
        console.error(`❌ Scraping terminé avec code d'erreur: ${code}`);
        // Mettre à jour le statut en ERROR
        prisma.competition.updateMany({
          where: { id: { in: competitionIds } },
          data: {
            scrapingStatus: "FAILED",
            scrapingStep: `Processus terminé avec code: ${code}`,
          },
        });
      }
    });

    // Gérer les erreurs du processus
    pythonProcess.on("error", (error) => {
      console.error("❌ Erreur lors du lancement du processus Python:", error);
      // Mettre à jour le statut en ERROR
      prisma.competition.updateMany({
        where: { id: { in: competitionIds } },
        data: {
          scrapingStatus: "FAILED",
          scrapingStep: `Erreur: ${error.message}`,
        },
      });
    });
  } catch (error) {
    console.error("❌ Erreur startScrapingProcess:", error);
  }
}

export type OnboardingResponse = {
  success: boolean;
  data?: any;
  error?: string;
};

export type CompetitionConfig = {
  url: string;
  equipe: string;
  equipe_bdd: string;
  competition_name: string;
  poule: string;
  max_journees: string;
  saison: string;
  phase?: string;
  equipeId: number | null;
};

/**
 * Sélectionner un club pendant l'onboarding
 */
export async function selectOnboardingClub(
  clubId: number,
): Promise<OnboardingResponse> {
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

    // Vérifier que l'utilisateur a bien accès à ce club
    const userClub = await prisma.userClub.findFirst({
      where: {
        userId: user.id,
        clubId: clubId,
      },
    });

    if (!userClub) {
      return {
        success: false,
        error: "Accès au club non autorisé",
      };
    }

    // Stocker la sélection dans les cookies
    const cookieStore = await cookies();
    cookieStore.set("onboarding-selected-club", clubId.toString(), {
      httpOnly: true,
      maxAge: 60 * 60 * 24, // 24h
      sameSite: "strict",
    });

    return {
      success: true,
      data: { clubId },
    };
  } catch (error) {
    console.error("Erreur sélection club onboarding:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Récupérer le club sélectionné pendant l'onboarding
 */
export async function getOnboardingSelectedClub(): Promise<OnboardingResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Non authentifié");
    }

    const cookieStore = await cookies();
    const selectedClubId = cookieStore.get("onboarding-selected-club")?.value;

    if (!selectedClubId) {
      return {
        success: false,
        error: "Aucun club sélectionné",
      };
    }

    const club = await prisma.club.findUnique({
      where: { id: parseInt(selectedClubId) },
      include: {
        _count: {
          select: { equipes: true },
        },
      },
    });

    if (!club) {
      return {
        success: false,
        error: "Club introuvable",
      };
    }

    return {
      success: true,
      data: club,
    };
  } catch (error) {
    console.error("Erreur récupération club onboarding:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Sélectionner des équipes pendant l'onboarding
 */
export async function selectOnboardingTeams(
  equipeIds: number[],
): Promise<OnboardingResponse> {
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

    // Vérifier que toutes les équipes appartiennent à des clubs de l'utilisateur
    const equipes = await prisma.equipes.findMany({
      where: {
        id: { in: equipeIds },
        club: {
          userClubs: {
            some: { userId: user.id },
          },
        },
      },
    });

    if (equipes.length !== equipeIds.length) {
      return {
        success: false,
        error: "Certaines équipes ne sont pas autorisées",
      };
    }

    // Stocker la sélection dans les cookies
    const cookieStore = await cookies();
    cookieStore.set("onboarding-selected-equipes", JSON.stringify(equipeIds), {
      httpOnly: true,
      maxAge: 60 * 60 * 24, // 24h
      sameSite: "strict",
    });

    return {
      success: true,
      data: { equipeIds },
    };
  } catch (error) {
    console.error("Erreur sélection équipes onboarding:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Récupérer les équipes sélectionnées pendant l'onboarding
 */
export async function getOnboardingSelectedTeams(): Promise<OnboardingResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Non authentifié");
    }

    const cookieStore = await cookies();
    const selectedEquipesStr = cookieStore.get(
      "onboarding-selected-equipes",
    )?.value;

    if (!selectedEquipesStr) {
      return {
        success: false,
        error: "Aucune équipe sélectionnée",
      };
    }

    const equipeIds = JSON.parse(selectedEquipesStr);

    const equipes = await prisma.equipes.findMany({
      where: { id: { in: equipeIds } },
      include: {
        club: {
          select: { id: true, nom: true },
        },
      },
    });

    return {
      success: true,
      data: equipes,
    };
  } catch (error) {
    console.error("Erreur récupération équipes onboarding:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Configurer les compétitions en lot pendant l'onboarding
 */
export async function configureCompetitionsBatch(
  competitions: CompetitionConfig[],
): Promise<OnboardingResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Non authentifié");
    }

    if (!competitions || !Array.isArray(competitions)) {
      return {
        success: false,
        error: "Tableau de compétitions requis",
      };
    }

    // Valider chaque configuration
    for (const [index, config] of competitions.entries()) {
      if (!config.equipeId) {
        return {
          success: false,
          error: `ID d'équipe requis pour la compétition ${index + 1}`,
        };
      }

      if (!config.competition_name) {
        return {
          success: false,
          error: `Nom de compétition requis pour l'entrée ${index + 1}`,
        };
      }

      if (!config.saison) {
        return {
          success: false,
          error: `Saison requise pour l'entrée ${index + 1}`,
        };
      }

      if (!config.equipe_bdd) {
        return {
          success: false,
          error: `Nom d'équipe BDD requis pour l'entrée ${index + 1}`,
        };
      }
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      throw new Error("Utilisateur introuvable");
    }

    const results = [];

    // Traiter chaque configuration de compétition
    for (const config of competitions) {
      // Vérifier l'accès à l'équipe
      const equipe = await prisma.equipes.findFirst({
        where: {
          id: config.equipeId!,
          club: {
            userClubs: {
              some: { userId: user.id },
            },
          },
        },
        include: {
          club: { select: { id: true } },
        },
      });

      if (!equipe) {
        return {
          success: false,
          error: `Accès non autorisé à l'équipe ID ${config.equipeId}`,
        };
      }

      if (!equipe.club) {
        return {
          success: false,
          error: `L'équipe ID ${config.equipeId} n'a pas de club associé`,
        };
      }

      // Créer la compétition avec gestion des séquences
      let competition;
      try {
        competition = await safeCreate(
          () =>
            prisma.competition.create({
              data: {
                nom: config.competition_name,
                saison: config.saison,
                equipeId: config.equipeId!,
                baseUrl: config.url,
                poule: config.poule || "",
                max_journees: parseInt(config.max_journees) || 18,
                equipeFFHB: config.equipe,
                niveau: "Championnat",
                phase: config.phase || "Poule",
                scrapingStatus: "PENDING",
              },
            }),
          "competitions",
        );
      } catch (error: any) {
        // Si la compétition existe déjà (contrainte unique), la récupérer
        if (error.code === "P2002") {
          console.log(
            `⚠️ Compétition existante trouvée pour ${config.competition_name}, utilisation de celle-ci`,
          );
          competition = await prisma.competition.findFirst({
            where: {
              equipeId: config.equipeId!,
              saison: config.saison,
              nom: config.competition_name,
              phase: config.phase || "Poule",
            },
          });

          if (!competition) {
            throw new Error(
              `Compétition existante introuvable: ${config.competition_name}`,
            );
          }

          // Mettre à jour les données avec les nouvelles valeurs
          competition = await prisma.competition.update({
            where: { id: competition.id },
            data: {
              baseUrl: config.url,
              poule: config.poule || "",
              max_journees: parseInt(config.max_journees) || 18,
              equipeFFHB: config.equipe,
              scrapingStatus: "PENDING",
            },
          });
        } else {
          throw error;
        }
      }

      // Créer l'accès compétition pour l'utilisateur
      await prisma.competitionAccess.create({
        data: {
          userId: user.id,
          competitionId: competition.id,
          tokenUsed: false, // Gratuit lors de l'onboarding
          createdAt: new Date(),
        },
      });

      results.push({
        competitionId: competition.id,
        config: config,
      });
    }

    // Nettoyer les cookies d'onboarding après succès
    const cookieStore = await cookies();
    cookieStore.delete("onboarding-selected-club");
    cookieStore.delete("onboarding-selected-equipes");

    // Appel à l'API Render pour lancer le scraping
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      if (!apiUrl) {
        throw new Error("NEXT_PUBLIC_API_URL non défini");
      }
      const response = await fetch(
        `${apiUrl.replace(/\/$/, "")}/scrape/batch`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            competitions: results.map((r) => ({
              competitionId: r.competitionId,
              ...r.config,
            })),
          }),
        },
      );
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erreur API scraping:", errorText);
      }
    } catch (err) {
      console.error(
        "Erreur lors de l'appel à l'API Render pour le scraping:",
        err,
      );
    }

    revalidatePath("/competitions");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: {
        competitions: results,
        count: results.length,
        redirectTo: `/competitions/scraping-progress?ids=${results.map((r) => r.competitionId).join(",")}`,
      },
    };
  } catch (error) {
    console.error("Erreur configuration compétitions batch:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Nettoyer les données d'onboarding (cookies)
 */
export async function clearOnboardingData(): Promise<OnboardingResponse> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("onboarding-selected-club");
    cookieStore.delete("onboarding-selected-equipes");

    return {
      success: true,
      data: { message: "Données d'onboarding nettoyées" },
    };
  } catch (error) {
    console.error("Erreur nettoyage onboarding:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Récupérer les équipes disponibles pour un club donné (onboarding)
 */
export async function getOnboardingEquipesByClub(
  clubId: number,
): Promise<OnboardingResponse> {
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

    // Vérifier l'accès au club
    const userClub = await prisma.userClub.findFirst({
      where: {
        userId: user.id,
        clubId: clubId,
      },
    });

    if (!userClub) {
      return {
        success: false,
        error: "Accès au club non autorisé",
      };
    }

    const equipes = await prisma.equipes.findMany({
      where: { clubId: clubId },
      include: {
        _count: {
          select: {
            competitions: true,
            joueurs: true,
          },
        },
      },
      orderBy: { nom: "asc" },
    });

    return {
      success: true,
      data: equipes,
    };
  } catch (error) {
    console.error("Erreur récupération équipes onboarding:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}
