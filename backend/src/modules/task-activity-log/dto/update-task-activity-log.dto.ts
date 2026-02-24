import { PartialType } from '@nestjs/swagger';
import { CreateTaskActivityLogDto } from './create-task-activity-log.dto';

export class UpdateTaskActivityLogDto extends PartialType(CreateTaskActivityLogDto) {}
