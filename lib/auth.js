import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { randomBytes } from "node:crypto";
import { prisma } from "./db.js";
import { verifyPassword } from "./password.js";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 },
  pages: { signIn: "/" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(input) {
        const ident = String(input?.email ?? "").trim().toLowerCase();
        if (!ident) return null;
        const user = await prisma.user.findFirst({ where: { OR: [{ email: ident }, { nim: ident }] } });
        if (!user || !(await verifyPassword(String(input?.password ?? ""), user.passwordHash))) return null;

        // FR-AUTH-03: one active session per account — new login revokes the old token.
        const sessionTag = randomBytes(16).toString("hex");
        await prisma.user.update({ where: { id: user.id }, data: { sessionTag } });
        return { id: String(user.id), name: user.name, email: user.email, role: user.role, tag: sessionTag };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.tag = user.tag;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub;
        session.user.role = token.role;
        session.user.tag = token.tag;
      }
      return session;
    },
  },
});
