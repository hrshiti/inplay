import React, { useState, useEffect } from 'react';
import { UserCheck, Key, Plus, Trash2, Edit, Shield, Copy, Check, Lock, RefreshCw } from 'lucide-react';
import adminAuthService from '../../../services/api/adminAuthService';

const AVAILABLE_TABS = [
  { id: 'dashboard', label: 'Dashboard Overview' },
  { id: 'banner_management', label: 'Banner Management' },
  { id: 'promotions', label: 'Active Ad Promotions' },
  { id: 'quick_bites', label: 'Quick Bites Shorts' },
  { id: 'for_you', label: 'For You Reels' },
  { id: 'darmaa_sections', label: 'Darmaa Sections' },
  { id: 'bhojpuri_sections', label: 'Bhojpuri Sections' },
  { id: 'cinema_sections', label: 'Cinema Sections' },
  { id: 'audio_series', label: 'Audio Series' },
  { id: 'users', label: 'User Management' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'content_library', label: 'Content Library' },
  { id: 'legal_pages', label: 'Legal Pages' }
];

export default function SubAdminManagementPage() {
  const [subAdmins, setSubAdmins] = useState([]);
  const [dailyCode, setDailyCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedSubAdmin, setSelectedSubAdmin] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    permittedTabs: [],
    canDelete: false,
    isActive: true
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [codeRes, subs] = await Promise.all([
        adminAuthService.getDailyCode(),
        adminAuthService.getSubAdmins()
      ]);
      setDailyCode(codeRes.code);
      setSubAdmins(subs || []);
    } catch (err) {
      console.error('Failed to load sub-admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(dailyCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenAddModal = () => {
    setModalMode('add');
    setSelectedSubAdmin(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      permittedTabs: ['dashboard'],
      canDelete: false,
      isActive: true
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (subAdmin) => {
    setModalMode('edit');
    setSelectedSubAdmin(subAdmin);
    setFormData({
      name: subAdmin.name || '',
      email: subAdmin.email || '',
      password: '',
      permittedTabs: subAdmin.permittedTabs || [],
      canDelete: subAdmin.canDelete === true,
      isActive: subAdmin.isActive !== undefined ? subAdmin.isActive : true
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleToggleTabPermission = (tabId) => {
    setFormData(prev => {
      const exists = prev.permittedTabs.includes(tabId);
      if (exists) {
        return { ...prev, permittedTabs: prev.permittedTabs.filter(id => id !== tabId) };
      } else {
        return { ...prev, permittedTabs: [...prev.permittedTabs, tabId] };
      }
    });
  };

  const handleSelectAllTabs = () => {
    setFormData(prev => ({
      ...prev,
      permittedTabs: AVAILABLE_TABS.map(t => t.id)
    }));
  };

  const handleDeselectAllTabs = () => {
    setFormData(prev => ({
      ...prev,
      permittedTabs: []
    }));
  };

  const handleSaveSubAdmin = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      setFormError('Name and email are required');
      return;
    }

    if (modalMode === 'add' && (!formData.password || formData.password.length < 6)) {
      setFormError('Password must be at least 6 characters');
      return;
    }

    try {
      setSaving(true);
      setFormError('');

      if (modalMode === 'add') {
        await adminAuthService.createSubAdmin(formData);
      } else {
        await adminAuthService.updateSubAdmin(selectedSubAdmin._id, formData);
      }

      setModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err.message || 'Failed to save sub-admin');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubAdmin = async (subAdmin) => {
    if (confirm(`Are you sure you want to delete staff account "${subAdmin.name}"?`)) {
      try {
        await adminAuthService.deleteSubAdmin(subAdmin._id);
        fetchData();
      } catch (err) {
        alert(err.message || 'Failed to delete sub-admin');
      }
    }
  };

  return (
    <div style={{ padding: '16px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: '0 0 4px', color: '#111827' }}>
            Staff & Access Delegation
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
            Create sub-admin credentials, assign tab permissions, and manage daily verification codes.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          style={{
            backgroundColor: '#46d369',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Plus size={18} /> Add New Sub-Admin
        </button>
      </div>

      {/* Today's Daily Access Code Box */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        color: 'white',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '32px',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Key size={20} style={{ color: '#38bdf8' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8' }}>
              TODAY'S DAILY ACCESS CODE ({new Date().toISOString().split('T')[0]})
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: 0 }}>
            Sub-admins must enter this 6-digit code daily to unlock their assigned tabs. Access expires at midnight.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            fontSize: '2.2rem',
            fontWeight: '800',
            letterSpacing: '6px',
            color: '#38bdf8',
            background: 'rgba(255, 255, 255, 0.08)',
            padding: '8px 24px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.12)'
          }}>
            {dailyCode || '******'}
          </div>

          <button
            onClick={handleCopyCode}
            style={{
              backgroundColor: copied ? '#16a34a' : 'white',
              color: copied ? 'white' : '#0f172a',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '10px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>
      </div>

      {/* Sub-Admins Table */}
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: '#111827' }}>Sub-Admin Staff Accounts</h3>
          <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{subAdmins.length} active staff accounts</span>
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>Loading staff accounts...</div>
        ) : subAdmins.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
            No sub-admin accounts created yet. Click "Add New Sub-Admin" to delegate tab access to staff.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#374151' }}>Name & Email</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#374151' }}>Permitted Tabs</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#374151' }}>Daily Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#374151' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subAdmins.map((subAdmin) => {
                const isVerifiedToday = subAdmin.dailyVerification?.lastVerifiedDate === new Date().toISOString().split('T')[0];
                return (
                  <tr key={subAdmin._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: '700', color: '#111827', fontSize: '0.95rem' }}>{subAdmin.name}</div>
                      <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>{subAdmin.email}</div>
                    </td>

                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxWidth: '500px' }}>
                        {subAdmin.permittedTabs?.map((tabId) => {
                          const tabObj = AVAILABLE_TABS.find(t => t.id === tabId);
                          return (
                            <span key={tabId} style={{
                              background: '#f0fdf4',
                              color: '#166534',
                              border: '1px solid #bbf7d0',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}>
                              {tabObj ? tabObj.label : tabId}
                            </span>
                          );
                        })}
                        {(!subAdmin.permittedTabs || subAdmin.permittedTabs.length === 0) && (
                          <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>No tabs permitted</span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          background: isVerifiedToday ? '#dcfce7' : '#fee2e2',
                          color: isVerifiedToday ? '#15803d' : '#b91c1c'
                        }}>
                          {isVerifiedToday ? '✓ Code Verified Today' : '🔒 Pending Daily Code'}
                        </span>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: '600',
                          color: subAdmin.canDelete ? '#dc2626' : '#059669',
                          background: subAdmin.canDelete ? '#fef2f2' : '#f0fdf4',
                          border: subAdmin.canDelete ? '1px solid #fecaca' : '1px solid #bbf7d0',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          display: 'inline-block',
                          width: 'fit-content'
                        }}>
                          {subAdmin.canDelete ? '⚠️ Delete Allowed' : '🛡️ No Delete Access'}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button
                          onClick={() => handleOpenEditModal(subAdmin)}
                          style={{ padding: '6px', border: 'none', background: '#f3f4f6', borderRadius: '6px', cursor: 'pointer', color: '#374151' }}
                          title="Edit Permissions"
                        >
                          <Edit size={16} />
                        </button>

                        <button
                          onClick={() => handleDeleteSubAdmin(subAdmin)}
                          style={{ padding: '6px', border: 'none', background: '#fee2e2', borderRadius: '6px', cursor: 'pointer', color: '#dc2626' }}
                          title="Delete Account"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal for Add / Edit Sub-Admin */}
      {modalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, backdropFilter: 'blur(4px)', padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '600px',
            maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: '0 0 16px', color: '#111827' }}>
              {modalMode === 'add' ? 'Create New Sub-Admin Account' : `Edit Permissions: ${selectedSubAdmin?.name}`}
            </h2>

            {formError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveSubAdmin}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                  Password {modalMode === 'edit' && '(Leave blank to keep unchanged)'} *
                </label>
                <input
                  type="password"
                  required={modalMode === 'add'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              {/* Tab Permissions Section */}
              <div style={{ marginBottom: '24px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: '800', color: '#111827' }}>
                    Select Permitted Admin Tabs ({formData.permittedTabs.length} / {AVAILABLE_TABS.length})
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={handleSelectAllTabs} style={{ fontSize: '0.75rem', background: '#f3f4f6', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>Select All</button>
                    <button type="button" onClick={handleDeselectAllTabs} style={{ fontSize: '0.75rem', background: '#f3f4f6', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>Clear All</button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {AVAILABLE_TABS.map((tab) => {
                    const isChecked = formData.permittedTabs.includes(tab.id);
                    return (
                      <label key={tab.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: isChecked ? '1px solid #46d369' : '1px solid #e5e7eb',
                        background: isChecked ? '#f0fdf4' : '#fafafa',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: isChecked ? '700' : '500',
                        color: isChecked ? '#166534' : '#374151'
                      }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleTabPermission(tab.id)}
                        />
                        <span>{tab.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Delete Permission Toggle */}
              <div style={{ marginBottom: '24px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: formData.canDelete ? '1px solid #fca5a5' : '1px solid #e5e7eb',
                  background: formData.canDelete ? '#fef2f2' : '#f9fafb',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={formData.canDelete}
                    onChange={(e) => setFormData({ ...formData, canDelete: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', color: formData.canDelete ? '#b91c1c' : '#374151' }}>
                      Allow Deletion Rights (Delete Content / Items)
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                      {formData.canDelete
                        ? 'Warning: Staff member will be able to delete items in their allowed tabs.'
                        : 'Recommended: Staff member can view, add, and edit, but CANNOT delete anything.'}
                    </div>
                  </div>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: '8px', background: 'white', cursor: 'pointer', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '10px 24px', border: 'none', borderRadius: '8px', background: '#46d369', color: 'white', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer' }}
                >
                  {saving ? 'Saving...' : modalMode === 'add' ? 'Create Sub-Admin' : 'Update Permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
