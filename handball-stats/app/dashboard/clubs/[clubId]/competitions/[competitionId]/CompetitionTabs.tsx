"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Calendar,
  Trophy,
  ChevronRight,
  CheckCircle2,
  MinusCircle,
  XCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type MatchResult = "win" | "draw" | "loss" | "upcoming";

function getMatchResult(match: any, equipeId: number | undefined): MatchResult {
  if (!equipeId || !match.score_final) return "upcoming";
  const parts = match.score_final.split("-");
  if (parts.length !== 2) return "upcoming";
  const scoreRecevant = parseInt(parts[0], 10);
  const scoreExterieur = parseInt(parts[1], 10);
  if (isNaN(scoreRecevant) || isNaN(scoreExterieur)) return "upcoming";
  const isHome = match.equipe_recevant_id === equipeId;
  const ourScore = isHome ? scoreRecevant : scoreExterieur;
  const theirScore = isHome ? scoreExterieur : scoreRecevant;
  if (ourScore > theirScore) return "win";
  if (ourScore === theirScore) return "draw";
  return "loss";
}

const resultConfig: Record<
  MatchResult,
  { label: string; scoreCls: string; rowCls: string; icon: React.ReactNode }
> = {
  win: {
    label: "Victoire",
    scoreCls: "bg-emerald-500 text-white border-none",
    rowCls:
      "border-l-4 border-l-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10",
    icon: <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />,
  },
  draw: {
    label: "Nul",
    scoreCls: "bg-amber-400 text-white border-none",
    rowCls:
      "border-l-4 border-l-amber-400 bg-amber-400/5 hover:bg-amber-400/10",
    icon: <MinusCircle size={13} className="text-amber-500 shrink-0" />,
  },
  loss: {
    label: "Défaite",
    scoreCls: "bg-destructive text-white border-none",
    rowCls:
      "border-l-4 border-l-destructive bg-destructive/5 hover:bg-destructive/10",
    icon: <XCircle size={13} className="text-destructive shrink-0" />,
  },
  upcoming: {
    label: "",
    scoreCls: "",
    rowCls: "hover:bg-muted/50",
    icon: <Clock size={13} className="text-muted-foreground/50 shrink-0" />,
  },
};

function FormeChar({ c }: { c: string }) {
  if (c === "G")
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-[10px] font-black">
        V
      </span>
    );
  if (c === "P")
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-destructive text-white text-[10px] font-black">
        D
      </span>
    );
  if (c === "N")
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-white text-[10px] font-black">
        N
      </span>
    );
  return null;
}

interface Props {
  matchs: any[];
  classement: any[];
  historiqueClassement: any[];
  equipeId: number | undefined;
  equipeNom: string | undefined;
  stats: { wins: number; draws: number; losses: number; upcoming: number };
  playedCount: number;
  updatedAt: string | null;
  clubId: string;
}

