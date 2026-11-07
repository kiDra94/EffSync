import { EmailPasswordResetMailer } from "./email-password-reset.mailer";
import { EmailService } from "./email.service";

// M13: the link points to the frontend's reset page, the token in the fragment
// (decision Q9), so it never reaches a server log
describe("EmailPasswordResetMailer", () => {
  it("sends the reset link to the frontend's /reset-password page", async () => {
    process.env.FRONTEND_URL = "https://effsync.example";
    const email = { sendPasswordResetEmail: jest.fn().mockResolvedValue(true) };

    await new EmailPasswordResetMailer(
      email as unknown as EmailService,
    ).sendResetLink({ user_id: 9, email: "t@htl.at" }, "reset.jwt");

    expect(email.sendPasswordResetEmail).toHaveBeenCalledWith(
      9,
      "t@htl.at",
      "https://effsync.example/reset-password#token=reset.jwt",
    );
  });

  // review M13 (6): EmailService reports a failed send as false; the mailer
  // turns it into an error, so PasswordResetService logs it
  it("fails when the EmailService couldn't send the mail", async () => {
    const email = {
      sendPasswordResetEmail: jest.fn().mockResolvedValue(false),
    };

    await expect(
      new EmailPasswordResetMailer(
        email as unknown as EmailService,
      ).sendResetLink({ user_id: 9, email: "t@htl.at" }, "reset.jwt"),
    ).rejects.toThrow();
  });
});
