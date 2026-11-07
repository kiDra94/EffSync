import { Test, TestingModule } from "@nestjs/testing";
import { TaskCommentsService } from "./task-comments.service";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { EmailService } from "../email/email.service";

describe("TaskCommentsService - @mention Email Notifications", () => {
  let service: TaskCommentsService;
  let prismaService: PrismaService;
  let emailService: EmailService;

  const mockPrismaService = {
    task_comments: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    users: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    tasks: {
      findUnique: jest.fn(),
    },
    email_preferences: {
      findUnique: jest.fn(),
    },
  };

  const mockEmailService = {
    sendMentionEmail: jest.fn().mockResolvedValue(undefined),
    sendDeadlineEmail: jest.fn().mockResolvedValue(undefined),
    sendCommentEmail: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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

    service = module.get<TaskCommentsService>(TaskCommentsService);
    prismaService = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);

    jest.clearAllMocks();
  });

  describe("detectMentions", () => {
    it("should detect single @mention", () => {
      const text = "Hey @john please review this";
      const mentions = service["detectMentions"](text);
      expect(mentions).toContain("john");
      expect(mentions.length).toBe(1);
    });

    it("should detect multiple @mentions", () => {
      const text = "@alice and @bob please check @charlie comment";
      const mentions = service["detectMentions"](text);
      expect(mentions).toContain("alice");
      expect(mentions).toContain("bob");
      expect(mentions).toContain("charlie");
      expect(mentions.length).toBe(3);
    });

    it("should remove duplicate mentions", () => {
      const text = "@john @john please check";
      const mentions = service["detectMentions"](text);
      expect(mentions).toEqual(["john"]);
    });

    it("should return empty array for no mentions", () => {
      const text = "This is a comment without any mentions";
      const mentions = service["detectMentions"](text);
      expect(mentions).toEqual([]);
    });

    it("should handle special characters and numbers", () => {
      const text = "@user_123 @john-doe please help";
      const mentions = service["detectMentions"](text);
      expect(mentions).toContain("user_123");
      expect(mentions.length).toBe(2);
    });
  });

  describe("notifyMentionedUsers", () => {
    it("should send email to mentioned user with email_on_mention enabled", async () => {
      const text = "Hey @alice please review";
      const commenterName = "bob";
      const taskTitle = "Code Review Task";
      const taskId = 1;
      const commenterUserId = 2;

      mockPrismaService.users.findFirst.mockResolvedValue({
        user_id: 1,
        email: "alice@example.com",
      });

      mockPrismaService.email_preferences.findUnique.mockResolvedValue({
        user_id: 1,
        email_on_mention: true,
        email_on_deadline: true,
        email_on_comment: false,
        email_digest: false,
        digest_frequency: "daily",
      });

      await service["notifyMentionedUsers"](
        text,
        commenterName,
        taskTitle,
        taskId,
        commenterUserId,
      );

      expect(mockPrismaService.users.findFirst).toHaveBeenCalledWith({
        where: { username: "alice" },
        select: { user_id: true, email: true },
      });

      expect(mockEmailService.sendMentionEmail).toHaveBeenCalledWith(
        1,
        "alice@example.com",
        "bob",
        "Code Review Task",
        "Hey @alice please review",
      );
    });

    it("should NOT send email if email_on_mention is disabled", async () => {
      const text = "Hey @alice please review";
      const commenterName = "bob";
      const taskTitle = "Code Review Task";
      const taskId = 1;
      const commenterUserId = 2;

      mockPrismaService.users.findFirst.mockResolvedValue({
        user_id: 1,
        email: "alice@example.com",
      });

      mockPrismaService.email_preferences.findUnique.mockResolvedValue({
        user_id: 1,
        email_on_mention: false,
        email_on_deadline: true,
        email_on_comment: false,
        email_digest: false,
        digest_frequency: "daily",
      });

      await service["notifyMentionedUsers"](
        text,
        commenterName,
        taskTitle,
        taskId,
        commenterUserId,
      );

      expect(mockEmailService.sendMentionEmail).not.toHaveBeenCalled();
    });

    it("should NOT send email to commenter themselves", async () => {
      const text = "Hey @bob please review";
      const commenterName = "bob";
      const taskTitle = "Code Review Task";
      const taskId = 1;
      const commenterUserId = 1; // Same as mentioned user

      mockPrismaService.users.findFirst.mockResolvedValue({
        user_id: 1,
        email: "bob@example.com",
      });

      await service["notifyMentionedUsers"](
        text,
        commenterName,
        taskTitle,
        taskId,
        commenterUserId,
      );

      expect(mockEmailService.sendMentionEmail).not.toHaveBeenCalled();
    });

    it("should send emails to multiple mentioned users", async () => {
      const text = "@alice and @bob please review";
      const commenterName = "charlie";
      const taskTitle = "Code Review Task";
      const taskId = 1;
      const commenterUserId = 3;

      mockPrismaService.users.findFirst
        .mockResolvedValueOnce({
          user_id: 1,
          email: "alice@example.com",
        })
        .mockResolvedValueOnce({
          user_id: 2,
          email: "bob@example.com",
        });

      mockPrismaService.email_preferences.findUnique
        .mockResolvedValueOnce({
          user_id: 1,
          email_on_mention: true,
        })
        .mockResolvedValueOnce({
          user_id: 2,
          email_on_mention: true,
        });

      await service["notifyMentionedUsers"](
        text,
        commenterName,
        taskTitle,
        taskId,
        commenterUserId,
      );

      expect(mockEmailService.sendMentionEmail).toHaveBeenCalledTimes(2);
      expect(mockEmailService.sendMentionEmail).toHaveBeenNthCalledWith(
        1,
        1,
        "alice@example.com",
        "charlie",
        "Code Review Task",
        "@alice and @bob please review",
      );
      expect(mockEmailService.sendMentionEmail).toHaveBeenNthCalledWith(
        2,
        2,
        "bob@example.com",
        "charlie",
        "Code Review Task",
        "@alice and @bob please review",
      );
    });
  });

  describe("create with @mention notifications", () => {
    it("should create comment and send mention emails", async () => {
      const createCommentDto = {
        task_id: 1,
        text: "@alice please review this code",
        user_id: 2,
      };

      const newComment = {
        comment_id: 1,
        task_id: 1,
        user_id: 2,
        text: "@alice please review this code",
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrismaService.task_comments.create.mockResolvedValue(newComment);

      mockPrismaService.users.findUnique
        .mockResolvedValueOnce({
          user_id: 2,
          username: "bob",
        })
        .mockResolvedValueOnce({
          user_id: 1,
          email: "alice@example.com",
        });

      mockPrismaService.tasks.findUnique.mockResolvedValue({
        task_id: 1,
        title: "Code Review",
      });

      mockPrismaService.email_preferences.findUnique.mockResolvedValue({
        user_id: 1,
        email_on_mention: true,
      });

      const result = await service.create(createCommentDto);

      expect(result).toEqual(newComment);
      expect(mockPrismaService.task_comments.create).toHaveBeenCalledWith({
        data: {
          task_id: 1,
          user_id: 2,
          text: "@alice please review this code",
        },
      });

      expect(mockEmailService.sendMentionEmail).toHaveBeenCalled();
    });

    it("should create comment even if mention notification fails", async () => {
      const createCommentDto = {
        task_id: 1,
        text: "@alice please review",
        user_id: 2,
      };

      const newComment = {
        comment_id: 1,
        task_id: 1,
        user_id: 2,
        text: "@alice please review",
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrismaService.task_comments.create.mockResolvedValue(newComment);
      mockPrismaService.users.findUnique.mockRejectedValue(
        new Error("Database error"),
      );

      const result = await service.create(createCommentDto);

      expect(result).toEqual(newComment);
      // Comment creation should succeed even if mention notification fails
    });
  });

  describe("findAll", () => {
    it("should return all comments with user info", async () => {
      const comments = [
        {
          comment_id: 1,
          task_id: 1,
          user_id: 1,
          text: "First comment",
          created_at: new Date(),
          updated_at: new Date(),
          users: {
            username: "alice",
            firstname: "Alice",
            lastname: "Smith",
          },
        },
      ];

      mockPrismaService.task_comments.findMany.mockResolvedValue(comments);

      const result = await service.findAll();

      expect(result).toEqual(comments);
      expect(mockPrismaService.task_comments.findMany).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return a single comment", async () => {
      const comment = {
        comment_id: 1,
        task_id: 1,
        user_id: 1,
        text: "Test comment",
        created_at: new Date(),
        updated_at: new Date(),
        users: { username: "alice" },
      };

      mockPrismaService.task_comments.findUnique.mockResolvedValue(comment);

      const result = await service.findOne(1);

      expect(result).toEqual(comment);
    });
  });
});
