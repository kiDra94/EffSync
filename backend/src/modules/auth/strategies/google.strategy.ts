import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, Profile } from "passport-google-oauth20";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(private prisma: PrismaService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        "http://localhost:3000/api/auth/google/callback",
      scope: ["profile", "email"],
    } as any);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: Function,
  ) {
    console.log("🔐 Google OAuth Profile:", {
      id: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.displayName,
    });

    try {
      // Versuche, den User zu finden
      let user = await this.prisma.users.findUnique({
        where: { username: profile.emails?.[0]?.value || profile.id },
        include: {
          user_roles: {
            include: { roles: true },
          },
        },
      });

      // Wenn User nicht existiert, erstelle ihn
      if (!user) {
        console.log("👤 Creating new user from Google OAuth...");

        const email =
          profile.emails?.[0]?.value || `${profile.id}@google.oauth`;

        // Erstelle User ohne Rollen zunächst
        const newUser = await this.prisma.users.create({
          data: {
            username: email,
            email: email,
            firstname: profile.name?.givenName || "Google",
            lastname: profile.name?.familyName || "User",
            google_id: profile.id,
          },
        });

        // Finde student rolle - auf Basis der vorhandenen Rollen
        try {
          const roles = await this.prisma.roles.findMany();
          const studentRole = roles.find(
            (r) => r.name?.toLowerCase() === "student",
          );

          if (studentRole && newUser.user_id) {
            await this.prisma.user_roles.create({
              data: {
                user_id: newUser.user_id,
                role_id: studentRole.role_id,
              },
            });
          }
        } catch (roleError) {
          console.warn("⚠️ Fehler beim Zuweisen der Student-Rolle:", roleError);
        }

        // Reload user mit Rollen
        user = await this.prisma.users.findUnique({
          where: { user_id: newUser.user_id },
          include: {
            user_roles: {
              include: { roles: true },
            },
          },
        });
      }

      const primaryRole =
        user?.user_roles && user.user_roles.length > 0
          ? user.user_roles[0].roles?.name?.toLowerCase()
          : "student";

      return done(null, {
        id: user?.user_id,
        userId: user?.user_id,
        username: user?.username,
        email: user?.email,
        firstname: user?.firstname,
        lastname: user?.lastname,
        role: primaryRole,
        googleId: profile.id,
      });
    } catch (error) {
      console.error("❌ Google OAuth validation error:", error);
      return done(error, null);
    }
  }
}
