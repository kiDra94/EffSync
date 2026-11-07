/**
 * Public entry point of identity-access (rule 3): other contexts and the
 * legacy modules import only from here, or the guards and decorators from
 * shared/presentation/security.
 */
export { PermissionsService } from "./permissions.service";
export { PermissionFlag } from "../domain/permission-flag";
export {
  RoleName,
  STAFF_ROLES,
  PRIVILEGED_ROLES,
  isRoleIn,
  getPermissionsForRole,
} from "../domain/role-permissions";
export { BCRYPT_COST } from "./password-hashing";
