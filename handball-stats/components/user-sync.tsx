"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { syncUser } from "@/app/actions/user-actions";

export function UserSync() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    async function handleSync() {
      if (!user) return;

      try {
        await syncUser();
        console.log("✅ Utilisateur synchronisé");
      } catch (error) {
        console.error("Erreur sync utilisateur:", error);
      }
    }

    if (isLoaded && user) {
      handleSync();
    }
  }, [user, isLoaded]);

  return null; // Composant invisible
}
