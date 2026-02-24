import { Test, TestingModule } from '@nestjs/testing';
import { TaskActivityLogController } from './task-activity-log.controller';
import { TaskActivityLogService } from './task-activity-log.service';

describe('TaskActivityLogController', () => {
  let controller: TaskActivityLogController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskActivityLogController],
      providers: [TaskActivityLogService],
    }).compile();

    controller = module.get<TaskActivityLogController>(TaskActivityLogController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
