import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMailTransport } from "./mail-transport";

// M13: in tests no mail leaves the process; each one lands as JSON in the outbox
describe("createMailTransport", () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it("writes every mail into MAIL_OUTBOX_DIR when NODE_ENV is test", async () => {
    const outbox = mkdtempSync(join(tmpdir(), "outbox-"));
    process.env.NODE_ENV = "test";
    process.env.MAIL_OUTBOX_DIR = outbox;

    await createMailTransport().sendMail({
      from: "a@b.at",
      to: "tobias@student.htl.at",
      subject: "Passwort",
      html: "<a href='x'>Link</a>",
    });

    const files = readdirSync(outbox);
    expect(files).toHaveLength(1);
    expect(JSON.parse(readFileSync(join(outbox, files[0]), "utf8"))).toEqual({
      to: "tobias@student.htl.at",
      subject: "Passwort",
      html: "<a href='x'>Link</a>",
    });
    rmSync(outbox, { recursive: true, force: true });
  });

  it("sends nothing over the network in tests without an outbox", async () => {
    process.env.NODE_ENV = "test";
    delete process.env.MAIL_OUTBOX_DIR;

    const info = (await createMailTransport().sendMail({
      to: "x@y.at",
      subject: "s",
      html: "h",
    })) as { messageId: string };

    expect(info.messageId).toEqual(expect.any(String));
  });
});
