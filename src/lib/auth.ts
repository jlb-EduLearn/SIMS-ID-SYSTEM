import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      organizationId: string;
      organizationName: string;
      currentSchoolId: string | null;
      currentSchoolName: string | null;
      currentSchoolYearId: string | null;
      currentSchoolYearName: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationId: string;
    organizationName: string;
    currentSchoolId: string | null;
    currentSchoolName: string | null;
    currentSchoolYearId: string | null;
    currentSchoolYearName: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    organizationId: string;
    organizationName: string;
    currentSchoolId: string | null;
    currentSchoolName: string | null;
    currentSchoolYearId: string | null;
    currentSchoolYearName: string | null;
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: {
            organization: true,
            userSchools: {
              include: {
                school: {
                  include: {
                    schoolYears: {
                      where: { isActive: true },
                      orderBy: [{ isCurrent: "desc" }, { name: "desc" }],
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        });

        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        if (!valid) return null;

        const assignedSchool =
          user.role !== "ADMIN" && user.userSchools.length === 1
            ? user.userSchools[0].school
            : null;
        const assignedSchoolYear = assignedSchool?.schoolYears[0] ?? null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          organizationName: user.organization.name,
          currentSchoolId: assignedSchool?.id ?? null,
          currentSchoolName: assignedSchool?.name ?? null,
          currentSchoolYearId: assignedSchoolYear?.id ?? null,
          currentSchoolYearName: assignedSchoolYear?.name ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.organizationName = user.organizationName;
        token.currentSchoolId = user.currentSchoolId;
        token.currentSchoolName = user.currentSchoolName;
        token.currentSchoolYearId = user.currentSchoolYearId;
        token.currentSchoolYearName = user.currentSchoolYearName;
      }

      if (trigger === "update" && session) {
        if (session.currentSchoolId !== undefined) {
          token.currentSchoolId = session.currentSchoolId;
          token.currentSchoolName = session.currentSchoolName ?? null;
          // Reset school year when school changes
          if (session.resetSchoolYear) {
            token.currentSchoolYearId = null;
            token.currentSchoolYearName = null;
          }
        }
        if (session.currentSchoolYearId !== undefined) {
          token.currentSchoolYearId = session.currentSchoolYearId;
          token.currentSchoolYearName = session.currentSchoolYearName ?? null;
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        email: token.email as string,
        name: token.name as string,
        role: token.role,
        organizationId: token.organizationId,
        organizationName: token.organizationName,
        currentSchoolId: token.currentSchoolId,
        currentSchoolName: token.currentSchoolName,
        currentSchoolYearId: token.currentSchoolYearId,
        currentSchoolYearName: token.currentSchoolYearName,
      };
      return session;
    },
  },
};
