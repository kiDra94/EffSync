import { createDocumentServices } from "./documents.fixtures";

// Grading and completing tasks end to end on a Prisma mock (DocumentsService until M19)
describe("grading use cases", () => {
  const mockPrismaService = {
    $transaction: jest.fn(),
    documents: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    user_roles: {
      findMany: jest.fn(),
    },
    task_documents: {
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    tasks: {
      findUnique: jest.fn(),
      // M17: grading loads the linked tasks in one query
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      // M17: the completion from grades completes a batch of tasks
      updateMany: jest.fn(),
    },
    task_members: {
      findMany: jest.fn(),
    },
    users: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    note_documents: {
      deleteMany: jest.fn(),
    },
    document_shares: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
  };

  mockPrismaService.$transaction.mockImplementation(
    (callback: (tx: unknown) => unknown) =>
      Promise.resolve(callback(mockPrismaService)),
  );

  const mockNotificationsService = {
    create: jest.fn(),
  };

  let grading: ReturnType<typeof createDocumentServices>["grading"];

  beforeEach(() => {
    jest.clearAllMocks();
    ({ grading } = createDocumentServices(
      mockPrismaService,
      mockNotificationsService,
    ));
  });

  it("sends a notification when a teacher grades a student document", async () => {
    mockPrismaService.task_documents.findMany.mockResolvedValue([]);
    mockPrismaService.tasks.findUnique.mockResolvedValue(null);
    mockPrismaService.task_members.findMany.mockResolvedValue([]);
    mockPrismaService.users.findMany.mockResolvedValue([]);

    mockPrismaService.documents.findUnique
      .mockResolvedValueOnce({
        document_id: 9,
        name: "abgabe.pdf",
        added_by: 21,
        users: {
          user_id: 21,
          firstname: "Lisa",
          lastname: "Schüler",
          username: "lisa",
          user_roles: [{ roles: { name: "Student" } }],
        },
        graded_by_user: null,
      })
      .mockResolvedValueOnce({
        document_id: 9,
        name: "abgabe.pdf",
        added_by: 21,
        grade: "1",
        feedback: "Sehr gut",
        users: {
          user_id: 21,
          firstname: "Lisa",
          lastname: "Schüler",
          username: "lisa",
          user_roles: [{ roles: { name: "Student" } }],
        },
        graded_by_user: {
          user_id: 4,
          firstname: "Anna",
          lastname: "Lehrer",
          username: "anna",
        },
      });
    mockPrismaService.documents.update.mockResolvedValue({ document_id: 9 });

    const result = await grading.grade(
      9,
      { grade: "1", feedback: "Sehr gut" },
      4,
      "teacher",
    );

    expect(mockPrismaService.documents.update).toHaveBeenCalled();
    expect(mockNotificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 21,
        type: "document_graded",
      }),
    );
    expect(result.permissions.can_grade).toBe(true);
  });

  it("marks task as COMPLETED when all student participants are graded", async () => {
    mockPrismaService.documents.findUnique
      .mockResolvedValueOnce({
        document_id: 19,
        name: "abgabe-2.pdf",
        added_by: 22,
        users: {
          user_id: 22,
          firstname: "Tom",
          lastname: "Schüler",
          username: "tom",
          students: { student_id: 22 },
          user_roles: [{ roles: { name: "Student" } }],
        },
        graded_by_user: null,
        task_documents: [
          { task_id: 77, tasks: { task_id: 77, created_by: 4 } },
        ],
      })
      .mockResolvedValueOnce({
        document_id: 19,
        name: "abgabe-2.pdf",
        added_by: 22,
        grade: "2",
        feedback: "Passt",
        users: {
          user_id: 22,
          firstname: "Tom",
          lastname: "Schüler",
          username: "tom",
          students: { student_id: 22 },
          user_roles: [{ roles: { name: "Student" } }],
        },
        graded_by_user: {
          user_id: 4,
          firstname: "Anna",
          lastname: "Lehrer",
          username: "anna",
        },
        task_documents: [
          { task_id: 77, tasks: { task_id: 77, created_by: 4 } },
        ],
      });

    mockPrismaService.documents.update.mockResolvedValue({ document_id: 19 });
    mockPrismaService.tasks.findMany.mockResolvedValue([
      {
        task_id: 77,
        status: "IN_PROGRESS",
        assigned_to: 21,
      },
    ]);
    mockPrismaService.task_members.findMany.mockResolvedValue([
      { task_id: 77, user_id: 22 },
    ]);
    mockPrismaService.users.findMany.mockResolvedValue([
      {
        user_id: 21,
        students: { student_id: 21 },
        user_roles: [{ roles: { name: "Student" } }],
      },
      {
        user_id: 22,
        students: { student_id: 22 },
        user_roles: [{ roles: { name: "Student" } }],
      },
    ]);
    mockPrismaService.documents.findMany.mockResolvedValue([
      { added_by: 21, task_documents: [{ task_id: 77 }] },
      { added_by: 22, task_documents: [{ task_id: 77 }] },
    ]);

    await grading.grade(19, { grade: "2", feedback: "Passt" }, 4, "teacher");

    expect(mockPrismaService.tasks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { task_id: { in: [77] } },
        data: expect.objectContaining({
          status: "COMPLETED",
          progress: 100,
        }) as unknown,
      }),
    );
  });

  it("does not mark task as COMPLETED when at least one participant is not graded", async () => {
    mockPrismaService.documents.findUnique
      .mockResolvedValueOnce({
        document_id: 20,
        name: "abgabe-1.pdf",
        added_by: 21,
        users: {
          user_id: 21,
          firstname: "Lisa",
          lastname: "Schüler",
          username: "lisa",
          students: { student_id: 21 },
          user_roles: [{ roles: { name: "Student" } }],
        },
        graded_by_user: null,
        task_documents: [
          { task_id: 88, tasks: { task_id: 88, created_by: 4 } },
        ],
      })
      .mockResolvedValueOnce({
        document_id: 20,
        name: "abgabe-1.pdf",
        added_by: 21,
        grade: "3",
        feedback: "ok",
        users: {
          user_id: 21,
          firstname: "Lisa",
          lastname: "Schüler",
          username: "lisa",
          students: { student_id: 21 },
          user_roles: [{ roles: { name: "Student" } }],
        },
        graded_by_user: {
          user_id: 4,
          firstname: "Anna",
          lastname: "Lehrer",
          username: "anna",
        },
        task_documents: [
          { task_id: 88, tasks: { task_id: 88, created_by: 4 } },
        ],
      });

    mockPrismaService.documents.update.mockResolvedValue({ document_id: 20 });
    mockPrismaService.tasks.findMany.mockResolvedValue([
      {
        task_id: 88,
        status: "IN_PROGRESS",
        assigned_to: 21,
      },
    ]);
    mockPrismaService.task_members.findMany.mockResolvedValue([
      { task_id: 88, user_id: 22 },
    ]);
    mockPrismaService.users.findMany.mockResolvedValue([
      {
        user_id: 21,
        students: { student_id: 21 },
        user_roles: [{ roles: { name: "Student" } }],
      },
      {
        user_id: 22,
        students: { student_id: 22 },
        user_roles: [{ roles: { name: "Student" } }],
      },
    ]);
    mockPrismaService.documents.findMany.mockResolvedValue([
      { added_by: 21, task_documents: [{ task_id: 88 }] },
    ]);

    await grading.grade(20, { grade: "3", feedback: "ok" }, 4, "teacher");

    expect(mockPrismaService.tasks.updateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: { task_id: { in: [88] } },
        data: expect.objectContaining({ status: "COMPLETED" }) as unknown,
      }),
    );
  });

  it("does not complete task if student creator has no graded submission yet", async () => {
    mockPrismaService.documents.findUnique
      .mockResolvedValueOnce({
        document_id: 30,
        name: "abgabe-assigned.pdf",
        added_by: 22,
        users: {
          user_id: 22,
          firstname: "Tom",
          lastname: "Schüler",
          username: "tom",
          students: { student_id: 22 },
          user_roles: [{ roles: { name: "Student" } }],
        },
        graded_by_user: null,
        task_documents: [
          { task_id: 99, tasks: { task_id: 99, created_by: 21 } },
        ],
      })
      .mockResolvedValueOnce({
        document_id: 30,
        name: "abgabe-assigned.pdf",
        added_by: 22,
        grade: "2",
        feedback: "gut",
        users: {
          user_id: 22,
          firstname: "Tom",
          lastname: "Schüler",
          username: "tom",
          students: { student_id: 22 },
          user_roles: [{ roles: { name: "Student" } }],
        },
        graded_by_user: {
          user_id: 4,
          firstname: "Anna",
          lastname: "Lehrer",
          username: "anna",
        },
        task_documents: [
          { task_id: 99, tasks: { task_id: 99, created_by: 21 } },
        ],
      });

    mockPrismaService.documents.update.mockResolvedValue({ document_id: 30 });
    mockPrismaService.tasks.findMany.mockResolvedValue([
      {
        task_id: 99,
        status: "IN_PROGRESS",
        created_by: 21,
        assigned_to: 22,
      },
    ]);
    mockPrismaService.task_members.findMany.mockResolvedValue([]);
    mockPrismaService.users.findMany.mockResolvedValue([
      {
        user_id: 21,
        students: { student_id: 21 },
        user_roles: [{ roles: { name: "Student" } }],
      },
      {
        user_id: 22,
        students: { student_id: 22 },
        user_roles: [{ roles: { name: "Student" } }],
      },
    ]);
    // Only the assigned student is graded, the creator (21) isn't yet
    mockPrismaService.documents.findMany.mockResolvedValue([
      { added_by: 22, task_documents: [{ task_id: 99 }] },
    ]);

    await grading.grade(30, { grade: "2", feedback: "gut" }, 4, "teacher");

    expect(mockPrismaService.tasks.updateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: { task_id: { in: [99] } },
        data: expect.objectContaining({ status: "COMPLETED" }) as unknown,
      }),
    );
  });
});
