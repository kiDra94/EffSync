import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/shared/infrastructure/prisma/prisma.service";
import { createTestApp } from "./setup/create-test-app";

interface RoleWithPermissions {
  role_id: number;
  roles_permissions: {
    permissions: { permission_id: number; name: string; flags: number };
  }[];
}

// GOALS.md M35: admins manage the accounts (T75, decision Q17), the
// Superuser configures which permissions each role has (T77, Q18, I2, I3)
describe("Admin user management and system configuration (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let superuser: string;
  let admin: string;
  let student: string;
  let studentRoleId: number;
  let superuserRoleId: number;
  let original: { roles_id: number; permission_id: number }[];
  let originalFlags: { permission_id: number; flags: number }[];

  const login = async (identifier: string) =>
    (
      (
        await request(app.getHttpServer())
          .post("/api/auth/login")
          .send({ identifier, password: "password123" })
          .expect(201)
      ).body as { token: string }
    ).token;
  const as = (token: string) => ({
    get: (url: string) =>
      request(app.getHttpServer())
        .get(url)
        .set("Authorization", `Bearer ${token}`),
    post: (url: string) =>
      request(app.getHttpServer())
        .post(url)
        .set("Authorization", `Bearer ${token}`),
    patch: (url: string) =>
      request(app.getHttpServer())
        .patch(url)
        .set("Authorization", `Bearer ${token}`),
    put: (url: string) =>
      request(app.getHttpServer())
        .put(url)
        .set("Authorization", `Bearer ${token}`),
    delete: (url: string) =>
      request(app.getHttpServer())
        .delete(url)
        .set("Authorization", `Bearer ${token}`),
  });
  const entriesOf = (role: RoleWithPermissions) =>
    role.roles_permissions.map(({ permissions: p }) => ({
      permission_id: p.permission_id,
      flags: p.flags,
    }));

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await createTestApp(moduleFixture);
    prisma = app.get(PrismaService);

    const role = async (name: string) =>
      (await prisma.roles.findFirstOrThrow({ where: { name } })).role_id;
    studentRoleId = await role("Student");
    superuserRoleId = await role("Superuser");
    // the test seed has no admin: one of its own, so the other files keep theirs
    await prisma.users.create({
      data: {
        firstname: "Adam",
        lastname: "Admin",
        username: "aadmin35",
        email: "adam.admin35@htl.at",
        password_hash: await bcrypt.hash("password123", 4),
        user_roles: { create: { role_id: await role("Admin") } },
      },
    });
    original = await prisma.roles_permissions.findMany({
      select: { roles_id: true, permission_id: true },
    });
    originalFlags = await prisma.permissions.findMany({
      select: { permission_id: true, flags: true },
    });

    // three logins: the login allows three a minute
    superuser = await login("adminadmin");
    admin = await login("aadmin35");
    student = await login("ffuchs");
  });

  afterAll(async () => {
    // the role mapping the other E2E files expect
    await prisma.roles_permissions.deleteMany();
    await prisma.roles_permissions.createMany({ data: original });
    for (const { permission_id, flags } of originalFlags) {
      await prisma.permissions.update({
        where: { permission_id },
        data: { flags },
      });
    }
    await app.close();
  });

  it("lets an admin create, edit and delete a user", async () => {
    const created = await as(admin)
      .post("/api/users")
      .send({
        email: "neu.schueler35@htl.at",
        password: "geheim-123",
        firstname: "Nora",
        lastname: "Neumann",
        username: "nneumann35",
      })
      .expect(201);
    const id = (created.body as { user_id: number }).user_id;
    expect(created.body).not.toHaveProperty("password_hash");

    const edited = await as(admin)
      .patch(`/api/users/${id}`)
      .send({ firstname: "Norah", email: "norah.neumann35@htl.at" })
      .expect(200);
    expect(edited.body).toMatchObject({
      firstname: "Norah",
      email: "norah.neumann35@htl.at",
    });

    await as(admin).delete(`/api/users/${id}`).expect(200);
    await as(admin).get(`/api/users/${id}`).expect(404);
  });

  it("answers 403 to a non-admin on the user endpoints", async () => {
    await as(student)
      .post("/api/users")
      .send({
        email: "nicht.erlaubt35@htl.at",
        password: "geheim-123",
        firstname: "Nina",
        lastname: "Nicht",
        username: "nnicht35",
      })
      .expect(403);
    await as(student)
      .patch("/api/users/5")
      .send({ firstname: "Laura" })
      .expect(403);
    await as(student).delete("/api/users/5").expect(403);
  });

  it("lets the superuser change a role's permissions, with the effect on its users at once", async () => {
    const manageUsers = await prisma.permissions.findFirstOrThrow({
      where: { name: "manage_users" },
    });
    const studentRole = (
      await as(superuser).get(`/api/roles/${studentRoleId}`).expect(200)
    ).body as RoleWithPermissions;
    const before = entriesOf(studentRole);
    expect(before.map((e) => e.permission_id)).not.toContain(
      manageUsers.permission_id,
    );
    await as(student).get("/api/roles").expect(403);

    const changed = await as(superuser)
      .put(`/api/roles/${studentRoleId}/permissions`)
      .send({
        permissions: [
          ...before,
          {
            permission_id: manageUsers.permission_id,
            flags: manageUsers.flags,
          },
        ],
      })
      .expect(200);
    expect(entriesOf(changed.body as RoleWithPermissions)).toHaveLength(
      before.length + 1,
    );
    await as(student).get("/api/roles").expect(200);

    // decision I3: taken away again, it is gone at once (no copy stays)
    await as(superuser)
      .put(`/api/roles/${studentRoleId}/permissions`)
      .send({ permissions: before })
      .expect(200);
    await as(student).get("/api/roles").expect(403);
  });

  it("changes a permission's flags for every role (decision I2)", async () => {
    const studentRole = (
      await as(superuser).get(`/api/roles/${studentRoleId}`).expect(200)
    ).body as RoleWithPermissions;
    const createTasks = studentRole.roles_permissions.find(
      (rp) => rp.permissions.name === "create_tasks",
    )!.permissions;
    // create_tasks needs WRITE on POST /tasks; read-only, the student is refused
    const readOnly = entriesOf(studentRole).map((e) =>
      e.permission_id === createTasks.permission_id ? { ...e, flags: 4 } : e,
    );

    await as(superuser)
      .put(`/api/roles/${studentRoleId}/permissions`)
      .send({ permissions: readOnly })
      .expect(200);
    await as(student)
      .post("/api/tasks")
      .send({ title: "Nur lesen M35", deadline: "2029-06-01" })
      .expect(403);

    await as(superuser)
      .put(`/api/roles/${studentRoleId}/permissions`)
      .send({ permissions: entriesOf(studentRole) })
      .expect(200);
    await as(student)
      .post("/api/tasks")
      .send({ title: "Wieder schreiben M35", deadline: "2029-06-01" })
      .expect(201);
  });

  // decision I3: a role's permissions count through the role; assigning it
  // copies none into the user's own grants, so removing it leaves none behind
  it("gives a user a role's permissions only while the user has the role", async () => {
    const teacherRoleId = (
      await prisma.roles.findFirstOrThrow({ where: { name: "Teacher" } })
    ).role_id;
    const user = await prisma.users.create({
      data: {
        firstname: "Rolf",
        lastname: "Rolle",
        username: "rrolle35",
        email: "rolf.rolle35@htl.at",
      },
    });

    await as(superuser)
      .post(`/api/users/${user.user_id}/roles`)
      .send({ role_id: teacherRoleId })
      .expect(201);
    expect(
      await prisma.user_permissions.count({ where: { user_id: user.user_id } }),
    ).toBe(0);
    const granted = (
      await as(superuser)
        .get(`/api/users/${user.user_id}/permissions`)
        .expect(200)
    ).body as { roles: unknown[] };
    expect(granted.roles).toHaveLength(1);

    await as(superuser)
      .delete(`/api/users/${user.user_id}/roles/${teacherRoleId}`)
      .expect(200);
    expect(
      await prisma.user_permissions.count({ where: { user_id: user.user_id } }),
    ).toBe(0);
  });

  // review M35: an Admin can't make anyone a Superuser, nor take over or
  // delete a Superuser's account, or the Superuser-only routes mean nothing
  it("keeps the Superuser role and accounts out of an admin's reach", async () => {
    const adminId = (
      await prisma.users.findUniqueOrThrow({ where: { username: "aadmin35" } })
    ).user_id;

    await as(admin)
      .post(`/api/users/${adminId}/roles`)
      .send({ role_id: superuserRoleId })
      .expect(403);
    await as(admin).delete(`/api/users/1/roles/${superuserRoleId}`).expect(403);
    await as(admin)
      .patch("/api/users/1")
      .send({ email: "uebernahme@example.com" })
      .expect(403);
    await as(admin).delete("/api/users/1").expect(403);
    expect(
      (await prisma.users.findUniqueOrThrow({ where: { user_id: 1 } })).email,
    ).not.toBe("uebernahme@example.com");
  });

  // review M35: an account an admin creates can sign in and use the app,
  // like a registered one (Student until the admin assigns another role)
  it("gives a new account the Student role", async () => {
    const created = await as(admin)
      .post("/api/users")
      .send({
        email: "start.rolle35@htl.at",
        password: "geheim-123",
        firstname: "Stella",
        lastname: "Start",
        username: "sstart35",
      })
      .expect(201);
    const roles = await prisma.user_roles.findMany({
      where: { user_id: (created.body as { user_id: number }).user_id },
      include: { roles: true },
    });
    expect(roles.map((r) => r.roles.name)).toEqual(["Student"]);
  });

  // review M35: everything the Superuser needs to reach the configuration
  it("refuses to take what the configuration needs away from the Superuser (400)", async () => {
    const role = (
      await as(superuser).get(`/api/roles/${superuserRoleId}`).expect(200)
    ).body as RoleWithPermissions;
    const entries = entriesOf(role);
    const idOf = (name: string) =>
      role.roles_permissions.find((rp) => rp.permissions.name === name)!
        .permissions.permission_id;

    for (const name of ["manage_users", "view_dashboard"]) {
      await as(superuser)
        .put(`/api/roles/${superuserRoleId}/permissions`)
        .send({
          permissions: entries.filter((e) => e.permission_id !== idOf(name)),
        })
        .expect(400);
    }
    // the flags are global: editing another role can't take READ away either
    await as(superuser)
      .put(`/api/roles/${studentRoleId}/permissions`)
      .send({
        permissions: [{ permission_id: idOf("view_dashboard"), flags: 0 }],
      })
      .expect(400);
  });

  it("answers 403 to an admin on PUT /roles/:id/permissions", async () => {
    await as(admin)
      .put(`/api/roles/${studentRoleId}/permissions`)
      .send({ permissions: [] })
      .expect(403);
  });

  it("refuses to take manage_system away from the Superuser role (400)", async () => {
    const role = (
      await as(superuser).get(`/api/roles/${superuserRoleId}`).expect(200)
    ).body as RoleWithPermissions;
    const manageSystem = role.roles_permissions.find(
      (rp) => rp.permissions.name === "manage_system",
    )!.permissions;
    const entries = entriesOf(role);

    await as(superuser)
      .put(`/api/roles/${superuserRoleId}/permissions`)
      .send({
        permissions: entries.filter(
          (e) => e.permission_id !== manageSystem.permission_id,
        ),
      })
      .expect(400);
    // without WRITE the Superuser couldn't send notifications to others any more
    await as(superuser)
      .put(`/api/roles/${superuserRoleId}/permissions`)
      .send({
        permissions: entries.map((e) =>
          e.permission_id === manageSystem.permission_id
            ? { ...e, flags: 4 }
            : e,
        ),
      })
      .expect(400);

    const after = (
      await as(superuser).get(`/api/roles/${superuserRoleId}`).expect(200)
    ).body as RoleWithPermissions;
    expect(entriesOf(after)).toEqual(expect.arrayContaining(entries));
    expect(entriesOf(after)).toHaveLength(entries.length);
  });

  it("rejects an unknown permission and an unknown role", async () => {
    await as(superuser)
      .put(`/api/roles/${studentRoleId}/permissions`)
      .send({ permissions: [{ permission_id: 99999, flags: 4 }] })
      .expect(400);
    await as(superuser)
      .put("/api/roles/99999/permissions")
      .send({ permissions: [] })
      .expect(404);
  });
});
