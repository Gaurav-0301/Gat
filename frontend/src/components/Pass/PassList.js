// PassList.js (fixed)
import React, { useState, useEffect } from 'react';
import { passesAPI } from '../../services/api';
import { useAuthContext } from '../../hooks/useAuthContext';
import Loader from '../Shared/Loader';
import { format } from 'date-fns';
import './Pass.css';
import { notifySuccess, notifyError } from '../../utils/notifications';

const PassList = () => {
  const { user } = useAuthContext();
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // moved function above useEffect
  const fetchPasses = async (page = currentPage, status = filter) => {
    try {
      setLoading(true);
      const params = { page, limit: 10 };
      if (status && status !== 'all') params.status = status;
      const data = await passesAPI.getAll(params);

      // Accept either { passes: [], totalPages } or direct array
      const receivedPasses = data?.passes || data || [];
      const receivedTotal = data?.totalPages ?? (Array.isArray(receivedPasses) ? Math.ceil(receivedPasses.length / 10) : 1);

      setPasses(Array.isArray(receivedPasses) ? receivedPasses : []);
      setTotalPages(Number.isFinite(receivedTotal) ? receivedTotal : 1);
    } catch (error) {
      console.error('Error fetching passes:', error);
      setPasses([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasses(currentPage, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, currentPage]);

  const handleRevoke = async (id) => {
    if (window.confirm('Are you sure you want to revoke this pass?')) {
      try {
        await passesAPI.revoke(id);
        notifySuccess('Pass revoked successfully!');
        fetchPasses(currentPage, filter);
      } catch (error) {
        console.error('Error revoking pass:', error);
        notifyError('Failed to revoke pass');
      }
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: 'badge-green',
      expired: 'badge-orange',
      revoked: 'badge-red'
    };
    return badges[status] || 'badge-blue';
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="pass-list-container">
      <div className="list-header">
        <h2>Visitor Passes</h2>
        {(user?.role === 'admin' || user?.role === 'security') && (
          <a href="/passes/issue" className="btn-primary">
            🎫 Issue New Pass
          </a>
        )}
      </div>

      <div className="filter-bar">
        <button
          className={filter === 'all' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => { setCurrentPage(1); setFilter('all'); }}
        >
          All
        </button>
        <button
          className={filter === 'active' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => { setCurrentPage(1); setFilter('active'); }}
        >
          Active
        </button>
        <button
          className={filter === 'expired' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => { setCurrentPage(1); setFilter('expired'); }}
        >
          Expired
        </button>
        <button
          className={filter === 'revoked' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => { setCurrentPage(1); setFilter('revoked'); }}
        >
          Revoked
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Pass Number</th>
              <th>Visitor</th>
              <th>Host</th>
              <th>Valid From</th>
              <th>Valid Until</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {passes.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center' }}>No passes found</td>
              </tr>
            ) : (
              passes.map((pass) => (
                <tr key={pass._id}>
                  <td>
                    <strong>{pass.passNumber}</strong>
                  </td>
                  <td>
                    <div>
                      <strong>{pass.visitor?.name || 'N/A'}</strong>
                      <br />
                      <small>{pass.visitor?.email || ''}</small>
                    </div>
                  </td>
                  <td>
                    <div>
                      <strong>{pass.host?.name || 'N/A'}</strong>
                      <br />
                      <small>{pass.host?.department || ''}</small>
                    </div>
                  </td>
                  <td>{pass.validFrom ? format(new Date(pass.validFrom), 'MMM dd, yyyy HH:mm') : 'N/A'}</td>
                  <td>{pass.validUntil ? format(new Date(pass.validUntil), 'MMM dd, yyyy HH:mm') : 'N/A'}</td>
                  <td>
                    <span className={`badge ${getStatusBadge(pass.status)}`}>
                      {pass.status || 'unknown'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <a href={`/passes/${pass._id}`} className="btn-icon" title="View">
                        👁️
                      </a>
                      {pass.status === 'active' && (user?.role === 'admin' || user?.role === 'security') && (
                        <button
                          onClick={() => handleRevoke(pass._id)}
                          className="btn-icon btn-delete"
                          title="Revoke"
                        >
                          🚫
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

      {totalPages > 1 && (
        <div className="pagination">
          <button
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

export default PassList;
