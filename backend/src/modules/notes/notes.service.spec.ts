import { Test, TestingModule } from '@nestjs/testing';
import { NotesService } from './notes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('NotesService', () => {
  let service: NotesService;
  let prisma: any;

  const mockPrismaService = {
    notes: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    subjects: {
      findUnique: jest.fn(),
    },
    tasks: {
      findUnique: jest.fn(),
    },
    priorities: {
      findFirst: jest.fn(),
    },
  };


  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<NotesService>(NotesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a note with task_id and creator from JWT userId', async () => {
      prisma.tasks.findUnique.mockResolvedValue({ task_id: 5, title: 'Task A' });
      prisma.subjects.findUnique.mockResolvedValue({ subject_id: 3, name: 'Math' });
      prisma.priorities.findFirst.mockResolvedValue({ priority_id: 2, name: 'Normal' });
      prisma.notes.create.mockResolvedValue({
        note_id: 11,
        title: 'Sticky',
        description: 'Body',
        created_by: 7,
        task_id: 5,
        subject_id: 3,
        priorities: { priority_id: 2, name: 'Normal' },
      });

      const result = await service.create(
        { title: 'Sticky', description: 'Body', task_id: 5, subject_id: 3, priority: 'medium' },
        7,
      );

      expect(prisma.notes.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Sticky',
            description: 'Body',
            task_id: 5,
            subject_id: 3,
            created_by: 7,
            priority_id: 2,
          }),
        }),
      );
      expect(result).toEqual(expect.objectContaining({ note_id: 11, priority: 'medium' }));
    });

    it('should throw NotFoundException when task does not exist', async () => {
      prisma.tasks.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ title: 'Sticky', description: 'Body', task_id: 999 }, 1),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return note for owner', async () => {
      prisma.notes.findFirst.mockResolvedValue({
        note_id: 1,
        title: 'A',
        description: 'B',
        created_by: 5,
        priorities: { name: 'Hoch' },
      });

      const note = await service.findOne(1, 5);
      expect(note).toEqual(expect.objectContaining({ note_id: 1, priority: 'high' }));
    });

    it('should throw NotFoundException for non-owner', async () => {
      prisma.notes.findFirst.mockResolvedValue(null);
      await expect(service.findOne(1, 99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should query only notes of current creator', async () => {
      prisma.notes.findMany.mockResolvedValue([]);

      await service.findAll(42);

      expect(prisma.notes.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ created_by: 42 }),
        }),
      );
    });
  });

  describe('update/remove', () => {
    it('should update note when owner', async () => {
      prisma.notes.findFirst.mockResolvedValue({
        note_id: 1,
        created_by: 5,
        priorities: { name: 'Normal' },
      });
      prisma.priorities.findFirst.mockResolvedValue({ priority_id: 3, name: 'Wichtig' });
      prisma.notes.update.mockResolvedValue({
        note_id: 1,
        title: 'Updated',
        description: 'Updated Desc',
        created_by: 5,
        task_id: 7,
        priorities: { name: 'Wichtig' },
      });
      prisma.tasks.findUnique.mockResolvedValue({ task_id: 7 });

      const updated = await service.update(
        1,
        5,
        { title: 'Updated', description: 'Updated Desc', task_id: 7, priority: 'high' },
      );

      expect(prisma.notes.update).toHaveBeenCalled();
      expect(updated).toEqual(expect.objectContaining({ note_id: 1, priority: 'high' }));
    });

    it('should delete note when owner', async () => {
      prisma.notes.findFirst.mockResolvedValue({ note_id: 1, created_by: 5 });
      prisma.notes.delete.mockResolvedValue({ note_id: 1 });

      const res = await service.remove(1, 5);
      expect(prisma.notes.delete).toHaveBeenCalledWith({ where: { note_id: 1 } });
      expect(res).toEqual({ message: 'Note deleted successfully', note_id: 1 });
    });
  });
});
