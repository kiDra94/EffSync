import {
  mayAllowResubmit,
  mayDelete,
  mayEdit,
  mayGrade,
  type Requester,
} from "../domain/document-access";
import type { DocumentWithRelations } from "./ports/document-records";

type Person = {
  user_id: number;
  firstname: string;
  lastname: string;
  username: string;
  user_roles?: { roles?: { name?: string | null } | null }[];
} | null;

function mapPerson(person: Person) {
  if (!person) return null;
  const primaryRole =
    person.user_roles?.[0]?.roles?.name?.toLowerCase() ?? null;
  return {
    user_id: person.user_id,
    firstname: person.firstname,
    lastname: person.lastname,
    username: person.username,
    full_name: [person.firstname, person.lastname].filter(Boolean).join(" "),
    role: primaryRole,
  };
}

/**
 * The document as the UI shows it: without the blob and the shares, with
 * uploader, grader, linked tasks and what the requester may do. The use
 * cases return it (M19: application, not infrastructure, because they
 * return the mapped view).
 */
export function toDocumentView(
  document: DocumentWithRelations,
  who: Requester,
  belongsToStudent: boolean,
) {
  const {
    file_blob: _blob,
    document_shares: _shares,
    ...safeDocument
  } = document;
  const linkedTaskIds = Array.isArray(document.task_documents)
    ? document.task_documents.map((entry) => entry.task_id)
    : [];

  return {
    ...safeDocument,
    uploader: mapPerson(document.users),
    grader: mapPerson(document.graded_by_user),
    linked_task_ids: linkedTaskIds,
    primary_task_id: linkedTaskIds[0] ?? null,
    is_gradeable: belongsToStudent,
    permissions: {
      can_view: true,
      can_download: true,
      can_edit: mayEdit(document, who),
      can_delete: mayDelete(document, who),
      can_grade: mayGrade(document, belongsToStudent, who),
      can_resubmit: mayAllowResubmit(belongsToStudent, who),
    },
  };
}
