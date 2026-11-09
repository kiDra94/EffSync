import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  JwtAuthGuard,
  Permissions,
  PermissionsGuard,
} from "../../../shared/presentation/security";
import type { AuthenticatedRequest } from "../../../shared/presentation/security";
import { ReportingService } from "../application/reporting.service";

/** The dashboard metrics (FA-30 to FA-35), read-only. */
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("metrics")
export class MetricsController {
  constructor(private readonly reporting: ReportingService) {}

  /** FA-32: tasks per status (donut chart). */
  @Get("status-distribution")
  @Permissions("view_dashboard")
  getStatusDistribution(@Req() req: AuthenticatedRequest) {
    return this.reporting.getStatusDistribution(req.user);
  }

  /** FA-31: total, open, completed and overdue tasks. */
  @Get("task-progress")
  @Permissions("view_dashboard")
  getTaskProgress(@Req() req: AuthenticatedRequest) {
    return this.reporting.getTaskProgress(req.user);
  }

  /** The tasks grouped by status. */
  @Get("tasks-by-status")
  @Permissions("view_dashboard")
  getTasksByStatus(@Req() req: AuthenticatedRequest) {
    return this.reporting.getTasksByStatus(req.user);
  }

  /** FA-30, FA-34: active projects with their progress (M24). */
  @Get("projects")
  @Permissions("view_dashboard")
  getActiveProjects(@Req() req: AuthenticatedRequest) {
    return this.reporting.getActiveProjects(req.user);
  }

  /** FA-35: the top 5 members by completed tasks (M24). */
  @Get("top-members")
  @Permissions("view_dashboard")
  getTopMembers(@Req() req: AuthenticatedRequest) {
    return this.reporting.getTopMembers(req.user);
  }

  /** FA-33: created and completed tasks per week or month (M24). */
  @Get("trends")
  @Permissions("view_dashboard")
  getTrends(
    @Req() req: AuthenticatedRequest,
    @Query("period") period = "week",
  ) {
    if (period !== "week" && period !== "month") {
      throw new BadRequestException('period must be "week" or "month"');
    }
    return this.reporting.getTrends(req.user, period);
  }
}
