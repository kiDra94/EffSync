import { createDocumentServices } from "./documents.fixtures";

// Uploading, renaming, deleting and downloading end to end on a Prisma mock (DocumentsService until M19)
describe("uploads use cases", () => {
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

  let uploads: ReturnType<typeof createDocumentServices>["uploads"];
  let queries: ReturnType<typeof createDocumentServices>["queries"];

  beforeEach(() => {
    jest.clearAllMocks();
    ({ uploads, queries } = createDocumentServices(
      mockPrismaService,
      mockNotificationsService,
    ));
  });

  it("notifies teachers when a student uploads a document", async () => {
    const file = {
      originalname: "abgabe.pdf",
      buffer: Buffer.from("pdf data"),
      size: 8,
      mimetype: "application/pdf",
    } as Express.Multer.File;

    mockPrismaService.documents.create.mockResolvedValue({ document_id: 12 });
    mockPrismaService.documents.findUnique.mockResolvedValue({
      document_id: 12,
      name: "abgabe.pdf",
      file_path: null,
      file_size: 8,
      mime_type: "application/pdf",
      added_by: 15,
      created_at: new Date().toISOString(),
      users: {
        user_id: 15,
        firstname: "Max",
        lastname: "Schüler",
        username: "max",
        students: { student_id: 15 },
        user_roles: [{ roles: { name: "Student" } }],
      },
      graded_by_user: null,
      task_documents: [],
    });
    mockPrismaService.user_roles.findMany.mockResolvedValue([
      { user_id: 2 },
      { user_id: 3 },
    ]);

    await uploads.create(file, 15, "application/pdf", "student");

    expect(mockNotificationsService.create).toHaveBeenCalledTimes(2);
    expect(mockNotificationsService.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        user_id: 2,
        type: "document_uploaded",
      }),
    );
    expect(mockNotificationsService.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        user_id: 3,
        type: "document_uploaded",
      }),
    );
  });

  it("allows a student to rename their own document", async () => {
    mockPrismaService.documents.findUnique.mockResolvedValue({
      document_id: 7,
      name: "alt.pdf",
      added_by: 15,
      users: {
        user_id: 15,
        firstname: "Max",
        lastname: "Mustermann",
        username: "max",
        user_roles: [{ roles: { name: "Student" } }],
      },
      graded_by_user: null,
    });
    mockPrismaService.documents.update.mockResolvedValue({ document_id: 7 });

    const result = await uploads.update(7, { name: "neu.pdf" }, 15, "student");

    expect(mockPrismaService.documents.update).toHaveBeenCalledWith({
      where: { document_id: 7 },
      data: { name: "neu.pdf" },
    });
    expect(result.permissions.can_edit).toBe(true);
  });

  it("allows a student to delete own linked document without FK errors", async () => {
    mockPrismaService.documents.findUnique.mockReset();
    mockPrismaService.documents.findUnique.mockResolvedValue({
      document_id: 11,
      name: "abgabe.pdf",
      file_path: null,
      added_by: 15,
      users: {
        user_id: 15,
        firstname: "Max",
        lastname: "Schüler",
        username: "max",
        students: { student_id: 15 },
        user_roles: [{ roles: { name: "Student" } }],
      },
      graded_by_user: null,
      task_documents: [{ task_id: 77 }],
    });

    const result = await uploads.remove("11", 15, "student");

    expect(mockPrismaService.document_shares.deleteMany).toHaveBeenCalledWith({
      where: { document_id: 11 },
    });
    expect(mockPrismaService.note_documents.deleteMany).toHaveBeenCalledWith({
      where: { document_id: 11 },
    });
    expect(mockPrismaService.task_documents.deleteMany).toHaveBeenCalledWith({
      where: { document_id: 11 },
    });
    expect(mockPrismaService.documents.delete).toHaveBeenCalledWith({
      where: { document_id: 11 },
    });
    expect(result).toEqual({
      message: "Dokument erfolgreich gelöscht",
      document_id: 11,
    });
  });

  it("returns a valid binary stream for blob downloads", async () => {
    const sampleBytes = Uint8Array.from([0x25, 0x50, 0x44, 0x46]); // %PDF

    mockPrismaService.documents.findUnique.mockResolvedValue({
      document_id: 42,
      name: "probe.pdf",
      mime_type: "application/pdf",
      file_blob: sampleBytes,
      added_by: 21,
      users: {
        user_id: 21,
        firstname: "Lisa",
        lastname: "Schüler",
        username: "lisa",
        user_roles: [{ roles: { name: "Student" } }],
      },
      graded_by_user: null,
      task_documents: [],
    });

    const payload = await queries.getDownloadPayload(42, 4, "teacher");
    const chunks: Buffer[] = [];

    for await (const chunk of payload.stream as AsyncIterable<
      Buffer | string
    >) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    expect(payload.fileName).toBe("probe.pdf");
    expect(payload.mimeType).toBe("application/pdf");
    expect(Buffer.concat(chunks)).toEqual(Buffer.from(sampleBytes));
  });

  it("rejects upload when detected file content does not match extension", async () => {
    const fakePng = {
      originalname: "bild.png",
      buffer: Buffer.from("%PDF-1.4 test content", "utf8"),
      size: 24,
      mimetype: "image/png",
    } as Express.Multer.File;

    await expect(
      uploads.create(fakePng, 15, "image/png", "student"),
    ).rejects.toThrow("Dateiinhalt passt nicht zur Endung (.png)");

    expect(mockPrismaService.documents.create).not.toHaveBeenCalled();
  });

  it("sanitizes uploaded file names before persisting", async () => {
    const file = {
      originalname: "../../boese<script>.pdf",
      buffer: Buffer.from("pdf data"),
      size: 8,
      mimetype: "application/pdf",
    } as Express.Multer.File;

    mockPrismaService.documents.create.mockResolvedValue({ document_id: 99 });
    mockPrismaService.documents.findUnique.mockResolvedValue({
      document_id: 99,
      name: "boese_script_.pdf",
      file_path: null,
      file_size: 8,
      mime_type: "application/pdf",
      added_by: 15,
      created_at: new Date().toISOString(),
      users: {
        user_id: 15,
        firstname: "Max",
        lastname: "Schüler",
        username: "max",
        students: { student_id: 15 },
        user_roles: [{ roles: { name: "Student" } }],
      },
      graded_by_user: null,
      task_documents: [],
    });
    mockPrismaService.user_roles.findMany.mockResolvedValue([]);

    await uploads.create(file, 15, "application/pdf", "student");

    expect(mockPrismaService.documents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "boese_script_.pdf",
        }) as unknown,
      }),
    );
  });
});
