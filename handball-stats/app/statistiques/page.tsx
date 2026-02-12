import MetabaseDashboard from "@/components/MetabaseDashboard";
import { getUserAccessibleEquipeIds } from "@/lib/access-control";

export default async function StatistiquesPage() {
  // Récupère les équipes accessibles à l'utilisateur
  const { equipeIds } = await getUserAccessibleEquipeIds();
  // Prends le premier club/équipe accessible (ou adapte selon ton besoin)
  const clubId = equipeIds[0];

  // Lien statique fourni par Metabase
  const dashboardId = "92df2fcb-90dd-43f2-95a7-1cb82fcd7922";
  const filters = { club_id: clubId };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Statistiques interactives</h1>
      <MetabaseDashboard dashboardId={dashboardId} filters={filters} />
    </div>
  );
}
