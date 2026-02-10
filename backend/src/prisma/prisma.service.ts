import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // Wir erzwingen die URL aus der Umgebungsvariable
    super();
  }

  async onModuleInit() {
    // Wenn die URL hier undefined ist, liegt das Problem bei der .env Datei
    if (!process.env.DATABASE_URL) {
      throw new Error("❌ KRITISCH: DATABASE_URL wurde nicht geladen! Überprüfe deine .env Datei im Backend-Root.");
    }
    
    try {
      await this.$connect();
      console.log('✅ Datenbankverbindung erfolgreich hergestellt.');
    } catch (error) {
      console.error('❌ Verbindung zur Datenbank fehlgeschlagen:', error.message);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}