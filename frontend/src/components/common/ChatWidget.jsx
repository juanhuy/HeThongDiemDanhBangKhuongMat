import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { apiFetch, API_BASE } from '../../api/client';

const INITIAL_BOT = "Xin chào! Tôi là trợ lý của hệ thống điểm danh PTIT. Bạn có thể hỏi về tỷ lệ vắng, cấm thi, lịch học hoặc quy chế.";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'bot', content: INITIAL_BOT }]);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const send = async () => {
    const text = input.trim();
    if (!text || typing) return;
    setInput('');
    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setTyping(true);
    try {
      const history = newMessages.slice(-6).map((m) => ({
        role: m.role === 'bot' ? 'assistant' : 'user',
        content: m.content,
      }));
      const data = await apiFetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      });
      setMessages([...newMessages, { role: 'bot', content: data.reply || 'Xin lỗi, tôi chưa trả lời được.' }]);
    } catch (e) {
      setMessages([...newMessages, { role: 'bot', content: 'Có lỗi khi liên hệ máy chủ. Vui lòng thử lại.' }]);
    } finally {
      setTyping(false);
    }
  };

  const styles = {
    fab: {
      position: 'fixed',
      bottom: 20,
      right: 20,
      width: 54,
      height: 54,
      borderRadius: '50%',
      background: '#106fa6',
      color: '#fff',
      border: 'none',
      boxShadow: '0 4px 14px rgba(16,111,166,0.4)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1200,
    },
    panel: {
      position: 'fixed',
      bottom: 84,
      right: 20,
      width: 360,
      maxWidth: 'calc(100vw - 40px)',
      height: 480,
      maxHeight: 'calc(100vh - 120px)',
      background: '#fff',
      borderRadius: 12,
      boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
      border: '1px solid #d0e0eb',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      zIndex: 1200,
    },
    header: {
      background: '#106fa6',
      color: '#fff',
      padding: '12px 14px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontWeight: 700,
      fontSize: '0.95rem',
    },
    body: {
      flex: 1,
      overflowY: 'auto',
      padding: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      background: '#f8fafc',
    },
    bubble: (isUser) => ({
      maxWidth: '80%',
      padding: '9px 12px',
      borderRadius: 12,
      fontSize: '0.82rem',
      lineHeight: 1.45,
      whiteSpace: 'pre-wrap',
      background: isUser ? '#106fa6' : '#fff',
      color: isUser ? '#fff' : '#1e293b',
      border: isUser ? 'none' : '1px solid #e2e8f0',
      alignSelf: isUser ? 'flex-end' : 'flex-start',
    }),
    inputRow: {
      display: 'flex',
      gap: 8,
      padding: 10,
      borderTop: '1px solid #e2edf5',
      background: '#fff',
    },
    input: {
      flex: 1,
      padding: '9px 12px',
      border: '1px solid #cbd5e1',
      borderRadius: 8,
      fontSize: '0.85rem',
      outline: 'none',
    },
  };

  return (
    <>
      {open && (
        <div style={styles.panel}>
          <div style={styles.header}>
            <span>Trợ lý ảo PTIT</span>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}>
              <X size={18} />
            </button>
          </div>
          <div style={styles.body}>
            {messages.map((m, i) => (
              <div key={i} style={styles.bubble(m.role === 'user')}>{m.content}</div>
            ))}
            {typing && <div style={styles.bubble(false)}>...</div>}
            <div ref={bottomRef} />
          </div>
          <div style={styles.inputRow}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Hỏi về điểm danh, cấm thi, lịch học..."
              style={styles.input}
            />
            <button onClick={send} disabled={typing} style={{ ...styles.fab, position: 'static', width: 40, height: 40, background: typing ? '#94a3b8' : '#059669' }}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(!open)} style={styles.fab} title="Trợ lý ảo">
        <MessageCircle size={24} />
      </button>
    </>
  );
}
