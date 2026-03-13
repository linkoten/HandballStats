type MetabaseDashboardProps = {
  /** URL complete et signee generee cote serveur */
  src: string;
  height?: number;
};

/**
 * Composant purement presentationnel.
 * L URL est generee et signee cote serveur (page.tsx) via JWT.
 * Ce composant ne connait jamais le secret.
 */
export default function MetabaseDashboard({
  src,
  height = 900,
}: MetabaseDashboardProps) {
  return (
    <iframe
      src={src}
      style={{ width: "100%", height: `${height}px`, border: "none" }}
    />
  );
}
