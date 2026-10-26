export interface RoleNavigationLink {
  label: string;
  to: string;
}

export type CitizenRouteDecision = "allow" | "sign-in" | "admin-dashboard";

export function getRoleNavigationLinks(roles: readonly string[] | null): RoleNavigationLink[] {
  if (roles?.includes("Admin")) {
    return [
      { label: "Administrator dashboard", to: "/admin" },
      { label: "About", to: "/about" },
    ];
  }

  return [
    { label: "Home", to: "/" },
    { label: "Report an incident", to: "/report" },
    { label: "Incident history", to: "/history" },
    { label: "About", to: "/about" },
  ];
}

export function getHomeRedirect(roles: readonly string[] | null): string | null {
  return roles?.includes("Admin") ? "/admin" : null;
}

export function getHomePrimaryAction(roles: readonly string[] | null): RoleNavigationLink {
  return roles?.includes("Admin")
    ? { label: "Open administrator dashboard", to: "/admin" }
    : { label: "Create a report", to: "/report" };
}

export function getPostSignInDestination(roles: readonly string[], requestedDestination?: string): string {
  if (roles.includes("Admin")) return "/admin";
  return requestedDestination ?? "/history";
}

export function getCitizenRouteDecision(roles: readonly string[] | null): CitizenRouteDecision {
  if (!roles) return "sign-in";
  return roles.includes("Citizen") ? "allow" : "admin-dashboard";
}
