type MetabaseDashboardProps = {
  dashboardId: string;
  filters: Record<string, string | number | undefined>;
};

export default function MetabaseDashboard({
  dashboardId,
  filters,
}: MetabaseDashboardProps) {
  // Construit l’URL d’embed statique avec les paramètres
  const params = new URLSearchParams(
    Object.entries(filters)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)]),
  ).toString();
  const iframeUrl = `http://localhost:3001/public/dashboard/${dashboardId}${params ? "?" + params : ""}`;

  return (
    <iframe
      src={iframeUrl}
      frameBorder={0}
      width="100%"
      height="600"
      style={{ background: "white" }}
    />
  );
}
