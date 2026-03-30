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
import { Logo } from "@/components/logo";
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
  Crown,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

type UserData = {
  subscription: string;
  role: string;
  tokensRemaining: number;
  clubs?: Array<{ id: number }>;
};

export function Navbar() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isLoaded, isSignedIn } = useUser();
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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

  const clubId = userData?.clubs?.[0]?.id;
  const equipesUrl = clubId ? `/dashboard/clubs/${clubId}/equipes` : "/equipes";
  const competitionsUrl = clubId
    ? `/dashboard/clubs/${clubId}/competitions`
    : "/competitions";
  const matchsUrl = clubId ? `/dashboard/clubs/${clubId}/matchs` : "/matchs";
  const statsUrl = clubId
    ? `/dashboard/clubs/${clubId}/statistiques`
    : "/statistiques";
  const allNavLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, requiresClub: false },
    { href: equipesUrl, label: "Équipes", icon: Users, requiresClub: true },
    { href: competitionsUrl, label: "Compétitions", icon: Trophy, requiresClub: true },
    { href: matchsUrl, label: "Matchs", icon: Calendar, requiresClub: true },
    { href: statsUrl, label: "Stats", icon: BarChart3, requiresClub: true },
    {
      href: "/pricing",
      label: "Abonnement",
      icon: Gem,
      highlight: true,
      requiresClub: false,
    },
  ];
  // N'affiche les liens club que si clubId est défini
  let navLinks = allNavLinks;
  if (isSignedIn && userData !== null && !clubId) {
    navLinks = allNavLinks.filter((l) => !l.requiresClub);
  } else if (isSignedIn && userData !== null && clubId === undefined) {
    // Si le profil n'est pas encore chargé, n'affiche pas les liens club
    navLinks = allNavLinks.filter((l) => !l.requiresClub);
  }

  return (
    <nav className="sticky top-0 z-100 w-full border-b-2 border-primary/10 bg-background/60 backdrop-blur-2xl">
      <div className="w-full pl-3 pr-5 sm:pl-4 sm:pr-7 md:pl-5 md:pr-8 h-20 flex items-center justify-between gap-4">
        {/* Logo Section */}
        <div className="flex items-center gap-10">
          <Link href="/" className="group flex items-center gap-2">
            <Logo
              size={40}
              className="transition-transform group-hover:scale-105"
            />
            <span className="text-xl font-sport font-black italic uppercase tracking-tighter text-foreground group-hover:text-primary transition-colors">
              Hand
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
        <div className="flex items-center gap-3">
          <SignedIn>
            {userData && (
              <div className="hidden md:flex items-center gap-2 mr-2">
                {/* Tokens Badge */}
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

            {/* Hamburger - Mobile */}
            <button
              className="lg:hidden ml-1 p-2 rounded-xl hover:bg-primary/10 transition-colors"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
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

      {/* Mobile Menu */}
      <SignedIn>
        {mobileOpen && (
          <div className="lg:hidden border-t-2 border-primary/10 bg-background/95 backdrop-blur-2xl px-4 py-4 flex flex-col gap-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-4 py-3 rounded-xl flex items-center gap-3 font-sport text-sm uppercase tracking-wider italic transition-all",
                    isActive
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:text-primary hover:bg-primary/5",
                    link.highlight &&
                      !isActive &&
                      "text-secondary hover:bg-secondary/5",
                  )}
                >
                  <link.icon size={16} />
                  {link.label}
                </Link>
              );
            })}

            {/* Badges mobile */}
            {userData && (
              <div className="flex items-center gap-2 pt-2 border-t border-border/50 mt-1">
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
          </div>
        )}
      </SignedIn>
    </nav>
  );
}
