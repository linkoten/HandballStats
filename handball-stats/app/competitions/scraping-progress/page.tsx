export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import ScrapingProgressClient from "./client";

interface PageProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function ScrapingProgressPage({
  searchParams,
}: PageProps) {
  const resolvedSearchParams =
    searchParams instanceof Promise ? await searchParams : searchParams;

  const idsParam = resolvedSearchParams?.ids;

  if (!idsParam || typeof idsParam !== "string") {
    redirect("/competitions");
  }

  const competitionIds = idsParam
    .split(",")
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => !isNaN(id) && id > 0);

  if (competitionIds.length === 0) {
    redirect("/competitions");
  }

  return <ScrapingProgressClient competitionIds={competitionIds} />;
}
