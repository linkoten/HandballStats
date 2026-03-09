import { getScrapingStatus } from "../app/actions/scraping-actions";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
    competition: { findMany: jest.fn() },
  },
}));
jest.mock("@clerk/nextjs/server");
jest.mock("child_process", () => ({
  spawn: jest.fn(() => {
    const events: Record<string, Function[]> = {};
    function safePush(event: string, cb: Function) {
      if (!events[event]) events[event] = [];
      events[event].push(cb);
    }
    return {
      stdout: {
        on: safePush,
      },
      stderr: {
        on: safePush,
      },
      on: (event: string, cb: Function) => {
        if (event === "close") setTimeout(() => cb(0), 10);
        safePush(event, cb);
      },
    };
  }),
}));
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

describe("getScrapingStatus", () => {
  it("refuse si non authentifié", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });
    const res = await getScrapingStatus([1, 2]);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/authentifié/);
  });
  it("refuse si user inconnu", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await getScrapingStatus([1, 2]);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/introuvable/);
  });
  it("refuse si IDs invalides", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
    const res = await getScrapingStatus([]);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/invalides|aucun/i);
  });
  it("accepte si compétitions accessibles", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
    (prisma.competition.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        nom: "Compétition",
        saison: "2023-2024",
        scrapingStatus: "IN_PROGRESS",
        scrapingProgress: 50,
        scrapingStep: "step1",
        scrapingError: null,
        lastScrapedAt: new Date("2024-01-01T12:00:00Z"),
        equipe: { nom: "Équipe", club: { nom: "Club" } },
        competitionAccess: [{ tokenUsed: false }],
      },
    ]);
    const res = await getScrapingStatus([1]);
    expect(res.success).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
    expect((res.data ?? []).length).toBe(1);
    expect(res.data?.[0]?.scrapingStatus).toBe("IN_PROGRESS");
    expect(res.data?.[0]?.tokenConsumed).toBe(false);
  });
});
