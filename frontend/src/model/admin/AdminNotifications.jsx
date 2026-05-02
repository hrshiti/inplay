import React, { useState, useEffect } from 'react';
import adminNotificationService from '../../services/api/adminNotificationService';

const AdminNotifications = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState({ title: '', body: '' });
  const [status, setStatus] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await adminNotificationService.getHistory();
      if (response.success) {
        setHistory(response.data);
      }
    } catch (error) {
      console.error('Fetch history error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.title || !message.body) return;

    setSending(true);
    setStatus({ type: '', text: '' });

    try {
      const response = await adminNotificationService.sendToAll(message);
      if (response.success) {
        setStatus({ type: 'success', text: 'Notification sent successfully to all users!' });
        setMessage({ title: '', body: '' });
        fetchHistory(); // Refresh history
      } else {
        setStatus({ type: 'error', text: response.message || 'Failed to send notification' });
      }
    } catch (error) {
      setStatus({ type: 'error', text: error.response?.data?.message || 'Server error occurred' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>Push Notifications</h1>
        <p style={{ color: '#6b7280' }}>Manage and broadcast push notifications to your users.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
        {/* Compose Section */}
        <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#1f2937', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.5rem' }}>📣</span> Send New Broadcast
          </h2>
          
          <form onSubmit={handleSend}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '500', color: '#374151' }}>Notification Title</label>
              <input
                type="text"
                placeholder="Enter catchy title..."
                value={message.title}
                onChange={(e) => setMessage({ ...message, title: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d1d5db', outline: 'none', transition: 'border-color 0.2s' }}
                required
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '500', color: '#374151' }}>Message Body</label>
              <textarea
                rows="4"
                placeholder="Type your message here..."
                value={message.body}
                onChange={(e) => setMessage({ ...message, body: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d1d5db', outline: 'none', resize: 'none' }}
                required
              />
            </div>

            {status.text && (
              <div style={{ marginBottom: '20px', padding: '12px', borderRadius: '8px', background: status.type === 'success' ? '#f0fdf4' : '#fef2f2', color: status.type === 'success' ? '#166534' : '#991b1b', fontSize: '0.85rem', border: `1px solid ${status.type === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
                {status.text}
              </div>
            )}

            <button
              type="submit"
              disabled={sending}
              style={{ width: '100%', padding: '14px', borderRadius: '10px', background: '#f59e0b', color: '#fff', border: 'none', fontWeight: '600', cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1, transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)' }}
            >
              {sending ? 'Sending...' : '🚀 Blast Notification to All Users'}
            </button>
          </form>
        </div>

        {/* History Section */}
        <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#1f2937', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.5rem' }}>📜</span> Sent History
          </h2>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading history...</div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280', border: '2px dashed #f3f4f6', borderRadius: '12px' }}>No notifications sent yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {history.map((item) => (
                <div key={item._id} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #f3f4f6', background: '#fafafa', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>{item.title}</span>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{new Date(item.sentAt || item.createdAt).toLocaleString()}</span>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: '#4b5563', margin: 0 }}>{item.body}</p>
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: item.target === 'all' ? '#dbeafe' : '#fef3c7', color: item.target === 'all' ? '#1e40af' : '#92400e', fontWeight: '600', textTransform: 'uppercase' }}>
                      {item.target}
                    </span>
                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: '#f3f4f6', color: '#6b7280' }}>
                      Status: {item.status || 'sent'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminNotifications;
