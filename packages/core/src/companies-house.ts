const BASE_URL = "https://api.company-information.service.gov.uk";

function authHeader() {
  const key = process.env.COMPANIES_HOUSE_API_KEY;
  if (!key) throw new Error("COMPANIES_HOUSE_API_KEY not configured");
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

interface CompanyProfile {
  company_name: string;
  company_status: string; // "active" | "dissolved" | ...
  registered_office_address?: Record<string, string>;
}

interface Officer {
  name: string; // Companies House format: "SURNAME, Forename Middlename"
  officer_role: string;
  resigned_on?: string;
}

async function getCompanyProfile(companyNumber: string): Promise<CompanyProfile> {
  const res = await fetch(`${BASE_URL}/company/${encodeURIComponent(companyNumber)}`, { headers: { Authorization: authHeader() } });
  if (!res.ok) throw Object.assign(new Error("Company not found"), { statusCode: res.status });
  return res.json();
}

async function getCompanyOfficers(companyNumber: string): Promise<Officer[]> {
  const res = await fetch(`${BASE_URL}/company/${encodeURIComponent(companyNumber)}/officers`, { headers: { Authorization: authHeader() } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.items ?? [];
}

/** Normalizes a name into a token set for fuzzy matching — CH returns "SURNAME, Forename", self-reported names are free text. */
function nameTokens(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .replace(/[,.]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1)
  );
}

function namesLikelyMatch(a: string, b: string): boolean {
  const tokensA = nameTokens(a);
  const tokensB = nameTokens(b);
  let overlap = 0;
  for (const t of tokensA) if (tokensB.has(t)) overlap++;
  return overlap >= Math.min(tokensA.size, tokensB.size, 2);
}

export interface CompaniesHouseCheckResult {
  isActive: boolean;
  notDissolved: boolean;
  directorMatch: boolean;
  companyStatus: string;
  registeredAddress?: Record<string, string>;
  snapshot: { profile: CompanyProfile; officers: Officer[] };
}

/** Fetches a company's profile + officers and checks it against a self-reported director name. */
export async function verifyLimitedCompany(companyNumber: string, selfReportedDirectorName: string): Promise<CompaniesHouseCheckResult> {
  const [profile, officers] = await Promise.all([getCompanyProfile(companyNumber), getCompanyOfficers(companyNumber)]);

  const activeDirectors = officers.filter((o) => o.officer_role === "director" && !o.resigned_on);
  const directorMatch = activeDirectors.some((o) => namesLikelyMatch(o.name, selfReportedDirectorName));

  return {
    isActive: profile.company_status === "active",
    notDissolved: profile.company_status !== "dissolved",
    directorMatch,
    companyStatus: profile.company_status,
    registeredAddress: profile.registered_office_address,
    snapshot: { profile, officers },
  };
}
