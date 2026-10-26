import { describe, expect, it } from "vitest";
import {
  getCitizenRouteDecision,
  getHomePrimaryAction,
  getHomeRedirect,
  getPostSignInDestination,
  getRoleNavigationLinks,
} from "./roleNavigation";

describe("role-aware navigation", () => {
  it("keeps report and incident history available to citizens and routes the report action to the form", () => {
    const links = getRoleNavigationLinks(["Citizen"]);

    expect(links).toContainEqual({ label: "Report an incident", to: "/report" });
    expect(links).toContainEqual({ label: "Incident history", to: "/history" });
    expect(getHomeRedirect(["Citizen"])).toBeNull();
    expect(getHomePrimaryAction(["Citizen"])).toEqual({ label: "Create a report", to: "/report" });
    expect(getPostSignInDestination(["Citizen"], "/report")).toBe("/report");
  });

  it("sends administrators to management and excludes citizen reporting links", () => {
    const links = getRoleNavigationLinks(["Admin"]);
    const paths = links.map((link) => link.to);

    expect(paths).toContain("/admin");
    expect(paths.includes("/report")).toBe(false);
    expect(paths.includes("/history")).toBe(false);
    expect(getHomeRedirect(["Admin"])).toBe("/admin");
    expect(getHomePrimaryAction(["Admin"])).toEqual({ label: "Open administrator dashboard", to: "/admin" });
    expect(getPostSignInDestination(["Admin"], "/report")).toBe("/admin");
  });

  it("keeps citizen routes protected for signed-out and administrator accounts", () => {
    expect(getCitizenRouteDecision(null)).toBe("sign-in");
    expect(getCitizenRouteDecision(["Admin"])).toBe("admin-dashboard");
    expect(getCitizenRouteDecision(["Citizen"])).toBe("allow");
  });
});
