import { updateUserProfile } from "@/app/actions/user-actions";

describe("updateUserProfile", () => {
  it("met à jour le profil si authentifié", async () => {
    // TODO: Mock auth, prisma, test succès
  });
  it("retourne une erreur si non authentifié", async () => {
    // TODO: Mock auth sans userId
  });
  it("retourne une erreur si utilisateur introuvable", async () => {
    // TODO: Mock prisma pour retourner null
  });
  it("gère les erreurs inattendues", async () => {
    // TODO: Mock prisma pour throw
  });
});
