import { startScrapingProcess } from "@/app/actions/onboarding-actions";
import prisma from "@/lib/prisma";
import { spawn } from "child_process";
import path from "path";

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    competition: { findMany: jest.fn(), updateMany: jest.fn() },
  },
}));
jest.mock("child_process");
jest.mock("path", () => ({
  join: (...args: string[]) => args.join("/"),
}));

describe("startScrapingProcess", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should do nothing if no competitions found", async () => {
    (prisma.competition.findMany as jest.Mock).mockResolvedValue([]);
    const res = await startScrapingProcess([1, 2]);
    expect(prisma.competition.findMany).toHaveBeenCalled();
    // Should not call updateMany or spawn
    expect(prisma.competition.updateMany).not.toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
  });

  it("should launch python process and update status", async () => {
    (prisma.competition.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        equipeId: 2,
        baseUrl: "url",
        equipeFFHB: "eq",
        nom: "n",
        poule: "p",
        max_journees: 10,
        saison: "2023",
        phase: "Poule",
        equipe: { nom: "eq" },
      },
    ]);
    (prisma.competition.updateMany as jest.Mock).mockResolvedValue({});
    const mockStdout = { on: jest.fn() };
    const mockStderr = { on: jest.fn() };
    const mockProcess = {
      pid: 123,
      stdin: { write: jest.fn(), end: jest.fn() },
      stdout: mockStdout,
      stderr: mockStderr,
      on: jest.fn((event, cb) => {
        if (event === "close") cb(0);
      }),
    };
    (spawn as unknown as jest.Mock).mockReturnValue(mockProcess);
    await startScrapingProcess([1]);
    expect(prisma.competition.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [1] } },
      data: { scrapingStatus: "IN_PROGRESS" },
    });
    expect(spawn).toHaveBeenCalled();
    expect(mockProcess.stdin.write).toHaveBeenCalled();
    expect(mockProcess.stdin.end).toHaveBeenCalled();
    // Should update status to COMPLETED on close(0)
  });

  it("should handle python process error event", async () => {
    (prisma.competition.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        equipeId: 2,
        baseUrl: "url",
        equipeFFHB: "eq",
        nom: "n",
        poule: "p",
        max_journees: 10,
        saison: "2023",
        phase: "Poule",
        equipe: { nom: "eq" },
      },
    ]);
    (prisma.competition.updateMany as jest.Mock).mockResolvedValue({});
    const mockProcess = {
      pid: 123,
      stdin: { write: jest.fn(), end: jest.fn() },
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
      on: jest.fn(),
    };
    (spawn as unknown as jest.Mock).mockReturnValue(mockProcess);
    await startScrapingProcess([1]);
    // Simuler l'appel du handler d'erreur
    const errorHandler = (mockProcess.on as jest.Mock).mock.calls.find(
      ([event]) => event === "error",
    )[1];
    errorHandler(new Error("fail"));
    expect(prisma.competition.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [1] } },
      data: {
        scrapingStatus: "FAILED",
        scrapingStep: expect.stringContaining("fail"),
      },
    });
  });

  it("should catch and log unexpected errors", async () => {
    (prisma.competition.findMany as jest.Mock).mockRejectedValue(
      new Error("fail"),
    );
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    await startScrapingProcess([1]);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("Erreur startScrapingProcess"),
      expect.any(Error),
    );
    spy.mockRestore();
  });
});
