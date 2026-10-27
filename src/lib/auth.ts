import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

const configuredUsername = () => process.env.ALLOWED_GITHUB_USERNAME?.trim().toLowerCase();

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
      authorization: {
        params: { scope: "read:user repo" },
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ profile }) {
      const login = typeof profile?.login === "string" ? profile.login.toLowerCase() : "";
      // Fail closed until the owner configures the app; don't allow all GitHub users by default.
      return !!configuredUsername() && login === configuredUsername();
    },
    async jwt({ token, account, profile }) {
      if (account?.provider === "github" && typeof account.access_token === "string") {
        token.githubAccessToken = account.access_token;
      }
      if (typeof profile?.login === "string") {
        token.githubLogin = profile.login;
      }
      return token;
    },
    async session({ session, token }) {
      // Never send the GitHub OAuth token to the browser session.
      if (session.user && typeof token.githubLogin === "string") {
        session.user.name = token.githubLogin;
      }
      return session;
    },
  },
  pages: {
    error: "/?authError=true",
  },
};
