import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/shared/infrastructure/prisma/prisma.service";
import { createTestApp } from "./setup/create-test-app";

// a 1×1 PNG
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

interface ChatUser {
  user_id: number;
  profile_picture: string | null;
}

// GOALS.md M27 step 6 (T47, decision Q8c): the profile picture
describe("Avatar (e2e)", () => {
  let app: INestApplication<App>;
  let token: string;
  let userId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await createTestApp(moduleFixture);
    userId = (
      await app
        .get(PrismaService)
        .users.findUniqueOrThrow({ where: { username: "ffuchs" } })
    ).user_id;
    token = (
      (
        await request(app.getHttpServer())
          .post("/api/auth/login")
          .send({ identifier: "ffuchs", password: "password123" })
          .expect(201)
      ).body as { token: string }
    ).token;
  });

  afterAll(async () => {
    await app.close();
  });

  const pictureInChat = async () =>
    (
      (
        await request(app.getHttpServer())
          .get("/api/users/for-chat")
          .set("Authorization", `Bearer ${token}`)
          .expect(200)
      ).body as ChatUser[]
    ).find((u) => u.user_id === userId)?.profile_picture;

  it("uploads an image, serves it and names it in user responses", async () => {
    const upload = await request(app.getHttpServer())
      .put("/api/users/me/avatar")
      .set("Authorization", `Bearer ${token}`)
      // the content decides, not the name or the declared type
      .attach("file", PNG, { filename: "ich.txt", contentType: "text/plain" })
      .expect(200);
    const url = (upload.body as { profile_picture: string }).profile_picture;
    expect(url).toMatch(new RegExp(`^/users/${userId}/avatar\\?v=\\d+$`));

    // review M27: other users' pictures only for signed-in users
    await request(app.getHttpServer()).get(`/api${url}`).expect(401);
    const image = await request(app.getHttpServer())
      .get(`/api${url}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(image.headers["content-type"]).toBe("image/png");
    expect(Buffer.compare(image.body as Buffer, PNG)).toBe(0);

    expect(await pictureInChat()).toBe(url);
    const profile = await request(app.getHttpServer())
      .get("/api/users/profile")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect((profile.body as ChatUser).profile_picture).toBe(url);
  });

  it("rejects a file that is not an image", async () => {
    await request(app.getHttpServer())
      .put("/api/users/me/avatar")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("%PDF-1.4 kein Bild"), {
        filename: "bild.png",
        contentType: "image/png",
      })
      .expect(400);
  });

  it("rejects an image over 1 MB", async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(1024 * 1024)]);
    await request(app.getHttpServer())
      .put("/api/users/me/avatar")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", big, { filename: "gross.png", contentType: "image/png" })
      .expect(413);
  });

  it("needs a token to upload", async () => {
    await request(app.getHttpServer())
      .put("/api/users/me/avatar")
      .attach("file", PNG, { filename: "ich.png", contentType: "image/png" })
      .expect(401);
  });

  it("deletes the picture", async () => {
    await request(app.getHttpServer())
      .delete("/api/users/me/avatar")
      .set("Authorization", `Bearer ${token}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/api/users/${userId}/avatar`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
    expect(await pictureInChat()).toBeNull();
  });
});
