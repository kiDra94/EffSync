import 'dotenv/config'; // WICHTIG: Lädt die DATABASE_URL aus deiner .env
import { PrismaClient, task_status } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL ist nicht in der .env definiert!');
}

// Prisma 7 Setup: Der Client benötigt zwingend den Adapter
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter })

async function main() {
    console.log('Starte Seed-Prozess...');

    try {
        // --- CLEANUP ---
        const tableNames = [
            'email_logs', 'email_preferences', 'task_comments', 'task_activity_log', 'task_documents',
            'chat_messages', 'chat_room_users', 'chat_rooms', 'document_shares', 'note_documents',
            'notes_users', 'notes', 'documents', 'tasks', 'task_templates',
            'lesson_slots', 'classes_teachers', 'students', 'classes', 'user_roles',
            'user_permissions', 'roles_permissions', 'roles', 'permissions', 'teachers',
            'users', 'subjects', 'rooms', 'schedules', 'priorities', 'departments', 'notifications'
        ];

        console.log('Führe Cleanup durch...');
        for (const tableName of tableNames) {
            await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`);
        }
        console.log('✓ Alle Tabellen geleert und Sequences zurückgesetzt.');

        // --- PHASE 1: Base Data ---
        const departmentsData = [
            { name: 'Informatik' }, { name: 'Medientechnik' }, { name: 'Netzwerktechnik' },
            { name: 'Maschinenbau' }, { name: 'Elektrotechnik' }, { name: 'Mechatronik' },
            { name: 'Wirtschaftsingenieurwesen' }, { name: 'Biomedizin' }, { name: 'Optometrie' },
            { name: 'Informationstechnik' }
        ];
        await prisma.departments.createMany({ data: departmentsData });
        console.log(`✓ 10 Einträge in departments erstellt`);

        const prioritiesData = [
            { name: 'Sehr Niedrig' }, { name: 'Niedrig' }, { name: 'Normal' },
            { name: 'Wichtig' }, { name: 'Sehr Wichtig' }, { name: 'Hoch' },
            { name: 'Sehr Hoch' }, { name: 'Dringend' }, { name: 'Kritisch' },
            { name: 'Blocker' }
        ];
        await prisma.priorities.createMany({ data: prioritiesData });
        console.log(`✓ 10 Einträge in priorities erstellt`);

        // Flags: READ=4, WRITE=2, EXECUTE=1
        const permissionsData = [
            { name: 'view_dashboard', description: 'Dashboard anschauen', flags: 4 },                // READ
            { name: 'manage_users', description: 'Benutzer verwalten', flags: 7 },                  // RWX
            { name: 'create_tasks', description: 'Aufgaben erstellen', flags: 7 },                  // RWX
            { name: 'edit_tasks', description: 'Aufgaben bearbeiten', flags: 6 },                   // RW
            { name: 'delete_tasks', description: 'Aufgaben löschen', flags: 1 },                    // X
            { name: 'view_grades', description: 'Noten einsehen', flags: 4 },                       // READ
            { name: 'edit_grades', description: 'Noten eintragen', flags: 6 },                      // RW
            { name: 'manage_classes', description: 'Klassen verwalten', flags: 7 },                 // RWX
            { name: 'view_schedules', description: 'Stundenpläne anschauen', flags: 4 },            // READ
            { name: 'manage_system', description: 'System administrieren', flags: 7 }               // RWX
        ];
        await prisma.permissions.createMany({ data: permissionsData });
        console.log(`✓ 10 Einträge in permissions erstellt (mit Flags)`);

        const rolesData = [
            { name: 'Superuser' }, { name: 'Student' }, { name: 'Teacher' },{ name: 'Admin' },
        ];
        await prisma.roles.createMany({ data: rolesData });
        console.log(`✓ 10 Einträge in roles erstellt`);

        const schedulesData = Array.from({ length: 10 }).map((_, i) => ({
            name: `Semester ${2020 + Math.floor(i / 2)}${i % 2 === 0 ? 'WS' : 'SS'}`,
            valid_from: new Date(`${2020 + Math.floor(i / 2)}-${i % 2 === 0 ? '09-01' : '02-01'}`),
            valid_to: new Date(`${2021 + Math.floor(i / 2)}-${i % 2 === 0 ? '01-31' : '07-01'}`)
        }));
        await prisma.schedules.createMany({ data: schedulesData });
        console.log(`✓ 10 Einträge in schedules erstellt`);

        const roomsData = [
            { name: 'EDV 1', type: 'Labor', capacity: 30, building: 'Hauptgebäude' },
            { name: 'EDV 2', type: 'Labor', capacity: 30, building: 'Hauptgebäude' },
            { name: 'Netzwerklabor', type: 'Labor', capacity: 20, building: 'Nebengebäude' },
            { name: 'Klasse 1A', type: 'Klassenzimmer', capacity: 36, building: 'Hauptgebäude' },
            { name: 'Physiksaal', type: 'Labor', capacity: 40, building: 'Altbau' },
            { name: 'Klasse 2A', type: 'Klassenzimmer', capacity: 36, building: 'Hauptgebäude' },
            { name: 'Chemie', type: 'Labor', capacity: 30, building: 'Altbau' },
            { name: 'Klasse 3A', type: 'Klassenzimmer', capacity: 36, building: 'Hauptgebäude' },
            { name: 'Bibliothek', type: 'Aufenthaltsraum', capacity: 50, building: 'Nebengebäude' },
            { name: 'Turnsaal', type: 'Sport', capacity: 100, building: 'Sporttrakt' }
        ];
        await prisma.rooms.createMany({ data: roomsData });
        console.log(`✓ 10 Einträge in rooms erstellt`);

        const subjectsData = [
            { name: 'Programmieren', short_name: 'POS' },
            { name: 'Datenbanken', short_name: 'DBI' },
            { name: 'Netzwerktechnik', short_name: 'NWT' },
            { name: 'Mathematik', short_name: 'AM' },
            { name: 'Deutsch', short_name: 'D' },
            { name: 'Englisch', short_name: 'E' },
            { name: 'Softwareentwicklung', short_name: 'SEW' },
            { name: 'Betriebssysteme', short_name: 'BSY' },
            { name: 'IT-Projekte', short_name: 'ITP' },
            { name: 'Medientechnik', short_name: 'MED' }
        ];
        await prisma.subjects.createMany({ data: subjectsData });
        console.log(`✓ 10 Einträge in subjects erstellt`);

        // --- PHASE 2: Users ---
        const passwordHash = await bcrypt.hash('password123', 10);

        const usersData = [
            { firstname: 'Max', lastname: 'Mustermann', email: 'admin@htl.at', username: 'adminadmin' }, // ID 1 (Superuser)
            { firstname: 'Anna', lastname: 'Lehrerin', email: 'anna.lehrerin@htl.at', username: 'alehrerin' }, // ID 2
            { firstname: 'Peter', lastname: 'Schmidt', email: 'peter.schmidt@htl.at', username: 'pschmidt' }, // ID 3
            { firstname: 'Maria', lastname: 'Huber', email: 'maria.huber@htl.at', username: 'mhuber' }, // ID 4
            { firstname: 'Lukas', lastname: 'Wagner', email: 'lukas.wagner@htl.at', username: 'lwagner' }, // ID 5
            { firstname: 'Julia', lastname: 'Bauer', email: 'julia.bauer@htl.at', username: 'jbauer' }, // ID 6
            { firstname: 'Felix', lastname: 'Fuchs', email: 'felix.fuchs@student.htl.at', username: 'ffuchs' }, // ID 7 (Student)
            { firstname: 'Laura', lastname: 'Gruber', email: 'laura.gruber@student.htl.at', username: 'lgruber' }, // ID 8
            { firstname: 'David', lastname: 'Wolf', email: 'david.wolf@student.htl.at', username: 'dwolf' }, // ID 9
            { firstname: 'Sarah', lastname: 'Schwaiger', email: 'sarah.schwaiger@student.htl.at', username: 'sschwaiger' }, // ID 10
            { firstname: 'Tobias', lastname: 'Eder', email: 'tobias.eder@student.htl.at', username: 'teder' }, // ID 11
            { firstname: 'Lena', lastname: 'Moser', email: 'lena.moser@student.htl.at', username: 'lmoser' }, // ID 12
            { firstname: 'Simon', lastname: 'Pichler', email: 'simon.pichler@student.htl.at', username: 'spichler' }, // ID 13
            { firstname: 'Mia', lastname: 'Steiner', email: 'mia.steiner@student.htl.at', username: 'msteiner' }, // ID 14
            { firstname: 'Paul', lastname: 'Wallner', email: 'paul.wallner@student.htl.at', username: 'pwallner' }, // ID 15
            { firstname: 'Emma', lastname: 'Auer', email: 'emma.auer@student.htl.at', username: 'eauer' } // ID 16
        ].map(u => ({ ...u, password_hash: passwordHash }));

        await prisma.users.createMany({ data: usersData });
        console.log(`✓ ${usersData.length} Einträge in users erstellt`);

        const emailPreferencesData = Array.from({ length: 16 }).map((_, i) => ({
            user_id: i + 1,
            email_on_deadline: true,
            email_on_mention: true,
            email_on_comment: true,
            email_digest: i % 2 === 0,
            digest_frequency: 'weekly'
        }));
        await prisma.email_preferences.createMany({ data: emailPreferencesData });
        console.log(`✓ 16 Einträge in email_preferences erstellt`);

        // --- PHASE 3: Teachers, Students ---
        const teachersData = [
            { teacher_id: 2, supervisor_id: null },
            { teacher_id: 3, supervisor_id: 2 },
            { teacher_id: 4, supervisor_id: 2 },
            { teacher_id: 5, supervisor_id: 2 },
            { teacher_id: 6, supervisor_id: 2 }
        ];
        await prisma.teachers.createMany({ data: teachersData });
        console.log(`✓ 5 Einträge in teachers erstellt`);

        const studentsData = Array.from({ length: 10 }).map((_, i) => ({
            student_id: i + 7,
            class_id: null // Wird nach Erstellung der Klassen geupdated
        }));
        await prisma.students.createMany({ data: studentsData });
        console.log(`✓ 10 Einträge in students erstellt`);

        // --- PHASE 4: Classes, Roles & Permissions ---
        const classesData = [
            { name: '1AHITM', department_id: 1, head_teacher_id: 2, schedule_id: 10 },
            { name: '2AHITM', department_id: 1, head_teacher_id: 3, schedule_id: 10 },
            { name: '3AHITM', department_id: 1, head_teacher_id: 4, schedule_id: 10 },
            { name: '4AHITM', department_id: 1, head_teacher_id: 5, schedule_id: 10 },
            { name: '5AHITM', department_id: 1, head_teacher_id: 6, schedule_id: 10 },
            { name: '1BHIF', department_id: 1, head_teacher_id: 2, schedule_id: 10 },
            { name: '2BHIF', department_id: 1, head_teacher_id: 3, schedule_id: 10 },
            { name: '3BHIF', department_id: 1, head_teacher_id: 4, schedule_id: 10 },
            { name: '4BHIF', department_id: 1, head_teacher_id: 5, schedule_id: 10 },
            { name: '5BHIF', department_id: 1, head_teacher_id: 6, schedule_id: 10 }
        ];
        await prisma.classes.createMany({ data: classesData });
        console.log(`✓ 10 Einträge in classes erstellt`);

        // Update Students with class_ids (aufteilen auf die ersten 5 Klassen)
        for (let i = 0; i < 10; i++) {
            await prisma.students.update({
                where: { student_id: i + 7 },
                data: { class_id: (i % 5) + 1 }
            });
        }

        const userRolesData = [
            ...[1, 2, 3, 4].map(role_id => ({ user_id: 1, role_id })), // User 1 = Alle Rollen
            ...[2, 3, 4, 5, 6].map(id => ({ user_id: id, role_id: 3 })), // Lehrer
            ...Array.from({ length: 10 }).map((_, i) => ({ user_id: i + 7, role_id: 2 })) // Schüler
        ];
        await prisma.user_roles.createMany({ data: userRolesData });
        console.log(`✓ ${userRolesData.length} Einträge in user_roles erstellt`);

        // === ERWEITERTE USER-PERMISSIONS MIT VERSCHIEDENEN TESTSZENARIEN ===
        
        // SZENARIO 1: Superadmin (User 1) - Alle Permissions unbegrenzt
        const superadminPermissions = Array.from({ length: 10 }).map((_, i) => ({
            user_id: 1,
            permission_id: i + 1,
            valid_from: new Date('2026-01-01'),
            valid_to: null  // Unbegrenzt für Admin
        }));

        // SZENARIO 2: Direktor (User 2) - Manage_users und manage_classes gültig, manage_system abgelaufen
        const directorPermissions = [
            {
                user_id: 2,
                permission_id: 2,  // manage_users
                valid_from: new Date('2026-01-01'),
                valid_to: new Date('2026-12-31')  // Gültig
            },
            {
                user_id: 2,
                permission_id: 8,  // manage_classes
                valid_from: new Date('2026-01-01'),
                valid_to: new Date('2026-12-31')  // Gültig
            },
            {
                user_id: 2,
                permission_id: 10,  // manage_system
                valid_from: new Date('2025-09-01'),
                valid_to: new Date('2025-12-31')  // ABGELAUFEN
            }
        ];

        // SZENARIO 3: Abteilungsvorstand (User 3) - manage_classes, view_grades (zukunftsdatiert)
        const deptLeadPermissions = [
            {
                user_id: 3,
                permission_id: 8,  // manage_classes
                valid_from: new Date('2026-01-01'),
                valid_to: new Date('2026-12-31')  // Gültig
            },
            {
                user_id: 3,
                permission_id: 6,  // view_grades
                valid_from: new Date('2026-04-01'),  // Zukunftsdatiert
                valid_to: new Date('2026-12-31')
            }
        ];

        // SZENARIO 4: Klassenvorstand (User 4) - create_tasks, edit_tasks
        const classLeadPermissions = [
            {
                user_id: 4,
                permission_id: 3,  // create_tasks
                valid_from: new Date('2026-01-01'),
                valid_to: new Date('2026-07-31')
            },
            {
                user_id: 4,
                permission_id: 4,  // edit_tasks
                valid_from: new Date('2026-01-01'),
                valid_to: new Date('2026-07-31')
            }
        ];

        // SZENARIO 5: Lehrer (User 5, 6) - create_tasks, edit_tasks, edit_grades (gültig bis Juli 2026)
        const teacherPermissions = [5, 6].flatMap(teacher_id =>
            [3, 4, 7].map(perm_id => ({  // create_tasks, edit_tasks, edit_grades
                user_id: teacher_id,
                permission_id: perm_id,
                valid_from: new Date('2026-01-01'),
                valid_to: new Date('2026-07-31')  // Gültig für Schuljahr
            }))
        );

        // SZENARIO 6: Schüler - Permissions mit unterschiedlichen Gültigkeiten
        const studentPermissions = [
            // Normaler Schüler (User 7) - view_dashboard gültig
            {
                user_id: 7,
                permission_id: 1,  // view_dashboard
                valid_from: new Date('2026-02-01'),
                valid_to: new Date('2026-06-30')  // Gültig
            },
            // Schüler (User 8) - permission abgelaufen
            {
                user_id: 8,
                permission_id: 1,  // view_dashboard
                valid_from: new Date('2025-12-01'),
                valid_to: new Date('2026-01-31')  // ABGELAUFEN
            },
            // Schüler (User 9) - permission noch nicht gültig
            {
                user_id: 9,
                permission_id: 1,  // view_dashboard
                valid_from: new Date('2026-05-01'),  // Zukunft
                valid_to: new Date('2026-08-31')
            },
            // Schüler (User 10) - view_grades (normalerweise nicht für Schüler)
            {
                user_id: 10,
                permission_id: 6,  // view_grades - Sonderfall
                valid_from: new Date('2026-02-01'),
                valid_to: new Date('2026-06-30')
            },
            // Schüler (User 11-16) - Standard view_dashboard
            ...Array.from({ length: 6 }).map((_, i) => ({
                user_id: 11 + i,
                permission_id: 1,  // view_dashboard
                valid_from: new Date('2026-02-01'),
                valid_to: new Date('2026-06-30')
            }))
        ];

        const allUserPermissions = [
            ...superadminPermissions,
            ...directorPermissions,
            ...deptLeadPermissions,
            ...classLeadPermissions,
            ...teacherPermissions,
            ...studentPermissions
        ];
        await prisma.user_permissions.createMany({ data: allUserPermissions });
        console.log(`✓ ${allUserPermissions.length} Einträge in user_permissions erstellt (mit erweiterten Testszenarien)`);

        // === ROLLEN-PERMISSION-MAPPINGS ===
        const rolesPermissionsData = [
            // Superadmin: Alle Permissions
            ...Array.from({ length: 10 }).map((_, i) => ({
                roles_id: 1, permission_id: i + 1
            })),
            // Direktor: manage_users, manage_classes, manage_system
            { roles_id: 2, permission_id: 2 },   // manage_users
            { roles_id: 2, permission_id: 8 },   // manage_classes
            { roles_id: 2, permission_id: 10 },  // manage_system
            // Abteilungsvorstand: manage_classes, view_schedules, view_grades
            { roles_id: 3, permission_id: 8 },   // manage_classes
            { roles_id: 3, permission_id: 9 },   // view_schedules
            { roles_id: 3, permission_id: 6 },   // view_grades
            // Klassenvorstand: create_tasks, edit_tasks, view_grades
            { roles_id: 4, permission_id: 3 },   // create_tasks
            { roles_id: 4, permission_id: 4 },   // edit_tasks
            { roles_id: 4, permission_id: 6 },   // view_grades
            // Lehrer: create_tasks, edit_tasks, edit_grades
            { roles_id: 5, permission_id: 3 },   // create_tasks
            { roles_id: 5, permission_id: 4 },   // edit_tasks
            { roles_id: 5, permission_id: 7 },   // edit_grades
            // Schüler: view_dashboard, view_grades
            { roles_id: 6, permission_id: 1 },   // view_dashboard
            { roles_id: 6, permission_id: 6 },   // view_grades
            // Schulsprecher: view_dashboard, view_schedules
            { roles_id: 7, permission_id: 1 },   // view_dashboard
            { roles_id: 7, permission_id: 9 },   // view_schedules
            // Sekretariat: view_dashboard, manage_users
            { roles_id: 8, permission_id: 1 },   // view_dashboard
            { roles_id: 8, permission_id: 2 },   // manage_users
            // IT-Admin: manage_system
            { roles_id: 9, permission_id: 10 },  // manage_system
            // Eltern: view_grades
            { roles_id: 10, permission_id: 6 }   // view_grades
        ];
        await prisma.roles_permissions.createMany({ data: rolesPermissionsData });
        console.log(`✓ ${rolesPermissionsData.length} Einträge in roles_permissions erstellt (mit Rolle-spezifischen Permissions)`);

        // --- PHASE 5: Classes_Teachers, Lesson Slots, Task Templates ---
        const classesTeachersData = Array.from({ length: 10 }).map((_, i) => ({
            class_id: i + 1, teacher_id: (i % 5) + 2
        }));
        await prisma.classes_teachers.createMany({ data: classesTeachersData });
        console.log(`✓ 10 Einträge in classes_teachers erstellt`);

        const lessonSlotsData = Array.from({ length: 10 }).map((_, i) => ({
            schedule_id: 10,
            subject_id: i + 1,
            teacher_id: (i % 5) + 2,
            room_id: i + 1,
            day_of_week: (i % 5) + 1, // Montag bis Freitag
            lesson_number: (i % 8) + 1,
            start_time: new Date(`1970-01-01T08:00:00Z`),
            end_time: new Date(`1970-01-01T08:50:00Z`)
        }));
        await prisma.lesson_slots.createMany({ data: lessonSlotsData });
        console.log(`✓ 10 Einträge in lesson_slots erstellt`);

        const taskTemplatesData = Array.from({ length: 10 }).map((_, i) => ({
            created_by: 2,
            name: `Vorlage für Abgabe ${i + 1}`,
            description: `Standardbeschreibung für Abgabe ${i + 1}`
        }));
        await prisma.task_templates.createMany({ data: taskTemplatesData });
        console.log(`✓ 10 Einträge in task_templates erstellt`);

        // --- PHASE 6: Tasks ---
        const parentTasksData = Array.from({ length: 10 }).map((_, i) => ({
            title: `Laborübung ${i + 1}`,
            description: `Bitte die Laborübung ${i + 1} bis zum Ende der Woche abschließen.`,
            status: [task_status.TODO, task_status.IN_PROGRESS, task_status.COMPLETED][i % 3],
            progress: i % 3 === 2 ? 100 : (i * 10),
            created_by: 2,
            assigned_to: i + 7,
            template_id: i + 1,
            priority_id: (i % 5) + 1,
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }));
        await prisma.tasks.createMany({ data: parentTasksData });

        const subTasksData = Array.from({ length: 10 }).map((_, i) => ({
            parent_task_id: i + 1,
            title: `Teilaufgabe ${i + 1}`,
            description: `Teilschritt für Laborübung ${i + 1}`,
            status: task_status.TODO,
            progress: 0,
            created_by: 2,
            assigned_to: i + 7,
            priority_id: 3
        }));
        await prisma.tasks.createMany({ data: subTasksData });
        console.log(`✓ 20 Einträge in tasks erstellt (10 Parent, 10 Subtasks)`);
        const extraSub1 = await prisma.tasks.create({
            data: {
                title: 'Nginx installieren',
                description: 'Webserver auf dem Produktions-Server einrichten',
                status: task_status.COMPLETED,
                progress: 100,
                created_by: 2,
                assigned_to: 7,
                priority_id: 3,
                created_at: new Date('2026-01-04T08:00:00'),
                updated_at: new Date('2026-01-04T08:00:00'),
            }
        });

        const extraSub2 = await prisma.tasks.create({
            data: {
                title: 'SSL Zertifikat einrichten',
                description: 'HTTPS mit Let\'s Encrypt konfigurieren',
                status: task_status.COMPLETED,
                progress: 100,
                created_by: 2,
                assigned_to: 7,
                priority_id: 3,
                created_at: new Date('2026-01-04T09:00:00'),
                updated_at: new Date('2026-01-04T09:00:00'),
            }
        });

        const extraSub3 = await prisma.tasks.create({
            data: {
                title: 'Docker aufsetzen',
                description: 'Container-Umgebung konfigurieren',
                status: task_status.IN_PROGRESS,
                progress: 60,
                created_by: 2,
                assigned_to: 7,
                priority_id: 3,
                created_at: new Date('2026-01-04T10:00:00'),
                updated_at: new Date('2026-01-04T10:00:00'),
            }
        });

        const extraSub4 = await prisma.tasks.create({
            data: {
                title: 'CI/CD Pipeline einrichten',
                description: 'GitHub Actions Workflow erstellen',
                status: task_status.TODO,
                progress: 0,
                created_by: 2,
                assigned_to: 7,
                priority_id: 3,
                created_at: new Date('2026-01-04T11:00:00'),
                updated_at: new Date('2026-01-04T11:00:00'),
            }
        });

        // Jetzt den Parent-Task mit echten Subtask-IDs erstellen
        const extraParent = await prisma.tasks.create({
            data: {
                title: 'Server aufsetzen',
                description: 'Produktions-Server für Diplomarbeit konfigurieren',
                status: task_status.IN_PROGRESS,
                progress: 50,
                created_by: 2,
                assigned_to: 7,
                priority_id: 3,
                auto_complete: true,
                deadline: new Date('2026-02-15T23:59:00'),
                created_at: new Date('2026-01-03T10:00:00'),
                updated_at: new Date('2026-01-03T10:00:00'),
                completion_rule: {
                    type: 'operator',
                    operator: 'OR',
                    operands: [
                        {
                            type: 'operator',
                            operator: 'AND',
                            operands: [
                                { type: 'leaf', task_id: String(extraSub1.task_id) },
                                { type: 'leaf', task_id: String(extraSub2.task_id) },
                            ]
                        },
                        {
                            type: 'operator',
                            operator: 'AND',
                            operands: [
                                { type: 'leaf', task_id: String(extraSub3.task_id) },
                                { type: 'leaf', task_id: String(extraSub4.task_id) },
                            ]
                        }
                    ]
                }
            }
        });

        // Subtasks dem Parent zuweisen
        await prisma.tasks.updateMany({
            where: { task_id: { in: [extraSub1.task_id, extraSub2.task_id, extraSub3.task_id, extraSub4.task_id] } },
            data: { parent_task_id: extraParent.task_id }
        });

        console.log(`✓ Extra Task "Server aufsetzen" mit completion_rule erstellt (ID: ${extraParent.task_id})`);

        // --- PHASE 7: Notes, Documents, Chat Rooms ---
        const notesData = Array.from({ length: 10 }).map((_, i) => ({
            title: `Notiz zur Konferenz ${i + 1}`,
            created_by: 2,
            description: `Wichtige Beschlüsse aus der Sitzung ${i + 1}`,
            subject_id: i + 1,
            priority_id: 3
        }));
        await prisma.notes.createMany({ data: notesData });
        console.log(`✓ 10 Einträge in notes erstellt`);

        const documentsData = Array.from({ length: 10 }).map((_, i) => ({
            name: `Skriptum_Teil${i + 1}.pdf`,
            file_path: `/uploads/docs/skriptum_${i + 1}.pdf`,
            file_size: 1024 * (i + 1),
            mime_type: 'application/pdf',
            added_by: 2
        }));
        await prisma.documents.createMany({ data: documentsData });
        console.log(`✓ 10 Einträge in documents erstellt`);

        // Direct Chats (is_private: true, direct_chat_hash = 'direct_{minId}_{maxId}')
        // Room IDs 1-3
        const directChatsData = [
            { name: null, is_private: true, direct_chat_hash: 'direct_1_2', created_by: 1 }, // Admin <-> Anna
            { name: null, is_private: true, direct_chat_hash: 'direct_1_7', created_by: 1 }, // Admin <-> Felix
            { name: null, is_private: true, direct_chat_hash: 'direct_2_3', created_by: 2 }, // Anna <-> Peter
        ];
        await prisma.chat_rooms.createMany({ data: directChatsData });
        console.log(`✓ 3 Direct Chat Rooms erstellt (IDs 1–3)`);

        // Group Rooms (is_private: false)
        // Room IDs 4-6
        const groupRoomsData = [
            { name: 'Lehrerkonferenz', is_private: false, created_by: 2 },                      // alle Lehrer + Admin
            { name: '5AHITM Klassenchat', is_private: false, class_id: 5, created_by: 6 },      // KV + Klasse 5
            { name: 'Diplomarbeit Gruppe', is_private: false, created_by: 3 },                  // Peter + ein paar Schüler
        ];
        await prisma.chat_rooms.createMany({ data: groupRoomsData });
        console.log(`✓ 3 Group Chat Rooms erstellt (IDs 4–6)`);

        // --- PHASE 8: Junction & Log Tables ---
        // --- Chat Room Users ---
        // Klasse 5 Schüler: user_id 11 (Tobias) und 16 (Emma) → class_id = (i%5)+1 für i=4 und i=9
        const chatRoomUsersData = [
            // Room 1 – Direct: Admin (1) <-> Anna (2)
            { room_id: 1, user_id: 1 },
            { room_id: 1, user_id: 2 },
            // Room 2 – Direct: Admin (1) <-> Felix (7)
            { room_id: 2, user_id: 1 },
            { room_id: 2, user_id: 7 },
            // Room 3 – Direct: Anna (2) <-> Peter (3)
            { room_id: 3, user_id: 2 },
            { room_id: 3, user_id: 3 },
            // Room 4 – Lehrerkonferenz: Admin + alle Lehrer
            { room_id: 4, user_id: 1 },
            { room_id: 4, user_id: 2 },
            { room_id: 4, user_id: 3 },
            { room_id: 4, user_id: 4 },
            { room_id: 4, user_id: 5 },
            { room_id: 4, user_id: 6 },
            // Room 5 – 5AHITM: KV Julia (6) + Tobias (11) + Emma (16)
            { room_id: 5, user_id: 6 },
            { room_id: 5, user_id: 11 },
            { room_id: 5, user_id: 16 },
            // Room 6 – Diplomarbeit: Peter (3) + Felix (7) + Laura (8) + David (9)
            { room_id: 6, user_id: 3 },
            { room_id: 6, user_id: 7 },
            { room_id: 6, user_id: 8 },
            { room_id: 6, user_id: 9 },
        ];
        await prisma.chat_room_users.createMany({ data: chatRoomUsersData });
        console.log(`✓ ${chatRoomUsersData.length} Einträge in chat_room_users erstellt`);

        // --- Chat Messages ---
        const chatMessagesData = [
            // Room 1 – Admin <-> Anna (Direct)
            { room_id: 1, user_id: 1, message: 'Hallo Anna, kannst du mir kurz sagen wann die nächste Lehrerkonferenz ist?' },
            { room_id: 1, user_id: 2, message: 'Hi Max! Ja, kommenden Dienstag um 14 Uhr im großen Konferenzsaal.' },
            { room_id: 1, user_id: 1, message: 'Super, danke! Ich trag das gleich ein.' },

            // Room 2 – Admin <-> Felix (Direct)
            { room_id: 2, user_id: 7, message: 'Guten Tag, ich wollte fragen ob mein Zugang zum Schulsystem schon freigeschaltet wurde?' },
            { room_id: 2, user_id: 1, message: 'Hallo Felix! Ja, sollte jetzt gehen. Einfach mit deinem Schulaccount einloggen.' },
            { room_id: 2, user_id: 7, message: 'Perfekt, hat geklappt. Danke!' },

            // Room 3 – Anna <-> Peter (Direct)
            { room_id: 3, user_id: 2, message: 'Peter, hast du die Abgaben von der 3AHITM schon korrigiert?' },
            { room_id: 3, user_id: 3, message: 'Bin gerade dabei, dauert noch bis morgen Abend.' },
            { room_id: 3, user_id: 2, message: 'Kein Stress, Deadline ist erst Freitag. 👍' },

            // Room 4 – Lehrerkonferenz (Group)
            { room_id: 4, user_id: 2, message: 'Guten Morgen alle! Erinnerung: Zeugnisnoten bis Donnerstag ins System einpflegen.' },
            { room_id: 4, user_id: 4, message: 'Danke für die Erinnerung! Mache ich heute Nachmittag.' },
            { room_id: 4, user_id: 5, message: 'Gilt das auch für die Nachtragsbeurteilungen?' },
            { room_id: 4, user_id: 2, message: 'Ja, alles was noch offen ist bitte bis Donnerstag.' },
            { room_id: 4, user_id: 1, message: 'Ich schick euch noch eine offizielle Erinnerungsmail raus.' },

            // Room 5 – 5AHITM Klassenchat (Group)
            { room_id: 5, user_id: 6, message: 'Hallo 5AHITM! Die Schularbeit am Freitag findet im EDV 1 statt, nicht im Klassenzimmer.' },
            { room_id: 5, user_id: 11, message: 'Danke für die Info! Welche Themen kommen dran?' },
            { room_id: 5, user_id: 6, message: 'Kapitel 3 bis 6 aus dem Skriptum, wie besprochen.' },
            { room_id: 5, user_id: 16, message: 'Dürfen wir Unterlagen mitnehmen?' },
            { room_id: 5, user_id: 6, message: 'Nein, closed book. Viel Erfolg beim Lernen! 📚' },

            // Room 6 – Diplomarbeit (Group)
            { room_id: 6, user_id: 3, message: 'Guten Morgen! Wie ist der aktuelle Stand beim Backend?' },
            { room_id: 6, user_id: 7, message: 'Nginx läuft, SSL ist eingerichtet. Gerade noch am Docker-Setup.' },
            { room_id: 6, user_id: 8, message: 'Ich hab das Frontend-Deployment fertig, warte auf die API-URL von Felix.' },
            { room_id: 6, user_id: 9, message: 'Die Doku hab ich auf den neuesten Stand gebracht.' },
            { room_id: 6, user_id: 3, message: 'Sehr gut! Nächstes Meeting Mittwoch 10 Uhr, dann schauen wir uns alles gemeinsam an.' },
        ];
        await prisma.chat_messages.createMany({ data: chatMessagesData });
        console.log(`✓ ${chatMessagesData.length} Einträge in chat_messages erstellt`);

        const documentSharesData = Array.from({ length: 10 }).map((_, i) => ({
            document_id: i + 1,
            user_id: i + 7
        }));
        await prisma.document_shares.createMany({ data: documentSharesData });
        console.log(`✓ 10 Einträge in document_shares erstellt`);

        const noteDocumentsData = Array.from({ length: 10 }).map((_, i) => ({
            note_id: i + 1,
            document_id: i + 1
        }));
        await prisma.note_documents.createMany({ data: noteDocumentsData });
        console.log(`✓ 10 Einträge in note_documents erstellt`);

        const notesUsersData = Array.from({ length: 10 }).map((_, i) => ({
            note_id: i + 1,
            user_id: 2
        }));
        await prisma.notes_users.createMany({ data: notesUsersData });
        console.log(`✓ 10 Einträge in notes_users erstellt`);

        const notificationsData = Array.from({ length: 10 }).map((_, i) => ({
            user_id: i + 7,
            type: 'TASK_ASSIGNED',
            text: `Dir wurde die Aufgabe ${i + 1} zugewiesen.`,
            is_read: i % 2 === 0
        }));
        await prisma.notifications.createMany({ data: notificationsData });
        console.log(`✓ 10 Einträge in notifications erstellt`);

        const taskActivityLogData = Array.from({ length: 10 }).map((_, i) => ({
            task_id: i + 1,
            user_id: 2,
            action: 'CREATED_TASK'
        }));
        await prisma.task_activity_log.createMany({ data: taskActivityLogData });
        console.log(`✓ 10 Einträge in task_activity_log erstellt`);

        const taskCommentsData = Array.from({ length: 10 }).map((_, i) => ({
            task_id: i + 1,
            user_id: i + 7,
            text: `Ich habe eine Frage zu Teilschritt ${i + 1}`
        }));
        await prisma.task_comments.createMany({ data: taskCommentsData });
        console.log(`✓ 10 Einträge in task_comments erstellt`);

        const taskDocumentsData = Array.from({ length: 10 }).map((_, i) => ({
            task_id: i + 1,
            document_id: i + 1
        }));
        await prisma.task_documents.createMany({ data: taskDocumentsData });
        console.log(`✓ 10 Einträge in task_documents erstellt`);

        const emailLogsData = Array.from({ length: 10 }).map((_, i) => ({
            user_id: i + 7,
            recipient: `student${i + 7}@htl.at`,
            subject: `Neue Aufgabe: Laborübung ${i + 1}`,
            email_type: 'deadline',
            status: 'sent',
            sent_at: new Date()
        }));
        await prisma.email_logs.createMany({ data: emailLogsData });
        console.log(`✓ 10 Einträge in email_logs erstellt`);

        // --- ZUSAMMENFASSUNG ---
        console.log('\n=============================================');
        console.log('SEEDING ERFOLGREICH ABGESCHLOSSEN!');
        console.log('Daten für Schulverwaltungssystem generiert.');
        console.log('User ID 1 (Max Mustermann / adminadmin) ist Superuser.');
        console.log('Passwörter für alle User: "password123"');
        console.log('');
        console.log('Chat-Übersicht:');
        console.log('  Direct:  Admin↔Anna (R1) | Admin↔Felix (R2) | Anna↔Peter (R3)');
        console.log('  Groups:  Lehrerkonferenz (R4) | 5AHITM (R5) | Diplomarbeit (R6)');
        console.log('=============================================\n');

    } catch (error) {
        console.error('\nFEHLER WÄHREND DEM SEEDING:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();