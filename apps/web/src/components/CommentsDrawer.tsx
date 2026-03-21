import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send } from 'lucide-react';
import { getMessages, sendMessage, markAsRead } from '../api/messaging';
import { useAuth } from '../context/AuthContext';
import type { AdminMessage } from '../types';

interface CommentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

export default function CommentsDrawer({ isOpen, onClose, userId, userName }: CommentsDrawerProps) {
  const { user: admin } = useAuth();
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await getMessages(userId);
      setMessages(data);
    } catch {
      // silently fail on poll errors
    }
  }, [userId]);

  // Load messages and start polling when drawer opens
  useEffect(() => {
    if (!isOpen || !userId) return;

    setLoading(true);
    fetchMessages().finally(() => setLoading(false));
    markAsRead(userId).catch(() => {});

    pollRef.current = setInterval(fetchMessages, 10_000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [isOpen, userId, fetchMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      const sent = await sendMessage(userId, text);
      setMessages((prev) => [...prev, { ...sent, isFromAdmin: true }]);
      setNewMessage('');
    } catch {
      // Could add error toast here
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-96 max-w-full flex flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Comments</h2>
            <p className="text-sm text-gray-500">{userName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              No messages yet. Start a conversation.
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isFromAdmin ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-3.5 py-2.5 ${
                    msg.isFromAdmin
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className={`text-xs font-medium mb-1 ${msg.isFromAdmin ? 'text-blue-100' : 'text-gray-500'}`}>
                    {msg.isFromAdmin
                      ? admin
                        ? `${admin.firstName ?? ''} ${admin.lastName ?? ''}`.trim() || 'Admin'
                        : 'Admin'
                      : userName}
                  </p>
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${msg.isFromAdmin ? 'text-blue-200' : 'text-gray-400'}`}>
                    {formatTime(msg.sentAt)}
                    {msg.isFromAdmin && msg.isRead && ' · Read'}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-gray-200 px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="flex-shrink-0 p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
