const API_BASE = "/api";

// Wrapper that always includes cookies + returns JSON + throws clean errors
async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include", // IMPORTANT: sends/receives the auth cookie
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const message = data?.error || data?.message || "Request failed";
    throw new Error(message);
  }

  return data;
}

export const api = {
  signup: (email, password) =>
    request("/signup", { method: "POST", body: JSON.stringify({ email, password }) }),

  login: (email, password) =>
    request("/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  logout: () => request("/logout", { method: "POST" }),

  me: () => request("/me"),

  listMatches: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/matches${qs ? `?${qs}` : ""}`);
  },

  getMatch: (id) => request(`/matches/${id}`),

  createMatch: (payload) =>
    request("/matches", { method: "POST", body: JSON.stringify(payload) }),

  updateMatch: (id, payload) =>
    request(`/matches/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

  deleteMatch: (id) => request(`/matches/${id}`, { method: "DELETE" }),

  opponentSummary: () => request("/opponents/summary"),
};
