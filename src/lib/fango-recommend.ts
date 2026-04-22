const BASE_URL = process.env.FANGO_RECOMMEND_URL || "";
const USERNAME = process.env.FANGO_RECOMMEND_USER || "";
const PASSWORD = process.env.FANGO_RECOMMEND_PASS || "";

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function login(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });

  if (!res.ok) {
    throw new Error(`Fango Recommend login failed: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = data.token;
  // JWT expires in 7 days per the token payload, refresh after 6 days
  tokenExpiry = Date.now() + 6 * 24 * 60 * 60 * 1000;
  return cachedToken!;
}

async function authFetch(
  path: string,
  options: RequestInit = {},
  extraHeaders: Record<string, string> = {}
): Promise<Response> {
  let token = await login();
  const buildHeaders = (tok: string): Record<string, string> => ({
    ...((options.headers as Record<string, string>) || {}),
    Authorization: `Bearer ${tok}`,
    ...extraHeaders,
  });

  let res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(token),
  });

  // Retry once on 401 (token expired)
  if (res.status === 401) {
    cachedToken = null;
    tokenExpiry = 0;
    token = await login();
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: buildHeaders(token),
    });
  }

  return res;
}

// Step 1: create project with just a name (no requirements yet — matches
// what the Fango Recommend web UI actually does).
export async function createProject(
  name: string
): Promise<{ id: string; name: string }> {
  const res = await authFetch("/api/projects", {
    method: "POST",
    body: JSON.stringify({ name }),
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Failed to create project: ${res.status}`);
  }

  return res.json();
}

// Step 2: upload the requirements as multipart/form-data. The UI does this
// immediately after project creation, and skipping it causes the backend to
// ignore the requirements text during search (returning irrelevant results).
export async function uploadRequirements(
  projectId: string,
  requirements: string
): Promise<{ success: boolean; houseIds: string[]; pageCount: number }> {
  const form = new FormData();
  form.append("requirements", requirements);

  const res = await authFetch(
    `/api/projects/${projectId}/upload`,
    {
      method: "POST",
      body: form,
    }
    // No Content-Type override: fetch will set the correct multipart boundary.
  );

  if (!res.ok) {
    throw new Error(`Failed to upload requirements: ${res.status}`);
  }

  return res.json();
}

// Step 3: trigger the search job.
export async function searchProperties(
  projectId: string,
  userRequirements: string
): Promise<{ success: boolean; jobId: string; message: string }> {
  const res = await authFetch(
    `/api/projects/${projectId}/search-properties`,
    {
      method: "POST",
      body: JSON.stringify({ userRequirements }),
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to search properties: ${res.status}`);
  }

  return res.json();
}

type FangoProject = {
  id: string;
  name: string;
  created_at: string;
  user_requirements: string;
  savedSearchResults: {
    reins_id: string;
    predicted_views: number;
    searched_at: string;
    rent?: string | null;
    area_sqm?: string | null;
    built_year?: string | null;
    walk_minutes?: string | null;
    address?: string | null;
    floor_plan?: string | null;
    property_type?: string | null;
    deposit?: string | null;
    key_money?: string | null;
  }[];
};

export async function getProject(projectId: string): Promise<FangoProject> {
  const res = await authFetch(`/api/projects/${projectId}`);

  if (!res.ok) {
    throw new Error(`Failed to get project: ${res.status}`);
  }

  return res.json();
}
