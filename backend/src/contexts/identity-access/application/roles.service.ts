import { Injectable } from "@nestjs/common";
import { RoleRepository } from "./ports/access.repositories";

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
}
