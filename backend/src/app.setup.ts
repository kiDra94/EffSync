import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as fs from "fs";
import helmet from "helmet";
import { join } from "path";
import { httpsOnly } from "./shared/presentation/https-only";

/**
 * HTTP configuration shared by main.ts and the E2E test app, so the tests
 * exercise the same prefix, pipes, headers, static files and Swagger routes
 * as production.
 */
export function configureApp(app: NestExpressApplication) {
  // M30 (T62, decision Q4): production runs behind a TLS-terminating reverse
  // proxy (README); plain HTTP is redirected there, HSTS (Helmet) stays
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
    app.use(httpsOnly(process.env.PUBLIC_URL ?? ""));
  }
  app.use(helmet());

  app.enableCors({
    // a list, so the header is only sent for a matching origin (T13): with a
    // plain string, cors answers every origin with FRONTEND_URL
    origin: [process.env.FRONTEND_URL || "http://localhost:5173"],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  app.setGlobalPrefix("api");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const uploadDir = process.env.UPLOAD_DIR || "./uploads";
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`📁 Ordner ${uploadDir} wurde automatisch erstellt.`);
  }
  app.useStaticAssets(join(process.cwd(), uploadDir), {
    prefix: "/api/uploads/",
  });

  setupSwagger(app);
}

/** Every controller's @ApiTags, in the order Swagger UI shows them (M30). */
export const API_TAGS: Record<string, string> = {
  auth: "Authentication & Authorization",
  users: "User Management",
  roles: "Roles",
  permissions: "Permissions",
  tasks: "Task Management",
  documents: "Document Management",
  notes: "Personal Notes",
  "chat-rooms": "Chat Rooms",
  "chat-messages": "Chat Messages",
  notifications: "User Notifications",
  "email-preferences": "E-Mail Preferences",
  classes: "Classes and their Members",
  departments: "Departments",
  subjects: "Subjects",
  rooms: "Rooms",
  schedules: "Schedules",
  "lesson-slots": "Lesson Slots",
  metrics: "Dashboard Metrics",
  app: "Health and Info",
};

function setupSwagger(app: NestExpressApplication) {
  const config = new DocumentBuilder()
    .setTitle("EffSync API")
    .setDescription("School Management & Task System - AP 4.6")
    .setVersion("1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        // CSRF by design (T13, decision Q3)
        description:
          "Send the JWT in the Authorization header. The API sets no auth cookies, so cross-site requests can't carry credentials (CSRF protection by design), and CORS only allows FRONTEND_URL.",
      },
      "bearer",
    )
    .build();
  // listed here, so Swagger UI shows the groups in this order with a text
  config.tags = Object.entries(API_TAGS).map(([name, description]) => ({
    name,
    description,
  }));

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);
}
