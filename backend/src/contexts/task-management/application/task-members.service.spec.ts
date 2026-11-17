import { Test, TestingModule } from "@nestjs/testing";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { TaskMembersService } from "./task-members.service";
import { TaskFlags } from "../domain/task-member-rights";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { PrismaUnitOfWork } from "../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { PrismaTaskMemberRepository } from "../infrastructure/persistence/prisma-task-member.repository";
import { TaskMemberRepository } from "./ports/task-member.repository";
import { TaskNotificationsService } from "./task-notifications.service";
import { permissionsOverPrisma } from "./task-members.fixtures";

const memberNotifications = {
  memberAdded: jest.fn().mockResolvedValue(undefined),
  memberRemoved: jest.fn().mockResolvedValue(undefined),
};

const CREATOR = 2;
const ASSIGNEE = 5;
const TASK = {
  task_id: 1,
  title: "Projekt",
  created_by: CREATOR,
  assigned_to: ASSIGNEE as number | null,
};
type ChainTask = typeof TASK & {
  members?: { user_id: number; flags: number }[];
};

// THESIS: T99, T127 (flipped in M38, decisions I4 and I5) – rights on the
// task: each membership carries READ/WRITE/EXECUTE, over the task and every
// task above it; R lists the members, W adds and removes them, X changes
// their flags. A direct grant alone no longer counts.
describe("TaskMembersService - task-level rights (rwx per membership)", () => {
  let service: TaskMembersService;
  let prisma: {
    $queryRaw: jest.Mock;
    tasks: { findUnique: jest.Mock; findMany: jest.Mock };
    users: { findUnique: jest.Mock };
    task_members: Record<string, jest.Mock>;
    user_roles: { count: jest.Mock; findMany: jest.Mock };
  };

  /**
   * The task chain (the task first, then the tasks above it) with each
   * task's member rows, as the repository's two queries return it.
   */
  const chain = (...tasks: ChainTask[]) => {
    prisma.$queryRaw.mockResolvedValue(
      tasks.map((t, i) => ({
        task_id: t.task_id,
        parent_task_id: tasks[i + 1]?.task_id ?? null,
      })),
    );
    prisma.tasks.findMany.mockResolvedValue(
      tasks.map((t) => ({ ...t, task_members: t.members ?? [] })),
    );
    // the task with its people, as findTaskWithPeople loads it
    prisma.tasks.findUnique.mockResolvedValue({
      ...tasks[0],
      created_at: null,
      users_tasks_created_byTousers: null,
      users_tasks_assigned_toTousers: tasks[0].assigned_to
        ? { user_id: tasks[0].assigned_to }
        : null,
    });
  };

  /** A user's member row on the task (null: none), and a privileged role. */
  const given = (
    userId: number,
    memberFlags: number | null,
    privileged = false,
  ) => {
    chain({
      ...TASK,
      members:
        memberFlags === null ? [] : [{ user_id: userId, flags: memberFlags }],
    });
    prisma.user_roles.count.mockResolvedValue(privileged ? 1 : 0);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      tasks: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      users: { findUnique: jest.fn().mockResolvedValue({ user_id: 9 }) },
      task_members: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest
          .fn()
          .mockResolvedValue({ task_id: 1, user_id: 9, flags: 4 }),
        delete: jest.fn(),
        update: jest.fn(),
      },
      user_roles: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskMembersService,
        PrismaUnitOfWork,
        { provide: TaskMemberRepository, useClass: PrismaTaskMemberRepository },
        { provide: TaskNotificationsService, useValue: memberNotifications },
        permissionsOverPrisma,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(TaskMembersService);
  });

  describe("the flags on a task", () => {
    it.each([
      ["the creator", CREATOR, null, false, 7],
      ["an Admin or Superuser without membership", 9, null, true, 7],
      ["the assignee", ASSIGNEE, null, false, 6],
      ["a READ member", 7, 4, false, 4],
      ["a READ+WRITE member", 7, 6, false, 6],
      ["anyone else, also with direct grants", 8, null, false, 0],
    ])("%s", async (_who, userId, memberFlags, privileged, expected) => {
      given(userId, memberFlags, privileged);

      await expect(service.permissionFlags(userId, 1)).resolves.toEqual({
        has_read: (expected & 4) !== 0,
        has_write: (expected & 2) !== 0,
        has_execute: (expected & 1) !== 0,
        permission_flags: expected,
      });
    });

    it("reads the rights from the task and every task above it", async () => {
      chain({ ...TASK, task_id: 8, created_by: 7, assigned_to: null }, TASK);

      await expect(
        service.checkPermission(CREATOR, 8, TaskFlags.RWX),
      ).resolves.toBe(true);
    });

    it("asks for the role only when the tasks don't give the flags", async () => {
      given(CREATOR, null);
      await service.checkPermission(CREATOR, 1, TaskFlags.RWX);
      given(7, 6);
      await service.checkPermission(7, 1, TaskFlags.WRITE);

      expect(prisma.user_roles.count).not.toHaveBeenCalled();
    });

    it("has no flags on a task that doesn't exist", async () => {
      await expect(
        service.checkPermission(CREATOR, 404, TaskFlags.READ),
      ).resolves.toBe(false);
    });

    // review of M38: an Admin passes the visibility guard on any id
    it("answers 404, not 403, for a task that doesn't exist", async () => {
      prisma.user_roles.count.mockResolvedValue(1);

      await expect(service.findMembersFor(404, 9)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.permissionFlags(9, 404)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("listing the members (READ)", () => {
    it("lists them with the rights that are enforced", async () => {
      given(7, 4);
      prisma.task_members.findMany.mockResolvedValue([
        { task_id: 1, user_id: 7, flags: 4, joined_at: null, users: null },
      ]);

      const list = await service.findMembersFor(1, 7);

      expect(list).toEqual([
        expect.objectContaining({
          user_id: CREATOR,
          role: "creator",
          flags: 7,
          fixed_flags: true,
        }),
        expect.objectContaining({
          user_id: ASSIGNEE,
          role: "assigned",
          flags: 6,
          fixed_flags: false,
        }),
        expect.objectContaining({
          user_id: 7,
          role: "member",
          flags: 4,
          fixed_flags: false,
        }),
      ]);
    });

    it("refuses a member whose READ was taken away (403)", async () => {
      given(7, 0);

      await expect(service.findMembersFor(1, 7)).rejects.toThrow(
        ForbiddenException,
      );
    });

    // second review: over the whole chain, with the roles in one query
    it("lists a member with the rights from the tasks above, fixed for a creator up there", async () => {
      chain(
        {
          ...TASK,
          task_id: 8,
          created_by: 7,
          assigned_to: null,
          members: [{ user_id: CREATOR, flags: 4 }],
        },
        TASK,
      );
      prisma.task_members.findMany.mockResolvedValue([
        {
          task_id: 8,
          user_id: CREATOR,
          flags: 4,
          joined_at: null,
          users: null,
        },
      ]);

      const list = await service.findMembersFor(8, 7);

      expect(list.find((m) => m.user_id === CREATOR)).toMatchObject({
        flags: 7,
        fixed_flags: true,
      });
    });

    it("lists an Admin, as member or assignee, with every flag and fixed", async () => {
      given(7, 4);
      prisma.task_members.findMany.mockResolvedValue([
        { task_id: 1, user_id: 9, flags: 4, joined_at: null, users: null },
      ]);
      prisma.user_roles.findMany.mockResolvedValue([
        { user_id: 9 },
        { user_id: ASSIGNEE },
      ]);

      const list = await service.findMembersFor(1, 7);

      expect(list.find((m) => m.user_id === 9)).toMatchObject({
        flags: 7,
        fixed_flags: true,
      });
      expect(list.find((m) => m.user_id === ASSIGNEE)).toMatchObject({
        flags: 7,
        fixed_flags: true,
      });
      expect(prisma.user_roles.findMany).toHaveBeenCalledTimes(1);
    });

    it("lists a creator who is also the assignee once, with every flag", async () => {
      chain({ ...TASK, assigned_to: CREATOR });

      const list = await service.findMembersFor(1, CREATOR);

      expect(list).toEqual([
        expect.objectContaining({
          user_id: CREATOR,
          role: "creator",
          flags: 7,
        }),
      ]);
    });
  });

  describe("adding and removing members (WRITE)", () => {
    it("lets a WRITE member add someone, with READ", async () => {
      given(7, 6);

      await service.addMember(1, 9, 7);

      expect(prisma.task_members.create).toHaveBeenCalledWith({
        data: { task_id: 1, user_id: 9 },
      });
    });

    it("refuses a READ member (403) and a missing task (404)", async () => {
      given(7, 4);
      await expect(service.addMember(1, 9, 7)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.removeMember(1, 9, 7)).rejects.toThrow(
        ForbiddenException,
      );

      prisma.$queryRaw.mockResolvedValue([]);
      prisma.tasks.findUnique.mockResolvedValue(null);
      await expect(service.addMember(404, 9, 7)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("lets the assignee remove a member", async () => {
      given(ASSIGNEE, null);
      prisma.task_members.findUnique.mockResolvedValue({
        task_id: 1,
        user_id: 9,
        flags: 4,
      });

      await service.removeMember(1, 9, ASSIGNEE);

      expect(prisma.task_members.delete).toHaveBeenCalled();
    });

    it("needs EXECUTE to remove a member who holds it", async () => {
      chain({
        ...TASK,
        members: [
          { user_id: 7, flags: 6 },
          { user_id: 9, flags: 7 },
        ],
      });
      prisma.task_members.findUnique.mockResolvedValue({
        task_id: 1,
        user_id: 9,
        flags: 7,
      });

      await expect(service.removeMember(1, 9, 7)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.task_members.delete).not.toHaveBeenCalled();
    });

    it("answers 404 for removing someone who isn't a member", async () => {
      given(7, 6);

      await expect(service.removeMember(1, 9, 7)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("changing a member's flags (EXECUTE)", () => {
    it("lets an EXECUTE member set another member's flags", async () => {
      given(7, 7);
      prisma.task_members.findUnique.mockResolvedValue({
        task_id: 1,
        user_id: 9,
        flags: 4,
      });
      prisma.task_members.update.mockResolvedValue({
        task_id: 1,
        user_id: 9,
        flags: 6,
      });

      await expect(service.setMemberFlags(1, 9, 6, 7)).resolves.toMatchObject({
        flags: 6,
      });
      expect(prisma.task_members.update).toHaveBeenCalledWith({
        where: { task_id_user_id: { task_id: 1, user_id: 9 } },
        data: { flags: 6 },
      });
    });

    it("refuses without EXECUTE (403)", async () => {
      given(7, 6);

      await expect(service.setMemberFlags(1, 9, 6, 7)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("refuses a change of one's own flags (403)", async () => {
      given(7, TaskFlags.EXECUTE);
      prisma.task_members.findUnique.mockResolvedValue({
        task_id: 1,
        user_id: 7,
        flags: 1,
      });

      await expect(service.setMemberFlags(1, 7, 7, 7)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("refuses the creator's flags (400) and a non-member (404)", async () => {
      given(CREATOR, null);
      await expect(
        service.setMemberFlags(1, CREATOR, 4, CREATOR),
      ).rejects.toThrow(BadRequestException);
      await expect(service.setMemberFlags(1, 9, 4, CREATOR)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
