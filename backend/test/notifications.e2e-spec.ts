import { INestApplication } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/shared/infrastructure/prisma/prisma.service";
import { createTestApp } from "./setup/create-test-app";

// GOALS.md M23: notifications and e-mail preferences in their context
describe("Notifications and e-mail preferences (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let student: string;
  let userId: number;

  const call = (
    method: "get" | "put" | "patch",
    url: string,
    body?: object,
  ) => {
    const req = request(app.getHttpServer())
      [method](url)
      .set("Authorization", `Bearer ${student}`);
    return body ? req.send(body) : req;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await createTestApp(moduleFixture);
    prisma = app.get(PrismaService);
    // a user of its own, so no seed data changes (review M23)
    userId = (
      await prisma.users.create({
        data: {
          firstname: "Nora",
          lastname: "Notiz",
          username: "nnotiz",
          email: "nora.notiz@student.htl.at",
          password_hash: await bcrypt.hash("password123", 4),
          user_roles: { create: { role_id: 2 } },
        },
      })
    ).user_id;
    student = (
      (
        await request(app.getHttpServer())
          .post("/api/auth/login")
          .send({ identifier: "nnotiz", password: "password123" })
          .expect(201)
      ).body as { token: string }
    ).token;
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates the default preferences on first read and changes them", async () => {
    const first = (await call("get", "/api/email-preferences").expect(200))
      .body as {
      data: { email_on_deadline: boolean; digest_frequency: string };
    };
    expect(first.data).toMatchObject({
      email_on_deadline: true,
      digest_frequency: "daily",
    });

    const updated = (
      await call("put", "/api/email-preferences", {
        email_on_deadline: false,
      }).expect(200)
    ).body as { data: { email_on_deadline: boolean } };
    expect(updated.data.email_on_deadline).toBe(false);

    // M23: the body is validated now
    await call("put", "/api/email-preferences", {
      digest_frequency: "hourly",
    }).expect(400);
  });

  it("lists, counts and marks the user's notifications", async () => {
    await prisma.notifications.createMany({
      data: [
        { user_id: userId, type: "info", text: "Eins" },
        { user_id: userId, type: "info", text: "Zwei" },
      ],
    });

    const unread = (
      await call("get", "/api/notifications/unread-count").expect(200)
    ).body as { unread_count: number };
    expect(unread.unread_count).toBe(2);

    await call("patch", "/api/notifications/mark-all-read").expect(200);
    expect(
      (
        (await call("get", "/api/notifications/unread-count").expect(200))
          .body as { unread_count: number }
      ).unread_count,
    ).toBe(0);
    const all = (await call("get", "/api/notifications").expect(200)).body as {
      text: string;
    }[];
    expect(all.map((n) => n.text)).toEqual(
      expect.arrayContaining(["Eins", "Zwei"]),
    );
  });

  // review M23: someone else's notification is a 404, not readable
  it("doesn't show another user's notification", async () => {
    const foreign = await prisma.notifications.create({
      data: { user_id: 4, type: "info", text: "Privat" },
    });

    await call("get", `/api/notifications/${foreign.notification_id}`).expect(
      404,
    );
  });
});
