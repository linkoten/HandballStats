import { getScrapingStatus } from "../app/actions/scraping-actions";
import { rescrapeClubCurrentSaison } from "../app/actions/scraping-actions";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn(), update: jest.fn() },
    competition: { findMany: jest.fn(), updateMany: jest.fn() },
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

describe("rescrapeClubCurrentSaison", () => {
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_API_URL = "http://api.test";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => "",
    }) as unknown as typeof fetch;
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    global.fetch = originalFetch;
  });

  function mockAdmin(overrides: Partial<Record<string, unknown>> = {}) {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "admin-1" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "admin-id",
      role: "ADMIN_CLUB",
      weeklyRescrapeCount: 0,
      weeklyRescrapeWeekStart: null,
      ...overrides,
    });
  }

  function mockCompetitions() {
    (prisma.competition.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        equipeId: 10,
        baseUrl: "url",
        equipeFFHB: "Équipe",
        nom: "Compétition",
        poule: "poule-1",
        max_journees: 18,
        saison: "2026-2027",
        phase: "Poule",
        equipe: { id: 10, nom: "Équipe" },
      },
    ]);
  }

  it("refuse si non authentifié", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });
    const res = await rescrapeClubCurrentSaison(1);
    expect(res.success).toBe(false);
  });

  it("autorise et incrémente le compteur si sous la limite", async () => {
    const monday = new Date();
    const day = monday.getUTCDay();
    const diff = (day === 0 ? -6 : 1) - day;
    monday.setUTCDate(monday.getUTCDate() + diff);
    monday.setUTCHours(0, 0, 0, 0);

    mockAdmin({ weeklyRescrapeCount: 1, weeklyRescrapeWeekStart: monday });
    mockCompetitions();
    const res = await rescrapeClubCurrentSaison(1);
    expect(res.success).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "admin-id" },
        data: expect.objectContaining({ weeklyRescrapeCount: 2 }),
      }),
    );
  });

  it("bloque au-delà de 3 mises à jour dans la même semaine", async () => {
    const monday = new Date();
    const day = monday.getUTCDay();
    const diff = (day === 0 ? -6 : 1) - day;
    monday.setUTCDate(monday.getUTCDate() + diff);
    monday.setUTCHours(0, 0, 0, 0);

    mockAdmin({ weeklyRescrapeCount: 3, weeklyRescrapeWeekStart: monday });
    mockCompetitions();
    const res = await rescrapeClubCurrentSaison(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/limite de 3 mises à jour/i);
    expect(prisma.competition.findMany).not.toHaveBeenCalled();
  });

  it("réinitialise le compteur si la semaine précédente est dépassée", async () => {
    const lastWeek = new Date();
    lastWeek.setUTCDate(lastWeek.getUTCDate() - 8);

    mockAdmin({ weeklyRescrapeCount: 3, weeklyRescrapeWeekStart: lastWeek });
    mockCompetitions();
    const res = await rescrapeClubCurrentSaison(1);
    expect(res.success).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ weeklyRescrapeCount: 1 }),
      }),
    );
  });

  it("n'applique aucune limite pour un ADMIN_GENERAL", async () => {
    mockAdmin({ role: "ADMIN_GENERAL", weeklyRescrapeCount: 10 });
    mockCompetitions();
    const res = await rescrapeClubCurrentSaison(1);
    expect(res.success).toBe(true);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
