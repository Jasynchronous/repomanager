import type { NextRequest } from "next/server";
import { ApiError, authorizedUser, errorResponse, githubRequest, validRepoName, type Repo } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const requestOrigin = req.headers.get("origin");
    if (!requestOrigin) throw new ApiError(403, "Missing request origin.");
    const origin = new URL(requestOrigin);
    const validHost = [req.nextUrl.host, req.headers.get("x-forwarded-host")].includes(origin.host);
    if (!validHost || !["http:", "https:"].includes(origin.protocol)) {
      throw new ApiError(403, "Cross-origin updates are not allowed.");
    }
    if (!req.headers.get("content-type")?.startsWith("application/json")) {
      throw new ApiError(415, "Expected a JSON request.");
    }

    const { githubLogin, githubToken } = await authorizedUser(req);
    const body = await req.json().catch(() => null) as { name?: unknown; visibility?: unknown } | null;
    if (!body || !validRepoName(body.name) || !["public", "private"].includes(String(body.visibility))) {
      throw new ApiError(400, "Provide a valid repository name and visibility (public or private).");
    }

    // The owner is ALWAYS taken from the authenticated JWT, never user input.
    const visibility = body.visibility === "private" ? "private" : "public";
    const result = await githubRequest<Repo>(
      githubToken,
      `/repos/${encodeURIComponent(githubLogin)}/${encodeURIComponent(body.name)}`,
      { method: "PATCH", body: JSON.stringify({ private: visibility === "private" }) }
    );
    return Response.json(
      { repository: result.full_name, visibility: result.private ? "private" : "public" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
