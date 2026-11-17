import { locksOutSuperuser } from "./system-configuration";

// M35 step 4 (T77, decision I2): the Superuser can't configure themselves out
describe("locksOutSuperuser", () => {
  const needed = [
    { name: "view_dashboard", flags: 4 },
    { name: "manage_users", flags: 7 },
    { name: "manage_system", flags: 7 },
  ];
  const without = (name: string) => needed.filter((p) => p.name !== name);

  it("refuses a Superuser role without manage_system", () => {
    expect(locksOutSuperuser("Superuser", without("manage_system"))).toBe(true);
    expect(locksOutSuperuser("Superuser", needed)).toBe(false);
  });

  // review M35: the app and the roles list are needed to reach the configuration
  it("refuses a Superuser role without view_dashboard or manage_users", () => {
    expect(locksOutSuperuser("Superuser", without("view_dashboard"))).toBe(
      true,
    );
    expect(locksOutSuperuser("Superuser", without("manage_users"))).toBe(true);
  });

  it("lets other roles drop them", () => {
    expect(locksOutSuperuser("Admin", [])).toBe(false);
  });

  // the flags are the permission's, for every role (decision I2)
  it("refuses too few flags on one of them, for any role", () => {
    expect(
      locksOutSuperuser("Admin", [{ name: "manage_system", flags: 4 }]),
    ).toBe(true);
    expect(
      locksOutSuperuser("Student", [{ name: "view_dashboard", flags: 0 }]),
    ).toBe(true);
    expect(
      locksOutSuperuser("Student", [{ name: "manage_users", flags: 3 }]),
    ).toBe(true);
    expect(
      locksOutSuperuser("Superuser", [
        { name: "view_dashboard", flags: 4 },
        { name: "manage_users", flags: 4 },
        { name: "manage_system", flags: 6 },
      ]),
    ).toBe(false);
  });
});
