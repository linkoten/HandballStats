// On mock les modules externes utilisés dans syncUser
jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
  currentUser: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

import { syncUser } from "@/app/actions/user-actions";
import { auth, currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

describe("syncUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("synchronise un utilisateur existant", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "clerk-1" });
    (currentUser as jest.Mock).mockResolvedValue({
      emailAddresses: [{ emailAddress: "user@site.fr" }],
      firstName: "Jean",
      lastName: "Dupont",
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      email: "user@site.fr",
      clerkId: "clerk-1",
    });
    (prisma.user.update as jest.Mock).mockResolvedValue({
      id: 1,
      email: "user@site.fr",
      clerkId: "clerk-1",
      firstName: "Jean",
      lastName: "Dupont",
      clubs: [],
    });
    const res = await syncUser();
    expect(res).toEqual({
      id: 1,
      email: "user@site.fr",
      clerkId: "clerk-1",
      firstName: "Jean",
      lastName: "Dupont",
      clubs: [],
    });
  });

  it("crée un nouvel utilisateur si inexistant", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "clerk-2" });
    (currentUser as jest.Mock).mockResolvedValue({
      emailAddresses: [{ emailAddress: "new@site.fr" }],
      firstName: "Alice",
      lastName: "Martin",
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.upsert as jest.Mock).mockResolvedValue({
      id: 2,
      email: "new@site.fr",
      clerkId: "clerk-2",
      firstName: "Alice",
      lastName: "Martin",
      clubs: [],
    });
    const res = await syncUser();
    expect(res).toEqual({
      id: 2,
      email: "new@site.fr",
      clerkId: "clerk-2",
      firstName: "Alice",
      lastName: "Martin",
      clubs: [],
    });
  });

  it("retourne une erreur si non authentifié", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });
    await expect(syncUser()).rejects.toThrow(/authentifié/i);
  });

  it("retourne une erreur si Clerk introuvable", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "clerk-3" });
    (currentUser as jest.Mock).mockResolvedValue(null);
    await expect(syncUser()).rejects.toThrow(/Clerk introuvable/i);
  });
});
