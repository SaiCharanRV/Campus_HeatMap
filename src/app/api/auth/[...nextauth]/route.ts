import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        // Enforce @iitr.ac.in or departmental subdomains only for Student role
        if (credentials.role === "Student") {
          if (!credentials.email.endsWith("@iitr.ac.in") && !credentials.email.endsWith(".iitr.ac.in")) {
            throw new Error("Only @iitr.ac.in or departmental emails are allowed for students");
          }
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error("No user found with this email");
        }

        // Validate that the user is logging in with their actual registered role
        if (credentials.role && user.role !== credentials.role) {
          throw new Error(`You are registered as a ${user.role}. Please select the correct role.`);
        }

        // Safeguard: Ensure student accounts adhere to @iitr.ac.in
        if (user.role === "Student") {
          if (!user.email.endsWith("@iitr.ac.in") && !user.email.endsWith(".iitr.ac.in")) {
            throw new Error("Only @iitr.ac.in or departmental emails are allowed for students");
          }
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          role: user.role,
          department: user.department ?? null,
          zone: user.zone ?? null,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.name = user.name ?? null;
        token.department = (user as any).department ?? null;
        token.zone = (user as any).zone ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).name = token.name ?? null;
        (session.user as any).department = token.department ?? null;
        (session.user as any).zone = token.zone ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "supersecret_for_local_development_only_12345",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
