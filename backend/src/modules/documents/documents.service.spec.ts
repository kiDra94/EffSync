import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('DocumentsService', () => {
  let service: DocumentsService;

  const mockPrismaService = {
    $transaction: jest.fn(async (callback) => callback(mockPrismaService)),
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
      update: jest.fn(),
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

  const mockNotificationsService = {
    create: jest.fn(),
  };


  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('notifies teachers when a student uploads a document', async () => {
    const file = {
      originalname: 'abgabe.pdf',
      buffer: Buffer.from('pdf data'),
      size: 8,
      mimetype: 'application/pdf',
    } as Express.Multer.File;

    mockPrismaService.documents.create.mockResolvedValue({ document_id: 12 });
    mockPrismaService.documents.findUnique.mockResolvedValue({
      document_id: 12,
      name: 'abgabe.pdf',
      file_path: null,
      file_size: 8,
      mime_type: 'application/pdf',
      added_by: 15,
      created_at: new Date().toISOString(),
      users: {
        user_id: 15,
        firstname: 'Max',
        lastname: 'Schüler',
        username: 'max',
        students: { student_id: 15 },
        user_roles: [{ roles: { name: 'Student' } }],
      },
      graded_by_user: null,
      task_documents: [],
    });
    mockPrismaService.user_roles.findMany.mockResolvedValue([
      { user_id: 2 },
      { user_id: 3 },
    ]);

    await service.create(file, 15, 'application/pdf', 'student');

    expect(mockNotificationsService.create).toHaveBeenCalledTimes(2);
    expect(mockNotificationsService.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        user_id: 2,
        type: 'document_uploaded',
      }),
    );
    expect(mockNotificationsService.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        user_id: 3,
        type: 'document_uploaded',
      }),
    );
  });

  it('allows a student to rename their own document', async () => {
    mockPrismaService.documents.findUnique.mockResolvedValue({
      document_id: 7,
      name: 'alt.pdf',
      added_by: 15,
      users: {
        user_id: 15,
        firstname: 'Max',
        lastname: 'Mustermann',
        username: 'max',
        user_roles: [{ roles: { name: 'Student' } }],
      },
      graded_by_user: null,
    });
    mockPrismaService.documents.update.mockResolvedValue({ document_id: 7 });

    const result = await service.update(7, { name: 'neu.pdf' }, 15, 'student');

    expect(mockPrismaService.documents.update).toHaveBeenCalledWith({
      where: { document_id: 7 },
      data: { name: 'neu.pdf' },
    });
    expect(result.permissions.can_edit).toBe(true);
  });

  it('sends a notification when a teacher grades a student document', async () => {
    mockPrismaService.task_documents.findMany.mockResolvedValue([]);
    mockPrismaService.tasks.findUnique.mockResolvedValue(null);
    mockPrismaService.task_members.findMany.mockResolvedValue([]);
    mockPrismaService.users.findMany.mockResolvedValue([]);

    mockPrismaService.documents.findUnique
      .mockResolvedValueOnce({
        document_id: 9,
        name: 'abgabe.pdf',
        added_by: 21,
        users: {
          user_id: 21,
          firstname: 'Lisa',
          lastname: 'Schüler',
          username: 'lisa',
          user_roles: [{ roles: { name: 'Student' } }],
        },
        graded_by_user: null,
      })
      .mockResolvedValueOnce({
        document_id: 9,
        name: 'abgabe.pdf',
        added_by: 21,
        grade: '1',
        feedback: 'Sehr gut',
        users: {
          user_id: 21,
          firstname: 'Lisa',
          lastname: 'Schüler',
          username: 'lisa',
          user_roles: [{ roles: { name: 'Student' } }],
        },
        graded_by_user: {
          user_id: 4,
          firstname: 'Anna',
          lastname: 'Lehrer',
          username: 'anna',
        },
      });
    mockPrismaService.documents.update.mockResolvedValue({ document_id: 9 });

    const result = await service.grade(9, { grade: '1', feedback: 'Sehr gut' }, 4, 'teacher');

    expect(mockPrismaService.documents.update).toHaveBeenCalled();
    expect(mockNotificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 21,
        type: 'document_graded',
      }),
    );
    expect(result.permissions.can_grade).toBe(true);
  });

  it('marks task as COMPLETED when all student participants are graded', async () => {
    mockPrismaService.documents.findUnique
      .mockResolvedValueOnce({
        document_id: 19,
        name: 'abgabe-2.pdf',
        added_by: 22,
        users: {
          user_id: 22,
          firstname: 'Tom',
          lastname: 'Schüler',
          username: 'tom',
          students: { student_id: 22 },
          user_roles: [{ roles: { name: 'Student' } }],
        },
        graded_by_user: null,
        task_documents: [{ task_id: 77, tasks: { task_id: 77, created_by: 4 } }],
      })
      .mockResolvedValueOnce({
        document_id: 19,
        name: 'abgabe-2.pdf',
        added_by: 22,
        grade: '2',
        feedback: 'Passt',
        users: {
          user_id: 22,
          firstname: 'Tom',
          lastname: 'Schüler',
          username: 'tom',
          students: { student_id: 22 },
          user_roles: [{ roles: { name: 'Student' } }],
        },
        graded_by_user: {
          user_id: 4,
          firstname: 'Anna',
          lastname: 'Lehrer',
          username: 'anna',
        },
        task_documents: [{ task_id: 77, tasks: { task_id: 77, created_by: 4 } }],
      });

    mockPrismaService.documents.update.mockResolvedValue({ document_id: 19 });
    mockPrismaService.tasks.findUnique.mockResolvedValue({
      task_id: 77,
      status: 'IN_PROGRESS',
      assigned_to: 21,
    });
    mockPrismaService.task_members.findMany.mockResolvedValue([{ user_id: 22 }]);
    mockPrismaService.users.findMany.mockResolvedValue([
      {
        user_id: 21,
        students: { student_id: 21 },
        user_roles: [{ roles: { name: 'Student' } }],
      },
      {
        user_id: 22,
        students: { student_id: 22 },
        user_roles: [{ roles: { name: 'Student' } }],
      },
    ]);
    mockPrismaService.documents.findMany.mockResolvedValue([
      { added_by: 21 },
      { added_by: 22 },
    ]);

    await service.grade(19, { grade: '2', feedback: 'Passt' }, 4, 'teacher');

    expect(mockPrismaService.tasks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { task_id: 77 },
        data: expect.objectContaining({
          status: 'COMPLETED',
          progress: 100,
        }),
      }),
    );
  });

  it('does not mark task as COMPLETED when at least one participant is not graded', async () => {
    mockPrismaService.documents.findUnique
      .mockResolvedValueOnce({
        document_id: 20,
        name: 'abgabe-1.pdf',
        added_by: 21,
        users: {
          user_id: 21,
          firstname: 'Lisa',
          lastname: 'Schüler',
          username: 'lisa',
          students: { student_id: 21 },
          user_roles: [{ roles: { name: 'Student' } }],
        },
        graded_by_user: null,
        task_documents: [{ task_id: 88, tasks: { task_id: 88, created_by: 4 } }],
      })
      .mockResolvedValueOnce({
        document_id: 20,
        name: 'abgabe-1.pdf',
        added_by: 21,
        grade: '3',
        feedback: 'ok',
        users: {
          user_id: 21,
          firstname: 'Lisa',
          lastname: 'Schüler',
          username: 'lisa',
          students: { student_id: 21 },
          user_roles: [{ roles: { name: 'Student' } }],
        },
        graded_by_user: {
          user_id: 4,
          firstname: 'Anna',
          lastname: 'Lehrer',
          username: 'anna',
        },
        task_documents: [{ task_id: 88, tasks: { task_id: 88, created_by: 4 } }],
      });

    mockPrismaService.documents.update.mockResolvedValue({ document_id: 20 });
    mockPrismaService.tasks.findUnique.mockResolvedValue({
      task_id: 88,
      status: 'IN_PROGRESS',
      assigned_to: 21,
    });
    mockPrismaService.task_members.findMany.mockResolvedValue([{ user_id: 22 }]);
    mockPrismaService.users.findMany.mockResolvedValue([
      {
        user_id: 21,
        students: { student_id: 21 },
        user_roles: [{ roles: { name: 'Student' } }],
      },
      {
        user_id: 22,
        students: { student_id: 22 },
        user_roles: [{ roles: { name: 'Student' } }],
      },
    ]);
    mockPrismaService.documents.findMany.mockResolvedValue([{ added_by: 21 }]);

    await service.grade(20, { grade: '3', feedback: 'ok' }, 4, 'teacher');

    expect(mockPrismaService.tasks.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: { task_id: 88 },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }),
    );
  });

  it('does not complete task if student creator has no graded submission yet', async () => {
    mockPrismaService.documents.findUnique
      .mockResolvedValueOnce({
        document_id: 30,
        name: 'abgabe-assigned.pdf',
        added_by: 22,
        users: {
          user_id: 22,
          firstname: 'Tom',
          lastname: 'Schüler',
          username: 'tom',
          students: { student_id: 22 },
          user_roles: [{ roles: { name: 'Student' } }],
        },
        graded_by_user: null,
        task_documents: [{ task_id: 99, tasks: { task_id: 99, created_by: 21 } }],
      })
      .mockResolvedValueOnce({
        document_id: 30,
        name: 'abgabe-assigned.pdf',
        added_by: 22,
        grade: '2',
        feedback: 'gut',
        users: {
          user_id: 22,
          firstname: 'Tom',
          lastname: 'Schüler',
          username: 'tom',
          students: { student_id: 22 },
          user_roles: [{ roles: { name: 'Student' } }],
        },
        graded_by_user: {
          user_id: 4,
          firstname: 'Anna',
          lastname: 'Lehrer',
          username: 'anna',
        },
        task_documents: [{ task_id: 99, tasks: { task_id: 99, created_by: 21 } }],
      });

    mockPrismaService.documents.update.mockResolvedValue({ document_id: 30 });
    mockPrismaService.tasks.findUnique.mockResolvedValue({
      task_id: 99,
      status: 'IN_PROGRESS',
      created_by: 21,
      assigned_to: 22,
    });
    mockPrismaService.task_members.findMany.mockResolvedValue([]);
    mockPrismaService.users.findMany.mockResolvedValue([
      {
        user_id: 21,
        students: { student_id: 21 },
        user_roles: [{ roles: { name: 'Student' } }],
      },
      {
        user_id: 22,
        students: { student_id: 22 },
        user_roles: [{ roles: { name: 'Student' } }],
      },
    ]);
    // Nur assigned student ist bewertet, creator (21) noch nicht
    mockPrismaService.documents.findMany.mockResolvedValue([{ added_by: 22 }]);

    await service.grade(30, { grade: '2', feedback: 'gut' }, 4, 'teacher');

    expect(mockPrismaService.tasks.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: { task_id: 99 },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }),
    );
  });

  it('allows a student to delete own linked document without FK errors', async () => {
    mockPrismaService.documents.findUnique.mockReset();
    mockPrismaService.documents.findUnique.mockResolvedValue({
      document_id: 11,
      name: 'abgabe.pdf',
      file_path: null,
      added_by: 15,
      users: {
        user_id: 15,
        firstname: 'Max',
        lastname: 'Schüler',
        username: 'max',
        students: { student_id: 15 },
        user_roles: [{ roles: { name: 'Student' } }],
      },
      graded_by_user: null,
      task_documents: [{ task_id: 77 }],
    });

    const result = await service.remove('11', 15, 'student');

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
      message: 'Dokument erfolgreich gelöscht',
      document_id: 11,
    });
  });

  it('returns a valid binary stream for blob downloads', async () => {
    const sampleBytes = Uint8Array.from([0x25, 0x50, 0x44, 0x46]); // %PDF

    mockPrismaService.documents.findUnique.mockResolvedValue({
      document_id: 42,
      name: 'probe.pdf',
      mime_type: 'application/pdf',
      file_blob: sampleBytes,
      added_by: 21,
      users: {
        user_id: 21,
        firstname: 'Lisa',
        lastname: 'Schüler',
        username: 'lisa',
        user_roles: [{ roles: { name: 'Student' } }],
      },
      graded_by_user: null,
      task_documents: [],
    });

    const payload = await service.getDownloadPayload(42, 4, 'teacher');
    const chunks: Buffer[] = [];

    for await (const chunk of payload.stream as any) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    expect(payload.fileName).toBe('probe.pdf');
    expect(payload.mimeType).toBe('application/pdf');
    expect(Buffer.concat(chunks)).toEqual(Buffer.from(sampleBytes));
  });

  it('rejects upload when detected file content does not match extension', async () => {
    const fakePng = {
      originalname: 'bild.png',
      buffer: Buffer.from('%PDF-1.4 test content', 'utf8'),
      size: 24,
      mimetype: 'image/png',
    } as Express.Multer.File;

    await expect(
      service.create(fakePng, 15, 'image/png', 'student'),
    ).rejects.toThrow('Dateiinhalt passt nicht zur Endung (.png)');

    expect(mockPrismaService.documents.create).not.toHaveBeenCalled();
  });

  it('sanitizes uploaded file names before persisting', async () => {
    const file = {
      originalname: '../../boese<script>.pdf',
      buffer: Buffer.from('pdf data'),
      size: 8,
      mimetype: 'application/pdf',
    } as Express.Multer.File;

    mockPrismaService.documents.create.mockResolvedValue({ document_id: 99 });
    mockPrismaService.documents.findUnique.mockResolvedValue({
      document_id: 99,
      name: 'boese_script_.pdf',
      file_path: null,
      file_size: 8,
      mime_type: 'application/pdf',
      added_by: 15,
      created_at: new Date().toISOString(),
      users: {
        user_id: 15,
        firstname: 'Max',
        lastname: 'Schüler',
        username: 'max',
        students: { student_id: 15 },
        user_roles: [{ roles: { name: 'Student' } }],
      },
      graded_by_user: null,
      task_documents: [],
    });
    mockPrismaService.user_roles.findMany.mockResolvedValue([]);

    await service.create(file, 15, 'application/pdf', 'student');

    expect(mockPrismaService.documents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'boese_script_.pdf',
        }),
      }),
    );
  });
});
