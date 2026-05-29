import React, { useState, useEffect } from 'react';
import adminNotificationService from '../../services/api/adminNotificationService';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUtils';

const AdminNotifications = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ title: '', body: '', imageUrl: '' });
  const [status, setStatus] = useState({ type: '', text: '' });

  // Reporting States
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [reportDetails, setReportDetails] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportSearch, setReportSearch] = useState('');
  const [activeReportTab, setActiveReportTab] = useState('seen');

  const openReport = async (notificationId) => {
    setSelectedReportId(notificationId);
    setLoadingReport(true);
    setReportDetails(null);
    setReportSearch('');
    setActiveReportTab('seen');
    try {
      const response = await adminNotificationService.getRecipients(notificationId);
      if (response.success) {
        setReportDetails(response.data);
      }
    } catch (error) {
      console.error('Fetch recipients error:', error);
    } finally {
      setLoadingReport(false);
    }
  };

  const closeReport = () => {
    setSelectedReportId(null);
    setReportDetails(null);
  };

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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setStatus({ type: 'error', text: 'Image size should be less than 5MB' });
      return;
    }

    setUploading(true);
    setStatus({ type: '', text: '' });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://api.inplays.in/api'}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ ...message, imageUrl: data.data.url });
        setStatus({ type: 'success', text: 'Image uploaded successfully!' });
      } else {
        setStatus({ type: 'error', text: data.message || 'Upload failed' });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setStatus({ type: 'error', text: 'Failed to upload image' });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setMessage({ ...message, imageUrl: '' });
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
        setMessage({ title: '', body: '', imageUrl: '' });
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
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '500', color: '#374151' }}>Message Body</label>
              <textarea
                rows="3"
                placeholder="Type your message here..."
                value={message.body}
                onChange={(e) => setMessage({ ...message, body: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d1d5db', outline: 'none', resize: 'none' }}
                required
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '500', color: '#374151' }}>
                Notification Icon / Image (Optional)
              </label>
              
              {!message.imageUrl ? (
                <div 
                  onClick={() => document.getElementById('imageUpload').click()}
                  style={{ 
                    border: '2px dashed #d1d5db', 
                    borderRadius: '12px', 
                    padding: '20px', 
                    textAlign: 'center', 
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    background: '#f9fafb',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = '#f59e0b'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                >
                  <input 
                    id="imageUpload"
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileUpload} 
                    style={{ display: 'none' }}
                    disabled={uploading}
                  />
                  {uploading ? (
                    <div style={{ color: '#6b7280' }}>Uploading...</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Upload size={24} color="#9ca3af" />
                      <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>Click to upload notification image</span>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb', width: 'fit-content' }}>
                  <img 
                    src={getImageUrl(message.imageUrl)} 
                    alt="Preview" 
                    style={{ width: '120px', height: '120px', objectFit: 'cover' }} 
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    style={{ 
                      position: 'absolute', 
                      top: '4px', 
                      right: '4px', 
                      background: 'rgba(0,0,0,0.6)', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: '50%', 
                      width: '24px', 
                      height: '24px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            {status.text && (
              <div style={{ marginBottom: '20px', padding: '12px', borderRadius: '8px', background: status.type === 'success' ? '#f0fdf4' : '#fef2f2', color: status.type === 'success' ? '#166534' : '#991b1b', fontSize: '0.85rem', border: `1px solid ${status.type === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
                {status.text}
              </div>
            )}

            <button
              type="submit"
              disabled={sending || uploading}
              style={{ width: '100%', padding: '14px', borderRadius: '10px', background: '#f59e0b', color: '#fff', border: 'none', fontWeight: '600', cursor: (sending || uploading) ? 'not-allowed' : 'pointer', opacity: (sending || uploading) ? 0.7 : 1, transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)' }}
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
                  <div style={{ display: 'flex', gap: '16px' }}>
                    {item.imageUrl && (
                      <img 
                        src={getImageUrl(item.imageUrl)} 
                        alt="icon" 
                        style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} 
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>{item.title}</span>
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{new Date(item.sentAt || item.createdAt).toLocaleString()}</span>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: '#4b5563', margin: 0 }}>{item.body}</p>
                      <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: item.target === 'all' ? '#dbeafe' : '#fef3c7', color: item.target === 'all' ? '#1e40af' : '#92400e', fontWeight: '600', textTransform: 'uppercase' }}>
                          {item.target}
                        </span>
                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: '#f3f4f6', color: '#6b7280' }}>
                          Status: {item.status || 'sent'}
                        </span>
                        {item.target !== 'user' && (
                          <>
                            <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: '#dcfce7', color: '#15803d', fontWeight: '600' }}>
                              👁️ Seen: {item.seenCount || 0}
                            </span>
                            
                            <button
                              onClick={() => openReport(item._id)}
                              style={{ 
                                marginLeft: 'auto',
                                fontSize: '0.7rem', 
                                padding: '4px 10px', 
                                borderRadius: '8px', 
                                background: '#f59e0b', 
                                color: '#fff', 
                                border: 'none', 
                                cursor: 'pointer',
                                fontWeight: '600',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 2px 4px rgba(245, 158, 11, 0.15)'
                              }}
                              onMouseOver={(e) => e.currentTarget.style.background = '#d97706'}
                              onMouseOut={(e) => e.currentTarget.style.background = '#f59e0b'}
                            >
                              📊 View Delivery Report
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detailed Delivery Report Modal Overlay */}
      {selectedReportId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(17, 24, 39, 0.7)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            background: '#fff',
            width: '100%',
            maxWidth: '700px',
            borderRadius: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid rgba(243, 244, 246, 1)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #f3f4f6',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#fcfcfc'
            }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#111827', margin: 0 }}>📊 Push Delivery Analytics</h3>
                <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '4px 0 0 0' }}>Seen/unseen tracking statistics for this broadcast</p>
              </div>
              <button 
                onClick={closeReport} 
                style={{ 
                  background: '#f3f4f6', 
                  border: 'none', 
                  borderRadius: '50%', 
                  width: '32px', 
                  height: '32px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer',
                  color: '#4b5563',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#e5e7eb'}
                onMouseOut={(e) => e.currentTarget.style.background = '#f3f4f6'}
              >
                <X size={18} />
              </button>
            </div>

            {loadingReport ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', border: '3px solid #f3f4f6', borderTop: '3px solid #f59e0b', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Fetching real-time statistics...</span>
              </div>
            ) : !reportDetails ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>Failed to load report. Please try again.</div>
            ) : (
              <>
                {/* Modal Body */}
                <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                  {/* Notification Details Card */}
                  <div style={{ padding: '16px', borderRadius: '16px', background: '#fafafa', border: '1px solid #f3f4f6', marginBottom: '24px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#6b7280', marginBottom: '6px' }}>Message Details</div>
                    <div style={{ fontSize: '1rem', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>{reportDetails.title}</div>
                    <div style={{ fontSize: '0.9rem', color: '#4b5563' }}>{reportDetails.body}</div>
                  </div>

                  {/* Summary Counters */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ padding: '16px', borderRadius: '16px', background: '#f0f9ff', border: '1px solid #e0f2fe', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#0369a1', textTransform: 'uppercase', marginBottom: '4px' }}>Total Sent</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0369a1' }}>{reportDetails.sentCount}</div>
                    </div>
                    <div style={{ padding: '16px', borderRadius: '16px', background: '#f0fdf4', border: '1px solid #dcfce7', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#15803d', textTransform: 'uppercase', marginBottom: '4px' }}>Seen / Opened</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#15803d' }}>{reportDetails.seenCount}</div>
                    </div>
                    <div style={{ padding: '16px', borderRadius: '16px', background: '#fffbeb', border: '1px solid #fef3c7', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#b45309', textTransform: 'uppercase', marginBottom: '4px' }}>Open Rate</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#b45309' }}>
                        {reportDetails.sentCount > 0 ? ((reportDetails.seenCount / reportDetails.sentCount) * 100).toFixed(1) + '%' : '0%'}
                      </div>
                    </div>
                  </div>

                  {/* Search and Tabs */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    {/* Tabs */}
                    <div style={{ display: 'flex', background: '#f3f4f6', padding: '4px', borderRadius: '12px' }}>
                      <button
                        onClick={() => setActiveReportTab('seen')}
                        style={{
                          padding: '6px 16px',
                          borderRadius: '10px',
                          border: 'none',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          background: activeReportTab === 'seen' ? '#fff' : 'transparent',
                          color: activeReportTab === 'seen' ? '#111827' : '#6b7280',
                          boxShadow: activeReportTab === 'seen' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                          transition: 'all 0.2s'
                        }}
                      >
                        👁️ Seen By ({reportDetails.seenUsers.length})
                      </button>
                      <button
                        onClick={() => setActiveReportTab('unseen')}
                        style={{
                          padding: '6px 16px',
                          borderRadius: '10px',
                          border: 'none',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          background: activeReportTab === 'unseen' ? '#fff' : 'transparent',
                          color: activeReportTab === 'unseen' ? '#111827' : '#6b7280',
                          boxShadow: activeReportTab === 'unseen' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                          transition: 'all 0.2s'
                        }}
                      >
                        👻 Unseen By ({reportDetails.unseenUsers.length})
                      </button>
                    </div>

                    {/* Search Input */}
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={reportSearch}
                      onChange={(e) => setReportSearch(e.target.value)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '10px',
                        border: '1px solid #d1d5db',
                        fontSize: '0.85rem',
                        outline: 'none',
                        width: '200px'
                      }}
                    />
                  </div>

                  {/* Users List */}
                  <div style={{ border: '1px solid #f3f4f6', borderRadius: '16px', overflow: 'hidden' }}>
                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                      {(() => {
                        const list = activeReportTab === 'seen' ? reportDetails.seenUsers : reportDetails.unseenUsers;
                        const filtered = list.filter(u => 
                          (u.name || '').toLowerCase().includes(reportSearch.toLowerCase()) || 
                          (u.email || '').toLowerCase().includes(reportSearch.toLowerCase()) ||
                          (u.phone || '').toLowerCase().includes(reportSearch.toLowerCase())
                        );

                        if (filtered.length === 0) {
                          return (
                            <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>
                              No users match this criteria.
                            </div>
                          );
                        }

                        return (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #f3f4f6', color: '#4b5563', fontWeight: '600' }}>
                                <th style={{ padding: '12px 16px' }}>User</th>
                                <th style={{ padding: '12px 16px' }}>Phone</th>
                                {activeReportTab === 'seen' && <th style={{ padding: '12px 16px' }}>Seen At</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {filtered.map((user) => (
                                <tr key={user._id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.1s' }} onMouseOver={(e) => e.currentTarget.style.background = '#fafafa'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                                  <td style={{ padding: '12px 16px' }}>
                                    <div style={{ fontWeight: '600', color: '#111827' }}>{user.name || 'Anonymous User'}</div>
                                    <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>{user.email}</div>
                                  </td>
                                  <td style={{ padding: '12px 16px', color: '#4b5563' }}>{user.phone || 'N/A'}</td>
                                  {activeReportTab === 'seen' && (
                                    <td style={{ padding: '12px 16px', color: '#10b981', fontWeight: '500' }}>
                                      {user.seenAt ? new Date(user.seenAt).toLocaleString() : 'N/A'}
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid #f3f4f6', background: '#fcfcfc', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={closeReport}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '10px',
                      background: '#111827',
                      color: '#fff',
                      border: 'none',
                      fontWeight: '600',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#1f2937'}
                    onMouseOut={(e) => e.currentTarget.style.background = '#111827'}
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotifications;

