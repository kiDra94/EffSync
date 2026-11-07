import "dotenv/config";
import { PrismaClient, task_status } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcrypt";
import { getPermissionsForRole } from "../src/config/role-permissions.config";
import { BCRYPT_COST } from "../src/config/auth.config";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL ist nicht in der .env definiert!");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool, { disposeExternalPool: true });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starte TEST-Seed-Prozess...");
  console.log("⚠️  Optimiert für Usability-Tests!\n");

  try {
    // --- CLEANUP ---
    const tableNames = [
      "email_logs",
      "email_preferences",
      "comments",
      "task_comments",
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
    console.log("✓ Test-Datenbank geleert\n");

    // --- PHASE 1: Base Data (Minimal) ---
    const departmentsData = [{ name: "Informatik" }, { name: "Medientechnik" }];
    await prisma.departments.createMany({ data: departmentsData });

    const prioritiesData = [
      { name: "Niedrig" },
      { name: "Normal" },
      { name: "Wichtig" },
      { name: "Sehr Wichtig" },
    ];
    await prisma.priorities.createMany({ data: prioritiesData });

    const permissionsData = [
      { name: "view_dashboard", description: "Dashboard anschauen", flags: 4 },
      { name: "create_tasks", description: "Aufgaben erstellen", flags: 7 },
      { name: "edit_tasks", description: "Aufgaben bearbeiten", flags: 6 },
      { name: "delete_tasks", description: "Aufgaben löschen", flags: 5 },
      { name: "view_grades", description: "Noten einsehen", flags: 4 },
      { name: "edit_grades", description: "Noten eintragen", flags: 6 },
      { name: "manage_users", description: "Benutzer verwalten", flags: 7 },
      { name: "manage_classes", description: "Klassen verwalten", flags: 7 },
      {
        name: "view_schedules",
        description: "Stundenpläne anschauen",
        flags: 4,
      },
      { name: "manage_system", description: "System administrieren", flags: 7 },
    ];
    await prisma.permissions.createMany({ data: permissionsData });

    const rolesData = [
      { name: "Superuser" },
      { name: "Student" },
      { name: "Teacher" },
      { name: "Admin" },
    ];
    await prisma.roles.createMany({ data: rolesData });

    const schedulesData = [
      {
        name: "Semester SS 2026",
        valid_from: new Date("2026-02-01"),
        valid_to: new Date("2026-07-01"),
      },
    ];
    await prisma.schedules.createMany({ data: schedulesData });

    const roomsData = [
      { name: "EDV 1", type: "Labor", capacity: 30, building: "Hauptgebäude" },
      { name: "EDV 2", type: "Labor", capacity: 30, building: "Hauptgebäude" },
    ];
    await prisma.rooms.createMany({ data: roomsData });

    const subjectsData = [
      { name: "Mathematik", short_name: "MAT" },
      { name: "Englisch", short_name: "ENG" },
      { name: "Biologie", short_name: "BIO" },
    ];
    await prisma.subjects.createMany({ data: subjectsData });

    console.log("✓ Base-Daten erstellt");

    // --- PHASE 2: users for the roles ---
    const passwordHash = await bcrypt.hash("password123", BCRYPT_COST);

    const usersData = [
      // Admin / Superuser
      {
        firstname: "Max",
        lastname: "Mustermann",
        email: "admin@htl.at",
        username: "adminadmin",
        password_hash: passwordHash,
      }, // ID 1
      // Teachers
      {
        firstname: "Anna",
        lastname: "Lehrerin",
        email: "anna@htl.at",
        username: "alehrerin",
        password_hash: passwordHash,
      }, // ID 2
      {
        firstname: "Peter",
        lastname: "Schmidt",
        email: "peter@htl.at",
        username: "pschmidt",
        password_hash: passwordHash,
      }, // ID 3 (for tests)
      // Students
      {
        firstname: "Felix",
        lastname: "Fuchs",
        email: "felix@student.htl.at",
        username: "ffuchs",
        password_hash: passwordHash,
      }, // ID 4
      {
        firstname: "Laura",
        lastname: "Gruber",
        email: "laura@student.htl.at",
        username: "lgruber",
        password_hash: passwordHash,
      }, // ID 5
      {
        firstname: "David",
        lastname: "Wolf",
        email: "david@student.htl.at",
        username: "dwolf",
        password_hash: passwordHash,
      }, // ID 6
      {
        firstname: "Sarah",
        lastname: "Schwaiger",
        email: "sarah@student.htl.at",
        username: "sschwaiger",
        password_hash: passwordHash,
      }, // ID 7
      {
        firstname: "Tobias",
        lastname: "Eder",
        email: "tobias@student.htl.at",
        username: "teder",
        password_hash: passwordHash,
      }, // ID 8
    ];

    await prisma.users.createMany({ data: usersData });
    console.log("✓ 8 Users erstellt");

    // --- PHASE 3: teachers (before classes, because head_teacher_id needs them) ---
    const teachersData = [{ teacher_id: 2 }, { teacher_id: 3 }];
    await prisma.teachers.createMany({ data: teachersData });
    console.log("✓ Teacher erstellt");

    // --- PHASE 4: Classes ---
    const classesData = [
      { name: "5AHITM", department_id: 1, head_teacher_id: 2, schedule_id: 1 },
    ];
    await prisma.classes.createMany({ data: classesData });
    console.log("✓ Klasse erstellt");

    // --- PHASE 5: Students ---
    const studentsData = [
      { student_id: 4, class_id: 1 },
      { student_id: 5, class_id: 1 },
      { student_id: 6, class_id: 1 },
      { student_id: 7, class_id: 1 },
      { student_id: 8, class_id: 1 },
    ];
    await prisma.students.createMany({ data: studentsData });

    const classesTeachersData = [
      { class_id: 1, teacher_id: 2 },
      { class_id: 1, teacher_id: 3 },
    ];
    await prisma.classes_teachers.createMany({ data: classesTeachersData });

    console.log("✓ Schüler & Klassen-Lehrer zugewiesen");

    // --- PHASE 5: roles & permissions ---
    const userRolesData = [
      { user_id: 1, role_id: 1 }, // Max = Superuser
      { user_id: 2, role_id: 3 }, // Anna = Teacher
      { user_id: 3, role_id: 3 }, // Peter = Teacher
      { user_id: 4, role_id: 2 }, // Felix = Student
      { user_id: 5, role_id: 2 }, // Laura = Student
      { user_id: 6, role_id: 2 }, // David = Student
      { user_id: 7, role_id: 2 }, // Sarah = Student
      { user_id: 8, role_id: 2 }, // Tobias = Student
    ];
    await prisma.user_roles.createMany({ data: userRolesData });

    // role permissions follow src/config/role-permissions.config.ts (decision F4)
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

    console.log("✓ Rollen & Permissions zugewiesen");

    // --- PHASE 6: TASKS for the test scenarios ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const testsTasksData = [
      // For student task 1: "Mathe Test"
      {
        title: "Mathe Test",
        description:
          "Schreiben Sie eine Klausur über Integralrechnung. Kapitel 5-7 werden abgefragt.",
        status: task_status.TODO,
        progress: 0,
        created_by: 2,
        assigned_to: 4,
        priority_id: 3,
        deadline: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), // +2 days
      },
      // For student task 2: "Englisch Vokabeln" (with chat)
      {
        title: "Englisch Vokabeln",
        description: "Unit 5 Vokabeln lernen. Quiz nächste Woche.",
        status: task_status.IN_PROGRESS,
        progress: 50,
        created_by: 2,
        assigned_to: 5,
        priority_id: 2,
        deadline: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), // +3 days
      },
      // For student task 3: "Abgabe Task 1" (with grading)
      {
        title: "Abgabe Task 1",
        description: "Bearbeitete Aufgabenserie zu Algebra.",
        status: task_status.COMPLETED,
        progress: 100,
        created_by: 2,
        assigned_to: 4,
        priority_id: 2,
        deadline: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), // -2 days (past)
      },
      // For teacher task 1: create a new task
      {
        title: "Biologie Projekt – Ökosysteme",
        description:
          "Recherchiert über lokale Ökosysteme und präsentiert ein Beispiel.",
        status: task_status.TODO,
        progress: 0,
        created_by: 2,
        assigned_to: 1, // whole class (represented by the first user)
        priority_id: 3,
        deadline: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000), // +10 days
      },
    ];

    await prisma.tasks.createMany({ data: testsTasksData });
    console.log("✓ 4 Test-Tasks erstellt");

    // --- PHASE 7: documents for students (with grading) ---
    const docsData = [
      // Graded submission for "Abgabe Task 1"
      {
        name: "abgabe_felix_task1.pdf",
        file_path: "/uploads/submissions/abgabe_felix_task1.pdf",
        file_size: 1890,
        mime_type: "application/pdf",
        added_by: 4, // Felix
        grade: "Sehr Gut",
        feedback:
          "Ausgezeichnet gelöst! Sehr saubere Argumentation. Kleine Verbesserung bei Punkt 3.",
        graded_by: 2, // Anna
        graded_at: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
      },
      // Ungraded submission for "Mathe Test"
      {
        name: "mathe_test_felix.pdf",
        file_path: "/uploads/submissions/mathe_test_felix.pdf",
        file_size: 2100,
        mime_type: "application/pdf",
        added_by: 4, // Felix
        grade: null,
        feedback: null,
        graded_by: null,
        graded_at: null,
      },
    ];

    await prisma.documents.createMany({ data: docsData });
    console.log("✓ 2 Documents erstellt (1 bewertet, 1 offen)");

    // --- PHASE 8: Document-Task Relationships ---
    const taskDocsData = [
      { task_id: 3, document_id: 1 }, // "Abgabe Task 1" -> graded document
      { task_id: 1, document_id: 2 }, // "Mathe Test" -> ungraded document
    ];
    await prisma.task_documents.createMany({ data: taskDocsData });

    // --- PHASE 9: Task Members ---
    const taskMembersData = [
      // "Mathe Test" Members
      { task_id: 1, user_id: 2 },
      { task_id: 1, user_id: 4 },
      // "Englisch Vokabeln" Members
      { task_id: 2, user_id: 2 },
      { task_id: 2, user_id: 5 },
      // "Biologie Projekt" for the whole class
      { task_id: 4, user_id: 2 }, // Teacher
      { task_id: 4, user_id: 4 }, // Students
      { task_id: 4, user_id: 5 },
      { task_id: 4, user_id: 6 },
      { task_id: 4, user_id: 7 },
      { task_id: 4, user_id: 8 },
    ];

    await prisma.task_members.createMany({
      data: taskMembersData,
      skipDuplicates: true,
    });
    console.log("✓ Task Members zugewiesen");

    // --- PHASE 10: chat rooms for communication ---
    const chatRoomsData = [
      {
        name: null,
        is_private: true,
        direct_chat_hash: "direct_2_4", // Anna <-> Felix (Teacher <-> Student)
        created_by: 2,
      },
      {
        name: "5AHITM Klassenchat",
        is_private: false,
        class_id: 1,
        created_by: 2,
      },
    ];
    await prisma.chat_rooms.createMany({ data: chatRoomsData });

    const chatRoomUsersData = [
      // Direct Chat
      { room_id: 1, user_id: 2 },
      { room_id: 1, user_id: 4 },
      // Class chat
      { room_id: 2, user_id: 2 }, // Teacher Anna
      { room_id: 2, user_id: 3 }, // Teacher Peter
      { room_id: 2, user_id: 4 }, // Felix
      { room_id: 2, user_id: 5 }, // Laura
      { room_id: 2, user_id: 6 }, // David
      { room_id: 2, user_id: 7 }, // Sarah
      { room_id: 2, user_id: 8 }, // Tobias
    ];
    await prisma.chat_room_users.createMany({ data: chatRoomUsersData });

    const chatMessagesData = [
      {
        room_id: 2,
        user_id: 2,
        message:
          "5AHITM! Die nächste Schularbeit findet am Freitag im EDV 1 statt.",
      },
      {
        room_id: 2,
        user_id: 4,
        message: "Wie lange haben wir Zeit für die Schularbeit?",
      },
      {
        room_id: 2,
        user_id: 2,
        message: "90 Minuten. Geschlossenes Buch.",
      },
    ];
    await prisma.chat_messages.createMany({ data: chatMessagesData });
    console.log("✓ Chat Rooms & Messages erstellt");

    // --- PHASE 11: Task Activity Log ---
    const taskActivityData = [
      { task_id: 1, user_id: 2, action: "Task erstellt" },
      { task_id: 2, user_id: 2, action: "Task erstellt" },
      { task_id: 3, user_id: 2, action: "Task erstellt" },
      { task_id: 3, user_id: 4, action: "Dokument hochgeladen" },
      { task_id: 3, user_id: 2, action: "Bewertung vergeben" },
      { task_id: 4, user_id: 2, action: "Task erstellt" },
    ];
    await prisma.task_activity_log.createMany({ data: taskActivityData });

    const taskCommentsData = [
      {
        task_id: 1,
        user_id: 2,
        text: "Dies ist ein wichtiger Test. Viel Erfolg!",
      },
      {
        task_id: 1,
        user_id: 4,
        text: "Ich habe eine Frage: Sind auch Aufgaben aus Kapitel 4 dabei?",
      },
      {
        task_id: 2,
        user_id: 5,
        text: "Welche Vokabeln aus Unit 5 werden die wichtigsten sein?",
      },
    ];
    await prisma.task_comments.createMany({ data: taskCommentsData });
    console.log("✓ Activity Logs & Comments erstellt");

    // --- PHASE 12: Email Preferences ---
    const emailPrefsData = Array.from({ length: 8 }).map((_, i) => ({
      user_id: i + 1,
      email_on_deadline: true,
      email_on_mention: true,
      email_on_comment: true,
      email_digest: false,
      digest_frequency: "weekly",
    }));
    await prisma.email_preferences.createMany({ data: emailPrefsData });

    // --- PHASE 13: notes ---
    const notesData = [
      {
        title: "Prüfungsvorbereitung Mathe",
        description:
          "Wichtig: Die Integralrechnung ist ein Schwerpunkt der Prüfung. Konzentriert euch auf unbestimmte Integrale.",
        created_by: 2,
        subject_id: 1,
        priority_id: 4,
      },
      {
        title: "Englisch Unit 5 Lernmaterial",
        description:
          "Tipp: Unit 5 Vokabeln sind im Lehrbuch Seite 45-48 zu finden. Phrasal Verbs sind sehr wichtig!",
        created_by: 2,
        subject_id: 2,
        priority_id: 3,
      },
      {
        title: "Biologie - Ökosystemforschung",
        description:
          "Fokus: Nahrungsketten, Biodiversität und menschliche Einflüsse. Praktische Beispiele aus lokaler Umgebung.",
        created_by: 2,
        subject_id: 3,
        priority_id: 3,
      },
      {
        title: "Persönliche Lernnotiz - Vokabeln",
        description:
          "Meine Vokabellisten für Unit 5. Lerne täglich 10-15 neue Wörter.",
        created_by: 5,
        subject_id: 2,
        priority_id: 2,
      },
    ];
    await prisma.notes.createMany({ data: notesData });
    console.log("✓ Notizen erstellt");

    // --- PHASE 14: task comments with more grading ---
    const moreCommentsData = [
      {
        task_id: 2,
        user_id: 2,
        text: "Gute Frage! Die wichtigsten Vokabeln sind: present perfect, past continuous, modal verbs.",
      },
      {
        task_id: 3,
        user_id: 2,
        text: "Felix, sehr gute Lösungen! Bitte achte beim nächsten Mal auf die Formatierung der Herleitung.",
      },
      {
        task_id: 4,
        user_id: 2,
        text: "Das Projekt ist sehr interessant. Die Deadline ist in 10 Tagen. Ihr könnt Fragen im Chat stellen!",
      },
      {
        task_id: 1,
        user_id: 2,
        text: "Zu deiner Frage: Ja, auch Kapitel 4 wird berücksichtigt, aber hauptsächlich Kapitel 5-7.",
      },
    ];
    await prisma.task_comments.createMany({ data: moreCommentsData });
    console.log("✓ Detaillierte Task Comments hinzugefügt");

    // --- PHASE 15: Notifications ---
    const notificationsData = [
      {
        user_id: 4, // Felix
        type: "TASK_CREATED",
        text: "Neuer Task erstellt: Mathe Test - Deadline in 2 Tagen",
        is_read: false,
      },
      {
        user_id: 4,
        type: "COMMENT_ADDED",
        text: "Anna hat einen Kommentar zu deinem Task hinterlassen",
        is_read: false,
      },
      {
        user_id: 4,
        type: "TASK_GRADED",
        text: "Deine Abgabe wurde bewertet: Sehr Gut - Ausgezeichnet gelöst!",
        is_read: true,
      },
      {
        user_id: 5, // Laura
        type: "TASK_CREATED",
        text: "Neuer Task erstellt: Englisch Vokabeln - Deadline in 3 Tagen",
        is_read: true,
      },
      {
        user_id: 5,
        type: "COMMENT_REPLY",
        text: "Anna hat deine Frage beantwortet",
        is_read: false,
      },
      {
        user_id: 2, // Anna (Teacher)
        type: "DOCUMENT_UPLOADED",
        text: 'Felix hat ein Dokument zu "Abgabe Task 1" hochgeladen',
        is_read: true,
      },
      {
        user_id: 2,
        type: "DEADLINE_REMINDER",
        text: "Deadline nähert sich: Mathe Test - Noch 2 Tage",
        is_read: false,
      },
      {
        user_id: 2,
        type: "STUDENT_ACTIVITY",
        text: "5 Schüler haben ihre Arbeiten abgegeben",
        is_read: true,
      },
      {
        user_id: 1, // Admin
        type: "SYSTEM_INFO",
        text: "Neuer Benutzer registriert: Peter Schmidt (Lehrer)",
        is_read: true,
      },
      {
        user_id: 6, // David
        type: "TASK_CREATED",
        text: "Neuer Klassen-Task: Biologie Projekt – Ökosysteme",
        is_read: false,
      },
    ];
    await prisma.notifications.createMany({ data: notificationsData });
    console.log("✓ Benachrichtigungen erstellt");

    // --- SUMMARY ---
    console.log("\n=============================================");
    console.log("✅ TEST-SEED ERFOLGREICH ABGESCHLOSSEN!");
    console.log("=============================================\n");
    console.log("🎯 Test-Konten verfügbar:");
    console.log("");
    console.log("  👨 ADMIN (Superuser):");
    console.log("     Username: adminadmin");
    console.log("     Passwort: password123");
    console.log("");
    console.log("  👨‍🏫 LEHRER 1:");
    console.log("     Username: alehrerin (Anna)");
    console.log("     Passwort: password123");
    console.log("");
    console.log("  👨‍🏫 LEHRER 2:");
    console.log("     Username: pschmidt (Peter - für Admin-Test)");
    console.log("     Passwort: password123");
    console.log("");
    console.log("  👤 SCHÜLER 1:");
    console.log("     Username: ffuchs (Felix)");
    console.log("     Passwort: password123");
    console.log("");
    console.log("  👤 SCHÜLER 2-5:");
    console.log("     lgruber, dwolf, sschwaiger, teder");
    console.log("     Passwort: password123");
    console.log("");
    console.log("📊 Erstellt für Tests:");
    console.log("  ✓ 1 Klasse (5AHITM)");
    console.log("  ✓ 4 vorkonfigurierte Tasks");
    console.log("  ✓ 2 Documents (1 bewertet, 1 offen)");
    console.log("  ✓ 2 Chat Rooms (Direct + Klasse)");
    console.log("  ✓ 3+ Chat Messages in jedem Room");
    console.log("  ✓ Activity Logs & 8 Task Comments");
    console.log("  ✓ 4 Notizen zu verschiedenen Fächern");
    console.log("  ✓ 10 Benachrichtigungen (Mix von gelesen/ungelesen)");
    console.log("  ✓ Email Preferences für alle User");
    console.log("");
    console.log("✨ Bereit für Usability-Tests!");
    console.log("=============================================\n");
  } catch (error) {
    console.error("\n❌ FEHLER BEIM TEST-SEEDING:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
