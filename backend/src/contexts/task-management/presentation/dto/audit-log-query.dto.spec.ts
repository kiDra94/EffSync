import { plainToInstance } from "class-transformer";
import { AuditLogQueryDto } from "./audit-log-query.dto";

// review M15 (5): `to` as a date means up to the end of that day
describe("AuditLogQueryDto", () => {
  it("reads a date-only `to` as the end of that day", () => {
    const query = plainToInstance(AuditLogQueryDto, {
      from: "2026-11-07",
      to: "2026-11-07",
    });

    expect(query.from).toEqual(new Date("2026-11-07T00:00:00.000Z"));
    expect(query.to).toEqual(new Date("2026-11-07T23:59:59.999Z"));
  });

  it("keeps a `to` with a time as it is", () => {
    const query = plainToInstance(AuditLogQueryDto, {
      to: "2026-11-07T10:30:00.000Z",
    });

    expect(query.to).toEqual(new Date("2026-11-07T10:30:00.000Z"));
  });
});
