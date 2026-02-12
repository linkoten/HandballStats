import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get("region");
    const departement = searchParams.get("departement");
    const ville = searchParams.get("ville");
    const search = searchParams.get("search");

    // Construire le filtre
    const where: any = {
      clubId: { not: null }, // S'assurer que l'équipe est liée à un club
    };

    if (region) {
      where.region = region;
    }

    if (departement) {
      where.departement = departement;
    }

    if (ville) {
      where.ville = ville;
    }

    if (search) {
      where.OR = [
        { club: { nom: { contains: search, mode: "insensitive" } } },
        { nom: { contains: search, mode: "insensitive" } },
        { ville: { contains: search, mode: "insensitive" } },
      ];
    }

    // Récupérer toutes les équipes correspondantes
    const equipes = await prisma.equipes.findMany({
      where,
      select: {
        id: true,
        nom: true,
        club: {
          select: {
            id: true,
            nom: true,
            ville: true,
            region: true,
            departement: true,
          },
        },
        ville: true,
        region: true,
        departement: true,
      },
      orderBy: [{ club: { nom: "asc" } }, { nom: "asc" }],
    });

    // Grouper par club
    const clubsMap = new Map<number, any>();

    equipes.forEach((equipe) => {
      if (equipe.club && !clubsMap.has(equipe.club.id)) {
        clubsMap.set(equipe.club.id, {
          id: equipe.club.id,
          nom: equipe.club.nom,
          ville: equipe.club.ville,
          region: equipe.club.region,
          departement: equipe.club.departement,
          // Compter le nombre d'équipes pour ce club
          equipesCount: equipes.filter((e) => e.club?.id === equipe.club?.id)
            .length,
        });
      }
    });

    const clubs = Array.from(clubsMap.values());

    // Récupérer les listes pour les filtres (en fonction des filtres actifs)
    const filterWhere: any = { clubId: { not: null } };

    // Si région sélectionnée, filtrer les départements et villes de cette région
    if (region) {
      filterWhere.region = region;
    }

    // Si département sélectionné, filtrer les villes de ce département
    if (departement) {
      filterWhere.departement = departement;
    }

    const regions = await prisma.equipes.findMany({
      where: { clubId: { not: null }, region: { not: null } },
      select: { region: true },
      distinct: ["region"],
      orderBy: { region: "asc" },
    });

    const departements = await prisma.equipes.findMany({
      where: { ...filterWhere, departement: { not: null } },
      select: { departement: true },
      distinct: ["departement"],
      orderBy: { departement: "asc" },
    });

    const villes = await prisma.equipes.findMany({
      where: { ...filterWhere, ville: { not: null } },
      select: { ville: true },
      distinct: ["ville"],
      orderBy: { ville: "asc" },
    });

    return NextResponse.json({
      clubs,
      filters: {
        regions: regions.map((r) => r.region).filter(Boolean),
        departements: departements.map((d) => d.departement).filter(Boolean),
        villes: villes.map((v) => v.ville).filter(Boolean),
      },
    });
  } catch (error) {
    console.error("Erreur récupération clubs:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
