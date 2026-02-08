import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
   
    super({
      datasources: {
        db: {
          url: "file:./prisma/dev.db", 
        },
      },
    } as any);
  }

  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ Datenbankverbindung erfolgreich hergestellt.');
    } catch (error) {
      console.error('❌ Fehler beim Verbinden mit der Datenbank:', error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}