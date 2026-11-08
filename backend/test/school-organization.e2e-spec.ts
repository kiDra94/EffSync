import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { createTestApp } from "./setup/create-test-app";

// GOALS.md M36: school organization on the real API (T26, decisions D1, D2)
describe("School organization (e2e)", () => {
  let app: INestApplication<App>;
  let admin: string;
  let teacher: string;
  let student: string;

  const login = async (identifier: string) =>
    (
      (
        await request(app.getHttpServer())
          .post("/api/auth/login")
          .send({ identifier, password: "password123" })
          .expect(201)
      ).body as { token: string }
    ).token;
  const call = (
    method: "get" | "post" | "patch" | "put" | "delete",
    url: string,
    token: string,
    body?: object,
  ) => {
    const req = request(app.getHttpServer())
      [method](url)
      .set("Authorization", `Bearer ${token}`);
    return body ? req.send(body) : req;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await createTestApp(moduleFixture);
    admin = await login("adminadmin");
    teacher = await login("alehrerin"); // user 2, head of 5AHITM
    student = await login("ffuchs");
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates a class, assigns two students and a teacher and reads them back", async () => {
    const created = (
      await call("post", "/api/classes", admin, {
        name: "1AHIF",
        department_id: 1,
        schedule_id: 1,
      }).expect(201)
    ).body as { class_id: number };

    await call("put", `/api/classes/${created.class_id}/students`, admin, {
      student_ids: [7, 8],
    }).expect(200);
    await call("put", `/api/classes/${created.class_id}/teachers`, admin, {
      teacher_ids: [3],
    }).expect(200);

    const detail = (
      await call("get", `/api/classes/${created.class_id}`, teacher).expect(200)
    ).body as {
      name: string;
      department: { name: string } | null;
      students: { user_id: number; email?: string }[];
      teachers: { user_id: number }[];
      head_teacher: unknown;
    };
    expect(detail.name).toBe("1AHIF");
    expect(detail.department?.name).toBe("Informatik");
    expect(detail.students.map((s) => s.user_id).sort()).toEqual([7, 8]);
    expect(detail.students[0]).not.toHaveProperty("email");
    expect(detail.teachers.map((t) => t.user_id)).toEqual([3]);
    expect(detail.head_teacher).toBeNull();

    // the students moved: 5AHITM keeps the other three
    const old = (await call("get", "/api/classes/1", admin).expect(200))
      .body as { students: { user_id: number }[] };
    expect(old.students.map((s) => s.user_id).sort()).toEqual([4, 5, 6]);

    const list = (await call("get", "/api/classes", student).expect(200))
      .body as { class_id: number; student_count: number }[];
    expect(
      list.find((c) => c.class_id === created.class_id)?.student_count,
    ).toBe(2);

    // a teacher of another class may not change the membership (UC-20)
    await call("put", `/api/classes/${created.class_id}/students`, teacher, {
      student_ids: [4],
    }).expect(403);
    // the teacher of 5AHITM may change their own class
    await call("put", "/api/classes/1/teachers", teacher, {
      teacher_ids: [2, 3],
    }).expect(200);
    // and a student may change nothing
    await call("put", `/api/classes/${created.class_id}/teachers`, student, {
      teacher_ids: [2],
    }).expect(403);

    // review M36: a teacher of 5AHITM takes no student out of another class
    await call("put", "/api/classes/1/students", teacher, {
      student_ids: [4, 5, 6, 7],
    }).expect(403);

    // only users with a student or teacher profile can be assigned
    await call("put", `/api/classes/${created.class_id}/students`, admin, {
      student_ids: [1],
    }).expect(400);
  });

  it("lists the assignable students and teachers by name", async () => {
    const people = (
      await call("get", "/api/classes/assignable", teacher).expect(200)
    ).body as {
      students: { user_id: number; email?: string }[];
      teachers: { user_id: number }[];
    };
    expect(people.students.map((s) => s.user_id)).toEqual(
      expect.arrayContaining([4, 5, 6, 7, 8]),
    );
    expect(people.teachers.map((t) => t.user_id).sort()).toEqual([2, 3]);
    expect(people.students[0]).not.toHaveProperty("email");
    // review M36: not for students
    await call("get", "/api/classes/assignable", student).expect(403);
  });

  it("manages departments, subjects and rooms and refuses deleting one in use", async () => {
    const department = (
      await call("post", "/api/departments", admin, {
        name: "Elektronik",
      }).expect(201)
    ).body as { department_id: number };
    await call("patch", `/api/departments/${department.department_id}`, admin, {
      name: "Elektronik und Technische Informatik",
    }).expect(200);
    const departments = (
      await call("get", "/api/departments", student).expect(200)
    ).body as { name: string; class_count: number }[];
    expect(departments.map((d) => d.name)).toContain(
      "Elektronik und Technische Informatik",
    );
    await call(
      "delete",
      `/api/departments/${department.department_id}`,
      admin,
    ).expect(200);
    // Informatik still has 5AHITM
    await call("delete", "/api/departments/1", admin).expect(409);
    // review M36: the schedule of 5AHITM is in use too, and a name stays set
    await call("delete", "/api/schedules/1", admin).expect(409);
    await call("patch", "/api/departments/1", admin, { name: null }).expect(
      400,
    );

    const subject = (
      await call("post", "/api/subjects", admin, {
        name: "Physik",
        short_name: "PHY",
      }).expect(201)
    ).body as { subject_id: number; short_name: string };
    expect(subject.short_name).toBe("PHY");
    await call("delete", `/api/subjects/${subject.subject_id}`, admin).expect(
      200,
    );

    const room = (
      await call("post", "/api/rooms", admin, {
        name: "Physiksaal",
        capacity: 24,
      }).expect(201)
    ).body as { room_id: number };
    await call("get", `/api/rooms/${room.room_id}`, teacher).expect(200);
    // only manage_classes changes the school structure
    await call("post", "/api/rooms", teacher, { name: "X" }).expect(403);
    await call("delete", `/api/rooms/${room.room_id}`, admin).expect(200);
    await call("get", `/api/rooms/${room.room_id}`, admin).expect(404);
  });

  // M22 open item (1): a missing lesson slot is a 404, not a 500
  it("answers 404 for a missing lesson slot", async () => {
    await call("get", "/api/lesson-slots/9999", admin).expect(404);
    await call("patch", "/api/lesson-slots/9999", admin, {
      room_id: 1,
    }).expect(404);
    await call("delete", "/api/lesson-slots/9999", admin).expect(404);
  });
});
