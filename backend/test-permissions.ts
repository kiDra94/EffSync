import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL ist nicht in der .env definiert!');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface UserPermissionTest {
    user_id: number;
    firstname: string;
    lastname: string;
    roles: (string | null)[];
    userPermissions: {
        permission_name: string | null;
        status: 'VALID' | 'EXPIRED' | 'NOT_YET_VALID';
        valid_from: Date;
        valid_to: Date | null;
    }[];
    rolePermissions: (string | null)[];
}

const today = new Date('2026-03-08'); // Aktuelles Seed-Datum

async function checkPermissionValidity(
    valid_from: Date,
    valid_to: Date | null
): Promise<'VALID' | 'EXPIRED' | 'NOT_YET_VALID'> {
    if (valid_from > today) {
        return 'NOT_YET_VALID';
    }
    if (valid_to && valid_to < today) {
        return 'EXPIRED';
    }
    return 'VALID';
}

async function runPermissionTests() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          PERMISSION & ROLE VALIDITY TEST REPORT            ║');
    console.log(`║                     Test Date: ${today.toISOString().split('T')[0]}                      ║`);
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    try {
        // Alle User laden
        const users = await prisma.users.findMany({
            orderBy: { user_id: 'asc' }
        });

        const results: UserPermissionTest[] = [];

        for (const user of users) {
            // User Rollen
            const userRoles = await prisma.user_roles.findMany({
                where: { user_id: user.user_id },
                include: { roles: true }
            });

            const roleNames = userRoles.map(ur => ur.roles.name);

            // User Permissions
            const userPerms = await prisma.user_permissions.findMany({
                where: { user_id: user.user_id },
                include: { permissions: true }
            });

            const userPermissionsStatus = await Promise.all(
                userPerms.map(async (up) => ({
                    permission_name: up.permissions.name,
                    status: await checkPermissionValidity(up.valid_from || new Date(), up.valid_to),
                    valid_from: up.valid_from || new Date(),
                    valid_to: up.valid_to
                }))
            );

            // Role Permissions
            const rolePerms = await prisma.roles_permissions.findMany({
                where: { roles_id: { in: userRoles.map(ur => ur.role_id) } },
                include: { permissions: true }
            });

            const rolePermissionNames = [
                ...new Set(rolePerms.map(rp => rp.permissions?.name).filter(Boolean))
            ];

            results.push({
                user_id: user.user_id,
                firstname: user.firstname,
                lastname: user.lastname,
                roles: roleNames,
                userPermissions: userPermissionsStatus,
                rolePermissions: rolePermissionNames
            });
        }

        // AUSGABE
        for (const result of results) {
            console.log(`\n${'═'.repeat(60)}`);
            console.log(
                `User ID ${result.user_id}: ${result.firstname} ${result.lastname}`
            );
            console.log(`${'═'.repeat(60)}`);

            // Rollen
            console.log(`\n📋 Rollen (${result.roles.length}):`);
            if (result.roles.length > 0) {
                result.roles.forEach(role => {
                    console.log(`   ✓ ${role}`);
                });
            } else {
                console.log('   (keine Rollen zugewiesen)');
            }

            // User Permissions
            console.log(`\n🔐 Direkte User Permissions (${result.userPermissions.length}):`);
            if (result.userPermissions.length > 0) {
                result.userPermissions.forEach(perm => {
                    const statusIcon =
                        perm.status === 'VALID'
                            ? '✅'
                            : perm.status === 'EXPIRED'
                              ? '❌'
                              : '⏳';
                    const toDate = perm.valid_to
                        ? perm.valid_to.toISOString().split('T')[0]
                        : 'unbegrenzt';
                    console.log(
                        `   ${statusIcon} ${perm.permission_name} (${perm.status})`
                    );
                    console.log(
                        `      Gültig: ${perm.valid_from.toISOString().split('T')[0]} → ${toDate}`
                    );
                });
            } else {
                console.log('   (keine Permissions zugewiesen)');
            }

            // Role Permissions
            console.log(`\n🎯 Permissions durch Rollen (${result.rolePermissions.length}):`);
            if (result.rolePermissions.length > 0) {
                result.rolePermissions.forEach(perm => {
                    console.log(`   ➜ ${perm}`);
                });
            } else {
                console.log('   (keine Permissions durch Rollen)');
            }

            // Zusammenfassung
            const validPerms = result.userPermissions.filter(
                p => p.status === 'VALID'
            ).length;
            const expiredPerms = result.userPermissions.filter(
                p => p.status === 'EXPIRED'
            ).length;
            const futurePerms = result.userPermissions.filter(
                p => p.status === 'NOT_YET_VALID'
            ).length;

            console.log(`\n📊 Zusammenfassung:`);
            console.log(`   Gültig: ${validPerms}, Abgelaufen: ${expiredPerms}, Zukunft: ${futurePerms}`);
        }

        // STATISTIKEN
        console.log(`\n\n${'═'.repeat(60)}`);
        console.log('📈 STATISTIKEN');
        console.log(`${'═'.repeat(60)}\n`);

        const totalUsers = results.length;
        const totalUserPerms = results.reduce(
            (acc, r) => acc + r.userPermissions.length,
            0
        );
        const validUserPerms = results.reduce(
            (acc, r) =>
                acc + r.userPermissions.filter(p => p.status === 'VALID').length,
            0
        );
        const expiredUserPerms = results.reduce(
            (acc, r) =>
                acc + r.userPermissions.filter(p => p.status === 'EXPIRED').length,
            0
        );
        const futureUserPerms = results.reduce(
            (acc, r) =>
                acc +
                r.userPermissions.filter(p => p.status === 'NOT_YET_VALID').length,
            0
        );

        console.log(`Total Users: ${totalUsers}`);
        console.log(`Total User Permissions: ${totalUserPerms}`);
        console.log(`  ✅ Gültig: ${validUserPerms}`);
        console.log(`  ❌ Abgelaufen: ${expiredUserPerms}`);
        console.log(`  ⏳ Zukunft: ${futureUserPerms}`);

        // TESTSZENARIEN HEADER
        console.log(`\n${'═'.repeat(60)}`);
        console.log('🧪 TESTSZENARIEN');
        console.log(`${'═'.repeat(60)}\n`);

        // Test 1: User mit abgelaufenen Permissions
        console.log('✓ Test 1: User mit abgelaufenen Permissions');
        const userWithExpired = results.filter(
            r => r.userPermissions.some(p => p.status === 'EXPIRED')
        );
        console.log(`  Gefunden: ${userWithExpired.map(u => `${u.firstname} (ID ${u.user_id})`).join(', ') || 'keine'}\n`);

        // Test 2: User mit zukünftigen Permissions
        console.log('✓ Test 2: User mit zukünftigen Permissions');
        const userWithFuture = results.filter(
            r => r.userPermissions.some(p => p.status === 'NOT_YET_VALID')
        );
        console.log(`  Gefunden: ${userWithFuture.map(u => `${u.firstname} (ID ${u.user_id})`).join(', ') || 'keine'}\n`);

        // Test 3: User mit unbegrenzten Permissions
        console.log('✓ Test 3: User mit unbegrenzten Permissions');
        const userWithUnlimited = results.filter(r =>
            r.userPermissions.some(p => p.valid_to === null)
        );
        console.log(`  Gefunden: ${userWithUnlimited.map(u => `${u.firstname} (ID ${u.user_id})`).join(', ') || 'keine'}\n`);

        // Test 4: Rollen-Permission Hierarchie
        console.log('✓ Test 4: Rollen-Permission Hierarchie überprüfbar');
        console.log('  Beispiel - Direktor (User 2):');
        const director = results.find(r => r.user_id === 2);
        if (director) {
            console.log(`    Rollen: ${director.roles.join(', ')}`);
            console.log(`    Role Permissions: ${director.rolePermissions.join(', ')}`);
            console.log(`    User Permissions: ${director.userPermissions.map(p => `${p.permission_name} (${p.status})`).join(', ')}`);
        }

        console.log(`\n${'═'.repeat(60)}`);
        console.log('✅ PERMISSION TEST ABGESCHLOSSEN');
        console.log(`${'═'.repeat(60)}\n`);

    } catch (error) {
        console.error('❌ FEHLER:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

runPermissionTests();