export default function CompetitionTabs({
  matchs,
  classement,
  historiqueClassement,
  equipeId,
  equipeNom,
  stats,
  playedCount,
  updatedAt,
  clubId,
}: Props) {
  // Construire les données du graphique d'évolution
  // Format : [{ journee: 12, "ASC RENNAIS": 3, "DINAN HB": 1, ... }, ...]
  const journees = [...new Set(historiqueClassement.map((r: any) => r.journee))].sort(
    (a, b) => a - b,
  );
  const equipes = [...new Set(historiqueClassement.map((r: any) => r.nomEquipe as string))];

  const evolutionData = journees.map((j) => {
    const point: any = { journee: `J${j}` };
    const rows = historiqueClassement.filter((r: any) => r.journee === j);
    rows.forEach((r: any) => {
      point[r.nomEquipe] = r.position;
    });
    return point;
  });

  // Couleurs pour les lignes — ton équipe en jaune (secondary), les autres en gris
  const COLORS = [
    "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
    "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#14b8a6",
  ];
  const ourTeamColor = "hsl(var(--secondary))";

  const hasEvolution = evolutionData.length >= 2;
  return (
    <Tabs defaultValue="matchs" className="space-y-6">
      <TabsList className="h-12 rounded-2xl bg-muted p-1 w-full sm:w-auto">
        <TabsTrigger
          value="matchs"
          className="rounded-xl font-sport italic uppercase text-sm px-6 data-[state=active]:bg-primary data-[state=active]:text-white"
        >
          <Calendar size={16} className="mr-2" />
          Calendrier
        </TabsTrigger>
        <TabsTrigger
          value="classement"
          className="rounded-xl font-sport italic uppercase text-sm px-6 data-[state=active]:bg-primary data-[state=active]:text-white"
        >
          <Trophy size={16} className="mr-2" />
          Classement
          {classement.length === 0 && (
            <span className="ml-2 text-[10px] opacity-50">(vide)</span>
          )}
        </TabsTrigger>
      </TabsList>

      {/* ── ONGLET CALENDRIER ── */}
      <TabsContent value="matchs">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Stats */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="rounded-[2.5rem] border-2 overflow-hidden">
              <CardHeader className="bg-muted/50 border-b">
                <CardTitle className="font-sport italic text-sm uppercase flex items-center gap-2">
                  <Activity size={18} className="text-primary" /> Bilan
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {playedCount > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col items-center p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                      <span className="text-2xl font-sport italic font-black text-emerald-600">
                        {stats.wins}
                      </span>
                      <span className="text-[9px] font-black uppercase text-emerald-600/70 mt-0.5">
                        Victoires
                      </span>
                    </div>
                    <div className="flex flex-col items-center p-3 bg-amber-400/10 rounded-2xl border border-amber-400/20">
                      <span className="text-2xl font-sport italic font-black text-amber-600">
                        {stats.draws}
                      </span>
                      <span className="text-[9px] font-black uppercase text-amber-600/70 mt-0.5">
                        Nuls
                      </span>
                    </div>
                    <div className="flex flex-col items-center p-3 bg-destructive/10 rounded-2xl border border-destructive/20">
                      <span className="text-2xl font-sport italic font-black text-destructive">
                        {stats.losses}
                      </span>
                      <span className="text-[9px] font-black uppercase text-destructive/70 mt-0.5">
                        Défaites
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic text-center py-2">
                    Aucun match joué
                  </p>
                )}

                <div className="flex justify-between items-center text-sm pt-2 border-t">
                  <span className="font-bold text-muted-foreground uppercase text-[10px]">
                    Mis à jour
                  </span>
                  <span className="font-sport italic text-xs">
                    {updatedAt
                      ? new Date(updatedAt).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "N/A"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Liste des Matchs */}
          <div className="lg:col-span-3">
            <Card className="rounded-[2.5rem] border-2 shadow-xl overflow-hidden">
              <div className="bg-primary text-white px-8 py-6 flex justify-between items-center">
                <h3 className="font-sport italic uppercase text-xl font-black tracking-tight">
                  Calendrier & Résultats
                </h3>
                <Badge className="bg-secondary text-primary font-sport italic">
                  {matchs.length} Rencontres
                </Badge>
              </div>

              <div className="divide-y">
                {matchs.length > 0 ? (
                  matchs.map((match: any) => {
                    const result = getMatchResult(match, equipeId);
                    const cfg = resultConfig[result];
                    return (
                      <Link
                        key={match.id}
                        href={`/dashboard/matchs/${match.id}`}
                        className={`flex items-center justify-between p-5 transition-colors group ${cfg.rowCls}`}
                      >
                        {/* Date */}
                        <div className="w-20 shrink-0 flex flex-col items-center border-r pr-4">
                          <span className="text-[10px] font-black uppercase text-muted-foreground">
                            {match.date_match
                              ? new Date(match.date_match).toLocaleDateString(
                                  "fr-FR",
                                  { weekday: "short" },
                                )
                              : "-"}
                          </span>
                          <span className="text-xl font-sport italic font-black text-primary">
                            {match.date_match
                              ? new Date(match.date_match).toLocaleDateString(
                                  "fr-FR",
                                  { day: "2-digit", month: "2-digit" },
                                )
                              : "--/--"}
                          </span>
                        </div>

                        {/* Teams + Score */}
                        <div className="flex-1 px-4 md:px-6 grid grid-cols-3 items-center gap-2">
                          <div className="text-right font-bold uppercase text-sm truncate">
                            {match.recevant_nom_display}
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            {match.score_final ? (
                              <Badge
                                className={`px-3 py-1 font-sport italic text-base rounded-lg ${cfg.scoreCls}`}
                              >
                                {match.score_final}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="font-sport italic text-muted-foreground"
                              >
                                VS
                              </Badge>
                            )}
                            {result !== "upcoming" && (
                              <span className="flex items-center gap-1 text-[10px] font-black uppercase text-muted-foreground">
                                {cfg.icon} {cfg.label}
                              </span>
                            )}
                          </div>
                          <div className="text-left font-bold uppercase text-sm truncate">
                            {match.exterieur_nom_display}
                          </div>
                        </div>

                        {/* Action */}
                        <div className="shrink-0 flex items-center gap-2 pl-2">
                          <span className="hidden md:block text-[10px] font-black uppercase text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                            Détails
                          </span>
                          <ChevronRight
                            className="text-primary group-hover:translate-x-1 transition-transform"
                            size={20}
                          />
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="p-12 text-center text-muted-foreground italic font-sport uppercase tracking-widest opacity-50">
                    Aucun match trouvé pour cette compétition
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </TabsContent>

      {/* ── ONGLET CLASSEMENT ── */}
      <TabsContent value="classement" className="space-y-6">
        {/* Graphique d'évolution */}
        {hasEvolution ? (
          <Card className="rounded-[2.5rem] border-2 overflow-hidden">
            <CardHeader className="bg-muted/50 border-b">
              <CardTitle className="font-sport italic text-sm uppercase flex items-center gap-2">
                <TrendingUp size={18} className="text-primary" /> Évolution des positions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-6">
              <p className="text-[10px] text-muted-foreground uppercase font-black mb-4 text-center">
                Position dans la poule par journée (1 = 1er)
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={evolutionData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="journee"
                    tick={{ fontSize: 11, fontWeight: 700 }}
                    tickLine={false}
                  />
                  <YAxis
                    reversed
                    allowDecimals={false}
                    domain={[1, equipes.length]}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    tickFormatter={(v) => `${v}`}
                    width={24}
                  />
                  <Tooltip
                    formatter={(value: any, name: string | undefined) => [`${value}e`, name ?? ""]}
                    labelFormatter={(label) => `Journée ${label}`}
                    contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", paddingTop: "16px" }}
                    formatter={(value) =>
                      equipeNom && value.toLowerCase().includes(equipeNom.toLowerCase().split(" ")[0].toLowerCase())
                        ? <strong>{value}</strong>
                        : value
                    }
                  />
                  {equipes.map((nom, i) => {
                    const isOurs =
                      equipeNom &&
                      nom.toLowerCase().includes(equipeNom.toLowerCase().split(" ")[0].toLowerCase());
                    return (
                      <Line
                        key={nom}
                        type="monotone"
                        dataKey={nom}
                        stroke={isOurs ? ourTeamColor : COLORS[i % COLORS.length]}
                        strokeWidth={isOurs ? 3 : 1.5}
                        dot={{ r: isOurs ? 5 : 3 }}
                        activeDot={{ r: 6 }}
                        opacity={isOurs ? 1 : 0.55}
                        connectNulls
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : historiqueClassement.length > 0 ? (
          <div className="text-center text-sm text-muted-foreground italic py-4">
            Le graphique d&apos;évolution apparaîtra après au moins 2 scrapings (actuellement{" "}
            {journees.length} journée enregistrée).
          </div>
        ) : null}

        {/* Tableau classement */}
        <Card className="rounded-[2.5rem] border-2 shadow-xl overflow-hidden">
          <div className="bg-primary text-white px-8 py-6 flex justify-between items-center">
            <h3 className="font-sport italic uppercase text-xl font-black tracking-tight">
              Classement de la poule
            </h3>
            <Badge className="bg-secondary text-primary font-sport italic">
              {classement.length} équipes
            </Badge>
          </div>

          {classement.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground italic font-sport uppercase tracking-widest opacity-50">
              Aucune donnée de classement — lancez une synchronisation
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left px-4 py-3 font-black uppercase text-[10px] text-muted-foreground w-10">
                      #
                    </th>
                    <th className="text-left px-4 py-3 font-black uppercase text-[10px] text-muted-foreground">
                      Équipe
                    </th>
                    <th className="text-center px-3 py-3 font-black uppercase text-[10px] text-muted-foreground">
                      Pts
                    </th>
                    <th className="text-center px-3 py-3 font-black uppercase text-[10px] text-muted-foreground">
                      MJ
                    </th>
                    <th className="text-center px-3 py-3 font-black uppercase text-[10px] text-emerald-600">
                      V
                    </th>
                    <th className="text-center px-3 py-3 font-black uppercase text-[10px] text-amber-500">
                      N
                    </th>
                    <th className="text-center px-3 py-3 font-black uppercase text-[10px] text-destructive">
                      D
                    </th>
                    <th className="text-center px-3 py-3 font-black uppercase text-[10px] text-muted-foreground hidden sm:table-cell">
                      BP
                    </th>
                    <th className="text-center px-3 py-3 font-black uppercase text-[10px] text-muted-foreground hidden sm:table-cell">
                      BC
                    </th>
                    <th className="text-center px-3 py-3 font-black uppercase text-[10px] text-muted-foreground hidden sm:table-cell">
                      Diff
                    </th>
                    <th className="text-center px-3 py-3 font-black uppercase text-[10px] text-muted-foreground hidden md:table-cell">
                      Forme
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {classement.map((row: any) => {
                    const isOurTeam =
                      equipeNom &&
                      row.nomEquipe
                        .toLowerCase()
                        .includes(equipeNom.toLowerCase().split(" ")[0]);
                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors ${
                          isOurTeam
                            ? "bg-secondary/10 border-l-4 border-l-secondary font-semibold"
                            : "hover:bg-muted/30"
                        }`}
                      >
                        {/* Position */}
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black
                            ${row.position === 1 ? "bg-amber-400 text-white" : row.position === 2 ? "bg-slate-300 text-slate-700" : row.position === 3 ? "bg-amber-600/80 text-white" : "bg-muted text-muted-foreground"}`}
                          >
                            {row.position}
                          </span>
                        </td>

                        {/* Nom équipe */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {row.logoUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={row.logoUrl}
                                alt={row.nomEquipe}
                                className="w-7 h-7 object-contain rounded"
                              />
                            )}
                            <span
                              className={`font-bold uppercase text-xs ${isOurTeam ? "text-primary" : ""}`}
                            >
                              {row.nomEquipe}
                            </span>
                            {isOurTeam && (
                              <Badge className="bg-secondary text-primary text-[9px] font-black px-1.5 py-0 hidden sm:inline-flex">
                                Vous
                              </Badge>
                            )}
                          </div>
                        </td>

                        {/* Points */}
                        <td className="px-3 py-3 text-center">
                          <span className="font-sport italic font-black text-base text-primary">
                            {row.points}
                          </span>
                        </td>

                        {/* MJ */}
                        <td className="px-3 py-3 text-center text-muted-foreground font-medium">
                          {row.matchsJoues}
                        </td>

                        {/* V */}
                        <td className="px-3 py-3 text-center font-bold text-emerald-600">
                          {row.victoires}
                        </td>

                        {/* N */}
                        <td className="px-3 py-3 text-center font-bold text-amber-500">
                          {row.nuls}
                        </td>

                        {/* D */}
                        <td className="px-3 py-3 text-center font-bold text-destructive">
                          {row.defaites}
                        </td>

                        {/* BP */}
                        <td className="px-3 py-3 text-center text-muted-foreground hidden sm:table-cell">
                          {row.butsPour}
                        </td>

                        {/* BC */}
                        <td className="px-3 py-3 text-center text-muted-foreground hidden sm:table-cell">
                          {row.butsContre}
                        </td>

                        {/* Diff */}
                        <td className="px-3 py-3 text-center hidden sm:table-cell">
                          <span
                            className={`font-bold text-xs ${row.diffButs > 0 ? "text-emerald-600" : row.diffButs < 0 ? "text-destructive" : "text-muted-foreground"}`}
                          >
                            {row.diffButs > 0 ? `+${row.diffButs}` : row.diffButs}
                          </span>
                        </td>

                        {/* Forme */}
                        <td className="px-3 py-3 hidden md:table-cell">
                          {row.forme ? (
                            <div className="flex items-center gap-0.5 justify-center">
                              {row.forme
                                .split("")
                                .map((c: string, i: number) => (
                                  <FormeChar key={i} c={c} />
                                ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </TabsContent>
    </Tabs>
  );
}
