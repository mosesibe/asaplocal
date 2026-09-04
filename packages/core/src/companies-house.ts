const BASE_URL = "https://api.company-information.service.gov.uk";

function authHeader() {
  const key = process.env.COMPANIES_HOUSE_API_KEY;
  if (!key) throw new Error("COMPANIES_HOUSE_API_KEY not configured");
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

interface CompanyProfile {
  company_name: string;
  company_status: string; // "active" | "dissolved" | ...
  date_of_creation?: string; // YYYY-MM-DD
  registered_office_address?: Record<string, string>;
}

interface Officer {
  name: string; // Companies House format: "SURNAME, Forename Middlename"
  officer_role: string;
  resigned_on?: string;
}

interface DisqualifiedOfficerSearchItem {
  title: string; // indexed name, same "SURNAME, Forename" shape as Officer.name
}

async function getCompanyProfile(companyNumber: string): Promise<CompanyProfile> {
  const res = await fetch(`${BASE_URL}/company/${encodeURIComponent(companyNumber)}`, { headers: { Authorization: authHeader() } });
  if (!res.ok) {
    const message =
      res.status === 400 || res.status === 401
        ? "Companies House API auth failed"
        : res.status === 404
          ? "Company not found"
          : `Companies House lookup failed (${res.status})`;
    throw Object.assign(new Error(message), { statusCode: res.status });
  }
  return res.json();
}

async function getCompanyOfficers(companyNumber: string): Promise<Officer[]> {
  const res = await fetch(`${BASE_URL}/company/${encodeURIComponent(companyNumber)}/officers`, { headers: { Authorization: authHeader() } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.items ?? [];
}

/**
 * Free-text search against the Companies House disqualified-officers
 * register. Fails open (returns false on a non-OK response) — this is a
 * supplementary flag that forces a human review, not the primary pass/fail
 * gate, so an API hiccup here shouldn't itself block verification.
 */
async function searchDisqualifiedOfficers(name: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/search/disqualified-officers?q=${encodeURIComponent(name)}`, { headers: { Authorization: authHeader() } });
  if (!res.ok) return false;
  const data = await res.json();
  const items: DisqualifiedOfficerSearchItem[] = data.items ?? [];
  return items.some((item) => namesLikelyMatch(item.title, name));
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
  /** Plausible name match against the free disqualified-officers register — always forces a human review, never used to auto-verify. */
  possibleDirectorDisqualification: boolean;
  companyStatus: string;
  companyIncorporatedAt: string | null;
  registeredAddress?: Record<string, string>;
  snapshot: { profile: CompanyProfile; officers: Officer[] };
}

/** Fetches a company's profile + officers and checks it against a self-reported director name. */
export async function verifyLimitedCompany(companyNumber: string, selfReportedDirectorName: string): Promise<CompaniesHouseCheckResult> {
  const [profile, officers] = await Promise.all([getCompanyProfile(companyNumber), getCompanyOfficers(companyNumber)]);

  const activeDirectors = officers.filter((o) => o.officer_role === "director" && !o.resigned_on);
  const directorMatch = activeDirectors.some((o) => namesLikelyMatch(o.name, selfReportedDirectorName));
  const possibleDirectorDisqualification = await searchDisqualifiedOfficers(selfReportedDirectorName);

  return {
    isActive: profile.company_status === "active",
    notDissolved: profile.company_status !== "dissolved",
    directorMatch,
    possibleDirectorDisqualification,
    companyStatus: profile.company_status,
    companyIncorporatedAt: profile.date_of_creation ?? null,
    registeredAddress: profile.registered_office_address,
    snapshot: { profile, officers },
  };
}
