import { Test, TestingModule } from '@nestjs/testing';
import { TaskTemplatesController } from './task-templates.controller';
import { TaskTemplatesService } from './task-templates.service';

describe('TaskTemplatesController', () => {
  let controller: TaskTemplatesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskTemplatesController],
      providers: [TaskTemplatesService],
    }).compile();

    controller = module.get<TaskTemplatesController>(TaskTemplatesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
