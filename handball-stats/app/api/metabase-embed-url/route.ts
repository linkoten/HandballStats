import { NextRequest, NextResponse } from "next/server";

// Proxy la requête vers le backend Python (FastAPI)
export async function GET(req: NextRequest) {
  const { search } = req.nextUrl;
  // Adapter l'URL backend si besoin
  const backendUrl = `http://localhost:8000/api/metabase-embed-url${search}`;

  try {
    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // Ajouter ici des headers d'auth si besoin
      },
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur proxy Metabase" },
      { status: 500 },
    );
  }
}
