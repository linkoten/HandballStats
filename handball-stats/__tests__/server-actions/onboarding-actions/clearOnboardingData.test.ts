import { clearOnboardingData } from "@/app/actions/onboarding-actions";
import { cookies } from "next/headers";

jest.mock("next/headers");

const mockDelete = jest.fn();
const mockCookies = () => ({ delete: mockDelete });
(cookies as unknown as jest.Mock).mockImplementation(mockCookies);

describe("clearOnboardingData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDelete.mockClear();
  });

  it("should clear onboarding cookies and return success", async () => {
    const res = await clearOnboardingData();
    expect(res.success).toBe(true);
    expect(res.data.message).toMatch(/nettoyées?/);
    expect(mockDelete).toHaveBeenCalledWith("onboarding-selected-club");
    expect(mockDelete).toHaveBeenCalledWith("onboarding-selected-equipes");
  });

  it("should return generic error on unexpected exception", async () => {
    (cookies as unknown as jest.Mock).mockImplementation(() => {
      throw new Error("fail");
    });
    const res = await clearOnboardingData();
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/fail/);
  });
});
