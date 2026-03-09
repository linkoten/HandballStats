"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type JoueurFormData = {
  nom_prenom: string;
  num_maillot?: number;
  id_equipe: number;
  poste_principal?: string;
  postes_secondaires?: string[];
};

export type JoueurResponse = {
  success: boolean;
  data?: any;
  error?: string;
};

/**
 * Récupère tous les joueurs avec filtrage optionnel par équipe
 */
export async function getJoueurs(equipeId?: string): Promise<JoueurResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Non authentifié");
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      throw new Error("Utilisateur introuvable");
    }

    let whereClause: any = {};

    if (equipeId) {
      // Si une équipe spécifique est demandée, vérifier les autorisations
      const equipe = await prisma.equipes.findFirst({
        where: {
          id: parseInt(equipeId),
          club: {
            userClubs: {
              some: { userId: user.id },
            },
          },
        },
      });

      if (!equipe) {
        throw new Error("Équipe non autorisée");
      }

      whereClause.id_equipe = parseInt(equipeId);
    } else {
      // Récupérer les joueurs de toutes les équipes des clubs de l'utilisateur
      const userClubs = await prisma.userClub.findMany({
        where: { userId: user.id },
        include: {
          club: {
            include: { equipes: true },
          },
        },
      });

      const equipeIds = userClubs.flatMap((uc) =>
        uc.club.equipes.map((eq) => eq.id),
      );

      if (equipeIds.length === 0) {
        return {
          success: true,
          data: [],
        };
      }

      whereClause.id_equipe = { in: equipeIds };
    }

    // Récupérer les joueurs
    const joueurs = await prisma.joueurs.findMany({
      where: whereClause,
      include: {
        equipes: {
          include: { club: true },
        },
      },
      orderBy: [{ equipes: { nom: "asc" } }, { nom_prenom: "asc" }],
    });

    // Formater pour correspondre à l'ancienne API
    const formattedJoueurs = joueurs.map((joueur) => ({
      id: joueur.id,
      nom_prenom: joueur.nom_prenom,
      num_maillot: joueur.num_maillot,
      id_equipe: joueur.id_equipe,
      poste_principal: joueur.poste_principal,
      postes_secondaires: joueur.postes_secondaires,
      equipe: joueur.equipes
        ? {
            id: joueur.equipes.id,
            nom: joueur.equipes.nom,
            club: joueur.equipes.club?.nom || "",
          }
        : null,
    }));

    return {
      success: true,
      data: formattedJoueurs,
    };
  } catch (error) {
    console.error("Erreur récupération joueurs:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Récupère un joueur spécifique par son ID
 */
export async function getJoueurById(joueurId: number): Promise<JoueurResponse> {
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

    // Récupérer le joueur avec vérification d'accès via le club
    const joueur = await prisma.joueurs.findFirst({
      where: {
        id: joueurId,
        equipes: {
          club: {
            userClubs: {
              some: { userId: user.id },
            },
          },
        },
      },
      include: {
        equipes: {
          include: { club: true },
        },
      },
    });

    if (!joueur) {
      throw new Error("Joueur introuvable ou non autorisé");
    }

    return {
      success: true,
      data: joueur,
    };
  } catch (error) {
    console.error("Erreur récupération joueur:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Crée un nouveau joueur
 */
export async function createJoueur(
  data: JoueurFormData,
): Promise<JoueurResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Non authentifié");
    }

    const {
      nom_prenom,
      num_maillot,
      id_equipe,
      poste_principal,
      postes_secondaires,
    } = data;

    if (!nom_prenom || !id_equipe) {
      throw new Error("Nom/prénom et équipe requis");
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });
    if (!user) {
      throw new Error("Utilisateur introuvable");
    }

    // Vérifier que l'utilisateur a le bon rôle sur l'équipe
    const equipe = await prisma.equipes.findUnique({
      where: { id: id_equipe },
      include: { club: true },
    });
    if (!equipe || !equipe.club) {
      throw new Error("Équipe ou club introuvable");
    }
    const { isAdmin, isCoach, isGeneralAdmin, hasAccess } =
      await require("@/lib/access-control").checkUserClubRole({
        userId,
        clubId: equipe.club.id,
      });
    if (!hasAccess || (!isAdmin && !isCoach && !isGeneralAdmin)) {
      throw new Error(
        "Seul un coach, admin du club ou admin général peut créer un joueur",
      );
    }

    // Créer le joueur
    const joueur = await prisma.joueurs.create({
      data: {
        nom_prenom,
        num_maillot,
        id_equipe,
        poste_principal,
        postes_secondaires,
      },
      include: {
        equipes: {
          include: { club: true },
        },
      },
    });

    revalidatePath("/joueurs");
    revalidatePath(`/equipes/${id_equipe}`);
    revalidatePath("/dashboard");

    return {
      success: true,
      data: joueur,
    };
  } catch (error) {
    console.error("Erreur création joueur:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Met à jour un joueur existant
 */
export async function updateJoueur(
  joueurId: number,
  data: Partial<JoueurFormData>,
): Promise<JoueurResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Non authentifié");
    }

    // Vérifier l'accès avant la mise à jour
    const joueur = await prisma.joueurs.findUnique({
      where: { id: joueurId },
      include: { equipes: { include: { club: true } } },
    });
    if (!joueur || !joueur.equipes || !joueur.equipes.club) {
      throw new Error("Joueur ou club introuvable");
    }
    const { isAdmin, isCoach, isGeneralAdmin, hasAccess } =
      await require("@/lib/access-control").checkUserClubRole({
        userId,
        clubId: joueur.equipes.club.id,
      });
    if (!hasAccess || (!isAdmin && !isCoach && !isGeneralAdmin)) {
      throw new Error(
        "Seul un coach, admin du club ou admin général peut modifier un joueur",
      );
    }

    // Mettre à jour le joueur
    const updatedJoueur = await prisma.joueurs.update({
      where: { id: joueurId },
      data: {
        ...(data.nom_prenom && { nom_prenom: data.nom_prenom }),
        ...(data.num_maillot !== undefined && {
          num_maillot: data.num_maillot,
        }),
        ...(data.id_equipe && { id_equipe: data.id_equipe }),
        ...(data.poste_principal !== undefined && {
          poste_principal: data.poste_principal,
        }),
        ...(data.postes_secondaires !== undefined && {
          postes_secondaires: data.postes_secondaires,
        }),
      },
      include: {
        equipes: {
          include: { club: true },
        },
      },
    });

    revalidatePath("/joueurs");
    revalidatePath(`/joueurs/${joueurId}`);
    revalidatePath(`/equipes/${updatedJoueur.id_equipe}`);
    revalidatePath("/dashboard");

    return {
      success: true,
      data: updatedJoueur,
    };
  } catch (error) {
    console.error("Erreur mise à jour joueur:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Supprime un joueur
 */
export async function deleteJoueur(joueurId: number): Promise<JoueurResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Non authentifié");
    }

    // Vérifier l'accès avant la suppression
    const joueur = await prisma.joueurs.findUnique({
      where: { id: joueurId },
      include: { equipes: { include: { club: true } } },
    });
    if (!joueur || !joueur.equipes || !joueur.equipes.club) {
      throw new Error("Joueur ou club introuvable");
    }
    const { isAdmin, isCoach, isGeneralAdmin, hasAccess } =
      await require("@/lib/access-control").checkUserClubRole({
        userId,
        clubId: joueur.equipes.club.id,
      });
    if (!hasAccess || (!isAdmin && !isCoach && !isGeneralAdmin)) {
      throw new Error(
        "Seul un coach, admin du club ou admin général peut supprimer un joueur",
      );
    }

    await prisma.joueurs.delete({ where: { id: joueurId } });

    revalidatePath("/joueurs");
    revalidatePath(`/equipes/${joueur.equipes.id}`);
    revalidatePath("/dashboard");

    return {
      success: true,
      data: { message: "Joueur supprimé avec succès" },
    };
  } catch (error) {
    console.error("Erreur suppression joueur:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Met à jour les postes de plusieurs joueurs
 */
export async function updateJoueursPostes(
  updates: {
    joueurId: number;
    poste_principal?: string;
    postes_secondaires?: string[];
  }[],
): Promise<JoueurResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Non authentifié");
    }

    if (!updates || updates.length === 0) {
      throw new Error("Aucune mise à jour spécifiée");
    }

    // Vérifier l'accès pour tous les joueurs
    for (const update of updates) {
      const accessCheck = await getJoueurById(update.joueurId);
      if (!accessCheck.success) {
        throw new Error(`Accès refusé pour le joueur ${update.joueurId}`);
      }
    }

    // Effectuer toutes les mises à jour en transaction
    const results = await prisma.$transaction(
      updates.map((update) =>
        prisma.joueurs.update({
          where: { id: update.joueurId },
          data: {
            ...(update.poste_principal !== undefined && {
              poste_principal: update.poste_principal,
            }),
            ...(update.postes_secondaires !== undefined && {
              postes_secondaires: update.postes_secondaires,
            }),
          },
        }),
      ),
    );

    // Revalider les pages concernées
    revalidatePath("/joueurs");
    revalidatePath("/dashboard");

    // Revalider les pages des équipes concernées
    const equipeIds = [...new Set(results.map((j) => j.id_equipe))];
    equipeIds.forEach((equipeId) => {
      revalidatePath(`/equipes/${equipeId}`);
    });

    return {
      success: true,
      data: results,
    };
  } catch (error) {
    console.error("Erreur mise à jour postes joueurs:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Récupère un joueur avec ses statistiques détaillées et les infos des matchs
 */
export async function getJoueurComplet(
  joueurId: string,
): Promise<JoueurResponse> {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Non authentifié");

    // 1. Sécurisation de l'ID : conversion en nombre et vérification
    const idNum = parseInt(joueurId);
    if (isNaN(idNum)) {
      throw new Error("ID de joueur invalide");
    }

    const joueur = await prisma.joueurs.findUnique({
      where: {
        id: idNum, // Utilisation de l'ID converti
      },
      include: {
        // Attention : selon ton schema.prisma, la relation vers l'équipe s'appelle 'equipes'
        equipes: {
          select: { nom: true, id: true },
        },
        statistiques_joueur: {
          include: {
            matchs: {
              include: {
                // Ces noms proviennent des relations 'idToequipes' de ton schema
                equipes_matchs_equipe_recevant_idToequipes: {
                  select: { nom: true },
                },
                equipes_matchs_equipe_exterieur_idToequipes: {
                  select: { nom: true },
                },
              },
            },
          },
          orderBy: {
            id: "desc",
          },
        },
        objectifs: {
          orderBy: [{ saison: "desc" }, { type_objectif: "asc" }],
        },
      },
    });

    if (!joueur) return { success: false, error: "Joueur non trouvé" };

    return { success: true, data: joueur };
  } catch (error) {
    console.error("Erreur Prisma:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

export async function getJoueursByEquipe(
  equipeId: string,
): Promise<JoueurResponse> {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Non authentifié");

    // Sécurité : on vérifie si equipeId existe et est un nombre
    if (!equipeId || equipeId === "undefined") {
      throw new Error("L'ID d'équipe est manquant");
    }

    const id = parseInt(equipeId);
    if (isNaN(id)) {
      throw new Error(
        `L'ID d'équipe fourni ("${equipeId}") n'est pas un nombre valide`,
      );
    }

    const joueurs = await prisma.joueurs.findMany({
      where: {
        id_equipe: id,
      },
      orderBy: {
        nom_prenom: "asc",
      },
    });

    return { success: true, data: joueurs };
  } catch (error) {
    console.error("Erreur getJoueursByEquipe:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

export async function getLicenciesDuClub(
  clubId: string,
): Promise<JoueurResponse> {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Non authentifié");

    const idClub = parseInt(clubId);

    // On récupère tous les joueurs qui appartiennent à une équipe de ce club
    const joueurs = await prisma.joueurs.findMany({
      where: {
        equipes: {
          clubId: idClub,
        },
      },
      include: {
        equipes: {
          select: { nom: true },
        },
      },
    });

    // Dédoublonnage par nom_prenom pour n'avoir qu'une liste de "personnes"
    const uniqueLicencies = Array.from(
      new Map(
        joueurs.map((j) => [j.nom_prenom.toLowerCase().trim(), j]),
      ).values(),
    );

    return {
      success: true,
      data: uniqueLicencies,
    };
  } catch (error) {
    return {
      success: false,
      error: "Erreur lors de la récupération des licenciés",
    };
  }
}
