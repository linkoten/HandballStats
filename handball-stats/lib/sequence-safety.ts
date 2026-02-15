import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Log des erreurs de séquence si elles surviennent
  const response = NextResponse.next();

  response.headers.set("x-sequence-check", "enabled");

  return response;
}

// Fonction utilitaire pour wrapper les créations Prisma
export async function safeCreate<T>(
  createFn: () => Promise<T>,
  entityName: string,
): Promise<T> {
  try {
    return await createFn();
  } catch (error: any) {
    if (error.code === "P2002" && error.meta?.target?.includes("id")) {
      console.error(`🚨 Séquence désynchronisée détectée pour ${entityName}!`);
      console.error("Exécutez: npm run prisma:fix-sequences");

      // En production, vous pourriez envoyer une alerte
      // await sendAlert(`Sequence issue detected for ${entityName}`);
    }
    throw error;
  }
}

export const config = {
  matcher: "/api/:path*",
};
