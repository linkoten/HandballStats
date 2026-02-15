"use client";

import {
  UserButton,
  SignedIn,
  SignedOut,
  SignInButton,
  useUser,
} from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getUserProfile } from "@/app/actions";

type UserData = {
  subscription: string;
  role: string;
  tokensRemaining: number;
};

export function Navbar() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    async function fetchUserData() {
      // Ne charger les données que si Clerk est chargé et l'utilisateur est connecté
      if (!isLoaded || !isSignedIn) {
        return;
      }

      try {
        const result = await getUserProfile();
        if (result.success) {
          setUserData(result.data);
        } else {
          console.error("Erreur getUserProfile:", result.error);
        }
      } catch (error) {
        console.error("Erreur chargement données utilisateur:", error);
      }
    }

    fetchUserData();
  }, [isLoaded, isSignedIn]);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-2xl font-sport font-bold text-primary tracking-widest uppercase hover:-skew-x-6 transition-transform"
          >
            Handball Stats
          </Link>

          <SignedIn>
            <div className="flex gap-6 items-center">
              {[
                { href: "/dashboard", label: "Dashboard" },
                { href: "/equipes", label: "Équipes" },
                { href: "/matchs", label: "Matchs" },
                { href: "/statistiques", label: "Statistiques" },
                { href: "/pricing", label: "💎 Pricing" },
                { href: "/statistiques", label: "📊 Dashboard" },
              ].map((link) => (
                <Link
                  key={link.href + link.label}
                  href={link.href}
                  className="font-sport text-sm uppercase tracking-wide text-foreground/80 hover:text-primary transition-colors hover:underline underline-offset-4"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </SignedIn>
        </div>

        <div className="flex items-center gap-4">
          <SignedIn>
            {userData && (
              <div className="flex items-center gap-3">
                {/* Tokens */}
                <Badge
                  variant="outline"
                  className="bg-accent/10 text-accent-foreground border-accent font-sport tracking-wide"
                >
                  🎫{" "}
                  {userData.subscription === "PREMIUM"
                    ? "∞"
                    : userData.tokensRemaining}{" "}
                  token{userData.tokensRemaining !== 1 ? "s" : ""}
                </Badge>

                {/* Rôle */}
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary font-sport tracking-wide"
                >
                  {userData.role === "UTILISATEUR" && "👤"}
                  {userData.role === "ENTRAINEUR" && "🏆"}
                  {userData.role === "ADMIN_CLUB" && "👑"}
                  {userData.role === "ADMIN_GENERAL" && "🔱"}{" "}
                  {userData.role === "UTILISATEUR" && "Utilisateur"}
                  {userData.role === "ENTRAINEUR" && "Entraîneur"}
                  {userData.role === "ADMIN_CLUB" && "Admin Club"}
                  {userData.role === "ADMIN_GENERAL" && "Admin"}
                </Badge>
              </div>
            )}

            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10 border-2 border-primary/20",
                },
              }}
            />
          </SignedIn>

          <SignedOut>
            <SignInButton mode="modal">
              <Button>Se connecter</Button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
    </nav>
  );
}
