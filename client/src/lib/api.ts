const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
let token = localStorage.getItem("bookleaf-token");
export function setToken(value: string | null) {
  token = value;
  if (value) localStorage.setItem("bookleaf-token", value);
  else localStorage.removeItem("bookleaf-token");
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data as T;
}
export type Book = {
  id: string;
  sourceId?: string | null;
  title: string;
  isbn: string;
  genre: string;
  status: string;
  sourceStatus: string;
  publishedAt: string | null;
  mrp: number;
  royaltyPerCopy: number | null;
  platform: string;
  availableOn: string[];
  copiesSold: number;
  earned: number;
  paid: number;
  pending: number;
  lastPayout: string | null;
  payouts: { period: string; amount: number; date: string | null }[];
  royaltyStatus: string;
};
export type Snapshot = {
  author: {
    id: string;
    sourceId?: string | null;
    name: string;
    email: string;
    phone?: string | null;
    city: string | null;
    joinedAt?: string | null;
  };
  books: Book[];
  summary: {
    books: number;
    copiesSold: number;
    earned: number;
    paid: number;
    pending: number;
  };
};
