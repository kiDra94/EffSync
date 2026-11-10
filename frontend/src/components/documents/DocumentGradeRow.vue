<script setup>
import { formatDate } from '@/components/documents/documentFiles';

// a graded document's grade and feedback, the table row under it
// (Definition of done: out of DocumentView)
defineProps({
  document: { type: Object, required: true },
});
</script>

<template>
  <tr class="grade-detail-row">
    <td colspan="6">
      <div class="grade-detail-card">
        <div class="grade-detail-header">
          <span class="grade-label">📝 Bewertung:</span>
          <span class="grade-value">{{ document.grade || '—' }}</span>
          <span class="grade-teacher">von {{ document.graded_by_user?.firstname }} {{ document.graded_by_user?.lastname }}</span>
          <span class="grade-date">{{ formatDate(document.graded_at) }}</span>
        </div>
        <div v-if="document.feedback" class="grade-feedback">
          <p>{{ document.feedback }}</p>
        </div>
      </div>
    </td>
  </tr>
</template>

<style scoped>
/* the page's table cell style, which reached this cell before it was a
   component of its own */
.document-table th,
.document-table td {
  padding: 18px 16px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  vertical-align: top;
}

.grade-detail-row {
  background: #f9fafb;
  border-top: 2px solid #e5e7eb;
}

.grade-detail-row td {
  padding: 16px !important;
}

.grade-detail-card {
  background: white;
  border-left: 4px solid #3b82f6;
  border-radius: 6px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.grade-detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.grade-label {
  font-weight: 700;
  color: #374151;
  font-size: 0.95rem;
}

.grade-value {
  background: #dbeafe;
  color: #1e40af;
  padding: 4px 12px;
  border-radius: 20px;
  font-weight: 700;
  font-size: 0.95rem;
}

.grade-teacher {
  color: #6b7280;
  font-size: 0.9rem;
}

.grade-date {
  color: #9ca3af;
  font-size: 0.85rem;
}

.grade-feedback {
  background: #f0f9ff;
  border-left: 3px solid #0284c7;
  padding: 12px;
  border-radius: 4px;
  line-height: 1.6;
  color: #1f2937;
}

.grade-feedback p {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

@media (prefers-color-scheme: dark) {
  .grade-detail-row {
    background: #111827;
    border-top-color: #374151;
  }

  .grade-detail-card {
    background: #1f2937;
    border-left-color: #60a5fa;
  }

  .grade-label,
  .grade-feedback {
    color: #f3f4f6;
  }

  .grade-teacher,
  .grade-date {
    color: #9ca3af;
  }

  .grade-feedback {
    background: #0f172a;
    color: #e5e7eb;
    border-left-color: #0284c7;
  }
}

@media (max-width: 768px) {
  .grade-detail-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .grade-value,
  .grade-teacher,
  .grade-date {
    display: block;
    width: 100%;
  }
}

@media (prefers-color-scheme: dark) {
  /* the page's dark table-cell border (DocumentView), for this cell */
  .document-table td {
    border-color: #374151;
  }
}
</style>
