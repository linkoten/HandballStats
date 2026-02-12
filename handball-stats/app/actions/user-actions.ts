"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { SubscriptionType, UserRole } from "@prisma/client";

export async function syncUser() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Non authentifié");
  }

  // Récupérer les infos de Clerk
  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new Error("Utilisateur Clerk introuvable");
  }
  const email = clerkUser.emailAddresses[0].emailAddress;

  // 1. Chercher un utilisateur existant avec ce mail
  let user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    // Si le clerkId n'est pas le bon, le mettre à jour
    if (user.clerkId !== userId) {
      user = await prisma.user.update({
        where: { email },
        data: {
          clerkId: userId,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
        },
        include: { clubs: true },
      });
    } else {
      // Mettre à jour les infos si besoin
      user = await prisma.user.update({
        where: { email },
        data: {
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
        },
        include: { clubs: true },
      });
    }
    return user;
  }

  // 2. Sinon, faire l'upsert classique par clerkId
  user = await prisma.user.upsert({
    where: { clerkId: userId },
    update: {
      email: email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
    },
    create: {
      clerkId: userId,
      email: email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      subscription: SubscriptionType.GRATUIT,
      role: UserRole.UTILISATEUR,
    },
    include: { clubs: true },
  });
  return user;
}

export async function getCurrentUser() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { clubs: true },
  });

  return user;
}
