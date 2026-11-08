import { Test, TestingModule } from "@nestjs/testing";
import { NotesService } from "../application/notes.service";
import { NotesController } from "./notes.controller";
import {
  JwtAuthGuard,
  PermissionsGuard,
} from "../../../shared/presentation/security";

describe("NotesController", () => {
  let controller: NotesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotesController],
      providers: [{ provide: NotesService, useValue: {} }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotesController>(NotesController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
