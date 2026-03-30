import { Controller, Get, UseGuards } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * GET /metrics/status-distribution
   * Gibt die Verteilung der Task-Status zurück
   */
  @Permissions()
  @Get('status-distribution')
  async getStatusDistribution() {
    return this.metricsService.getStatusDistribution();
  }

  /**
   * GET /metrics/task-progress
   * Gibt Fortschrittsmetriken zurück
   */
  @Permissions()
  @Get('task-progress')
  async getTaskProgress() {
    return this.metricsService.getTaskProgress();
  }

  /**
   * GET /metrics/weekly-trends
   * Gibt wöchentliche Trends zurück
   */
  @Permissions()
  @Get('weekly-trends')
  async getWeeklyTrends() {
    return this.metricsService.getWeeklyTrends();
  }

  /**
   * GET /metrics/monthly-trends
   * Gibt monatliche Trends zurück
   */
  @Permissions()
  @Get('monthly-trends')
  async getMonthlyTrends() {
    return this.metricsService.getMonthlyTrends();
  }
}
