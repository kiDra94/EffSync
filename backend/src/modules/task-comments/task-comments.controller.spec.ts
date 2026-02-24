import { Test, TestingModule } from '@nestjs/testing';
import { TaskCommentsService } from './task-comments.service';
import { TaskCommentsController } from './task-comments.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';

describe('TaskCommentsController', () => {
  let controller: TaskCommentsController;

  const mockPrismaService = {
    task_comments: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };
  const mockEmailService = { sendMentionEmail: jest.fn(), sendEmail: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskCommentsController],
      providers: [
        TaskCommentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    controller = module.get<TaskCommentsController>(TaskCommentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
