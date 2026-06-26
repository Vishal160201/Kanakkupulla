import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET as string,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  debug: true,
  logger: {
    error(code, metadata) {
      try {
        require("fs").appendFileSync("nextauth-error.log", JSON.stringify({ code, metadata }) + "\\n");
      } catch (e) {}
    },
    debug(code, metadata) {
      try {
        require("fs").appendFileSync("nextauth-debug.log", JSON.stringify({ code, metadata }) + "\\n");
      } catch (e) {}
    }
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
    async signIn({ user, account, profile }) {
      console.log("[NextAuth] signIn callback triggered for provider:", account?.provider);
      if (account?.provider === "google-drive") {
        try {
          console.log("[NextAuth] account data:", JSON.stringify(account, null, 2));
          if (!account.providerAccountId) {
            console.error("[NextAuth] Missing providerAccountId!");
            return false;
          }
          
          const existingAccount = await prisma.account.findFirst({
            where: {
              providerAccountId: account.providerAccountId,
              provider: "google-drive",
            },
          });

          if (existingAccount) {
            console.log("[NextAuth] Updating existing account:", existingAccount.id);
            // Check UserIntegration for matching email
            const integration = await prisma.userIntegration.findUnique({
              where: { userId_provider: { userId: existingAccount.userId, provider: "google-drive" } }
            });
            
            if (integration && integration.connectedEmail) {
              if (profile?.email && profile.email !== integration.connectedEmail) {
                // Remove the unauthorized token from Google
                if (account.access_token) {
                  try {
                    await fetch(`https://oauth2.googleapis.com/revoke?token=${account.access_token}`, {
                      method: "POST",
                      headers: { "Content-Type": "application/x-www-form-urlencoded" }
                    });
                  } catch (e) {
                    console.error("Failed to revoke unauthorized token", e);
                  }
                }
                return `/settings?error=DriveEmailMismatch&expectedEmail=${encodeURIComponent(integration.connectedEmail)}`;
              }
            } else if (profile?.email) {
              await prisma.userIntegration.upsert({
                where: { userId_provider: { userId: existingAccount.userId, provider: 'google-drive' } },
                create: { userId: existingAccount.userId, provider: 'google-drive', connectedEmail: profile.email },
                update: { connectedEmail: profile.email }
              });
            }

            // Update tokens on existing linked account
            await prisma.account.update({
              where: { id: existingAccount.id },
              data: {
                access_token: account.access_token,
                refresh_token: account.refresh_token ?? existingAccount.refresh_token,
                expires_at: account.expires_at,
              },
            });
          } else {
            console.log("[NextAuth] Account not found, proceeding with NextAuth linkAccount");
            // If linking a new account, we need to save the connected email as well
            if (user?.id && profile?.email) {
              const integration = await prisma.userIntegration.findUnique({
                where: { userId_provider: { userId: user.id, provider: "google-drive" } }
              });
              
              if (integration && integration.connectedEmail && profile.email !== integration.connectedEmail) {
                return `/settings?error=DriveEmailMismatch&expectedEmail=${encodeURIComponent(integration.connectedEmail)}`;
              }
              
              await prisma.userIntegration.upsert({
                where: { userId_provider: { userId: user.id, provider: 'google-drive' } },
                create: { userId: user.id, provider: 'google-drive', connectedEmail: profile.email },
                update: { connectedEmail: profile.email }
              });
            }
          }
          
          // FIX: Google sometimes returns `refresh_token_expires_in` which is not in our Prisma schema.
          // PrismaAdapter blindly passes it to `prisma.account.create()`, causing a validation crash.
          if ('refresh_token_expires_in' in account) {
            delete account.refresh_token_expires_in;
          }

          return true;
        } catch (error) {
          console.error("[NextAuth] Error in signIn callback for google-drive:", error);
          return false;
        }
      }
      return true;
    },

    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.sub as string;
        (session.user as any).role = token.role as string;
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
        token.role = (user as any).role || "STAFF";
      }
      return token;
    },
  },
};