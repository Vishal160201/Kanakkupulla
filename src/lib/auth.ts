import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma, { basePrisma } from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import bcrypt from "bcryptjs";
import type { JWT } from "next-auth/jwt";

const ROLE_REFRESH_MS = 60 * 1000;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(basePrisma),
  secret: process.env.NEXTAUTH_SECRET as string,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
        GoogleProvider({
          id: "google-drive",
          name: "Google Drive",
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          checks: ["none"],
          authorization: {
            params: {
              scope: "openid email profile https://www.googleapis.com/auth/drive.file",
              prompt: "consent",
              access_type: "offline",
              response_type: "code",
            },
          },
          allowDangerousEmailAccountLinking: true,
        }),
      ]
      : []),
    ...(process.env.APPLE_ID && process.env.APPLE_SECRET
      ? [
        AppleProvider({
          clientId: process.env.APPLE_ID,
          clientSecret: process.env.APPLE_SECRET,
        }),
      ]
      : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email.toLowerCase(),
          },
        });

        if (!user || !user?.password) {
          throw new Error("Invalid credentials");
        }

        if (user.status === "INACTIVE") {
          throw new Error("Account deactivated");
        }

        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isCorrectPassword) {
          const tempToken = await prisma.passwordResetToken.findUnique({
            where: { token: credentials.password },
          });

          if (tempToken && tempToken.email.toLowerCase() === credentials.email.toLowerCase()) {
            const hasExpired = new Date(tempToken.expires) < new Date();
            if (!hasExpired) {
              throw new Error(`TEMPORARY_PASSWORD:${tempToken.token}`);
            }
          }
          throw new Error("Invalid credentials");
        }

        return user;
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google-drive") {
        try {
          if (!account.providerAccountId) return false;
          
          if (!profile?.email) {
             return `/settings?error=DriveIntegrationFailed&details=Google did not return an email address.`;
          }

          // 1. Find the Kanakkupulla user by the Google profile email
          const dbUser = await prisma.user.findUnique({ 
            where: { email: profile.email } 
          });
          
          if (!dbUser) {
            return `/settings?error=DriveEmailMismatch&details=No Kanakkupulla account found for the email ${profile.email}. Please use the Google account that matches your Kanakkupulla login.`;
          }
          const userId = dbUser.id;

          // 2. Check if this integration already belongs to someone else (optional but safe)
          const integration = await prisma.userIntegration.findUnique({
            where: { userId_provider: { userId, provider: "google-drive" } }
          });
          
          if (integration && integration.connectedEmail && profile.email !== integration.connectedEmail) {
             // Technically they are using a different Google email than before, which we could reject, 
             // but since we match by profile.email above, it means their Kanakkupulla email ALSO changed.
             // We'll allow the upsert to update it.
          }

          // 3. Upsert the Account manually
          await prisma.account.upsert({
            where: { 
              provider_providerAccountId: { 
                provider: 'google-drive', 
                providerAccountId: account.providerAccountId 
              } 
            },
            create: {
              userId: userId,
              type: account.type || 'oauth',
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
              session_state: account.session_state as string | undefined,
            },
            update: {
              access_token: account.access_token,
              refresh_token: account.refresh_token ?? undefined,
              expires_at: account.expires_at,
              scope: account.scope,
              id_token: account.id_token,
            }
          });

          // 4. Upsert the UserIntegration manually
          await prisma.userIntegration.upsert({
            where: { userId_provider: { userId, provider: 'google-drive' } },
            create: { userId, provider: 'google-drive', connectedEmail: profile.email },
            update: { connectedEmail: profile.email }
          });

          // 5. Return a URL to bypass NextAuth's fragile account linking and redirect immediately
          return '/settings?section=google-drive&success=DriveConnected';
        } catch (error) {
          console.error("[auth] Google Drive linking failed", error);
          const message = error instanceof Error ? error.message : "Unknown error";
          return `/settings?error=DriveIntegrationFailed&details=${encodeURIComponent(message)}`;
        }
      }
      return true;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role ?? "STAFF";
        session.user.status = token.status;
      }
      return session;
    },

    async jwt({ token, user, account }) {
      // Return token as-is for Google Drive to preserve existing session
      if (account?.provider === "google-drive") {
        return token;
      }

      if (user) {
        token.sub = user.id;
        // `user` is the Prisma User row returned by authorize() / the adapter
        const dbUser = user as typeof user & { role?: JWT["role"]; status?: JWT["status"] };
        token.role = dbUser.role || "STAFF";
        token.status = dbUser.status;
        token.refreshedAt = Date.now();
        return token;
      }

      // Re-read role/status periodically so demotions and deactivations take effect
      // without waiting for the JWT to expire.
      if (token.sub && Date.now() - (token.refreshedAt ?? 0) > ROLE_REFRESH_MS) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, status: true },
        });
        token.role = dbUser?.role;
        token.status = dbUser ? dbUser.status : "INACTIVE";
        token.refreshedAt = Date.now();
      }
      return token;
    },
  },
};