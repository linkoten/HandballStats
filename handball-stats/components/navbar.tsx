"use client";

import {
  UserButton,
  SignedIn,
  SignedOut,
  SignInButton,
  useUser,
} from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getUserProfile } from "@/app/actions";
import {
  Trophy,
  LayoutDashboard,
  Users,
  Calendar,
  BarChart3,
  Gem,
  Zap,
  ShieldCheck,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

type UserData = {
  subscription: string;
  role: string;
  tokensRemaining: number;
};

export function Navbar() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const { isLoaded, isSignedIn } = useUser();
  const pathname = usePathname();

  useEffect(() => {
    async function fetchUserData() {
      if (!isLoaded || !isSignedIn) return;
      try {
        const result = await getUserProfile();
        if (result.success) setUserData(result.data);
      } catch (error) {
        console.error("Erreur chargement données utilisateur:", error);
      }
    }
    fetchUserData();
  }, [isLoaded, isSignedIn]);

  const clubId = userData?.club?.id;
  const equipesUrl = clubId ? `/dashboard/clubs/${clubId}/equipes` : "/equipes";
  const matchsUrl = clubId ? `/dashboard/clubs/${clubId}/matchs` : "/matchs";
  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: equipesUrl, label: "Équipes", icon: Users },
    { href: matchsUrl, label: "Matchs", icon: Calendar },
    { href: "/statistiques", label: "Stats", icon: BarChart3 },
    { href: "/pricing", label: "Premium", icon: Gem, highlight: true },
  ];

  return (
    <nav className="sticky top-0 z-[100] w-full border-b-2 border-primary/10 bg-background/60 backdrop-blur-2xl">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        {/* Logo Section */}
        <div className="flex items-center gap-10">
          <Link href="/" className="group flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg rotate-[-6deg] group-hover:rotate-0 transition-transform">
              <Zap className="text-white fill-current" size={20} />
            </div>
            <span className="text-xl font-sport font-black italic uppercase tracking-tighter text-foreground group-hover:text-primary transition-colors">
              Handball
              <span className="text-primary group-hover:text-foreground">
                Stats
              </span>
            </span>
          </Link>

          {/* Navigation Links - Desktop */}
          <SignedIn>
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "px-4 py-2 rounded-xl flex items-center gap-2 font-sport text-[11px] uppercase tracking-wider italic transition-all",
                      isActive
                        ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105"
                        : "text-muted-foreground hover:text-primary hover:bg-primary/5",
                      link.highlight &&
                        !isActive &&
                        "text-secondary hover:text-secondary hover:bg-secondary/5",
                    )}
                  >
                    <link.icon
                      size={14}
                      className={cn(isActive ? "animate-pulse" : "")}
                    />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </SignedIn>
        </div>

        {/* Action Section (Right) */}
        <div className="flex items-center gap-4">
          <SignedIn>
            {userData && (
              <div className="hidden md:flex items-center gap-2 mr-2">
                {/* Tokens Badge */}
                <div className="flex flex-col items-end">
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-7 border-2 font-sport italic text-[10px] px-3 gap-1.5",
                      userData.subscription === "PREMIUM"
                        ? "border-secondary bg-secondary/10 text-secondary-foreground"
                        : "border-primary/20 bg-primary/5 text-primary",
                    )}
                  >
                    <Zap size={10} className="fill-current" />
                    {userData.subscription === "PREMIUM"
                      ? "ILLIMITÉ"
                      : `${userData.tokensRemaining} TOKENS`}
                  </Badge>
                </div>

                {/* Role Badge */}
                <Badge
                  className={cn(
                    "h-7 font-sport italic text-[10px] border-2",
                    userData.role === "ADMIN_GENERAL" ||
                      userData.role === "ADMIN_CLUB"
                      ? "bg-foreground text-background border-foreground"
                      : "bg-muted text-muted-foreground border-transparent",
                  )}
                >
                  {userData.role === "ADMIN_GENERAL" && (
                    <Crown size={10} className="mr-1" />
                  )}
                  {userData.role === "ENTRAINEUR" && (
                    <Trophy size={10} className="mr-1" />
                  )}
                  {userData.role
                    .replace("ADMIN_", "")
                    .replace("UTILISATEUR", "JOUEUR")}
                </Badge>
              </div>
            )}

            <div className="pl-2 border-l-2 border-border/50 h-8 flex items-center">
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox:
                      "w-9 h-9 border-2 border-primary/20 hover:border-primary transition-colors",
                    userButtonPopoverCard: "rounded-[2rem] border-2 shadow-2xl",
                  },
                }}
              />
            </div>
          </SignedIn>

          <SignedOut>
            <SignInButton mode="modal">
              <Button className="font-sport italic uppercase rounded-xl shadow-lg shadow-primary/20 px-6">
                Connexion
              </Button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
    </nav>
  );
}
