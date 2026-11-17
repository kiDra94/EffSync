import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/shared/infrastructure/prisma/prisma.service";
import { createTestApp } from "./setup/create-test-app";

// M37: the permission check reads every grant in one SQL query; a direct
// grant counts only inside its validity period, checked against PostgreSQL.
// The windows end 30 minutes from now, so a time-zone slip of an hour shows.
describe("Direct permissions and their validity period (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;
  let userId: number;
  let permissionId: number;
  const MINUTES_30 = 30 * 60 * 1000;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await createTestApp(moduleFixture);
    prisma = app.get(PrismaService);

    // a user without any role: only the direct grant can let them in
    userId = (
      await prisma.users.create({
        data: {
          firstname: "Vera",
          lastname: "Gültig",
          username: "vgueltig",
          email: "vera.gueltig@htl.at",
          password_hash: await bcrypt.hash("password123", 4),
        },
      })
    ).user_id;
    permissionId = (
      await prisma.permissions.findFirstOrThrow({
        where: { name: "view_dashboard" },
        orderBy: { permission_id: "asc" },
      })
    ).permission_id;
    token = (
      (
        await request(app.getHttpServer())
          .post("/api/auth/login")
          .send({ identifier: "vgueltig", password: "password123" })
          .expect(201)
      ).body as { token: string }
    ).token;
  });

  afterAll(async () => {
    await app.close();
  });

  const grant = (validFrom: Date | null, validTo: Date | null) =>
    prisma.user_permissions.upsert({
      where: {
        user_id_permission_id: { user_id: userId, permission_id: permissionId },
      },
      create: {
        user_id: userId,
        permission_id: permissionId,
        valid_from: validFrom,
        valid_to: validTo,
      },
      update: { valid_from: validFrom, valid_to: validTo },
    });
  const notifications = () =>
    request(app.getHttpServer())
      .get("/api/notifications")
      .set("Authorization", `Bearer ${token}`);

  it("refuses a user without the permission", async () => {
    await notifications().expect(403);
  });

  it("lets the grant in inside its window, and not before or after it", async () => {
    const now = Date.now();

    await grant(new Date(now - MINUTES_30), new Date(now + MINUTES_30));
    await notifications().expect(200);

    // expired half an hour ago
    await grant(null, new Date(now - MINUTES_30));
    await notifications().expect(403);

    // starts in half an hour
    await grant(new Date(now + MINUTES_30), null);
    await notifications().expect(403);

    // without limits
    await grant(null, null);
    await notifications().expect(200);
  });
});
