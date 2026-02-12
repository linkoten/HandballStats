"use client";

import { useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, ShoppingCart } from "lucide-react";
import Link from "next/link";

type AccessCheckResult = {
  hasAccess: boolean;
  reason: string;
  tokensAvailable?: number;
  subscription?: string;
  tokenId?: string;
};

type EquipeAccessGuardProps = {
  equipeId: number;
  children: ReactNode;
};

export default function EquipeAccessGuard({
  equipeId,
  children,
}: EquipeAccessGuardProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [accessResult, setAccessResult] = useState<AccessCheckResult | null>(
    null
  );

  useEffect(() => {
    checkAccess();
  }, [equipeId]);

  async function checkAccess() {
    try {
      const response = await fetch("/api/user/check-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equipeId }),
      });

      const result = await response.json();
      setAccessResult(result);
    } catch (error) {
      console.error("Erreur vérification accès:", error);
      setAccessResult({ hasAccess: false, reason: "error" });
    } finally {
      setChecking(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Accès refusé - pas authentifié
  if (accessResult?.reason === "not_authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-center">
              Authentification requise
            </CardTitle>
            <CardDescription className="text-center">
              Vous devez être connecté pour accéder à cette page
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/sign-in">
              <Button className="w-full">Se connecter</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Accès refusé - pas de token
  if (!accessResult?.hasAccess && accessResult?.reason === "no_token") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-yellow-600" />
            </div>
            <CardTitle className="text-center">Accès restreint</CardTitle>
            <CardDescription className="text-center">
              Vous devez débloquer cette équipe pour accéder à ses statistiques
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 font-medium">
                {accessResult.tokensAvailable || 0} token
                {(accessResult.tokensAvailable || 0) > 1 ? "s" : ""} disponible
                {(accessResult.tokensAvailable || 0) > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Abonnement : {accessResult.subscription}
              </p>
            </div>

            <div className="space-y-2">
              {(accessResult.tokensAvailable || 0) > 0 ? (
                <Link href="/onboarding/teams" className="block">
                  <Button className="w-full">Débloquer cette équipe</Button>
                </Link>
              ) : (
                <Link href="/pricing" className="block">
                  <Button className="w-full">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Acheter des tokens
                  </Button>
                </Link>
              )}

              <Link href="/dashboard" className="block">
                <Button variant="outline" className="w-full">
                  Retour au dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Accès autorisé
  if (accessResult?.hasAccess) {
    return <>{children}</>;
  }

  // Erreur générique
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-center">Erreur</CardTitle>
          <CardDescription className="text-center">
            Une erreur s'est produite lors de la vérification de vos droits
            d'accès
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button onClick={() => router.push("/dashboard")} variant="outline">
            Retour au dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
