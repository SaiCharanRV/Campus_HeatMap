import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    name?: string | null;
    department?: string | null;
    zone?: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: string;
      department?: string | null;
      zone?: string | null;
    } & DefaultSession["user"]; // DefaultSession["user"] already includes name, email, image
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    department?: string | null;
    zone?: string | null;
  }
}
