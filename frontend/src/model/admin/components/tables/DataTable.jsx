import { useState } from 'react';
import { MoreVertical, Edit, Trash2, Eye, Search } from 'lucide-react';

export default function DataTable({
  data,
  columns,
  title,
  searchable = true,
  onEdit,
  onDelete,
  onView,
  emptyMessage = "No data available"
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const filteredData = data.filter(item =>
    Object.values(item).some(value =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: { background: '#d1fae5', color: '#065f46' },
      published: { background: '#d1fae5', color: '#065f46' },
      inactive: { background: '#fee2e2', color: '#dc2626' },
      draft: { background: '#fef3c7', color: '#92400e' }
    };

    return (
      <span style={{
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: '600',
        ...styles[status] || styles.draft
      }}>
        {status}
      </span>
    );
  };

  return (
    <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
      <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>{title}</h2>
          <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>{sortedData.length} items</span>
        </div>

        {searchable && (
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>
        )}
      </div>

      <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => column.sortable && handleSort(column.key)}
                  style={{
                    padding: '8px 10px',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#374151',
                    cursor: column.sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {column.label}
                    {column.sortable && (
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                        {sortConfig.key === column.key ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((item, index) => (
                <tr key={item.id || index} style={{
                  borderBottom: '1px solid #e5e7eb',
                  transition: 'background-color 0.15s ease'
                }}>
                  {columns.map((column) => (
                    <td key={column.key} style={{ padding: '8px 10px', fontSize: '0.75rem', color: '#374151', whiteSpace: 'nowrap' }}>
                      {column.render ? column.render(item[column.key], item) : (
                        column.key === 'status' ? getStatusBadge(item[column.key]) :
                          column.key === 'image' ? (
                            <img
                              src={item[column.key]}
                              alt={item.title || 'Image'}
                              style={{ width: '40px', height: '56px', objectFit: 'cover', borderRadius: '4px' }}
                            />
                          ) :
                            column.key === 'price' && item[column.key] ? `₹${item[column.key]}` :
                              column.key === 'rating' ? `${item[column.key]}/10` :
                                column.key === 'views' ? item[column.key]?.toLocaleString() :
                                  column.key === 'addedDate' || column.key === 'joinDate' ? new Date(item[column.key]).toLocaleDateString() :
                                    String(item[column.key] || '-')
                      )}
                    </td>
                  ))}
                  <td style={{ padding: '8px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      {onView && (
                        <button
                          onClick={() => onView(item)}
                          style={{
                            padding: '6px',
                            border: 'none',
                            borderRadius: '6px',
                            background: 'transparent',
                            color: '#6b7280',
                            cursor: 'pointer',
                            transition: 'color 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.target.style.color = '#374151'}
                          onMouseLeave={(e) => e.target.style.color = '#6b7280'}
                        >
                          <Eye size={16} />
                        </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(item)}
                          style={{
                            padding: '6px',
                            border: 'none',
                            borderRadius: '6px',
                            background: 'transparent',
                            color: '#6b7280',
                            cursor: 'pointer',
                            transition: 'color 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.target.style.color = '#374151'}
                          onMouseLeave={(e) => e.target.style.color = '#6b7280'}
                        >
                          <Edit size={16} />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(item)}
                          style={{
                            padding: '6px',
                            border: 'none',
                            borderRadius: '6px',
                            background: 'transparent',
                            color: '#ef4444',
                            cursor: 'pointer',
                            transition: 'color 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.target.style.color = '#dc2626'}
                          onMouseLeave={(e) => e.target.style.color = '#ef4444'}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
