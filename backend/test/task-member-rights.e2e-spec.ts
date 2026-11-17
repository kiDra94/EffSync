import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { AuthService } from "../src/contexts/identity-access/application/auth.service";
import { PrismaService } from "../src/shared/infrastructure/prisma/prisma.service";
import { createTestApp } from "./setup/create-test-app";

interface Member {
  user_id: number;
  role: string;
  flags: number;
}

// THESIS: T99 (flipped in M38, decision I4) – rights are evaluated on the
// task: each membership carries READ/WRITE/EXECUTE; R lists the members, W
// adds and removes them, X changes their flags. Creator and Admin/Superuser
// have RWX, the assignee READ+WRITE; a direct grant alone gives nothing here.
describe("Task-level member rights (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let taskId: number;
  const token: Record<string, string> = {};
  const id: Record<string, number> = {};

  const as = (who: string) => ({
    get: (url: string) =>
      request(app.getHttpServer())
        .get(url)
        .set("Authorization", `Bearer ${token[who]}`),
    post: (url: string) =>
      request(app.getHttpServer())
        .post(url)
        .set("Authorization", `Bearer ${token[who]}`),
    patch: (url: string) =>
      request(app.getHttpServer())
        .patch(url)
        .set("Authorization", `Bearer ${token[who]}`),
    delete: (url: string) =>
      request(app.getHttpServer())
        .delete(url)
        .set("Authorization", `Bearer ${token[who]}`),
  });
  const members = () => `/api/tasks/${taskId}/members`;
  const flagsOf = async (who: string) =>
    (
      (await as(who).get(`${members()}/check-permission`).expect(200)).body as {
        permission_flags: number;
      }
    ).permission_flags;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await createTestApp(moduleFixture);
    prisma = app.get(PrismaService);
    const auth = app.get(AuthService);

    const user = async (username: string) =>
      (await prisma.users.findUniqueOrThrow({ where: { username } })).user_id;
    id.creator = await user("alehrerin");
    id.assignee = await user("lgruber");
    id.reader = await user("ffuchs");
    id.writer = await user("dwolf");
    id.executor = await user("sschwaiger");
    // a teacher with a direct grant, not part of the task
    id.granted = await user("pschmidt");
    id.newcomer = await user("teder");
    id.superuser = await user("adminadmin");
    const adminRole = await prisma.roles.findFirstOrThrow({
      where: { name: "Admin" },
    });
    id.admin = (
      await prisma.users.create({
        data: {
          firstname: "Ada",
          lastname: "Admin",
          username: "aadmin38",
          email: "ada.admin38@htl.at",
          user_roles: { create: { role_id: adminRole.role_id } },
        },
      })
    ).user_id;

    taskId = (
      await prisma.tasks.create({
        data: {
          title: "Rechte-Projekt M38",
          created_by: id.creator,
          assigned_to: id.assignee,
        },
      })
    ).task_id;
    await prisma.task_members.createMany({
      data: [
        // no flags given: the column's default, as the migration gives existing rows
        { task_id: taskId, user_id: id.reader },
        { task_id: taskId, user_id: id.writer, flags: 6 },
        { task_id: taskId, user_id: id.executor, flags: 7 },
      ],
    });
    // a direct grant with every flag, but no membership
    const editTasks = await prisma.permissions.findFirstOrThrow({
      where: { name: "edit_tasks" },
    });
    await prisma.user_permissions.create({
      data: { user_id: id.granted, permission_id: editTasks.permission_id },
    });

    for (const who of Object.keys(id)) {
      token[who] = (await auth.issueTokenFor(id[who])).token;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it("resolves the flags on the task for each kind of user", async () => {
    expect(await flagsOf("creator")).toBe(7);
    expect(await flagsOf("superuser")).toBe(7);
    expect(await flagsOf("admin")).toBe(7);
    expect(await flagsOf("assignee")).toBe(6);
    // the default for existing and new memberships is READ
    expect(await flagsOf("reader")).toBe(4);
    expect(await flagsOf("writer")).toBe(6);
    expect(await flagsOf("executor")).toBe(7);
    // a direct grant doesn't count on a task (it did before M38); since I5
    // the teacher doesn't even see a task they aren't part of
    await as("granted").get(`${members()}/check-permission`).expect(404);
  });

  // decision I4 (after the review): the rights on a subtask include those on
  // every task above it
  it("carries the rights of the project over to its subtasks", async () => {
    const subtask = await prisma.tasks.create({
      data: {
        title: "Teilaufgabe M38",
        created_by: id.writer,
        parent_task_id: taskId,
      },
    });
    const sub = (who: string) =>
      as(who).get(`/api/tasks/${subtask.task_id}/members/check-permission`);
    const flags = async (who: string) =>
      ((await sub(who).expect(200)).body as { permission_flags: number })
        .permission_flags;

    expect(await flags("creator")).toBe(7);
    expect(await flags("reader")).toBe(4);
    expect(await flags("assignee")).toBe(6);
    await as("reader").get(`/api/tasks/${subtask.task_id}/members`).expect(200);
    await as("reader")
      .post(`/api/tasks/${subtask.task_id}/members`)
      .send({ user_id: id.newcomer })
      .expect(403);

    // second review: the list shows the rights that count, also those from
    // above: the project's creator as a member of the subtask holds RWX there
    await as("writer")
      .post(`/api/tasks/${subtask.task_id}/members`)
      .send({ user_id: id.creator })
      .expect(201);
    const list = (
      await as("writer")
        .get(`/api/tasks/${subtask.task_id}/members`)
        .expect(200)
    ).body as (Member & { fixed_flags: boolean })[];
    expect(list.find((m) => m.user_id === id.creator)).toMatchObject({
      flags: 7,
      fixed_flags: true,
    });
  });

  // second review: an Admin passes the visibility guard on any id
  it("answers 404, not 403, for a task that doesn't exist", async () => {
    await as("admin").get("/api/tasks/999999/members").expect(404);
    await as("admin")
      .get("/api/tasks/999999/members/check-permission")
      .expect(404);
  });

  // THESIS: T128 (decision I5) – a student's private task stays private
  it("hides a student's private task from teachers, not from an admin", async () => {
    const own = await prisma.tasks.create({
      data: { title: "Privat M38", created_by: id.newcomer },
    });

    await as("granted").get(`/api/tasks/${own.task_id}`).expect(404);
    const listed = (await as("granted").get("/api/tasks?limit=100").expect(200))
      .body as {
      data: { task_id: number }[];
    };
    expect(listed.data.map((t) => t.task_id)).not.toContain(own.task_id);
    await as("admin").get(`/api/tasks/${own.task_id}`).expect(200);
  });

  it("lists the members with their flags for READ, and refuses without it", async () => {
    const list = (await as("reader").get(members()).expect(200))
      .body as Member[];
    const flagsById = Object.fromEntries(list.map((m) => [m.user_id, m.flags]));
    expect(flagsById[id.creator]).toBe(7);
    expect(flagsById[id.assignee]).toBe(6);
    expect(flagsById[id.reader]).toBe(4);
    expect(flagsById[id.writer]).toBe(6);

    await as("granted").get(members()).expect(404);
  });

  it("lets WRITE add and remove members, not READ", async () => {
    await as("reader")
      .post(members())
      .send({ user_id: id.newcomer })
      .expect(403);
    await as("granted")
      .post(members())
      .send({ user_id: id.newcomer })
      .expect(404);

    await as("writer")
      .post(members())
      .send({ user_id: id.newcomer })
      .expect(201);
    const added = (
      (await as("writer").get(members()).expect(200)).body as Member[]
    ).find((m) => m.user_id === id.newcomer);
    expect(added?.flags).toBe(4);

    await as("reader").delete(`${members()}/${id.newcomer}`).expect(403);
    await as("writer").delete(`${members()}/${id.newcomer}`).expect(204);
  });

  it("lets EXECUTE change a member's flags, not WRITE", async () => {
    await as("writer")
      .patch(`${members()}/${id.reader}`)
      .send({ flags: 6 })
      .expect(403);

    const changed = await as("executor")
      .patch(`${members()}/${id.reader}`)
      .send({ flags: 6 })
      .expect(200);
    expect((changed.body as Member).flags).toBe(6);
    expect(await flagsOf("reader")).toBe(6);
    await as("reader")
      .post(members())
      .send({ user_id: id.newcomer })
      .expect(201);

    // back to READ for the other tests
    await as("creator")
      .patch(`${members()}/${id.reader}`)
      .send({ flags: 4 })
      .expect(200);
    await as("creator").delete(`${members()}/${id.newcomer}`).expect(204);
  });

  it("lets an Admin manage the members of a task they aren't part of", async () => {
    await as("admin")
      .post(members())
      .send({ user_id: id.newcomer })
      .expect(201);
    await as("admin")
      .patch(`${members()}/${id.newcomer}`)
      .send({ flags: 2 })
      .expect(200);
    await as("admin").delete(`${members()}/${id.newcomer}`).expect(204);
  });

  it("refuses to change the creator's flags, a non-member's or invalid ones", async () => {
    await as("creator")
      .patch(`${members()}/${id.creator}`)
      .send({ flags: 4 })
      .expect(400);
    await as("creator")
      .patch(`${members()}/${id.newcomer}`)
      .send({ flags: 4 })
      .expect(404);
    await as("creator")
      .patch(`${members()}/${id.reader}`)
      .send({ flags: 9 })
      .expect(400);
    await as("creator")
      .patch(`/api/tasks/999999/members/${id.reader}`)
      .send({ flags: 4 })
      .expect(404);
  });
});
