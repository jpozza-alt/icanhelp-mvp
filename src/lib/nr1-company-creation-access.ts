/**
 * Read-only permission projection for the NR-1 workspace.
 * Not a security boundary: the server and transactional database function must
 * revalidate permission before inserting a company.
 */
export type CompanyCreationAccessInput = {
  membershipRole: string | null | undefined;
  companyCount: number;
  portfolioEnabled: boolean;
  partnerModeEnabled: boolean;
};

export function canCreateNr1Company(input: CompanyCreationAccessInput): boolean {
  if (input.membershipRole !== "owner" && input.membershipRole !== "admin") return false;
  if (!Number.isSafeInteger(input.companyCount) || input.companyCount < 0) return false;

  // One initial company is permitted even on a basic plan.
  if (input.companyCount === 0) return true;

  // Partner SST / Pasini plans can administer an authorized portfolio.
  // A plan subscription is NOT a global platform-owner role.
  return input.portfolioEnabled && input.partnerModeEnabled;
}