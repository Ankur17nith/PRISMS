export const ROLES = {
  STUDENT: "STUDENT",
  SUPERVISOR: "SUPERVISOR",
  HOD: "HOD",
  DDPC: "DDPC",
  CHAIRPERSON_SDPC: "CHAIRPERSON_SDPC",
  SDPC: "SDPC",
  DEAN_ACADEMICS: "DEAN_ACADEMICS",
  DEAN: "DEAN",
  CHAIRPERSON_SENATE: "CHAIRPERSON_SENATE",
  CHAIRMAN: "CHAIRMAN",
  ADMIN: "ADMIN",
} as const;

export const STAGE_CODES = {
  SUPERVISOR_REVIEW: "SUPERVISOR_REVIEW",
  HOD_REVIEW: "HOD_REVIEW",
  SDPC_REVIEW: "SDPC_REVIEW",
  DEAN_REVIEW: "DEAN_REVIEW",
  SENATE_REVIEW: "SENATE_REVIEW",
} as const;

/** Canonical mapping of role aliases so both standard and short codes resolve seamlessly */
export function normalizeRoleCode(code: string): string {
  const upper = code.trim().toUpperCase();
  if (upper === "CHAIRMAN") return ROLES.CHAIRPERSON_SENATE;
  if (upper === "SDPC") return ROLES.CHAIRPERSON_SDPC;
  if (upper === "DEAN") return ROLES.DEAN_ACADEMICS;
  return upper;
}

/** Check if user possesses one of the authorized role codes (accounting for normalized aliases) */
export function hasNormalizedRole(userRoles: { code: string }[], authorizedCodes: string[]): boolean {
  const normAuth = authorizedCodes.map(normalizeRoleCode);
  return userRoles.some((r) => normAuth.includes(normalizeRoleCode(r.code)));
}
