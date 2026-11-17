/**
 * Row shapes the documents-notes ports return: Prisma's generated types,
 * imported type-only (decision G1).
 */
import type { Prisma } from "@prisma/client";

/** What a document is read with (DocumentsService.relationInclude before M19). */
type DocumentRelations = {
  users: {
    select: {
      user_id: true;
      firstname: true;
      lastname: true;
      username: true;
      students: { select: { student_id: true } };
      user_roles: { include: { roles: true } };
    };
  };
  document_shares: { select: { user_id: true } };
  graded_by_user: {
    select: { user_id: true; firstname: true; lastname: true; username: true };
  };
  task_documents: {
    select: {
      task_id: true;
      tasks: { select: { task_id: true; created_by: true } };
    };
  };
};

export type DocumentRecord = Prisma.documentsGetPayload<object>;
export type DocumentWithRelations = Prisma.documentsGetPayload<{
  include: DocumentRelations;
}>;

export type GradedDocument = Prisma.documentsGetPayload<{
  include: {
    graded_by_user: {
      select: { user_id: true; firstname: true; lastname: true };
    };
    task_documents: {
      select: {
        task_id: true;
        tasks: { select: { task_id: true; title: true; status: true } };
      };
    };
  };
}>;

export type TaskDocument = Prisma.documentsGetPayload<{
  include: {
    users: {
      select: {
        user_id: true;
        firstname: true;
        lastname: true;
        username: true;
      };
    };
    graded_by_user: {
      select: { user_id: true; firstname: true; lastname: true };
    };
    task_documents: { select: { task_id: true } };
  };
}>;

export type TaskForLinking = Prisma.tasksGetPayload<{
  select: {
    task_id: true;
    created_by: true;
    assigned_to: true;
    task_members: { select: { user_id: true } };
  };
}>;

export type TaskRecord = Prisma.tasksGetPayload<object>;

export type RoleNames = Prisma.usersGetPayload<{
  select: { user_roles: { select: { roles: { select: { name: true } } } } };
}>;
export type StudentProfile = Prisma.usersGetPayload<{
  select: {
    students: { select: { student_id: true } };
    user_roles: { select: { roles: { select: { name: true } } } };
  };
}>;

/** Which documents a list shows (the three branches of findAll before M19). */
export type DocumentScope = "all" | "student" | "related";

export interface NewDocument {
  name: string;
  file_blob: Uint8Array<ArrayBuffer>;
  file_size: number;
  mime_type: string;
  added_by: number;
}
