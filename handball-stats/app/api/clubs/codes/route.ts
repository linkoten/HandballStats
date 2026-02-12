import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // On récupère tous les clubs avec leurs codes
    const clubs = await prisma.club.findMany({
      select: {
        id: true,
        nom: true,
        coachCode: true,
        playerCode: true,
      },
      orderBy: { nom: "asc" },
    });
    return NextResponse.json({ clubs });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
