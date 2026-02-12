import { NextResponse } from "next/server";
import { spawn } from "child_process";

export async function POST(request: Request) {
  try {
    const { equipeIds } = await request.json();
    if (!Array.isArray(equipeIds) || equipeIds.length === 0) {
      return NextResponse.json(
        { error: "Aucune équipe à scraper." },
        { status: 400 },
      );
    }

    const results: { equipeId: number; success: boolean; error?: string }[] =
      [];

    for (const equipeId of equipeIds) {
      try {
        await new Promise((resolve, reject) => {
          const process = spawn("python", [
            "../../backend/scraper/main.py",
            "--mode",
            "incremental",
            "--equipe_id",
            String(equipeId),
          ]);
          process.on("close", (code) => {
            if (code === 0) resolve(true);
            else
              reject(
                new Error(`Scraping équipe ${equipeId} échoué (code ${code})`),
              );
          });
          process.on("error", reject);
        });
        results.push({ equipeId, success: true });
      } catch (err: any) {
        results.push({ equipeId, success: false, error: err.message });
      }
    }

    const allSuccess = results.every((r) => r.success);
    return NextResponse.json({ success: allSuccess, results });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Erreur serveur" },
      { status: 500 },
    );
  }
}
