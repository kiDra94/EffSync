import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { locksOutSuperuser } from "../domain/system-configuration";
import {
  RoleRepository,
  type RolePermissionEntry,
} from "./ports/access.repositories";

@Injectable()
export class RolesService {
  constructor(private readonly roles: RoleRepository) {}

  /**
   * Returns all available roles
   */
  async findAll() {
    return this.roles.findAll();
  }

  /**
   * Returns one role with its permissions
   */
  async findOne(roleId: number) {
    return this.roles.findOne(roleId);
  }

  /**
   * The Superuser's system configuration (T77, decision Q18, M35): the role
   * gets exactly these permissions, and each entry with flags gives its
   * permission those flags, for every role (decision I2). Users of the role have them at once (decision
   * I3). Refused if it would lock the Superuser out.
   */
  async setPermissions(roleId: number, entries: RolePermissionEntry[]) {
    const role = await this.roles.findOne(roleId);
    if (!role) {
      throw new NotFoundException(`Rolle ${roleId} nicht gefunden`);
    }
    const ids = entries.map((e) => e.permission_id);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException("Eine Berechtigung ist doppelt angegeben");
    }
    const known = await this.roles.findPermissionsByIds(ids);
    if (known.length !== ids.length) {
      throw new BadRequestException("Unbekannte Berechtigung");
    }
    // the flags after the change: sent ones, else the permission's own
    const named = entries.map((e) => {
      const permission = known.find((p) => p.permission_id === e.permission_id);
      return {
        name: permission?.name ?? "",
        flags: e.flags ?? permission?.flags ?? 0,
      };
    });
    if (locksOutSuperuser(role.name, named)) {
      throw new BadRequestException(
        "Der Superuser muss manage_system mit Lese- und Schreibrecht behalten",
      );
    }
    await this.roles.replacePermissions(roleId, entries);
    return this.roles.findOne(roleId);
  }
}
