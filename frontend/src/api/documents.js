import { apiFetch, getToken, API_BASE, resolveApiBase } from './client';

// Lưu ý: không build URL tuyệt đối tại module load (API_BASE được resolve động
// khi chạy trên Android/máy thật). Luôn truyền path tương đối cho apiFetch.

async function fetchBlob(path) {
  await resolveApiBase();
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Không thể tải file.');
  return res.blob();
}

export const uploadDocument = ({ file, title, description, subject_id }) => {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('title', title);
  if (description) fd.append('description', description);
  if (subject_id) fd.append('subject_id', subject_id);
  return apiFetch('/api/documents/upload', { method: 'POST', body: fd });
};

export const listDocuments = ({ search, tag, subject_id, sort, page, page_size } = {}) => {
  const q = new URLSearchParams();
  if (search) q.set('search', search);
  if (tag) q.set('tag', tag);
  if (subject_id) q.set('subject_id', subject_id);
  if (sort) q.set('sort', sort);
  q.set('page', page || 1);
  q.set('page_size', page_size || 12);
  return apiFetch(`/api/documents?${q.toString()}`);
};

export const listTags = () => apiFetch('/api/documents/tags');

export const getDocument = (id) => apiFetch(`/api/documents/${id}`);

export const getDocumentSummary = (id) => apiFetch(`/api/documents/${id}/summary`);

export const reanalyzeDocument = (id) =>
  apiFetch(`/api/documents/${id}/reanalyze`, { method: 'POST' });

export const getDocumentText = (id) => apiFetch(`/api/documents/${id}/text`);

export const listComments = (id) => apiFetch(`/api/documents/${id}/comments`);

export const addComment = (id, content) => {
  const fd = new FormData();
  fd.append('content', content);
  return apiFetch(`/api/documents/${id}/comments`, { method: 'POST', body: fd });
};

export const similarDocuments = (id, limit = 5) =>
  apiFetch(`/api/documents/${id}/similar?limit=${limit}`);

export const documentFlashcards = (id) => apiFetch(`/api/documents/${id}/flashcards`);

export const myFlashcards = () => apiFetch('/api/documents/flashcards/mine');

export const createPersonalFlashcard = ({ question, answer, document_id }) => {
  const fd = new FormData();
  fd.append('question', question);
  fd.append('answer', answer);
  if (document_id) fd.append('document_id', document_id);
  return apiFetch('/api/documents/flashcards/personal', { method: 'POST', body: fd });
};

export const deleteFlashcard = (card_id) =>
  apiFetch(`/api/documents/flashcards/${card_id}`, { method: 'DELETE' });

export const moderationPending = () => apiFetch('/api/documents/moderation/pending');

export const moderateDocument = (id, action, note) => {
  const fd = new FormData();
  fd.append('action', action);
  if (note) fd.append('note', note);
  return apiFetch(`/api/documents/${id}/moderate`, { method: 'POST', body: fd });
};

export const removeDocument = (id) => apiFetch(`/api/documents/${id}`, { method: 'DELETE' });

export const documentSubjects = () => apiFetch('/api/documents/meta/subjects');

// Xem PDF trực tuyến (có token) -> object URL
export const viewDocumentBlobUrl = async (id) => {
  const blob = await fetchBlob(`/api/documents/${id}/file`);
  return URL.createObjectURL(blob);
};

// Tải file về máy
export const downloadDocument = async (id, filename) => {
  const blob = await fetchBlob(`/api/documents/${id}/download`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'document';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
};
