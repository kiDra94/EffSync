import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { PrismaUnitOfWork } from "../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { PrismaCommentRepository } from "../infrastructure/persistence/prisma-comment.repository";
import { CommentsService } from "./comments.service";
import { CommentRepository } from "./ports/comment.repository";
import { MentionMailer } from "./ports/mention-mailer";
import { TaskVisibilityService } from "./task-visibility.service";

// The @mention tests of task-comments.service.spec.ts (T09), against the
// comment use case on the `comments` table (M15, decision Q16)
describe("CommentsService - @mention Email Notifications", () => {
  let service: CommentsService;

  const mockPrismaService = {
    comments: {
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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        PrismaUnitOfWork,
        { provide: CommentRepository, useClass: PrismaCommentRepository },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MentionMailer, useValue: mockEmailService },
        // the visibility rule has its own tests (task.service.spec.ts)
        {
          provide: TaskVisibilityService,
          useValue: { assertVisible: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);

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
      const newComment = {
        comment_id: 1,
        task_id: 1,
        created_by: 2,
        content: "@alice please review this code",
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrismaService.comments.create.mockResolvedValue(newComment);

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

      mockPrismaService.users.findFirst.mockResolvedValue({
        user_id: 1,
        email: "alice@example.com",
      });

      mockPrismaService.email_preferences.findUnique.mockResolvedValue({
        user_id: 1,
        email_on_mention: true,
      });

      const result = await service.create(
        1,
        2,
        "@alice please review this code",
      );

      expect(result).toEqual(newComment);
      expect(mockPrismaService.comments.create).toHaveBeenCalledWith({
        data: {
          task_id: 1,
          created_by: 2,
          content: "@alice please review this code",
        },
      });

      expect(mockEmailService.sendMentionEmail).toHaveBeenCalledWith(
        1,
        "alice@example.com",
        "bob",
        "Code Review",
        "@alice please review this code",
      );
      // review M15 (8): the task title is read once
      expect(mockPrismaService.tasks.findUnique).toHaveBeenCalledTimes(1);
    });

    it("should create comment even if mention notification fails", async () => {
      const newComment = {
        comment_id: 1,
        task_id: 1,
        created_by: 2,
        content: "@alice please review",
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrismaService.tasks.findUnique.mockResolvedValue({
        task_id: 1,
        title: "Code Review",
      });
      mockPrismaService.comments.create.mockResolvedValue(newComment);
      mockPrismaService.users.findUnique.mockRejectedValue(
        new Error("Database error"),
      );

      const result = await service.create(1, 2, "@alice please review");

      expect(result).toEqual(newComment);
      // Comment creation should succeed even if mention notification fails
    });

    it("answers 404 for a comment on an unknown task", async () => {
      mockPrismaService.tasks.findUnique.mockResolvedValue(null);

      await expect(service.create(99, 2, "Hallo")).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.comments.create).not.toHaveBeenCalled();
    });
  });

  // M15: only the author edits or deletes a comment
  describe("update and remove", () => {
    beforeEach(() => {
      mockPrismaService.comments.findUnique.mockResolvedValue({
        comment_id: 7,
        task_id: 1,
        created_by: 2,
      });
    });

    it("lets the author change and delete the comment", async () => {
      await service.update(1, 7, 2, "neu");
      await service.remove(1, 7, 2);

      expect(mockPrismaService.comments.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { comment_id: 7 },
          data: expect.objectContaining({ content: "neu" }) as unknown,
        }),
      );
      expect(mockPrismaService.comments.delete).toHaveBeenCalledWith({
        where: { comment_id: 7 },
      });
    });

    it("answers 403 for someone else's comment and 404 for another task's", async () => {
      await expect(service.update(1, 7, 3, "x")).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.remove(2, 7, 2)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.comments.delete).not.toHaveBeenCalled();
    });
  });

  // M16 step 6: the ghost user (M14) is no one to mention
  it("sends no mail for a mention of the ghost user", async () => {
    mockPrismaService.users.findFirst.mockResolvedValue({
      user_id: 0,
      email: "ghost@effsync.invalid",
    });
    mockPrismaService.email_preferences.findUnique.mockResolvedValue(null);

    await service["notifyMentionedUsers"](
      "@geloeschter-nutzer schau mal",
      "bob",
      "Task",
      1,
      2,
    );

    expect(mockEmailService.sendMentionEmail).not.toHaveBeenCalled();
  });
});
