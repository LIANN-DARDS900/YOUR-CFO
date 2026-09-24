export type MembershipRole = "owner" | "member" | "viewer";

export function assertProfileAccess(row: unknown): asserts row is Record<string, unknown> & { role: MembershipRole } {
  if (!row || typeof row !== "object" || !["owner", "member", "viewer"].includes(String((row as Record<string, unknown>).role))) {
    throw new Error("Profile not found or access denied");
  }
}

export function canMutate(role: MembershipRole) { return role === "owner" || role === "member"; }
export function canAdminister(role: MembershipRole) { return role === "owner"; }
