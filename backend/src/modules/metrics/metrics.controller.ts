import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { MetricsService } from "./metrics.service";
import {
  JwtAuthGuard,
  PermissionsGuard,
  Permissions,
} from "../../shared/presentation/security";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("metrics")
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * GET /metrics/status-distribution
   * Returns the distribution of task statuses
   */
  @Get("status-distribution")
  @Permissions("view_dashboard")
  async getStatusDistribution(@Req() req) {
    return this.metricsService.getStatusDistribution(req.user);
  }

  /**
   * GET /metrics/task-progress
   * Returns progress metrics
   */
  @Get("task-progress")
  @Permissions("view_dashboard")
  async getTaskProgress(@Req() req) {
    return this.metricsService.getTaskProgress(req.user);
  }

  /**
   * GET /metrics/tasks-by-status
   * Returns all tasks grouped by status
   */
  @Get("tasks-by-status")
  @Permissions("view_dashboard")
  async getTasksByStatus(@Req() req) {
    return this.metricsService.getTasksByStatus(req.user);
  }
}
