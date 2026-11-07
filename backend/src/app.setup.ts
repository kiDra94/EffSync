import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as fs from "fs";
import helmet from "helmet";
import { join } from "path";

/**
 * HTTP configuration shared by main.ts and the E2E test app, so the tests
 * exercise the same prefix, pipes, headers, static files and Swagger routes
 * as production.
 */
export function configureApp(app: NestExpressApplication) {
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
    .addTag("auth", "Authentication & Authorization")
    .addTag("users", "User Management")
    .addTag("tasks", "Task Management")
    .addTag("task-comments", "Task Comments")
    .addTag("task-activity", "Task Activity Logs")
    .addTag("task-templates", "Task Templates")
    .addTag("documents", "Document Management")
    .addTag("chat-rooms", "Chat Rooms")
    .addTag("chat-messages", "Chat Messages")
    .addTag("notifications", "User Notifications")
    .addTag("notes", "Personal Notes")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);
}
