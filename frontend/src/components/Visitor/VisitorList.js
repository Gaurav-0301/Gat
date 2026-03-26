// VisitorList.js (admin view: remove Status column; actions: view, delete, remove blacklist)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { visitorAPI } from '../../services/api';
import { useAuthContext } from '../../hooks/useAuthContext';
import Loader from '../Shared/Loader';
import './Visitor.css';
import { exportToCSV, formatDataForExport } from '../../utils/exportUtils';
import { notifySuccess, notifyError } from '../../utils/notifications';

const VisitorList = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchVisitors = async (s = search, page = currentPage) => {
    try {
      setLoading(true);
      const data = await visitorAPI.getAll({ search: s, page, limit: 10 });

      const list = data?.visitors || data?.data || (Array.isArray(data) ? data : []);
      const pages = data?.totalPages ?? data?.total_pages ?? 1;

      setVisitors(Array.isArray(list) ? list : []);
      setTotalPages(Number.isFinite(pages) ? pages : 1);
    } catch (error) {
      console.error('Error fetching visitors:', error);
      setVisitors([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, currentPage]);

  const handleExport = (e) => {
    e?.preventDefault?.();
    try {
      const formattedData = formatDataForExport(visitors || []);
      exportToCSV(formattedData, `visitors-${new Date().toISOString().split('T')[0]}`);
      notifySuccess('CSV exported successfully');
    } catch (err) {
      console.error('Export failed:', err);
      notifyError('Failed to export CSV');
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleUnblacklist = async (id) => {
    try {
      setActionLoading(id);
      await visitorAPI.toggleBlacklist(id, { isBlacklisted: false });
      notifySuccess('Visitor removed from blacklist');
      await fetchVisitors();
    } catch (error) {
      console.error('Error updating blacklist:', error);
      notifyError('Failed to update blacklist status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this visitor?')) return;
    try {
      setActionLoading(id);
      await visitorAPI.delete(id);
      notifySuccess('Visitor deleted');
      await fetchVisitors();
    } catch (error) {
      console.error('Error deleting visitor:', error);
      notifyError('Failed to delete visitor');
    } finally {
      setActionLoading(null);
    }
  };

  const goToRegister = () => navigate('/visitors/register');

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="visitor-list-container">
      <div className="list-header">
        <h2>Visitors</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="button" onClick={handleExport} className="btn-secondary">
            📥 Export CSV
          </button>

          {(user?.role === 'admin' || user?.role === 'security') && (
            <button type="button" onClick={goToRegister} className="btn-primary">
              ➕ Register New Visitor
            </button>
          )}
        </div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search visitors by name, email, phone..."
          value={search}
          onChange={handleSearch}
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Company</th>
              <th>Visit Count</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(!visitors || visitors.length === 0) ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center' }}>No visitors found</td>
              </tr>
            ) : (
              visitors.map((visitor) => {
                const id = visitor._id || visitor.id;

                return (
                  <tr key={id}>
                    <td>{visitor?.name || 'N/A'}</td>
                    <td>{visitor?.email || 'N/A'}</td>
                    <td>{visitor?.phone || 'N/A'}</td>
                    <td>{visitor?.company || 'N/A'}</td>
                    <td>{typeof visitor?.visitCount === 'number' ? visitor.visitCount : '0'}</td>
                    <td>
                      <div className="action-buttons">
                        {user?.role === 'admin' && (
                          <>
                            {visitor?.isBlacklisted && (
                              <button
                                type="button"
                                onClick={() => handleUnblacklist(id)}
                                className="btn-icon"
                                title="Remove from blacklist"
                                disabled={actionLoading === id}
                              >
                                ✅
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDelete(id)}
                              className="btn-icon btn-delete"
                              title="Delete"
                              disabled={actionLoading === id}
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            type="button"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="btn-secondary"
          >
            Previous
          </button>
          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="btn-secondary"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default VisitorList;
