import React, { useState, useEffect, useCallback } from 'react';
import DocumentLibrary from './DocumentLibrary';
import DocumentUpload from './DocumentUpload';
import DocumentDetail from './DocumentDetail';
import FlashcardStudy from './FlashcardStudy';
import ModerationPanel from './ModerationPanel';

// Hash-router nhẹ cho Hệ thống Tài liệu (không cần react-router):
//   #/documents                -> Thư viện
//   #/documents/<id>           -> Chi tiết tài liệu
//   #/documents/<id>/summary   -> Tóm tắt AI
//   #/upload                   -> Đăng tải
//   #/flashcards/<id>          -> Flashcard
//   #/moderation               -> Kiểm duyệt (admin)
export function parseDocumentHash(hash) {
  const clean = (hash || '').replace(/^#\/?/, '').replace(/\/+$/, '');
  const parts = clean.split('/').filter(Boolean);
  if (parts.length === 0) return { view: 'library' };
  if (parts[0] === 'documents') {
    const id = parseInt(parts[1], 10);
    if (!Number.isNaN(id)) {
      if (parts[2] === 'summary') return { view: 'detail', docId: id, tab: 'summary' };
      return { view: 'detail', docId: id, tab: 'view' };
    }
    return { view: 'library' };
  }
  if (parts[0] === 'upload') return { view: 'upload' };
  if (parts[0] === 'flashcards') {
    const id = parseInt(parts[1], 10);
    if (!Number.isNaN(id)) return { view: 'flashcards', docId: id };
  }
  if (parts[0] === 'moderation') return { view: 'moderation' };
  return { view: 'library' };
}

export function navigateTo(hash) {
  window.location.hash = hash.startsWith('#') ? hash : `#/${hash}`;
}

const DocumentSystem = ({ user, showToast }) => {
  const [route, setRoute] = useState(() => parseDocumentHash(window.location.hash));

  useEffect(() => {
    const onHash = () => setRoute(parseDocumentHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const goLibrary = useCallback(() => navigateTo('documents'), []);
  const goUpload = useCallback(() => navigateTo('upload'), []);
  const goModeration = useCallback(() => navigateTo('moderation'), []);

  if (route.view === 'upload') {
    return <DocumentUpload user={user} showToast={showToast} onBack={goLibrary} onUploaded={(id) => navigateTo(`documents/${id}`)} />;
  }
  if (route.view === 'detail') {
    return <DocumentDetail user={user} showToast={showToast} docId={route.docId} initialTab={route.tab || 'view'} onBack={goLibrary} />;
  }
  if (route.view === 'flashcards') {
    return <FlashcardStudy user={user} showToast={showToast} docId={route.docId} onBack={goLibrary} />;
  }
  if (route.view === 'moderation') {
    return <ModerationPanel user={user} showToast={showToast} onBack={goLibrary} />;
  }

  return (
    <DocumentLibrary
      user={user}
      showToast={showToast}
      onUpload={goUpload}
      onOpen={(id) => navigateTo(`documents/${id}`)}
      onModeration={goModeration}
    />
  );
};

export default DocumentSystem;
