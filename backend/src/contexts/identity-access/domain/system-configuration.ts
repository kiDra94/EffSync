import { PermissionFlag } from "./permission-flag";
import { RoleName } from "./role-permissions";

const { READ, WRITE } = PermissionFlag;

// what the Superuser needs to reach and use the system configuration, with
// the flags the code checks (review M35): the app (view_dashboard), the
// roles and permissions lists (manage_users) and manage_system itself (READ
// for the audit log, WRITE for the configuration and notifications to others)
const SUPERUSER_NEEDS: Record<string, number> = {
  view_dashboard: READ,
  manage_users: READ,
  manage_system: READ | WRITE,
};

/**
 * The lock-out guard (M35 step 4): whether a role's new permissions would
 * take what the configuration needs away from the Superuser role. Flags
 * belong to the permission, so too few on one of them lock the Superuser out
 * whichever role is changed (decision I2).
 */
export function locksOutSuperuser(
  roleName: string | null,
  permissions: { name: string; flags: number }[],
): boolean {
  return Object.entries(SUPERUSER_NEEDS).some(([name, needed]) => {
    const permission = permissions.find((p) => p.name === name);
    if (permission) return (permission.flags & needed) !== needed;
    return roleName === RoleName.SUPERUSER;
  });
}
