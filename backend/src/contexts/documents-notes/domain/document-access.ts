/**
 * Who may do what with a document (T96, decision of M19 step 1). Pure rules
 * over the document's data; the caller passes the requester's role as flags,
 * so the domain knows no role names.
 */

/** The fields the rules read. */
interface DocumentAccessView {
  added_by?: number | null;
  graded_at?: Date | null;
  document_shares?: { user_id: number | null }[];
  task_documents?: { tasks?: { created_by: number } | null }[];
}

/** The requester as the rules see them. */
export interface Requester {
  userId: number;
  isPrivileged: boolean; // Admin, Superuser
  isTeacher: boolean; // Teacher, Admin, Superuser
  isStudent: boolean;
}

/** Shared with the user through `document_shares`. */
function isExplicitlySharedWith(
  document: DocumentAccessView,
  userId: number,
): boolean {
  if (!Array.isArray(document.document_shares)) return false;
  return document.document_shares.some(
    (share) => Number(share?.user_id) === Number(userId),
  );
}

/** A student sees their own uploads and the ones shared with them. */
export function studentMaySee(
  document: DocumentAccessView,
  userId: number,
): boolean {
  return (
    Number(document.added_by) === Number(userId) ||
    isExplicitlySharedWith(document, userId)
  );
}

function managesOwnAsStudent(document: DocumentAccessView, who: Requester) {
  return who.isStudent && Number(document.added_by) === Number(who.userId);
}

/**
 * Admin/Superuser edit everything; a teacher the documents of their own tasks;
 * a student their own ungraded uploads.
 */
export function mayEdit(document: DocumentAccessView, who: Requester): boolean {
  if (who.isPrivileged) return true;
  if (who.isTeacher) {
    return (document.task_documents ?? []).some(
      (link) => Number(link.tasks?.created_by) === Number(who.userId),
    );
  }
  return managesOwnAsStudent(document, who) && !document.graded_at;
}

/** Admin/Superuser delete everything; a student their own ungraded uploads. */
export function mayDelete(
  document: DocumentAccessView,
  who: Requester,
): boolean {
  if (who.isPrivileged) return true;
  return managesOwnAsStudent(document, who) && !document.graded_at;
}

/**
 * A document can be graded by someone other than its uploader, if a student
 * uploaded it. (The teacher role is checked by the route's RolesGuard, M7.)
 */
export function isGradeableBy(
  document: DocumentAccessView,
  belongsToStudent: boolean,
  userId: number,
): boolean {
  return Number(document.added_by) !== Number(userId) && belongsToStudent;
}

export function mayGrade(
  document: DocumentAccessView,
  belongsToStudent: boolean,
  who: Requester,
): boolean {
  return who.isTeacher && isGradeableBy(document, belongsToStudent, who.userId);
}

/** Only a teacher allows a student a new upload. */
export function mayAllowResubmit(belongsToStudent: boolean, who: Requester) {
  return who.isTeacher && belongsToStudent;
}
