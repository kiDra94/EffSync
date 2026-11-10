import { defineStore } from 'pinia';
import {
    fetchDocuments,
    uploadDocument,
    renameDocument,
    gradeDocument,
    fetchMyGrades,
    deleteDocument,
    fetchDocumentBinary,
} from '@/api/documents';

/**
 * Documents and grades (M25, decision Q19): the document view, the grades
 * view and the grading dialog reach the api/ layer through this store.
 */
export const useDocumentStore = defineStore('document', () => ({
    fetchDocuments: () => fetchDocuments(),
    uploadDocument: (file, taskId) => uploadDocument(file, taskId),
    renameDocument: (documentId, name) => renameDocument(documentId, name),
    gradeDocument: (documentId, payload) => gradeDocument(documentId, payload),
    fetchMyGrades: () => fetchMyGrades(),
    deleteDocument: (documentId) => deleteDocument(documentId),
    fetchDocumentBinary: (documentId) => fetchDocumentBinary(documentId),
}));
