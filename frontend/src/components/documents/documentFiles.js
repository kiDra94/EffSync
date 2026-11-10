// The documents page's file rules and labels (Definition of done: out of
// DocumentView.vue). The backend checks the upload again (M19).

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [
  'pdf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp',
  'doc', 'docx', 'odt', 'rtf', 'txt', 'md', 'csv',
  'xls', 'xlsx', 'ppt', 'pptx', 'ods', 'odp',
];
const PREVIEWABLE_MIME_PREFIXES = ['image/', 'text/'];
const PREVIEWABLE_MIME_SUBSTRINGS = ['pdf'];

/** Why a file can't be uploaded, or '' when it can. */
export function validateFile(file) {
  if (!file) return 'Bitte wähle eine Datei aus.';
  if (file.size > MAX_FILE_SIZE) return 'Datei überschreitet das Limit von 25 MB.';
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
    return 'Erlaubte Formate: PDF, JPG/JPEG, PNG, GIF, BMP, WEBP, DOC/DOCX, ODT, RTF, TXT, MD, CSV, XLS/XLSX, PPT/PPTX, ODS, ODP.';
  }
  return '';
}

/** Whether the browser can show the file itself. */
export const isPreviewable = (mimeType) =>
  PREVIEWABLE_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix))
  || PREVIEWABLE_MIME_SUBSTRINGS.some((part) => mimeType.includes(part));

export function simpleType(mime = '') {
  const normalizedMime = String(mime || '').toLowerCase();
  if (normalizedMime.includes('pdf')) return 'PDF';
  if (normalizedMime.includes('word') || normalizedMime.includes('officedocument.wordprocessingml') || normalizedMime.includes('opendocument.text') || normalizedMime.includes('rtf')) return 'Dokument';
  if (normalizedMime.includes('excel') || normalizedMime.includes('spreadsheetml') || normalizedMime.includes('csv') || normalizedMime.includes('opendocument.spreadsheet')) return 'Tabelle';
  if (normalizedMime.includes('powerpoint') || normalizedMime.includes('presentationml') || normalizedMime.includes('opendocument.presentation')) return 'Präsentation';
  if (normalizedMime.includes('text')) return 'Text';
  if (mime.startsWith('image/')) return 'Bild';
  return 'Datei';
}

export function formatBytes(bytes) {
  const size = Number(bytes || 0);
  if (size === 0) return '0 Bytes';
  const units = ['Bytes', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  return `${(size / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

export function formatDate(date) {
  if (!date) return 'Unbekanntes Datum';
  return new Intl.DateTimeFormat('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export const uploaderLabel = (document) =>
  document.uploader?.full_name || document.uploader?.username || 'Unbekannt';

export function uploaderRole(document) {
  const role = String(document.uploader?.role || '').toLowerCase();
  if (role === 'student') return 'Schüler';
  if (role === 'teacher') return 'Lehrer';
  if (role === 'admin') return 'Admin';
  if (role === 'superuser') return 'Superuser';
  return 'Benutzer';
}

export function gradeSummary(document) {
  if (document.grade) return `Note: ${document.grade}`;
  if (document.feedback) return 'Feedback vorhanden';
  return document.is_gradeable ? 'Noch offen' : 'Keine Bewertung';
}

/** The file name the server sends (RFC 5987 first), else the fallback. */
export function fileNameFromResponse(response, fallbackName) {
  const disposition = response.headers?.['content-disposition'] || '';
  const encodedMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (encodedMatch?.[1]) return decodeURIComponent(encodedMatch[1]);
  const plainMatch = disposition.match(/filename="?([^"]+)"?/i);
  return plainMatch?.[1] || fallbackName;
}

/**
 * Opens a downloaded file in a new tab, or saves it when that is blocked.
 * Without 'noopener' in the features, because with it window.open always
 * returns null and every file was downloaded as well (review); the tab is
 * cut off from this page by hand instead.
 */
export function openBlob(blob, fileName) {
  const objectUrl = URL.createObjectURL(blob);
  const newWindow = window.open(objectUrl, '_blank');
  if (newWindow) {
    newWindow.opener = null;
  } else {
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    link.click();
  }
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

export function saveBlob(blob, fileName) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
}
