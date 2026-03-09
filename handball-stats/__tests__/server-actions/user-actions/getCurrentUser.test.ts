import { getCurrentUser } from "@/app/actions/user-actions";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

// On mock les modules externes utilisés dans getCurrentUser
jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

describe("getCurrentUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retourne l'utilisateur courant si authentifié", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "user-1" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      email: "user@site.fr",
      clubs: [],
    });
    const res = await getCurrentUser();
    expect(res).toEqual({ id: 1, email: "user@site.fr", clubs: [] });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { clerkId: "user-1" },
      include: { clubs: true },
    });
  });

  it("retourne null si non authentifié", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });
    const res = await getCurrentUser();
    expect(res).toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
