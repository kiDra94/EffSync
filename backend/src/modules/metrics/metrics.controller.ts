import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { MetricsService } from "./metrics.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("metrics")
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * GET /metrics/status-distribution
   * Gibt die Verteilung der Task-Status zurück
   */
  @Permissions()
  @Get("status-distribution")
  async getStatusDistribution(@Req() req) {
    return this.metricsService.getStatusDistribution(req.user);
  }

  /**
   * GET /metrics/task-progress
   * Gibt Fortschrittsmetriken zurück
   */
  @Permissions()
  @Get("task-progress")
  async getTaskProgress(@Req() req) {
    return this.metricsService.getTaskProgress(req.user);
  }

  /**
   * GET /metrics/tasks-by-status
   * Gibt alle Tasks gruppiert nach Status zurück
   */
  @Permissions()
  @Get("tasks-by-status")
  async getTasksByStatus(@Req() req) {
    return this.metricsService.getTasksByStatus(req.user);
  }
}
