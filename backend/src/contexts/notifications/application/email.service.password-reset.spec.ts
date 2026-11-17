import { EmailService } from "./email.service";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { PrismaUnitOfWork } from "../../../shared/infrastructure/prisma/prisma-unit-of-work";
import type { Transporter } from "nodemailer";
import { NodemailerMailTransport } from "../infrastructure/mail-transport";
import { PrismaEmailLogRepository } from "../infrastructure/persistence/prisma-email.repository";

// M13: the reset mail, and (review M13, 7) at most one per account every
// 5 minutes, so nobody can flood an inbox through POST /auth/forgot-password
describe("EmailService.sendPasswordResetEmail", () => {
  let prisma: { email_logs: { findFirst: jest.Mock; create: jest.Mock } };
  let transporter: { sendMail: jest.Mock };
  let service: EmailService;

  beforeEach(() => {
    prisma = {
      email_logs: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    transporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: "m-1" }),
    };
    service = new EmailService(
      new PrismaEmailLogRepository(
        new PrismaUnitOfWork(prisma as unknown as PrismaService),
      ),
      new NodemailerMailTransport(transporter as unknown as Transporter),
    );
  });

  it("sends the link and logs it as password_reset", async () => {
    await expect(
      service.sendPasswordResetEmail(
        9,
        "t@htl.at",
        "https://x/reset-password#token=a",
      ),
    ).resolves.toBe(true);

    const [[mail]] = transporter.sendMail.mock.calls as [
      [{ to: string; html: string }],
    ];
    expect(mail.to).toBe("t@htl.at");
    expect(mail.html).toContain("https://x/reset-password#token=a");
    expect(prisma.email_logs.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user_id: 9,
        email_type: "password_reset",
        status: "sent",
      }) as unknown,
    });
  });

  it("sends no second reset mail to the same account within 5 minutes", async () => {
    prisma.email_logs.findFirst.mockResolvedValue({ email_log_id: 1 });

    await expect(
      service.sendPasswordResetEmail(9, "t@htl.at", "link"),
    ).resolves.toBe(true);

    expect(transporter.sendMail).not.toHaveBeenCalled();
    const [[query]] = prisma.email_logs.findFirst.mock.calls as [
      [
        {
          where: {
            user_id: number;
            email_type: string;
            sent_at: { gte: Date };
          };
        },
      ],
    ];
    expect(query.where).toMatchObject({
      user_id: 9,
      email_type: "password_reset",
    });
    expect(Date.now() - query.where.sent_at.gte.getTime()).toBeCloseTo(
      5 * 60 * 1000,
      -3,
    );
  });

  it("reports a failed send as false and logs it", async () => {
    transporter.sendMail.mockRejectedValue(new Error("SMTP down"));

    await expect(
      service.sendPasswordResetEmail(9, "t@htl.at", "link"),
    ).resolves.toBe(false);
    expect(prisma.email_logs.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "failed",
        error_message: "SMTP down",
      }) as unknown,
    });
  });
});
