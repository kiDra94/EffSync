import { Controller, Get, INestApplication, UseGuards } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { JwtAuthGuard } from "../src/modules/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../src/modules/auth/guards/roles.guard";
import { PermissionsGuard } from "../src/modules/auth/guards/permissions.guard";
import { Roles } from "../src/modules/auth/decorators/roles.decorator";
import { Permissions } from "../src/modules/auth/decorators/permissions.decorator";
import { RoleName } from "../src/config/role-permissions.config";
import { createTestApp } from "./setup/create-test-app";

// THESIS: T97 – the backend checks the token, then the role, then the permission.
// The test seed gives teachers view_dashboard … edit_grades, but not manage_users.
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller("guard-order-test")
class GuardOrderTestController {
  @Get()
  @Roles(RoleName.TEACHER)
  @Permissions("manage_users")
  check() {
    return { ok: true };
  }
}

describe("Guard order token → role → permission (e2e)", () => {
  let app: INestApplication<App>;
  let student: string;
  let teacher: string;
  let otherTeacher: string;

  async function login(username: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ username, password: "password123" })
      .expect(201);
    return (response.body as { token: string }).token;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [GuardOrderTestController],
    }).compile();
    app = await createTestApp(moduleFixture);
    // three logins per app instance: the login throttle allows 3 per minute
    student = await login("ffuchs");
    teacher = await login("alehrerin");
    otherTeacher = await login("pschmidt");
  });

  afterAll(async () => {
    await app.close();
  });

  it("answers 401 without a token", async () => {
    await request(app.getHttpServer()).get("/api/guard-order-test").expect(401);
  });

  it("answers 403 for the role before looking at the permission", async () => {
    // a student has neither the role nor the permission: the role check fails first
    const response = await request(app.getHttpServer())
      .get("/api/guard-order-test")
      .set("Authorization", `Bearer ${student}`)
      .expect(403);

    expect((response.body as { message: string }).message).toMatch(
      /Insufficient role/,
    );
  });

  it("answers 403 for the permission once the role is present", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/guard-order-test")
      .set("Authorization", `Bearer ${teacher}`)
      .expect(403);

    expect((response.body as { message: string }).message).toBe(
      "Missing permission: manage_users",
    );
  });

  // M7: the endpoints that are role-restricted get @Roles(Teacher, Admin, Superuser)
  it.each([
    ["PATCH", "/api/documents/1/grade", { grade: "1" }],
    ["PATCH", "/api/documents/1/allow-resubmit", {}],
  ])("%s %s answers 403 for a student", async (_method, url, body) => {
    const response = await request(app.getHttpServer())
      .patch(url)
      .set("Authorization", `Bearer ${student}`)
      .send(body)
      .expect(403);

    expect((response.body as { message: string }).message).toMatch(
      /Insufficient role/,
    );
  });

  // staff or the task's creator; uses its own task so the seed data stays untouched
  describe("PATCH /api/tasks/:id/deadline-unlock", () => {
    let taskId: number;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post("/api/tasks")
        .set("Authorization", `Bearer ${teacher}`)
        .send({ title: "Guard order deadline task", deadline: "2029-06-01" })
        .expect(201);
      taskId = (response.body as { task_id: number }).task_id;
    });

    it("answers 403 for a student who didn't create the task", async () => {
      await request(app.getHttpServer())
        .patch(`/api/tasks/${taskId}/deadline-unlock`)
        .set("Authorization", `Bearer ${student}`)
        .send({ deadline: "2030-01-01" })
        .expect(403);
    });

    it("lets another teacher change the deadline", async () => {
      await request(app.getHttpServer())
        .patch(`/api/tasks/${taskId}/deadline-unlock`)
        .set("Authorization", `Bearer ${otherTeacher}`)
        .send({ deadline: "2030-01-01" })
        .expect(200);
    });
  });
});
