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

        const permissionsData = [
            { name: 'view_dashboard' }, { name: 'manage_users' }, { name: 'create_tasks' },
            { name: 'edit_tasks' }, { name: 'delete_tasks' }, { name: 'view_grades' },
            { name: 'edit_grades' }, { name: 'manage_classes' }, { name: 'view_schedules' },
            { name: 'manage_system' }
        ];
        await prisma.permissions.createMany({ data: permissionsData });
        console.log(`✓ 10 Einträge in permissions erstellt`);

        const rolesData = [
            { name: 'Superadmin' }, { name: 'Direktor' }, { name: 'Abteilungsvorstand' },
            { name: 'Klassenvorstand' }, { name: 'Lehrer' }, { name: 'Schüler' },
            { name: 'Schulsprecher' }, { name: 'Sekretariat' }, { name: 'IT-Admin' },
            { name: 'Eltern' }
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
            ...Array.from({ length: 10 }).map((_, i) => ({ user_id: 1, role_id: i + 1 })), // User 1 = Alle Rollen
            ...[2, 3, 4, 5, 6].map(id => ({ user_id: id, role_id: 5 })), // Lehrer
            ...Array.from({ length: 10 }).map((_, i) => ({ user_id: i + 7, role_id: 6 })) // Schüler
        ];
        await prisma.user_roles.createMany({ data: userRolesData });
        console.log(`✓ ${userRolesData.length} Einträge in user_roles erstellt`);

        const userPermissionsData = Array.from({ length: 10 }).map((_, i) => ({
            user_id: 1, permission_id: i + 1
        }));
        await prisma.user_permissions.createMany({ data: userPermissionsData });
        console.log(`✓ 10 Einträge in user_permissions erstellt`);

        const rolesPermissionsData = Array.from({ length: 10 }).map((_, i) => ({
            roles_id: 1, permission_id: i + 1 // Superadmin hat alle Berechtigungen
        }));
        await prisma.roles_permissions.createMany({ data: rolesPermissionsData });
        console.log(`✓ 10 Einträge in roles_permissions erstellt`);

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

        const chatRoomsData = Array.from({ length: 10 }).map((_, i) => ({
            name: i === 0 ? 'Lehrerzimmer' : `Klassenchat Gruppe ${i}`,
            class_id: i === 0 ? null : i,
            task_id: null
        }));
        await prisma.chat_rooms.createMany({ data: chatRoomsData });
        console.log(`✓ 10 Einträge in chat_rooms erstellt`);

        // --- PHASE 8: Junction & Log Tables ---
        const chatMessagesData = Array.from({ length: 10 }).map((_, i) => ({
            room_id: 1,
            user_id: (i % 5) + 2,
            message: `Nachricht ${i + 1} im Lehrerzimmer`,
        }));
        await prisma.chat_messages.createMany({ data: chatMessagesData });
        console.log(`✓ 10 Einträge in chat_messages erstellt`);

        const chatRoomUsersData = Array.from({ length: 10 }).map((_, i) => ({
            room_id: i + 1,
            user_id: 2
        }));
        await prisma.chat_room_users.createMany({ data: chatRoomUsersData });
        console.log(`✓ 10 Einträge in chat_room_users erstellt`);

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
        console.log('=============================================\n');

    } catch (error) {
        console.error('\nFEHLER WÄHREND DEM SEEDING:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();