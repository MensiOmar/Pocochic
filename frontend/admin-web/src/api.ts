const origin = import.meta.env.VITE_API_ORIGIN ?? "";

export async function adminFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${origin}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  return res;
}
