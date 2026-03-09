"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  User,
  ChevronRight,
  ArrowLeft,
  Users,
  Loader2,
  FilterX,
  ShieldCheck,
} from "lucide-react";
import { getJoueurs } from "@/app/actions/joueur-actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ListeJoueursPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [joueurs, setJoueurs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // ID du club récupéré depuis l'URL (ou 5 par défaut comme demandé)
  const clubId = params?.clubId || "5";

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await getJoueurs();
        if (res.success) {
          setJoueurs(res.data);
        } else {
          toast.error(res.error);
        }
      } catch (err) {
        toast.error("Impossible de charger les joueurs");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Groupement et filtrage
  const groupedJoueurs = useMemo(() => {
    const filtered = joueurs.filter((j) =>
      j.nom_prenom.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    return filtered.reduce((acc: any, joueur) => {
      const equipeNom = joueur.equipe?.nom || "Non Assignés";
      if (!acc[equipeNom]) acc[equipeNom] = [];
      acc[equipeNom].push(joueur);
      return acc;
    }, {});
  }, [joueurs, searchTerm]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="font-sport italic uppercase text-muted-foreground tracking-widest">
          Initialisation du Roster...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header Broadcaster Immensif */}
      <header className="relative overflow-hidden bg-[#0F172A] rounded-b-[4rem] p-8 md:p-20 shadow-2xl border-b-8 border-secondary">
        <div className="absolute top-0 right-0 p-4 opacity-5 font-sport text-[15rem] italic uppercase pointer-events-none select-none leading-none">
          CLUB
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <Button
            variant="ghost"
            className="text-white/50 hover:text-white mb-8 border-white/10 hover:bg-white/5 rounded-full"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour Dashboard
          </Button>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-secondary font-sport italic tracking-widest">
                <ShieldCheck size={28} className="fill-current" /> EFFECTIFS
                OFFICIELS
              </div>
              <h1 className="text-5xl md:text-8xl font-sport font-black italic uppercase text-white tracking-tighter leading-[0.8]">
                Gestion des{" "}
                <span className="text-secondary font-outline-2">Joueurs</span>
              </h1>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl text-right hidden md:block">
              <p className="text-white/50 text-xs font-black uppercase tracking-widest">
                Total Effectif
              </p>
              <p className="text-4xl font-sport italic text-secondary">
                {joueurs.length}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 -mt-12 space-y-16 relative z-20">
        {/* Barre de Recherche Premium */}
        <div className="max-w-3xl mx-auto">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-full blur opacity-25 group-focus-within:opacity-50 transition duration-1000"></div>
            <Card className="relative rounded-full border-2 bg-card/90 backdrop-blur-xl p-1.5 shadow-2xl">
              <div className="relative flex items-center">
                <Search className="absolute left-6 text-primary" size={24} />
                <Input
                  placeholder="RECHERCHER UN NOM OU UN PRÉNOM..."
                  className="h-14 pl-16 pr-8 rounded-full border-none bg-transparent font-bold uppercase text-base italic focus-visible:ring-0"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </Card>
          </div>
        </div>

        {/* Sections par Équipes */}
        <div className="space-y-20">
          {Object.entries(groupedJoueurs).map(
            ([equipeNom, listeJoueurs]: [string, any]) => (
              <section
                key={equipeNom}
                className="animate-in fade-in slide-in-from-bottom-4 duration-700"
              >
                <div className="flex items-end gap-6 mb-8 px-4">
                  <h2 className="text-4xl md:text-5xl font-sport font-black italic uppercase text-primary leading-none">
                    {equipeNom}
                  </h2>
                  <div className="h-2 flex-1 bg-muted rounded-full mb-2 opacity-30" />
                  <Badge className="mb-2 bg-primary text-white font-sport italic px-4 py-1 text-lg">
                    {listeJoueurs.length} UNITÉS
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {listeJoueurs.map((joueur: any) => (
                    <div
                      key={joueur.id}
                      onClick={() =>
                        router.push(
                          `/dashboard/clubs/${clubId}/joueurs/${joueur.id}`,
                        )
                      }
                      className="group relative cursor-pointer"
                    >
                      {/* Effet de carte au survol */}
                      <div className="absolute inset-0 bg-primary rounded-[2.5rem] translate-x-2 translate-y-2 opacity-0 group-hover:opacity-10 transition-all duration-300" />

                      <Card className="relative rounded-[2.5rem] border-2 border-muted bg-card overflow-hidden transition-all duration-300 group-hover:border-primary group-hover:-translate-y-1 shadow-md">
                        <CardContent className="p-0">
                          <div className="p-8 flex items-center gap-6">
                            {/* Avatar / Maillot */}
                            <div className="relative shrink-0">
                              <div className="w-20 h-20 rounded-[1.5rem] bg-slate-50 flex items-center justify-center border-2 border-dashed border-slate-200 group-hover:bg-primary/5 group-hover:border-primary/30 transition-all duration-500">
                                <User
                                  size={40}
                                  className="text-slate-300 group-hover:text-primary transition-colors"
                                />
                              </div>
                              {joueur.num_maillot && (
                                <div className="absolute -top-3 -right-3 bg-secondary text-black font-sport italic font-black text-xl h-10 w-10 flex items-center justify-center rounded-xl shadow-xl ring-4 ring-card">
                                  {joueur.num_maillot}
                                </div>
                              )}
                            </div>

                            {/* Infos Joueur */}
                            <div className="flex-1 min-w-0 space-y-1">
                              <Badge
                                variant="outline"
                                className="text-[9px] font-black uppercase tracking-tighter border-primary/20 text-primary bg-primary/5"
                              >
                                {joueur.poste_principal || "Non défini"}
                              </Badge>
                              <h3 className="text-2xl font-sport font-black italic uppercase leading-tight truncate group-hover:text-primary transition-colors">
                                {joueur.nom_prenom}
                              </h3>
                            </div>

                            <div className="bg-muted group-hover:bg-primary group-hover:text-white p-3 rounded-2xl transition-all duration-300 shadow-inner">
                              <ChevronRight size={20} />
                            </div>
                          </div>

                          {/* Barre de stats/footer factice pour le look */}
                          <div className="bg-muted/30 px-8 py-3 flex justify-between items-center border-t border-dashed">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500" />{" "}
                              Profil Actif
                            </span>
                            <span className="text-[10px] font-black text-primary italic uppercase">
                              Détails Statistiques
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </section>
            ),
          )}
        </div>

        {Object.keys(groupedJoueurs).length === 0 && (
          <div className="text-center py-32 bg-muted/10 rounded-[4rem] border-4 border-dashed border-muted">
            <Users
              size={80}
              className="mx-auto text-muted-foreground/20 mb-6"
            />
            <p className="font-sport italic text-3xl uppercase text-muted-foreground tracking-tighter">
              Aucun joueur trouvé dans la base
            </p>
            <Button
              variant="link"
              onClick={() => setSearchTerm("")}
              className="mt-4 text-primary font-bold uppercase tracking-widest"
            >
              Réinitialiser la recherche
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
