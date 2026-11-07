import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { createTestApp } from "./setup/create-test-app";

// THESIS: T54 (M8) – every endpoint needs a permission; a missing one returns 403.
// Roles get their permissions from role-permissions.config.ts (decisions F1, F2).
const STUDENT_ROLE_ID = 2; // test seed: Superuser 1, Student 2, Teacher 3, Admin 4

describe("Endpoint permissions (e2e)", () => {
  let app: INestApplication<App>;
  let superuser: string;
  let student: string;
  let noPermissions: string;
  const task = { title: "Permission test task", deadline: "2029-06-01" };

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
    }).compile();
    app = await createTestApp(moduleFixture);

    // three logins per app instance: the login throttle allows 3 per minute
    superuser = await login("adminadmin");
    student = await login("ffuchs");

    const registered = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({
        username: "no_permissions",
        email: "no.permissions@example.com",
        password: "password123",
        firstname: "Nobody",
        lastname: "Permissions",
      })
      .expect(201);
    const userId = (registered.body as { user_id: number }).user_id;
    // registration gives the Student role; taking it away leaves no permission at all
    await request(app.getHttpServer())
      .delete(`/api/users/${userId}/roles/${STUDENT_ROLE_ID}`)
      .set("Authorization", `Bearer ${superuser}`)
      .expect(200);
    noPermissions = await login("no_permissions");
  });

  afterAll(async () => {
    await app.close();
  });

  const get = (url: string, token: string) =>
    request(app.getHttpServer())
      .get(url)
      .set("Authorization", `Bearer ${token}`);

  // decision F2: UC-10 lists students as actors of "create task"
  it("lets a student create a task", async () => {
    await request(app.getHttpServer())
      .post("/api/tasks")
      .set("Authorization", `Bearer ${student}`)
      .send(task)
      .expect(201);
  });

  it("answers 403 on POST /tasks for a user without create_tasks", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/tasks")
      .set("Authorization", `Bearer ${noPermissions}`)
      .send(task)
      .expect(403);

    expect((response.body as { message: string }).message).toBe(
      "Missing permission: create_tasks",
    );
  });

  // M8 review: endpoints that had a decorator without a guard, or no permission at all
  it.each([
    "/api/users/for-chat",
    "/api/users/profile",
    "/api/task-activity?task_id=1",
    "/api/email-preferences",
  ])("answers 403 on GET %s without view_dashboard", async (url) => {
    await get(url, noPermissions).expect(403);
  });

  it("still serves those endpoints to a student", async () => {
    await get("/api/users/for-chat", student).expect(200);
    await get("/api/email-preferences", student).expect(200);
  });

  it("lets only manage_system create notifications for other users", async () => {
    await request(app.getHttpServer())
      .post("/api/notifications")
      .set("Authorization", `Bearer ${student}`)
      .send({ user_id: 2, type: "info", text: "fake" })
      .expect(403);
  });

  it("lets a student delete nobody else's task (delete_tasks)", async () => {
    // task 1 of the test seed belongs to Anna (teacher)
    const response = await request(app.getHttpServer())
      .delete("/api/tasks/1")
      .set("Authorization", `Bearer ${student}`)
      .expect(403);

    expect((response.body as { message: string }).message).toBe(
      "Missing permission: delete_tasks",
    );
  });
});
