import { generateMentionEmailHtml } from "./mail-templates";
import type {
  EmailLogRepository,
  EmailPreferenceRepository,
} from "./ports/email.repository";
import type { MailTransport } from "./ports/mail-transport";
import { DeadlineMailService } from "./deadline-mail.service";
import { EmailService } from "./email.service";

// T09 (@mention mail) and T46 (deadline mail), M23
describe("EmailService", () => {
  let transport: { send: jest.Mock };
  let logs: { log: jest.Mock; sentSince: jest.Mock };
  let service: EmailService;

  beforeEach(() => {
    transport = { send: jest.fn().mockResolvedValue("m-1") };
    logs = { log: jest.fn(), sentSince: jest.fn().mockResolvedValue(false) };
    service = new EmailService(
      logs as unknown as EmailLogRepository,
      transport as unknown as MailTransport,
    );
  });

  it("mails a mentioned user with the commenter, task and excerpt (T09)", async () => {
    await expect(
      service.sendMentionEmail(
        5,
        "laura@htl.at",
        "anna",
        "Referat",
        "@laura schau",
      ),
    ).resolves.toBe(true);

    const [[mail]] = transport.send.mock.calls as [
      [{ to: string; subject: string; html: string }],
    ];
    expect(mail.to).toBe("laura@htl.at");
    expect(mail.subject).toBe("📢 Du wurdest erwähnt: Referat");
    expect(mail.html).toContain("<strong>anna</strong>");
    expect(mail.html).toContain("@laura schau");
    expect(logs.log).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 5,
        email_type: "mention",
        status: "sent",
      }),
    );
  });

  it("logs a failed send and answers false", async () => {
    transport.send.mockRejectedValue(new Error("smtp down"));

    await expect(
      service.sendMentionEmail(5, "laura@htl.at", "anna", "Referat", "x"),
    ).resolves.toBe(false);
    expect(logs.log).toHaveBeenCalledWith(
      expect.objectContaining({
        email_type: "mention",
        status: "failed",
        subject: "Mention: Referat",
        error_message: "smtp down",
      }),
    );
  });

  it("words the deadline mail by the days left (T46)", async () => {
    const inTwoDays = new Date();
    inTwoDays.setDate(inTwoDays.getDate() + 2);
    await service.sendDeadlineEmail(4, "f@htl.at", "Referat", inTwoDays);
    await service.sendDeadlineEmail(
      4,
      "f@htl.at",
      "Referat",
      new Date(2020, 0, 1),
    );

    const subjects = (transport.send.mock.calls as [{ subject: string }][]).map(
      ([mail]) => mail.subject,
    );
    expect(subjects).toEqual([
      "⏰ Aufgabe fällig in 2 Tag(en): Referat",
      "🚨 Aufgabe überfällig: Referat",
    ]);
  });
});

// T46: the deadline mail goes only to users who want it (default: yes)
describe("DeadlineMailService", () => {
  const recipient = { user_id: 4, email: "f@htl.at" };
  let email: { sendDeadlineEmail: jest.Mock };
  let preferences: { find: jest.Mock };
  let service: DeadlineMailService;

  beforeEach(() => {
    email = { sendDeadlineEmail: jest.fn().mockResolvedValue(true) };
    preferences = { find: jest.fn().mockResolvedValue(null) };
    service = new DeadlineMailService(
      email as unknown as EmailService,
      preferences as unknown as EmailPreferenceRepository,
    );
  });

  it("mails without preferences and with email_on_deadline", async () => {
    await expect(
      service.sendDeadlineReminder(recipient, "T", new Date()),
    ).resolves.toBe(true);
    preferences.find.mockResolvedValue({ email_on_deadline: true });
    await service.sendDeadlineReminder(recipient, "T", new Date());

    expect(email.sendDeadlineEmail).toHaveBeenCalledTimes(2);
  });

  it("doesn't mail a user who turned deadline mails off, or one without an address", async () => {
    preferences.find.mockResolvedValue({ email_on_deadline: false });
    await expect(
      service.sendDeadlineReminder(recipient, "T", new Date()),
    ).resolves.toBe(false);
    await expect(
      service.sendDeadlineReminder(
        { user_id: 4, email: null },
        "T",
        new Date(),
      ),
    ).resolves.toBe(false);

    expect(email.sendDeadlineEmail).not.toHaveBeenCalled();
  });
});

// review M23: user text can't put markup or links into the app's mails
describe("mail templates", () => {
  it("escapes user text and links to the frontend", () => {
    process.env.FRONTEND_URL = "https://effsync.example";

    const html = generateMentionEmailHtml(
      "<b>anna</b>",
      'Referat "1"',
      '<a href="https://evil">Passwort bestätigen</a>',
    );

    expect(html).not.toContain('<a href="https://evil">');
    expect(html).toContain("&lt;a href=&quot;https://evil&quot;&gt;");
    expect(html).toContain("&lt;b&gt;anna&lt;/b&gt;");
    expect(html).toContain('href="https://effsync.example/tasks"');
  });
});
