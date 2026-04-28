const BASE_URL = process.env.FANGO_RECOMMEND_URL || "";
const USERNAME = process.env.FANGO_RECOMMEND_USER || "";
const PASSWORD = process.env.FANGO_RECOMMEND_PASS || "";

let cachedToken: string | null = null;
let tokenExpiry = 0;
// In-flight login promise — concurrent callers share it so we don't open
// duplicate auth connections during a cold-start burst.
let loginInFlight: Promise<string> | null = null;

// Parse `exp` out of the JWT payload. Returns 0 on any parse failure so the
// caller falls back to the conservative default.
function parseJwtExpiry(token: string): number {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return 0;
    // base64url → base64
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');
    const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'));
    if (typeof payload.exp === 'number') return payload.exp * 1000;
  } catch {
    /* fall through */
  }
  return 0;
}

function doLogin(): Promise<string> {
  return fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`Fango Recommend login failed: ${res.status}`);
      const data = await res.json();
      const token = data.token as string;
      cachedToken = token;
      const exp = parseJwtExpiry(token);
      // Expire 5 minutes before the real exp so we don't race a request's
      // server-side clock drift. Fall back to 6 days if the token has no
      // exp claim (upstream policy shift).
      tokenExpiry = exp > 0 ? exp - 5 * 60 * 1000 : Date.now() + 6 * 24 * 60 * 60 * 1000;
      return token;
    });
}

async function login(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  if (loginInFlight) return loginInFlight;
  loginInFlight = doLogin().finally(() => {
    loginInFlight = null;
  });
  return loginInFlight;
}

/**
 * Caller contract: when passing a streaming body (FormData, ReadableStream),
 * supply `bodyFactory` so this helper can rebuild it for the 401 retry. The
 * same body instance can't be read twice.
 */
async function authFetch(
  path: string,
  options: RequestInit = {},
  extraHeaders: Record<string, string> = {},
  bodyFactory?: () => RequestInit['body'],
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

  // Retry once on 401 (token expired). If the body is a one-shot stream
  // (FormData etc.) the caller must supply bodyFactory, otherwise the retry
  // would send an empty body and silently lose the request's payload.
  if (res.status === 401) {
    cachedToken = null;
    tokenExpiry = 0;
    token = await login();
    const retryBody = bodyFactory ? bodyFactory() : options.body;
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      body: retryBody,
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
  const makeForm = () => {
    const f = new FormData();
    f.append('requirements', requirements);
    return f;
  };

  const res = await authFetch(
    `/api/projects/${encodeURIComponent(projectId)}/upload`,
    {
      method: "POST",
      body: makeForm(),
    },
    {},
    // On 401 retry, rebuild the form — the original has already been
    // consumed by the first fetch and can't be replayed.
    makeForm,
  );

  if (!res.ok) {
    throw new Error(`Failed to upload requirements: ${res.status}`);
  }

  return res.json();
}

// Step 3: trigger the search job.
// resultCount: 10 / 20 / 30 / 40 / 50 (Fango Recommend side defaults to 30 when omitted).
export async function searchProperties(
  projectId: string,
  userRequirements: string,
  resultCount?: number
): Promise<{ success: boolean; jobId: string; message: string }> {
  const body: Record<string, unknown> = { userRequirements };
  if (typeof resultCount === "number") body.resultCount = resultCount;

  const res = await authFetch(
    `/api/projects/${encodeURIComponent(projectId)}/search-properties`,
    {
      method: "POST",
      body: JSON.stringify(body),
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
  // Encode as a defence-in-depth against a caller who skips validation; the
  // route layer should have already rejected non-alphanumeric ids.
  const res = await authFetch(`/api/projects/${encodeURIComponent(projectId)}`);

  if (!res.ok) {
    throw new Error(`Failed to get project: ${res.status}`);
  }

  return res.json();
}
