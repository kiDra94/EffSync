import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/shared/infrastructure/prisma/prisma.service";
import { createTestApp } from "./setup/create-test-app";

// Password reset by e-mail (GOALS.md M13, T52, decision Q8a): the link carries
// a 30-minute JWT signed with JWT_SECRET plus the current password hash, so it
// stops working once the password has changed. In the test environment the
// EmailService writes every mail as JSON into MAIL_OUTBOX_DIR.
interface OutboxMail {
  to: string;
  subject: string;
  html: string;
}

describe("Password reset by e-mail (e2e)", () => {
  let app: INestApplication<App>;
  const outbox = process.env.MAIL_OUTBOX_DIR as string;
  // a seed user no other E2E file signs in with: its password changes here
  const email = "tobias@student.htl.at";

  beforeAll(async () => {
    rmSync(outbox, { recursive: true, force: true });
    mkdirSync(outbox, { recursive: true });
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await createTestApp(moduleFixture);
  });

  afterAll(async () => {
    await app.close();
  });

  const mailsTo = (recipient: string): OutboxMail[] =>
    readdirSync(outbox)
      .sort()
      .map(
        (file) =>
          JSON.parse(readFileSync(join(outbox, file), "utf8")) as OutboxMail,
      )
      .filter((mail) => mail.to === recipient);

  // the mail is sent after the 204, so the answer doesn't depend on it
  const waitForMail = async (recipient: string, count: number) => {
    for (let attempt = 0; attempt < 50; attempt++) {
      const mails = mailsTo(recipient);
      if (mails.length >= count) return mails[count - 1];
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`no mail #${count} to ${recipient}`);
  };

  const tokenFrom = (mail: OutboxMail) => {
    const match = /\/reset-password#token=([\w.-]+)/.exec(mail.html);
    if (!match) throw new Error("no reset link in the mail");
    return match[1];
  };

  const forgot = (address: string) =>
    request(app.getHttpServer())
      .post("/api/auth/forgot-password")
      .send({ email: address });
  const setPassword = (token: string, password: string) =>
    request(app.getHttpServer())
      .post("/api/auth/set-new-password")
      .set("Authorization", `Bearer ${token}`)
      .send({ password });
  const login = (password: string) =>
    request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ identifier: "teder", password });

  it("answers 204 for an unknown address and sends nothing", async () => {
    await forgot("nobody@htl.at").expect(204);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(mailsTo("nobody@htl.at")).toHaveLength(0);
  });

  it("mails a reset link; the link sets a new password once, and old sessions end", async () => {
    const before = (await login("password123").expect(201)).body as {
      refreshToken: string;
    };

    // the address is matched case-insensitively
    await forgot("Tobias@Student.HTL.at").expect(204);
    const token = tokenFrom(await waitForMail(email, 1));

    // the reset token is no access token
    await request(app.getHttpServer())
      .get("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);

    // the same rules as on registration: 7 to 32 characters
    await setPassword(token, "kurz12").expect(400);
    await setPassword(token, "x".repeat(33)).expect(400);
    await setPassword(token, "neues-passwort-1").expect(201);
    const after = (await login("neues-passwort-1").expect(201)).body as {
      token: string;
    };

    // the same link again: the password hash in its key has changed
    await setPassword(token, "noch-ein-passwort").expect(401);
    // a session from before the change can't refresh any more
    await request(app.getHttpServer())
      .post("/api/auth/refresh")
      .send({ refreshToken: before.refreshToken })
      .expect(401);

    // the Google reset path stays: it sets the password with an access token
    await setPassword(after.token, "google-pfad-123").expect(201);
  });

  it("rejects an expired reset link with 401", async () => {
    const user = await app
      .get(PrismaService)
      .users.findUniqueOrThrow({ where: { email } });
    const expired = app.get(JwtService).sign(
      { sub: user.user_id, purpose: "reset" },
      {
        secret: `${process.env.JWT_SECRET}:reset:${user.password_hash}`,
        expiresIn: -60,
      },
    );

    await setPassword(expired, "abgelaufen-123").expect(401);
  });
});
