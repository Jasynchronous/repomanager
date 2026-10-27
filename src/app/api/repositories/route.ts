import type { NextRequest } from "next/server";
import { authorizedUser, errorResponse, githubRequest, type Repo } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { githubToken, githubLogin } = await authorizedUser(req);
    const repositories: Repo[] = [];
    let truncated = false;

    // GitHub pages contain at most 100 entries; cap at 1,000 to bound Vercel execution time.
    for (let page = 1; page <= 10; page += 1) {
      const data = await githubRequest<Repo[]>(
        githubToken,
        `/user/repos?affiliation=owner&visibility=all&sort=updated&direction=desc&per_page=100&page=${page}`
      );
      const owned = data.filter((repo) => repo.full_name.split("/")[0]?.toLowerCase() === githubLogin.toLowerCase());
      repositories.push(...owned);
      if (data.length < 100) break;
      if (page === 10) truncated = true;
    }
    return Response.json(
      { repositories, truncated },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
