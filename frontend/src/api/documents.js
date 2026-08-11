import { apiFetch, getToken, API_BASE } from './client';

const base = `${API_BASE}/api/documents`;

async function fetchBlob(path) {
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
  return apiFetch(`${base}/upload`, { method: 'POST', body: fd });
};

export const listDocuments = ({ search, tag, subject_id, sort, page, page_size } = {}) => {
  const q = new URLSearchParams();
  if (search) q.set('search', search);
  if (tag) q.set('tag', tag);
  if (subject_id) q.set('subject_id', subject_id);
  if (sort) q.set('sort', sort);
  q.set('page', page || 1);
  q.set('page_size', page_size || 12);
  return apiFetch(`${base}?${q.toString()}`);
};

export const listTags = () => apiFetch(`${base}/tags`);

export const getDocument = (id) => apiFetch(`${base}/${id}`);

export const getDocumentSummary = (id) => apiFetch(`${base}/${id}/summary`);

export const reanalyzeDocument = (id) =>
  apiFetch(`${base}/${id}/reanalyze`, { method: 'POST' });

export const getDocumentText = (id) => apiFetch(`${base}/${id}/text`);

export const listComments = (id) => apiFetch(`${base}/${id}/comments`);

export const addComment = (id, content) => {
  const fd = new FormData();
  fd.append('content', content);
  return apiFetch(`${base}/${id}/comments`, { method: 'POST', body: fd });
};

export const similarDocuments = (id, limit = 5) =>
  apiFetch(`${base}/${id}/similar?limit=${limit}`);

export const documentFlashcards = (id) => apiFetch(`${base}/${id}/flashcards`);

export const myFlashcards = () => apiFetch(`${base}/flashcards/mine`);

export const createPersonalFlashcard = ({ question, answer, document_id }) => {
  const fd = new FormData();
  fd.append('question', question);
  fd.append('answer', answer);
  if (document_id) fd.append('document_id', document_id);
  return apiFetch(`${base}/flashcards/personal`, { method: 'POST', body: fd });
};

export const deleteFlashcard = (card_id) =>
  apiFetch(`${base}/flashcards/${card_id}`, { method: 'DELETE' });

export const moderationPending = () => apiFetch(`${base}/moderation/pending`);

export const moderateDocument = (id, action, note) => {
  const fd = new FormData();
  fd.append('action', action);
  if (note) fd.append('note', note);
  return apiFetch(`${base}/${id}/moderate`, { method: 'POST', body: fd });
};

export const removeDocument = (id) => apiFetch(`${base}/${id}`, { method: 'DELETE' });

export const documentSubjects = () => apiFetch(`${base}/meta/subjects`);

// Xem PDF trực tuyến (có token) -> object URL
export const viewDocumentBlobUrl = async (id) => {
  const blob = await fetchBlob(`${base}/${id}/file`);
  return URL.createObjectURL(blob);
};

// Tải file về máy
export const downloadDocument = async (id, filename) => {
  const blob = await fetchBlob(`${base}/${id}/download`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'document';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
};
