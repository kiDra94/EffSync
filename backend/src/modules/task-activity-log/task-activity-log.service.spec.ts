import { Test, TestingModule } from '@nestjs/testing';
import { TaskActivityLogService } from './task-activity-log.service';

describe('TaskActivityLogService', () => {
  let service: TaskActivityLogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TaskActivityLogService],
    }).compile();

    service = module.get<TaskActivityLogService>(TaskActivityLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
