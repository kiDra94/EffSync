import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  isRoleIn,
  PRIVILEGED_ROLES,
  RoleName,
  STAFF_ROLES,
} from "../../identity-access/application";
import type { Requester } from "../domain/document-access";
import { DocumentRepository } from "./ports/document.repository";
import type { DocumentWithRelations } from "./ports/document-records";

/**
 * Who the requester is and which documents they reach (T96), shared by the
 * document use cases. The role name comes from the JWT (first role, lower
 * case); where it isn't enough, the DB roles and the student profile decide.
 */
@Injectable()
export class DocumentAccessService {
  constructor(private readonly documents: DocumentRepository) {}

  requester(userId: number, role?: string): Requester {
    return {
      userId,
      isPrivileged: isRoleIn(role, PRIVILEGED_ROLES),
      isTeacher: isRoleIn(role, STAFF_ROLES),
      isStudent: isRoleIn(role, [RoleName.STUDENT]),
    };
  }

  /** The uploader has the Student role or a student profile. */
  belongsToStudent(document: Pick<DocumentWithRelations, "users">): boolean {
    const roles = document.users?.user_roles;
    if (
      Array.isArray(roles) &&
      roles.some((entry) => isRoleIn(entry.roles?.name, [RoleName.STUDENT]))
    ) {
      return true;
    }
    return Boolean(document.users?.students?.student_id);
  }

  async getDocument(documentId: number): Promise<DocumentWithRelations> {
    const document = await this.documents.findWithRelations(documentId);
    if (!document) throw new NotFoundException("Dokument nicht gefunden");
    return document;
  }

  async isStudentContext(userId: number, role?: string) {
    if (isRoleIn(role, [RoleName.STUDENT])) return true;

    const user = await this.documents.findStudentProfile(userId);
    if (!user) return false;
    const hasStudentRole = Array.isArray(user.user_roles)
      ? user.user_roles.some((entry) =>
          isRoleIn(entry.roles?.name, [RoleName.STUDENT]),
        )
      : false;
    return Boolean(user.students?.student_id) || hasStudentRole;
  }

  async canReadAll(userId: number, role?: string) {
    if (await this.isStudentContext(userId, role)) return false;
    if (isRoleIn(role, STAFF_ROLES)) return true;

    const user = await this.documents.findRoleNames(userId);
    return Array.isArray(user?.user_roles)
      ? user.user_roles.some((entry) =>
          isRoleIn(entry.roles?.name, STAFF_ROLES),
        )
      : false;
  }

  /** Staff read all; a student their own and shared ones; others also those of their tasks and notes. */
  async canAccess(documentId: number, userId: number, role?: string) {
    if (await this.canReadAll(userId, role)) return true;

    const studentContext = await this.isStudentContext(userId, role);
    if (!(await this.documents.findUploader(documentId))) return false;
    return (
      (await this.documents.countAccessible(
        documentId,
        userId,
        studentContext,
      )) > 0
    );
  }

  async assertAccess(documentId: number, userId: number, role?: string) {
    if (!(await this.canAccess(documentId, userId, role))) {
      throw new ForbiddenException("Kein Zugriff auf dieses Dokument");
    }
  }

  /** A teacher links to any task; others only to their own, assigned or member tasks. */
  async assertTaskLinkable(taskId: number, userId: number, role?: string) {
    const task = await this.documents.findTaskForLinking(taskId, userId);
    if (!task) {
      throw new NotFoundException(
        "Task für Dokument-Verknüpfung nicht gefunden",
      );
    }
    if (isRoleIn(role, STAFF_ROLES)) return task;

    const isOwner = Number(task.created_by) === Number(userId);
    const isAssignee = Number(task.assigned_to) === Number(userId);
    const isMember =
      Array.isArray(task.task_members) && task.task_members.length > 0;
    if (!isOwner && !isAssignee && !isMember) {
      throw new ForbiddenException(
        "Du darfst nur Dokumente zu deinen eigenen Tasks verknüpfen",
      );
    }
    return task;
  }
}
