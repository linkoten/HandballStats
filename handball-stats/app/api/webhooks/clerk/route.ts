import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("CLERK_WEBHOOK_SECRET manquant dans .env.local");
  }

  // Récupérer les headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Headers Svix manquants", { status: 400 });
  }

  // Récupérer le body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Vérifier la signature du webhook
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Erreur vérification webhook:", err);
    return new Response("Signature invalide", { status: 400 });
  }

  // Traiter les événements Clerk
  const eventType = evt.type;

  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name } = evt.data;

    try {
      await prisma.user.create({
        data: {
          clerkId: id,
          email: email_addresses[0]?.email_address || "",
          firstName: first_name || null,
          lastName: last_name || null,
          subscription: "GRATUIT",
          role: "UTILISATEUR",
        },
      });

      console.log(`✅ Utilisateur créé: ${email_addresses[0]?.email_address}`);
    } catch (error) {
      console.error("Erreur création utilisateur:", error);
      return new Response("Erreur création utilisateur", { status: 500 });
    }
  }

  if (eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name } = evt.data;

    try {
      await prisma.user.update({
        where: { clerkId: id },
        data: {
          email: email_addresses[0]?.email_address || "",
          firstName: first_name || null,
          lastName: last_name || null,
        },
      });

      console.log(
        `✅ Utilisateur mis à jour: ${email_addresses[0]?.email_address}`
      );
    } catch (error) {
      console.error("Erreur mise à jour utilisateur:", error);
      return new Response("Erreur mise à jour utilisateur", { status: 500 });
    }
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;

    try {
      await prisma.user.delete({
        where: { clerkId: id! },
      });

      console.log(`✅ Utilisateur supprimé: ${id}`);
    } catch (error) {
      console.error("Erreur suppression utilisateur:", error);
      return new Response("Erreur suppression utilisateur", { status: 500 });
    }
  }

  return new Response("Webhook traité", { status: 200 });
}
