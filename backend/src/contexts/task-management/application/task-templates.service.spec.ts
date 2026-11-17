import { NotFoundException } from "@nestjs/common";
import { UnitOfWork } from "../../../shared/application/unit-of-work";
import type { Transaction } from "../../../shared/domain/transaction";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { PrismaUnitOfWork } from "../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { PrismaTaskTemplateRepository } from "../infrastructure/persistence/prisma-task-template.repository";
import { TaskTemplatesService } from "./task-templates.service";

// T110 (M18): templates store a name and a description (decision H2) and are
// private (decision E1): each user sees, changes and deletes only their own,
// and responses carry the author's name but no e-mail
describe("TaskTemplatesService", () => {
  const AUTHOR = {
    user: { select: { user_id: true, firstname: true, lastname: true } },
  };
  const template = {
    template_id: 3,
    created_by: 1,
    name: "Hausübung",
    description: "Kapitel lesen",
  };

  let prisma: {
    task_templates: Record<string, jest.Mock>;
    tasks: { updateMany: jest.Mock };
  };
  let service: TaskTemplatesService;

  beforeEach(() => {
    prisma = {
      task_templates: {
        create: jest.fn().mockResolvedValue(template),
        findMany: jest.fn().mockResolvedValue([template]),
        findUnique: jest.fn().mockResolvedValue(template),
        update: jest.fn().mockResolvedValue(template),
        delete: jest.fn().mockResolvedValue(template),
      },
      tasks: { updateMany: jest.fn() },
    };
    const unitOfWork = new PrismaUnitOfWork(prisma as unknown as PrismaService);
    service = new TaskTemplatesService(
      new PrismaTaskTemplateRepository(unitOfWork),
      {
        run: (work: (tx: Transaction) => Promise<unknown>) =>
          work({} as Transaction),
      } as unknown as UnitOfWork,
    );
  });

  it("creates a template with name and description for its author", async () => {
    await service.create(
      { name: "Hausübung", description: "Kapitel lesen" },
      1,
    );

    expect(prisma.task_templates.create).toHaveBeenCalledWith({
      data: { name: "Hausübung", description: "Kapitel lesen", created_by: 1 },
      include: AUTHOR,
    });
  });

  it("lists only the requester's templates, newest first", async () => {
    await service.findAll(1);

    expect(prisma.task_templates.findMany).toHaveBeenCalledWith({
      where: { created_by: 1 },
      include: AUTHOR,
      orderBy: { created_at: "desc" },
    });
  });

  it("shows a template with its tasks to its author", async () => {
    await expect(service.findOne(3, 1)).resolves.toEqual(template);
    expect(prisma.task_templates.findUnique).toHaveBeenCalledWith({
      where: { template_id: 3 },
      include: {
        ...AUTHOR,
        tasks: { select: { task_id: true, title: true, created_at: true } },
      },
    });
  });

  it("answers 404 for someone else's template and for a missing one", async () => {
    await expect(service.findOne(3, 2)).rejects.toThrow(NotFoundException);
    await expect(service.update(3, 2, { name: "x" })).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.remove(3, 2)).rejects.toThrow(NotFoundException);
    prisma.task_templates.findUnique.mockResolvedValue(null);
    await expect(service.findOne(9, 1)).rejects.toThrow(NotFoundException);
    expect(prisma.task_templates.update).not.toHaveBeenCalled();
    expect(prisma.task_templates.delete).not.toHaveBeenCalled();
  });

  it("updates the author's template", async () => {
    await service.update(3, 1, { description: "neu" });

    expect(prisma.task_templates.update).toHaveBeenCalledWith({
      where: { template_id: 3 },
      data: { description: "neu", updated_at: expect.any(Date) as unknown },
      include: AUTHOR,
    });
  });

  it("deletes the author's template and keeps the tasks created from it", async () => {
    await expect(service.remove(3, 1)).resolves.toEqual({
      message: "Template deleted successfully",
      template_id: 3,
    });

    expect(prisma.tasks.updateMany).toHaveBeenCalledWith({
      where: { template_id: 3 },
      data: { template_id: null },
    });
    expect(prisma.task_templates.delete).toHaveBeenCalledWith({
      where: { template_id: 3 },
    });
  });

  // review M18 (7): changing or deleting checks the owner without the tasks
  it("checks the owner of an update or delete with a lean query", async () => {
    await service.update(3, 1, { name: "neu" });
    await service.remove(3, 1);

    for (const [args] of prisma.task_templates.findUnique.mock.calls as [
      { select?: unknown; include?: unknown },
    ][]) {
      expect(args).toEqual({
        where: { template_id: 3 },
        select: { created_by: true },
      });
    }
  });
});
