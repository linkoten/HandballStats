"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type ObjectifType =
  | "buts"
  | "arrets"
  | "pct_tir"
  | "exclusions_max"
  | "sept_metres"
  | "tirs";

export type FixePar = "joueur" | "entraineur";

export type UpsertObjectifData = {
  id_joueur: number;
  saison: string;
  type_objectif: ObjectifType;
  valeur_cible: number;
  fixe_par: FixePar;
  note?: string;
};

export type ObjectifResponse = {
  success: boolean;
  data?: any;
  error?: string;
};

/** Créer ou mettre à jour un objectif (upsert par joueur/saison/type) */
export async function upsertObjectif(
  data: UpsertObjectifData,
): Promise<ObjectifResponse> {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Non authentifié");

    const objectif = await prisma.joueur_objectifs.upsert({
      where: {
        id_joueur_saison_type_objectif: {
          id_joueur: data.id_joueur,
          saison: data.saison,
          type_objectif: data.type_objectif,
        },
      },
      update: {
        valeur_cible: data.valeur_cible,
        fixe_par: data.fixe_par,
        note: data.note ?? null,
      },
      create: {
        id_joueur: data.id_joueur,
        saison: data.saison,
        type_objectif: data.type_objectif,
        valeur_cible: data.valeur_cible,
        fixe_par: data.fixe_par,
        note: data.note ?? null,
      },
    });

    revalidatePath(`/dashboard/clubs`);
    return { success: true, data: objectif };
  } catch (error) {
    console.error("Erreur upsertObjectif:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/** Supprimer un objectif par son ID */
export async function deleteObjectif(id: number): Promise<ObjectifResponse> {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Non authentifié");

    await prisma.joueur_objectifs.delete({ where: { id } });

    revalidatePath(`/dashboard/clubs`);
    return { success: true };
  } catch (error) {
    console.error("Erreur deleteObjectif:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/** Récupérer tous les objectifs d'un joueur */
export async function getObjectifsByJoueur(
  joueurId: number,
): Promise<ObjectifResponse> {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Non authentifié");

    const objectifs = await prisma.joueur_objectifs.findMany({
      where: { id_joueur: joueurId },
      orderBy: [{ saison: "desc" }, { type_objectif: "asc" }],
    });

    return { success: true, data: objectifs };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}
