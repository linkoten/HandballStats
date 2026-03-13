import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import OnboardingClubForm from "./OnboardingClubForm";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Si l'user a déjà un club → dashboard directement
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { clubs: { take: 1 } },
  });
  if (user?.clubs && user.clubs.length > 0) {
    redirect("/dashboard");
  }

  const { checkout } = await searchParams;
  return <OnboardingClubForm fromCheckout={checkout === "success"} />;
}
