import { Test, TestingModule } from "@nestjs/testing";
import { DocumentGradingService } from "../application/document-grading.service";
import { DocumentQueriesService } from "../application/document-queries.service";
import { DocumentUploadsService } from "../application/document-uploads.service";
import { DocumentsController } from "./documents.controller";
import {
  JwtAuthGuard,
  PermissionsGuard,
  RolesGuard,
} from "../../../shared/presentation/security";
import type { AuthenticatedRequest } from "../../../shared/presentation/security";

describe("DocumentsController", () => {
  let controller: DocumentsController;

  const mockUploads = { create: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        { provide: DocumentUploadsService, useValue: mockUploads },
        { provide: DocumentQueriesService, useValue: {} },
        { provide: DocumentGradingService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DocumentsController>(DocumentsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("uses the authenticated user for uploads", async () => {
    mockUploads.create.mockResolvedValue({ document_id: 1 });

    await controller.uploadFile(
      {
        originalname: "arbeit.pdf",
        mimetype: "application/pdf",
      } as Express.Multer.File,
      {},
      { user: { userId: 17, role: "student" } } as AuthenticatedRequest,
    );

    expect(mockUploads.create).toHaveBeenCalledWith(
      expect.objectContaining({ originalname: "arbeit.pdf" }),
      17,
      "application/pdf",
      "student",
      undefined,
    );
  });
});
