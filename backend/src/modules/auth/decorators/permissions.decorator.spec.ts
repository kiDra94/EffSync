import { Reflector } from "@nestjs/core";
import {
  PERMISSION_FLAG_KEY,
  PERMISSIONS_KEY,
  Permissions,
} from "./permissions.decorator";
import { PermissionFlag } from "../../permissions/permissions.service";

// T94 (M8): @Permissions takes an optional required flag, READ by default
class Handlers {
  @Permissions("edit_tasks", PermissionFlag.WRITE)
  write() {}

  @Permissions("view_dashboard")
  read() {}
}

describe("@Permissions", () => {
  const reflector = new Reflector();
  const handler = (name: string) =>
    Reflect.get(Handlers.prototype, name) as () => void;

  it("stores the names and the declared flag", () => {
    expect(reflector.get(PERMISSIONS_KEY, handler("write"))).toEqual([
      "edit_tasks",
    ]);
    expect(reflector.get(PERMISSION_FLAG_KEY, handler("write"))).toBe(
      PermissionFlag.WRITE,
    );
  });

  it("defaults the flag to READ", () => {
    expect(reflector.get(PERMISSION_FLAG_KEY, handler("read"))).toBe(
      PermissionFlag.READ,
    );
  });
});
