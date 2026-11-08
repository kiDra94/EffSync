/**
 * The four task priorities (T58, decision Q15, M18), the same as the
 * backend's `priorities` table. The one list the components use.
 */
export const PRIORITIES = [
    { id: 1, label: 'Niedrig' },
    { id: 2, label: 'Mittel' },
    { id: 3, label: 'Hoch' },
    { id: 4, label: 'Dringend' },
];

export const priorityLabel = (id) =>
    PRIORITIES.find((priority) => priority.id === Number(id))?.label ?? '';
