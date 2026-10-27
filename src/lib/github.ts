import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export type RepoVisibility = "public" | "private";

export interface Repo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  archived: boolean;
  fork: boolean;
  stargazers_count: number;
  updated_at: string;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export function errorResponse(error: unknown) {
  const status = error instanceof ApiError ? error.status : 500;
  const message = error instanceof ApiError ? error.message : "Unexpected server error.";
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function authorizedUser(req: NextRequest) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const githubLogin = typeof jwt?.githubLogin === "string" ? jwt.githubLogin : "";
  const githubToken = typeof jwt?.githubAccessToken === "string" ? jwt.githubAccessToken : "";
  const allowed = process.env.ALLOWED_GITHUB_USERNAME?.trim().toLowerCase();
  if (!allowed || !githubLogin || !githubToken || githubLogin.toLowerCase() !== allowed) {
    throw new ApiError(401, "Not authorized. Sign in using your configured GitHub account.");
  }
  return { githubLogin, githubToken };
}

export async function githubRequest<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  // Paths are constructed only by the server from validated GitHub usernames/repo names.
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const body: { message?: string } = await response.json().catch(() => ({}));
    const reason = typeof body.message === "string" ? body.message.slice(0, 250) : "GitHub request failed";
    throw new ApiError(response.status, `GitHub: ${reason} (HTTP ${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function validRepoName(repoName: unknown): repoName is string {
  return typeof repoName === "string" && /^[a-zA-Z0-9_.-]{1,100}$/.test(repoName) && repoName !== "." && repoName !== "..";
}
