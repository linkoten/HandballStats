// app/equipes/[id]/page.tsx - Page de détails d'une équipe

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Trophy, Calendar, Users } from "lucide-react";
import { getEquipeById } from "@/app/actions";
import prisma from "@/lib/prisma";

export default async function EquipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const { id } = await params;
  const equipeId = parseInt(id);
  
  if (!id || isNaN(equipeId)) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/equipes">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux équipes
            </Button>
          </Link>
        </div>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Équipe introuvable</h1>
          <p className="text-muted-foreground">L'identifiant de l'équipe n'est pas valide.</p>
        </div>
      </div>
    );
  }

  // Récupérer l'équipe via Server Action
  const equipeResult = await getEquipeById(equipeId);

  if (!equipeResult.success || !equipeResult.data) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/equipes">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux équipes
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Équipe introuvable
            </CardTitle>
            <CardDescription>
              L'équipe demandée n'existe pas ou vous n'y avez pas accès.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {equipeResult.error || "Équipe non accessible"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const equipe = equipeResult.data;

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/equipes">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux équipes
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* En-tête de l'équipe */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Users className="w-6 h-6" />
                  {equipe.nom}
                </CardTitle>
                {equipe.club && (
                  <CardDescription className="flex items-center gap-2 mt-2">
                    🏛️ {equipe.club.nom}
                    {equipe.ville && (
                      <>
                        <MapPin className="w-4 h-4 ml-2" />
                        {equipe.ville}
                      </>
                    )}
                  </CardDescription>
                )}
              </div>
              <div className="flex gap-2">
                <Badge variant={equipe.status === "ACTIVE" ? "default" : "secondary"}>
                  {equipe.status === "ACTIVE" ? "Active" : "Inactive"}
                </Badge>
                {equipe.region && (
                  <Badge variant="outline">{equipe.region}</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {equipe.ville && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Ville</h4>
                  <p className="text-sm">{equipe.ville}</p>
                </div>
              )}
              {equipe.region && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Région</h4>
                  <p className="text-sm">{equipe.region}</p>
                </div>
              )}
              {equipe.departement && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Département</h4>
                  <p className="text-sm">{equipe.departement}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Compétitions */}
        {equipe.competitions && equipe.competitions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Compétitions ({equipe.competitions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {equipe.competitions.map((competition: any) => (
                  <div
                    key={competition.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium">{competition.nom}</h4>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Saison {competition.saison}
                      </p>
                    </div>
                    <Link href={`/competitions/${competition.id}`}>
                      <Button variant="outline" size="sm">
                        Voir détails
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Link href={`/joueurs?equipe=${equipe.id}`}>
                <Button variant="outline">
                  <Users className="w-4 h-4 mr-2" />
                  Voir les joueurs
                </Button>
              </Link>
              <Link href={`/matchs?equipe=${equipe.id}`}>
                <Button variant="outline">
                  <Trophy className="w-4 h-4 mr-2" />
                  Voir les matchs
                </Button>
              </Link>
              <Link href={`/statistiques?equipe=${equipe.id}`}>
                <Button variant="outline">
                  📊 Statistiques
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
