import "dotenv/config"; // IMPORTANT: loads DATABASE_URL from your .env
import { PrismaClient, task_status } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcrypt";
import {
  BCRYPT_COST,
  GHOST_USER,
  getPermissionsForRole,
} from "../src/contexts/identity-access/application";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL ist nicht in der .env definiert!");
}

// Prisma 7 setup: the client requires the adapter
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool, { disposeExternalPool: true });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starte Seed-Prozess...");

  try {
    // --- CLEANUP ---
    const tableNames = [
      "refresh_tokens",
      "email_logs",
      "email_preferences",
      "comments",
      "task_grade",
      "task_tags",
      "tags",
      "task_activity_log",
      "task_documents",
      "task_members",
      "chat_messages",
      "chat_room_users",
      "chat_rooms",
      "document_shares",
      "note_documents",
      "notes_users",
      "notes",
      "documents",
      "tasks",
      "task_templates",
      "lesson_slots",
      "classes_teachers",
      "students",
      "classes",
      "user_roles",
      "user_permissions",
      "roles_permissions",
      "roles",
      "permissions",
      "teachers",
      "users",
      "subjects",
      "rooms",
      "schedules",
      "priorities",
      "departments",
      "notifications",
    ];

    console.log("Führe Cleanup durch...");
    for (const tableName of tableNames) {
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`,
      );
    }
    console.log("✓ Alle Tabellen geleert und Sequences zurückgesetzt.");

    // --- PHASE 1: Base Data ---
    const departmentsData = [
      { name: "Informatik" },
      { name: "Medientechnik" },
      { name: "Netzwerktechnik" },
      { name: "Maschinenbau" },
      { name: "Elektrotechnik" },
      { name: "Mechatronik" },
      { name: "Wirtschaftsingenieurwesen" },
      { name: "Biomedizin" },
      { name: "Optometrie" },
      { name: "Informationstechnik" },
    ];
    await prisma.departments.createMany({ data: departmentsData });
    console.log(`✓ 10 Einträge in departments erstellt`);

    // T58 (M18, decision Q15): the four priorities the UI shows, IDs 1-4
    const prioritiesData = [
      { name: "Niedrig" },
      { name: "Mittel" },
      { name: "Hoch" },
      { name: "Dringend" },
    ];
    await prisma.priorities.createMany({ data: prioritiesData });
    console.log(`✓ ${prioritiesData.length} Einträge in priorities erstellt`);

    // Flags: READ=4, WRITE=2, EXECUTE=1
    const permissionsData = [
      { name: "view_dashboard", description: "Dashboard anschauen", flags: 4 }, // READ
      { name: "manage_users", description: "Benutzer verwalten", flags: 7 }, // RWX
      { name: "create_tasks", description: "Aufgaben erstellen", flags: 7 }, // RWX
      { name: "edit_tasks", description: "Aufgaben bearbeiten", flags: 6 }, // RW
      { name: "delete_tasks", description: "Aufgaben löschen", flags: 5 }, // RX
      { name: "view_grades", description: "Noten einsehen", flags: 4 }, // READ
      { name: "edit_grades", description: "Noten eintragen", flags: 6 }, // RW
      { name: "manage_classes", description: "Klassen verwalten", flags: 7 }, // RWX
      {
        name: "view_schedules",
        description: "Stundenpläne anschauen",
        flags: 4,
      }, // READ
      { name: "manage_system", description: "System administrieren", flags: 7 }, // RWX
    ];
    await prisma.permissions.createMany({ data: permissionsData });
    console.log(`✓ 10 Einträge in permissions erstellt (mit Flags)`);

    const rolesData = [
      { name: "Superuser" },
      { name: "Student" },
      { name: "Teacher" },
      { name: "Admin" },
    ];
    await prisma.roles.createMany({ data: rolesData });
    console.log(`✓ ${rolesData.length} Einträge in roles erstellt`);

    const schedulesData = Array.from({ length: 10 }).map((_, i) => ({
      name: `Semester ${2020 + Math.floor(i / 2)}${i % 2 === 0 ? "WS" : "SS"}`,
      valid_from: new Date(
        `${2020 + Math.floor(i / 2)}-${i % 2 === 0 ? "09-01" : "02-01"}`,
      ),
      valid_to: new Date(
        `${2021 + Math.floor(i / 2)}-${i % 2 === 0 ? "01-31" : "07-01"}`,
      ),
    }));
    await prisma.schedules.createMany({ data: schedulesData });
    console.log(`✓ 10 Einträge in schedules erstellt`);

    const roomsData = [
      { name: "EDV 1", type: "Labor", capacity: 30, building: "Hauptgebäude" },
      { name: "EDV 2", type: "Labor", capacity: 30, building: "Hauptgebäude" },
      {
        name: "Netzwerklabor",
        type: "Labor",
        capacity: 20,
        building: "Nebengebäude",
      },
      {
        name: "Klasse 1A",
        type: "Klassenzimmer",
        capacity: 36,
        building: "Hauptgebäude",
      },
      { name: "Physiksaal", type: "Labor", capacity: 40, building: "Altbau" },
      {
        name: "Klasse 2A",
        type: "Klassenzimmer",
        capacity: 36,
        building: "Hauptgebäude",
      },
      { name: "Chemie", type: "Labor", capacity: 30, building: "Altbau" },
      {
        name: "Klasse 3A",
        type: "Klassenzimmer",
        capacity: 36,
        building: "Hauptgebäude",
      },
      {
        name: "Bibliothek",
        type: "Aufenthaltsraum",
        capacity: 50,
        building: "Nebengebäude",
      },
      {
        name: "Turnsaal",
        type: "Sport",
        capacity: 100,
        building: "Sporttrakt",
      },
    ];
    await prisma.rooms.createMany({ data: roomsData });
    console.log(`✓ 10 Einträge in rooms erstellt`);

    const subjectsData = [
      { name: "Programmieren", short_name: "POS" },
      { name: "Datenbanken", short_name: "DBI" },
      { name: "Netzwerktechnik", short_name: "NWT" },
      { name: "Mathematik", short_name: "AM" },
      { name: "Deutsch", short_name: "D" },
      { name: "Englisch", short_name: "E" },
      { name: "Softwareentwicklung", short_name: "SEW" },
      { name: "Betriebssysteme", short_name: "BSY" },
      { name: "IT-Projekte", short_name: "ITP" },
      { name: "Medientechnik", short_name: "MED" },
    ];
    await prisma.subjects.createMany({ data: subjectsData });
    console.log(`✓ 10 Einträge in subjects erstellt`);

    // --- PHASE 2: Users ---
    const passwordHash = await bcrypt.hash("password123", BCRYPT_COST);

    const usersData = [
      {
        firstname: "Max",
        lastname: "Mustermann",
        email: "admin@htl.at",
        username: "adminadmin",
        password_hash: passwordHash,
      }, // ID 1 (Superuser)
      {
        firstname: "Anna",
        lastname: "Lehrerin",
        email: "anna.lehrerin@htl.at",
        username: "alehrerin",
        password_hash: passwordHash,
      }, // ID 2
      {
        firstname: "Peter",
        lastname: "Schmidt",
        email: "peter.schmidt@htl.at",
        username: "pschmidt",
        password_hash: passwordHash,
      }, // ID 3
      {
        firstname: "Maria",
        lastname: "Huber",
        email: "maria.huber@htl.at",
        username: "mhuber",
        password_hash: passwordHash,
      }, // ID 4
      {
        firstname: "Lukas",
        lastname: "Wagner",
        email: "lukas.wagner@htl.at",
        username: "lwagner",
        password_hash: passwordHash,
      }, // ID 5
      {
        firstname: "Julia",
        lastname: "Bauer",
        email: "julia.bauer@htl.at",
        username: "jbauer",
        password_hash: passwordHash,
      }, // ID 6
      {
        firstname: "Felix",
        lastname: "Fuchs",
        email: "felix.fuchs@student.htl.at",
        username: "ffuchs",
        password_hash: passwordHash,
      }, // ID 7 (Student)
      {
        firstname: "Laura",
        lastname: "Gruber",
        email: "laura.gruber@student.htl.at",
        username: "lgruber",
        password_hash: passwordHash,
      }, // ID 8
      {
        firstname: "David",
        lastname: "Wolf",
        email: "david.wolf@student.htl.at",
        username: "dwolf",
        password_hash: passwordHash,
      }, // ID 9
      {
        firstname: "Sarah",
        lastname: "Schwaiger",
        email: "sarah.schwaiger@student.htl.at",
        username: "sschwaiger",
        password_hash: passwordHash,
      }, // ID 10
      {
        firstname: "Tobias",
        lastname: "Eder",
        email: "tobias.eder@student.htl.at",
        username: "teder",
        password_hash: passwordHash,
      }, // ID 11
      {
        firstname: "Lena",
        lastname: "Moser",
        email: "lena.moser@student.htl.at",
        username: "lmoser",
        password_hash: passwordHash,
      }, // ID 12
      {
        firstname: "Simon",
        lastname: "Pichler",
        email: "simon.pichler@student.htl.at",
        username: "spichler",
        password_hash: passwordHash,
      }, // ID 13
      {
        firstname: "Mia",
        lastname: "Steiner",
        email: "mia.steiner@student.htl.at",
        username: "msteiner",
        password_hash: passwordHash,
      }, // ID 14
      {
        firstname: "Paul",
        lastname: "Wallner",
        email: "paul.wallner@student.htl.at",
        username: "pwallner",
        password_hash: passwordHash,
      }, // ID 15
      {
        firstname: "Emma",
        lastname: "Auer",
        email: "emma.auer@student.htl.at",
        username: "eauer",
        password_hash: passwordHash,
      }, // ID 16
      // Google OAuth test users (no password_hash)
      {
        firstname: "Google",
        lastname: "Testuser",
        email: "test@gmail.com",
        username: "test@gmail.com",
        google_id: "123456789012345678901",
        password_hash: null,
      }, // ID 17
      {
        firstname: "Max",
        lastname: "Mustermann",
        email: "max.mustermann@gmail.com",
        username: "max.mustermann@gmail.com",
        google_id: "123456789012345678902",
        password_hash: null,
      }, // ID 18
      {
        firstname: "Demo",
        lastname: "User",
        email: "demo.user@gmail.com",
        username: "demo.user@gmail.com",
        google_id: "123456789012345678903",
        password_hash: null,
      }, // ID 19
    ];

    await prisma.users.createMany({ data: usersData });
    // T10 (M14): deleted accounts' content moves to the ghost user 0; an
    // explicit id doesn't advance the sequence, so the IDs above stay the same
    await prisma.users.create({ data: GHOST_USER });
    console.log(
      `✓ ${usersData.length} Einträge in users erstellt (davon 3 mit Google OAuth)`,
    );

    const emailPreferencesData = Array.from({ length: 19 }).map((_, i) => ({
      user_id: i + 1,
      email_on_deadline: true,
      email_on_mention: true,
      email_on_comment: true,
      email_digest: i % 2 === 0,
      digest_frequency: "weekly",
    }));
    await prisma.email_preferences.createMany({ data: emailPreferencesData });
    console.log(
      `✓ ${emailPreferencesData.length} Einträge in email_preferences erstellt`,
    );

    // --- PHASE 3: Teachers, Students ---
    const teachersData = [
      { teacher_id: 2, supervisor_id: null },
      { teacher_id: 3, supervisor_id: 2 },
      { teacher_id: 4, supervisor_id: 2 },
      { teacher_id: 5, supervisor_id: 2 },
      { teacher_id: 6, supervisor_id: 2 },
    ];
    await prisma.teachers.createMany({ data: teachersData });
    console.log(`✓ 5 Einträge in teachers erstellt`);

    const studentsData = Array.from({ length: 13 }).map((_, i) => ({
      student_id: i + 7,
      class_id: null, // Updated after the classes are created
    }));
    await prisma.students.createMany({ data: studentsData });
    console.log(`✓ 13 Einträge in students erstellt (inkl. Google OAuth User)`);

    // --- PHASE 4: Classes, Roles & Permissions ---
    const classesData = [
      { name: "1AHITM", department_id: 1, head_teacher_id: 2, schedule_id: 10 },
      { name: "2AHITM", department_id: 1, head_teacher_id: 3, schedule_id: 10 },
      { name: "3AHITM", department_id: 1, head_teacher_id: 4, schedule_id: 10 },
      { name: "4AHITM", department_id: 1, head_teacher_id: 5, schedule_id: 10 },
      { name: "5AHITM", department_id: 1, head_teacher_id: 6, schedule_id: 10 },
      { name: "1BHIF", department_id: 1, head_teacher_id: 2, schedule_id: 10 },
      { name: "2BHIF", department_id: 1, head_teacher_id: 3, schedule_id: 10 },
      { name: "3BHIF", department_id: 1, head_teacher_id: 4, schedule_id: 10 },
      { name: "4BHIF", department_id: 1, head_teacher_id: 5, schedule_id: 10 },
      { name: "5BHIF", department_id: 1, head_teacher_id: 6, schedule_id: 10 },
    ];
    await prisma.classes.createMany({ data: classesData });
    console.log(`✓ 10 Einträge in classes erstellt`);

    // Update students with class_ids (spread over the first 5 classes)
    for (let i = 0; i < 13; i++) {
      await prisma.students.update({
        where: { student_id: i + 7 },
        data: { class_id: (i % 5) + 1 },
      });
    }

    const userRolesData = [
      // User 1: Superuser role (covers all Superuser rights)
      { user_id: 1, role_id: 1 }, // Superuser
      // User 2-6: Teachers
      { user_id: 2, role_id: 3 },
      { user_id: 3, role_id: 3 },
      { user_id: 4, role_id: 3 },
      { user_id: 5, role_id: 3 },
      { user_id: 6, role_id: 3 },
      // User 7-16: Students
      ...Array.from({ length: 10 }).map((_, i) => ({
        user_id: i + 7,
        role_id: 2,
      })),
      // User 17-19: Google OAuth Test Users (Students)
      { user_id: 17, role_id: 2 }, // test@gmail.com -> Student
      { user_id: 18, role_id: 2 }, // max.mustermann@gmail.com -> Student
      { user_id: 19, role_id: 2 }, // demo.user@gmail.com -> Student
    ];
    await prisma.user_roles.createMany({ data: userRolesData });
    console.log(
      `✓ ${userRolesData.length} Einträge in user_roles erstellt (inkl. Google OAuth User)`,
    );

    // === EXTENDED USER PERMISSIONS WITH DIFFERENT TEST SCENARIOS ===

    // SCENARIO 1: superadmin (user 1) - all permissions, unlimited
    const superadminPermissions = Array.from({ length: 10 }).map((_, i) => ({
      user_id: 1,
      permission_id: i + 1,
      valid_from: new Date("2026-01-01"),
      valid_to: null, // Unlimited for admin
    }));

    // SCENARIO 2: principal (user 2) - manage_users and manage_classes valid, manage_system expired
    const directorPermissions = [
      {
        user_id: 2,
        permission_id: 2, // manage_users
        valid_from: new Date("2026-01-01"),
        valid_to: new Date("2026-12-31"), // Valid
      },
      {
        user_id: 2,
        permission_id: 8, // manage_classes
        valid_from: new Date("2026-01-01"),
        valid_to: new Date("2026-12-31"), // Valid
      },
      {
        user_id: 2,
        permission_id: 10, // manage_system
        valid_from: new Date("2025-09-01"),
        valid_to: new Date("2025-12-31"), // EXPIRED
      },
    ];

    // SCENARIO 3: head of department (user 3) - manage_classes, view_grades (future-dated)
    const deptLeadPermissions = [
      {
        user_id: 3,
        permission_id: 8, // manage_classes
        valid_from: new Date("2026-01-01"),
        valid_to: new Date("2026-12-31"), // Valid
      },
      {
        user_id: 3,
        permission_id: 6, // view_grades
        valid_from: new Date("2026-04-01"), // Future-dated
        valid_to: new Date("2026-12-31"),
      },
    ];

    // SCENARIO 4: class teacher (user 4) - create_tasks, edit_tasks
    const classLeadPermissions = [
      {
        user_id: 4,
        permission_id: 3, // create_tasks
        valid_from: new Date("2026-01-01"),
        valid_to: new Date("2026-07-31"),
      },
      {
        user_id: 4,
        permission_id: 4, // edit_tasks
        valid_from: new Date("2026-01-01"),
        valid_to: new Date("2026-07-31"),
      },
    ];

    // SCENARIO 5: teachers (users 5, 6) - create_tasks, edit_tasks, edit_grades (valid until July 2026)
    const teacherPermissions = [5, 6].flatMap((teacher_id) =>
      [3, 4, 7].map((perm_id) => ({
        // create_tasks, edit_tasks, edit_grades
        user_id: teacher_id,
        permission_id: perm_id,
        valid_from: new Date("2026-01-01"),
        valid_to: new Date("2026-07-31"), // Valid for the school year
      })),
    );

    // SCENARIO 6: students - permissions with different validity periods
    const studentPermissions = [
      // Regular student (user 7) - view_dashboard valid
      {
        user_id: 7,
        permission_id: 1, // view_dashboard
        valid_from: new Date("2026-02-01"),
        valid_to: new Date("2026-06-30"), // Valid
      },
      // Student (user 8) - permission expired
      {
        user_id: 8,
        permission_id: 1, // view_dashboard
        valid_from: new Date("2025-12-01"),
        valid_to: new Date("2026-01-31"), // EXPIRED
      },
      // Student (user 9) - permission not yet valid
      {
        user_id: 9,
        permission_id: 1, // view_dashboard
        valid_from: new Date("2026-05-01"), // Future
        valid_to: new Date("2026-08-31"),
      },
      // Student (user 10) - view_grades (normally not for students)
      {
        user_id: 10,
        permission_id: 6, // view_grades - special case
        valid_from: new Date("2026-02-01"),
        valid_to: new Date("2026-06-30"),
      },
      // Students (users 11-16) - default view_dashboard
      ...Array.from({ length: 6 }).map((_, i) => ({
        user_id: 11 + i,
        permission_id: 1, // view_dashboard
        valid_from: new Date("2026-02-01"),
        valid_to: new Date("2026-06-30"),
      })),
    ];

    const allUserPermissions = [
      ...superadminPermissions,
      ...directorPermissions,
      ...deptLeadPermissions,
      ...classLeadPermissions,
      ...teacherPermissions,
      ...studentPermissions,
    ];
    await prisma.user_permissions.createMany({ data: allUserPermissions });
    console.log(
      `✓ ${allUserPermissions.length} Einträge in user_permissions erstellt (mit erweiterten Testszenarien)`,
    );

    // === ROLE-PERMISSION MAPPINGS ===
    // role permissions follow src/contexts/identity-access/domain/role-permissions.ts (decision F4)
    const roleRows = await prisma.roles.findMany();
    const permissionRows = await prisma.permissions.findMany();
    const rolesPermissionsData = roleRows.flatMap((role) =>
      getPermissionsForRole(role.name ?? "").map((permissionName) => {
        const permission = permissionRows.find(
          (p) => p.name === permissionName,
        );
        if (!permission)
          throw new Error(
            `Unknown permission in role config: ${permissionName}`,
          );
        return {
          roles_id: role.role_id,
          permission_id: permission.permission_id,
        };
      }),
    );
    await prisma.roles_permissions.createMany({ data: rolesPermissionsData });
    console.log(
      `✓ ${rolesPermissionsData.length} Einträge in roles_permissions erstellt`,
    );

    // --- PHASE 5: Classes_Teachers, Lesson Slots, Task Templates ---
    const classesTeachersData = Array.from({ length: 10 }).map((_, i) => ({
      class_id: i + 1,
      teacher_id: (i % 5) + 2,
    }));
    await prisma.classes_teachers.createMany({ data: classesTeachersData });
    console.log(`✓ 10 Einträge in classes_teachers erstellt`);

    const lessonSlotsData = Array.from({ length: 10 }).map((_, i) => ({
      schedule_id: 10,
      subject_id: i + 1,
      teacher_id: (i % 5) + 2,
      room_id: i + 1,
      day_of_week: (i % 5) + 1, // Monday to Friday
      lesson_number: (i % 8) + 1,
      start_time: new Date(`1970-01-01T08:00:00Z`),
      end_time: new Date(`1970-01-01T08:50:00Z`),
    }));
    await prisma.lesson_slots.createMany({ data: lessonSlotsData });
    console.log(`✓ 10 Einträge in lesson_slots erstellt`);

    const taskTemplatesData = Array.from({ length: 10 }).map((_, i) => ({
      created_by: 2,
      name: `Vorlage für Abgabe ${i + 1}`,
      description: `Standardbeschreibung für Abgabe ${i + 1}`,
    }));
    await prisma.task_templates.createMany({ data: taskTemplatesData });
    console.log(`✓ 10 Einträge in task_templates erstellt`);

    // --- PHASE 6: tasks with realistic dates for the calendar ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Tasks on different days of this week and next week
    const parentTasksData = [
      // This week, Monday
      {
        title: "Mathe Test",
        description: "Vorbereitung auf Mathe Test - Integralrechnung",
        status: task_status.TODO,
        progress: 30,
        created_by: 2,
        assigned_to: 7,
        template_id: 1,
        priority_id: 3, // Hoch (formerly 5, Sehr Wichtig; Q15)
        deadline: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000), // +1 day
      },
      // This week, Wednesday
      {
        title: "Englisch Vokabeln",
        description: "Unit 5 Vokabeln lernen für Quiz",
        status: task_status.IN_PROGRESS,
        progress: 60,
        created_by: 2,
        assigned_to: 8,
        template_id: 2,
        priority_id: 4, // Normal
        deadline: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), // +3 days
      },
      // This week, Friday
      {
        title: "Informatik Projekt",
        description: "REST API für Schulverwaltung fertigstellen",
        status: task_status.IN_PROGRESS,
        progress: 75,
        created_by: 2,
        assigned_to: 9,
        template_id: 3,
        priority_id: 3, // Hoch (formerly 5, Sehr Wichtig; Q15)
        deadline: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000), // +5 days
      },
      // Next week, Monday
      {
        title: "Sportfest",
        description: "Schulinternes Sportfest - Anmeldung erforderlich",
        status: task_status.ON_HOLD,
        progress: 0,
        created_by: 2,
        assigned_to: 10,
        template_id: 4,
        priority_id: 3, // Normal
        deadline: new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000), // +8 days
      },
      // Next week, Wednesday
      {
        title: "Chemie Versuchsprotokoll",
        description: "Laborversuch dokumentieren und analysieren",
        status: task_status.IN_REVIEW,
        progress: 85,
        created_by: 2,
        assigned_to: 11,
        template_id: 5,
        priority_id: 4, // Normal
        deadline: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000), // +10 days
      },
      // Next week, Friday
      {
        title: "Deutsch Referat",
        description: "Präsentation über Literatur der Klassik halten",
        status: task_status.TODO,
        progress: 20,
        created_by: 2,
        assigned_to: 12,
        template_id: 6,
        priority_id: 3, // Hoch (formerly 5, Sehr Wichtig; Q15)
        deadline: new Date(today.getTime() + 12 * 24 * 60 * 60 * 1000), // +12 days
      },
      // In two weeks
      {
        title: "Historieprojekt",
        description: "Zeitzeugenbefragung durchführen",
        status: task_status.TODO,
        progress: 0,
        created_by: 2,
        assigned_to: 13,
        template_id: 7,
        priority_id: 3, // Normal
        deadline: new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000), // +15 days
      },
      // In two weeks + 2 days
      {
        title: "PhysikVerstehen Übungen",
        description: "Kapitel 7-8 Aufgaben 1-42 lösen",
        status: task_status.COMPLETED,
        progress: 100,
        created_by: 2,
        assigned_to: 14,
        template_id: 8,
        priority_id: 2, // Low
        deadline: new Date(today.getTime() + 17 * 24 * 60 * 60 * 1000), // +17 days
      },
      // UI test - overdue (in the past)
      {
        title: "Bio Test (Vergangenheit)",
        description: "Bereits abgelaufene Aufgabe",
        status: task_status.IN_PROGRESS,
        progress: 40,
        created_by: 2,
        assigned_to: 15,
        template_id: 9,
        priority_id: 1, // Low
        deadline: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000), // -3 days
      },
      // Extra Task
      {
        title: "GW Exkursion",
        description: "Vorbereitungsmaterialien sammeln",
        status: task_status.TODO,
        progress: 10,
        created_by: 2,
        assigned_to: 16,
        template_id: 10,
        priority_id: 3, // Normal
        deadline: new Date(today.getTime() + 20 * 24 * 60 * 60 * 1000), // +20 days
      },
    ];
    await prisma.tasks.createMany({ data: parentTasksData });

    const subTasksData = Array.from({ length: 10 }).map((_, i) => ({
      parent_task_id: i + 1,
      title: `Teilaufgabe ${i + 1}`,
      description: `Teilschritt für Aufgabe ${i + 1}`,
      status:
        i % 3 === 0
          ? task_status.COMPLETED
          : i % 3 === 1
            ? task_status.IN_PROGRESS
            : task_status.TODO,
      progress: i % 3 === 0 ? 100 : i % 3 === 1 ? 45 : 0,
      created_by: 2,
      assigned_to: i + 7,
      priority_id: 3,
    }));
    await prisma.tasks.createMany({ data: subTasksData });
    console.log(`✓ 20 Einträge in tasks erstellt (10 Parent, 10 Subtasks)`);
    const extraSub1 = await prisma.tasks.create({
      data: {
        title: "Nginx installieren",
        description: "Webserver auf dem Produktions-Server einrichten",
        status: task_status.COMPLETED,
        progress: 100,
        created_by: 2,
        assigned_to: 7,
        priority_id: 3,
        created_at: new Date("2026-01-04T08:00:00"),
        updated_at: new Date("2026-01-04T08:00:00"),
      },
    });

    const extraSub2 = await prisma.tasks.create({
      data: {
        title: "SSL Zertifikat einrichten",
        description: "HTTPS mit Let's Encrypt konfigurieren",
        status: task_status.COMPLETED,
        progress: 100,
        created_by: 2,
        assigned_to: 7,
        priority_id: 3,
        created_at: new Date("2026-01-04T09:00:00"),
        updated_at: new Date("2026-01-04T09:00:00"),
      },
    });

    const extraSub3 = await prisma.tasks.create({
      data: {
        title: "Docker aufsetzen",
        description: "Container-Umgebung konfigurieren",
        status: task_status.IN_PROGRESS,
        progress: 60,
        created_by: 2,
        assigned_to: 7,
        priority_id: 3,
        created_at: new Date("2026-01-04T10:00:00"),
        updated_at: new Date("2026-01-04T10:00:00"),
      },
    });

    const extraSub4 = await prisma.tasks.create({
      data: {
        title: "CI/CD Pipeline einrichten",
        description: "GitHub Actions Workflow erstellen",
        status: task_status.TODO,
        progress: 0,
        created_by: 2,
        assigned_to: 7,
        priority_id: 3,
        created_at: new Date("2026-01-04T11:00:00"),
        updated_at: new Date("2026-01-04T11:00:00"),
      },
    });

    // Now create the parent task with the real subtask IDs
    const extraParent = await prisma.tasks.create({
      data: {
        title: "Server aufsetzen",
        description: "Produktions-Server für Diplomarbeit konfigurieren",
        status: task_status.IN_PROGRESS,
        progress: 50,
        created_by: 2,
        assigned_to: 7,
        priority_id: 3,
        auto_complete: true,
        deadline: new Date("2026-02-15T23:59:00"),
        created_at: new Date("2026-01-03T10:00:00"),
        updated_at: new Date("2026-01-03T10:00:00"),
        completion_rule: {
          type: "operator",
          operator: "OR",
          operands: [
            {
              type: "operator",
              operator: "AND",
              operands: [
                { type: "leaf", task_id: String(extraSub1.task_id) },
                { type: "leaf", task_id: String(extraSub2.task_id) },
              ],
            },
            {
              type: "operator",
              operator: "AND",
              operands: [
                { type: "leaf", task_id: String(extraSub3.task_id) },
                { type: "leaf", task_id: String(extraSub4.task_id) },
              ],
            },
          ],
        },
      },
    });

    // Assign the subtasks to the parent
    await prisma.tasks.updateMany({
      where: {
        task_id: {
          in: [
            extraSub1.task_id,
            extraSub2.task_id,
            extraSub3.task_id,
            extraSub4.task_id,
          ],
        },
      },
      data: { parent_task_id: extraParent.task_id },
    });

    // Task memberships for realistic permission/visibility tests
    const baseTaskMembersData = Array.from({ length: 20 }).flatMap((_, i) => {
      const taskId = i + 1;
      const assignedUserId = i < 10 ? i + 7 : i - 3; // Tasks 1-10 => 7..16, Tasks 11-20 => 7..16
      return [
        { task_id: taskId, user_id: 2 },
        { task_id: taskId, user_id: assignedUserId },
      ];
    });

    const extraTaskMembersData = [
      { task_id: extraParent.task_id, user_id: 2 },
      { task_id: extraParent.task_id, user_id: 7 },
      { task_id: extraSub1.task_id, user_id: 2 },
      { task_id: extraSub1.task_id, user_id: 7 },
      { task_id: extraSub2.task_id, user_id: 2 },
      { task_id: extraSub2.task_id, user_id: 7 },
      { task_id: extraSub3.task_id, user_id: 2 },
      { task_id: extraSub3.task_id, user_id: 7 },
      { task_id: extraSub4.task_id, user_id: 2 },
      { task_id: extraSub4.task_id, user_id: 7 },
    ];

    await prisma.task_members.createMany({
      data: [...baseTaskMembersData, ...extraTaskMembersData],
      skipDuplicates: true,
    });
    console.log(
      `✓ ${baseTaskMembersData.length + extraTaskMembersData.length} Einträge in task_members erstellt`,
    );

    console.log(
      `✓ Extra Task "Server aufsetzen" mit completion_rule erstellt (ID: ${extraParent.task_id})`,
    );

    // --- PHASE 7: Notes, Documents, Chat Rooms ---
    const notesData = Array.from({ length: 10 }).map((_, i) => ({
      title: `Notiz zur Konferenz ${i + 1}`,
      created_by: 2,
      description: `Wichtige Beschlüsse aus der Sitzung ${i + 1}`,
      subject_id: i + 1,
      priority_id: 3,
    }));
    await prisma.notes.createMany({ data: notesData });
    console.log(`✓ 10 Einträge in notes erstellt`);

    const documentsData = [
      // Teaching materials (teachers)
      {
        name: "Skriptum_Teil1.pdf",
        file_path: "/uploads/docs/skriptum_1.pdf",
        file_size: 1024,
        mime_type: "application/pdf",
        added_by: 2,
      },
      {
        name: "Skriptum_Teil2.pdf",
        file_path: "/uploads/docs/skriptum_2.pdf",
        file_size: 2048,
        mime_type: "application/pdf",
        added_by: 2,
      },
      {
        name: "Skriptum_Teil3.pdf",
        file_path: "/uploads/docs/skriptum_3.pdf",
        file_size: 3072,
        mime_type: "application/pdf",
        added_by: 2,
      },
      {
        name: "Skriptum_Teil4.pdf",
        file_path: "/uploads/docs/skriptum_4.pdf",
        file_size: 4096,
        mime_type: "application/pdf",
        added_by: 2,
      },
      {
        name: "Skriptum_Teil5.pdf",
        file_path: "/uploads/docs/skriptum_5.pdf",
        file_size: 5120,
        mime_type: "application/pdf",
        added_by: 2,
      },
      // Student submissions (partly graded)
      {
        name: "abgabe_felix_task1.pdf",
        file_path: "/uploads/submissions/abgabe_felix_task1.pdf",
        file_size: 1890,
        mime_type: "application/pdf",
        added_by: 7,
        grade: "Sehr gut",
        feedback: "Saubere Lösung und gut dokumentiert.",
        graded_by: 2,
        graded_at: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        name: "abgabe_laura_task2.pdf",
        file_path: "/uploads/submissions/abgabe_laura_task2.pdf",
        file_size: 1750,
        mime_type: "application/pdf",
        added_by: 8,
        grade: "Gut",
        feedback: "Inhalt passt, bitte auf Formatierung achten.",
        graded_by: 2,
        graded_at: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        name: "abgabe_david_task3.pdf",
        file_path: "/uploads/submissions/abgabe_david_task3.pdf",
        file_size: 2130,
        mime_type: "application/pdf",
        added_by: 9,
        grade: null,
        feedback: null,
        graded_by: null,
        graded_at: null,
      },
      {
        name: "abgabe_sarah_task4.pdf",
        file_path: "/uploads/submissions/abgabe_sarah_task4.pdf",
        file_size: 2010,
        mime_type: "application/pdf",
        added_by: 10,
        grade: null,
        feedback: null,
        graded_by: null,
        graded_at: null,
      },
      {
        name: "abgabe_tobias_task5.pdf",
        file_path: "/uploads/submissions/abgabe_tobias_task5.pdf",
        file_size: 1980,
        mime_type: "application/pdf",
        added_by: 11,
        grade: "Befriedigend",
        feedback: "Grundidee korrekt, Details nachschärfen.",
        graded_by: 2,
        graded_at: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
      },
    ];
    await prisma.documents.createMany({ data: documentsData });
    console.log(`✓ 10 Einträge in documents erstellt`);

    // Direct Chats (is_private: true, direct_chat_hash = 'direct_{minId}_{maxId}')
    // Room IDs 1-3
    const directChatsData = [
      {
        name: null,
        is_private: true,
        direct_chat_hash: "direct_1_2",
        created_by: 1,
      }, // Admin <-> Anna
      {
        name: null,
        is_private: true,
        direct_chat_hash: "direct_1_7",
        created_by: 1,
      }, // Admin <-> Felix
      {
        name: null,
        is_private: true,
        direct_chat_hash: "direct_2_3",
        created_by: 2,
      }, // Anna <-> Peter
    ];
    await prisma.chat_rooms.createMany({ data: directChatsData });
    console.log(`✓ 3 Direct Chat Rooms erstellt (IDs 1–3)`);

    // Group Rooms (is_private: false)
    // Room IDs 4-6
    const groupRoomsData = [
      { name: "Lehrerkonferenz", is_private: false, created_by: 2 }, // all teachers + admin
      {
        name: "5AHITM Klassenchat",
        is_private: false,
        class_id: 5,
        created_by: 6,
      }, // class teacher + class 5
      { name: "Diplomarbeit Gruppe", is_private: false, created_by: 3 }, // Peter + a few students
    ];
    await prisma.chat_rooms.createMany({ data: groupRoomsData });
    console.log(`✓ 3 Group Chat Rooms erstellt (IDs 4–6)`);

    // --- PHASE 8: Junction & Log Tables ---
    // --- Chat Room Users ---
    // Class 5 students: user_id 11 (Tobias) and 16 (Emma) → class_id = (i%5)+1 for i=4 and i=9
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
      // Room 4 – staff meeting: admin + all teachers
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
    console.log(
      `✓ ${chatRoomUsersData.length} Einträge in chat_room_users erstellt`,
    );

    // --- Chat Messages ---
    const chatMessagesData = [
      // Room 1 – Admin <-> Anna (Direct)
      {
        room_id: 1,
        user_id: 1,
        message:
          "Hallo Anna, kannst du mir kurz sagen wann die nächste Lehrerkonferenz ist?",
      },
      {
        room_id: 1,
        user_id: 2,
        message:
          "Hi Max! Ja, kommenden Dienstag um 14 Uhr im großen Konferenzsaal.",
      },
      {
        room_id: 1,
        user_id: 1,
        message: "Super, danke! Ich trag das gleich ein.",
      },

      // Room 2 – Admin <-> Felix (Direct)
      {
        room_id: 2,
        user_id: 7,
        message:
          "Guten Tag, ich wollte fragen ob mein Zugang zum Schulsystem schon freigeschaltet wurde?",
      },
      {
        room_id: 2,
        user_id: 1,
        message:
          "Hallo Felix! Ja, sollte jetzt gehen. Einfach mit deinem Schulaccount einloggen.",
      },
      { room_id: 2, user_id: 7, message: "Perfekt, hat geklappt. Danke!" },

      // Room 3 – Anna <-> Peter (Direct)
      {
        room_id: 3,
        user_id: 2,
        message: "Peter, hast du die Abgaben von der 3AHITM schon korrigiert?",
      },
      {
        room_id: 3,
        user_id: 3,
        message: "Bin gerade dabei, dauert noch bis morgen Abend.",
      },
      {
        room_id: 3,
        user_id: 2,
        message: "Kein Stress, Deadline ist erst Freitag. 👍",
      },

      // Room 4 – staff meeting (group)
      {
        room_id: 4,
        user_id: 2,
        message:
          "Guten Morgen alle! Erinnerung: Zeugnisnoten bis Donnerstag ins System einpflegen.",
      },
      {
        room_id: 4,
        user_id: 4,
        message: "Danke für die Erinnerung! Mache ich heute Nachmittag.",
      },
      {
        room_id: 4,
        user_id: 5,
        message: "Gilt das auch für die Nachtragsbeurteilungen?",
      },
      {
        room_id: 4,
        user_id: 2,
        message: "Ja, alles was noch offen ist bitte bis Donnerstag.",
      },
      {
        room_id: 4,
        user_id: 1,
        message: "Ich schick euch noch eine offizielle Erinnerungsmail raus.",
      },

      // Room 5 – 5AHITM class chat (group)
      {
        room_id: 5,
        user_id: 6,
        message:
          "Hallo 5AHITM! Die Schularbeit am Freitag findet im EDV 1 statt, nicht im Klassenzimmer.",
      },
      {
        room_id: 5,
        user_id: 11,
        message: "Danke für die Info! Welche Themen kommen dran?",
      },
      {
        room_id: 5,
        user_id: 6,
        message: "Kapitel 3 bis 6 aus dem Skriptum, wie besprochen.",
      },
      { room_id: 5, user_id: 16, message: "Dürfen wir Unterlagen mitnehmen?" },
      {
        room_id: 5,
        user_id: 6,
        message: "Nein, closed book. Viel Erfolg beim Lernen! 📚",
      },

      // Room 6 – Diplomarbeit (Group)
      {
        room_id: 6,
        user_id: 3,
        message: "Guten Morgen! Wie ist der aktuelle Stand beim Backend?",
      },
      {
        room_id: 6,
        user_id: 7,
        message:
          "Nginx läuft, SSL ist eingerichtet. Gerade noch am Docker-Setup.",
      },
      {
        room_id: 6,
        user_id: 8,
        message:
          "Ich hab das Frontend-Deployment fertig, warte auf die API-URL von Felix.",
      },
      {
        room_id: 6,
        user_id: 9,
        message: "Die Doku hab ich auf den neuesten Stand gebracht.",
      },
      {
        room_id: 6,
        user_id: 3,
        message:
          "Sehr gut! Nächstes Meeting Mittwoch 10 Uhr, dann schauen wir uns alles gemeinsam an.",
      },
    ];
    await prisma.chat_messages.createMany({ data: chatMessagesData });
    console.log(
      `✓ ${chatMessagesData.length} Einträge in chat_messages erstellt`,
    );

    const documentSharesData = [
      { document_id: 1, user_id: 7 },
      { document_id: 1, user_id: 8 },
      { document_id: 2, user_id: 9 },
      { document_id: 2, user_id: 10 },
      { document_id: 3, user_id: 11 },
      { document_id: 4, user_id: 12 },
      { document_id: 5, user_id: 13 },
      { document_id: 5, user_id: 14 },
      { document_id: 5, user_id: 15 },
      { document_id: 5, user_id: 16 },
    ];
    await prisma.document_shares.createMany({ data: documentSharesData });
    console.log(`✓ 10 Einträge in document_shares erstellt`);

    const noteDocumentsData = Array.from({ length: 10 }).map((_, i) => ({
      note_id: i + 1,
      document_id: i + 1,
    }));
    await prisma.note_documents.createMany({ data: noteDocumentsData });
    console.log(`✓ 10 Einträge in note_documents erstellt`);

    const notesUsersData = Array.from({ length: 10 }).map((_, i) => ({
      note_id: i + 1,
      user_id: 2,
    }));
    await prisma.notes_users.createMany({ data: notesUsersData });
    console.log(`✓ 10 Einträge in notes_users erstellt`);

    const notificationsData = [
      {
        user_id: 7,
        type: "TASK_ASSIGNED",
        text: "Dir wurde die Aufgabe „Mathe Test“ zugewiesen.",
        is_read: false,
      },
      {
        user_id: 8,
        type: "TASK_ASSIGNED",
        text: "Dir wurde die Aufgabe „Englisch Vokabeln“ zugewiesen.",
        is_read: true,
      },
      {
        user_id: 9,
        type: "TASK_REVIEW",
        text: "Deine Abgabe zu „Informatik Projekt“ wartet auf Bewertung.",
        is_read: false,
      },
      {
        user_id: 10,
        type: "TASK_ON_HOLD",
        text: "Die Aufgabe „Sportfest“ wurde pausiert.",
        is_read: false,
      },
      {
        user_id: 11,
        type: "TASK_PROGRESS",
        text: "Status von „Chemie Versuchsprotokoll“: In Review.",
        is_read: true,
      },
      {
        user_id: 12,
        type: "TASK_ASSIGNED",
        text: "Dir wurde die Aufgabe „Deutsch Referat“ zugewiesen.",
        is_read: false,
      },
      {
        user_id: 13,
        type: "TASK_ASSIGNED",
        text: "Dir wurde die Aufgabe „Historieprojekt“ zugewiesen.",
        is_read: true,
      },
      {
        user_id: 14,
        type: "TASK_DONE",
        text: "Aufgabe „PhysikVerstehen Übungen“ wurde abgeschlossen.",
        is_read: true,
      },
      {
        user_id: 15,
        type: "TASK_OVERDUE",
        text: "Aufgabe „Bio Test (Vergangenheit)“ ist überfällig.",
        is_read: false,
      },
      {
        user_id: 16,
        type: "TASK_ASSIGNED",
        text: "Dir wurde die Aufgabe „GW Exkursion“ zugewiesen.",
        is_read: false,
      },
    ];
    await prisma.notifications.createMany({ data: notificationsData });
    console.log(`✓ 10 Einträge in notifications erstellt`);

    const commentsData = [
      {
        task_id: 1,
        created_by: 2,
        content: "Bitte bis morgen die Übungsbeispiele 1-10 lösen.",
      },
      {
        task_id: 1,
        created_by: 7,
        content: "Verstanden, ich lade die Lösung heute Abend hoch.",
      },
      {
        task_id: 3,
        created_by: 9,
        content: "Kann ich für die API auch Fastify verwenden?",
      },
      {
        task_id: 3,
        created_by: 2,
        content: "Ja, aber dokumentiere die Entscheidung kurz im README.",
      },
      {
        task_id: 5,
        created_by: 11,
        content: "Versuchsaufbau ist fertig, Protokoll folgt.",
      },
      {
        task_id: extraParent.task_id,
        created_by: 7,
        content: "Nginx und SSL sind erledigt, ich arbeite an Docker.",
      },
    ];
    await prisma.comments.createMany({ data: commentsData });
    console.log(`✓ ${commentsData.length} Einträge in comments erstellt`);

    const taskActivityLogData = Array.from({ length: 10 }).map((_, i) => ({
      task_id: i + 1,
      user_id: 2,
      action: "CREATED_TASK",
    }));
    await prisma.task_activity_log.createMany({ data: taskActivityLogData });
    console.log(`✓ 10 Einträge in task_activity_log erstellt`);

    // student questions are discussion comments (decision Q16: comments, M15)
    const taskCommentsData = Array.from({ length: 10 }).map((_, i) => ({
      task_id: i + 1,
      created_by: i + 7,
      content: `Ich habe eine Frage zu Teilschritt ${i + 1}`,
    }));
    await prisma.comments.createMany({ data: taskCommentsData });
    console.log(`✓ 10 weitere Einträge in comments erstellt`);

    // teachers' grading remarks on a task (task_grade)
    const taskGradeData = [
      { task_id: 3, user_id: 2, text: "Saubere API, die Tests fehlen noch." },
      {
        task_id: 5,
        user_id: 2,
        text: "Protokoll vollständig, gute Auswertung.",
      },
    ];
    await prisma.task_grade.createMany({ data: taskGradeData });
    console.log(`✓ ${taskGradeData.length} Einträge in task_grade erstellt`);

    const taskDocumentsData = [
      { task_id: 1, document_id: 1 },
      { task_id: 1, document_id: 6 },
      { task_id: 2, document_id: 2 },
      { task_id: 2, document_id: 7 },
      { task_id: 3, document_id: 3 },
      { task_id: 3, document_id: 8 },
      { task_id: 4, document_id: 4 },
      { task_id: 4, document_id: 9 },
      { task_id: 5, document_id: 5 },
      { task_id: 5, document_id: 10 },
    ];
    await prisma.task_documents.createMany({ data: taskDocumentsData });
    console.log(`✓ 10 Einträge in task_documents erstellt`);

    const emailLogsData = Array.from({ length: 10 }).map((_, i) => ({
      user_id: i + 7,
      recipient: `student${i + 7}@htl.at`,
      subject: `Neue Aufgabe: Laborübung ${i + 1}`,
      email_type: "deadline",
      status: "sent",
      sent_at: new Date(),
    }));
    await prisma.email_logs.createMany({ data: emailLogsData });
    console.log(`✓ 10 Einträge in email_logs erstellt`);

    // --- SUMMARY ---
    console.log("\n=============================================");
    console.log("SEEDING ERFOLGREICH ABGESCHLOSSEN!");
    console.log("Daten für Schulverwaltungssystem generiert.");
    console.log("User ID 1 (Max Mustermann / adminadmin) ist Superuser.");
    console.log('Passwörter für alle User: "password123"');
    console.log("");
    console.log("Chat-Übersicht:");
    console.log(
      "  Direct:  Admin↔Anna (R1) | Admin↔Felix (R2) | Anna↔Peter (R3)",
    );
    console.log(
      "  Groups:  Lehrerkonferenz (R4) | 5AHITM (R5) | Diplomarbeit (R6)",
    );
    console.log("=============================================\n");
  } catch (error) {
    console.error("\nFEHLER WÄHREND DEM SEEDING:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
