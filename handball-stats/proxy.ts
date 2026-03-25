import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/",
  "/pricing",
  "/api/webhooks(.*)", // Webhook Clerk doit être public
]);

const isApiRoute = createRouteMatcher(["/api(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();

  // Si c'est une route API protégée et l'utilisateur n'est pas authentifié
  // Retourner du JSON au lieu de rediriger
  if (isApiRoute(request) && !isPublicRoute(request) && !userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // Protéger les autres routes normalement
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
