import { Test, TestingModule } from '@nestjs/testing';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';
import { PrismaService } from '../../prisma/prisma.service';

describe('NotesController', () => {
  let controller: NotesController;

  const mockPrismaService = {
    notes: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };


  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotesController],
      providers: [
        NotesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<NotesController>(NotesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
