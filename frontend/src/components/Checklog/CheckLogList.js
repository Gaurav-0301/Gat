// CheckLogList.js (fixed)
import React, { useState, useEffect } from 'react';
import { checkLogsAPI } from '../../services/api';
import Loader from '../Shared/Loader';
import { format } from 'date-fns';
import './CheckLog.css';

const CheckLogList = () => {
  const [checkLogs, setCheckLogs] = useState([]);
  const [currentVisitors, setCurrentVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('all'); // 'all' or 'current'
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // fetch functions declared before useEffect
  const fetchCheckLogs = async (page = currentPage) => {
    try {
      setLoading(true);
      const data = await checkLogsAPI.getAll({ page, limit: 10 });
      // support different shapes
      const logs = data?.checkLogs || data?.logs || data || [];
      const pages = data?.totalPages ?? data?.total_pages ?? 1;
      setCheckLogs(Array.isArray(logs) ? logs : []);
      setTotalPages(Number.isFinite(pages) ? pages : 1);
    } catch (error) {
      console.error('Error fetching check logs:', error);
      setCheckLogs([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentVisitors = async () => {
    try {
      setLoading(true);
      const data = await checkLogsAPI.getCurrent();
      const list = data?.current || data || [];
      setCurrentVisitors(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Error fetching current visitors:', error);
      setCurrentVisitors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'all') {
      fetchCheckLogs(currentPage);
    } else {
      fetchCurrentVisitors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, currentPage]);

  const calculateDuration = (checkInTime, checkOutTime) => {
    if (!checkOutTime) return 'In Progress';
    const a = new Date(checkInTime).getTime();
    const b = new Date(checkOutTime).getTime();
    if (Number.isNaN(a) || Number.isNaN(b)) return 'N/A';
    const duration = Math.floor((b - a) / (1000 * 60));
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return <Loader />;
  }

  const listToRender = view === 'all' ? checkLogs : currentVisitors;

  return (
    <div className="checklog-list-container">
      <div className="list-header">
        <h2>Check In/Out Logs</h2>
        <a href="/checklogs/checkin" className="btn-primary">
          ✅ Check In Visitor
        </a>
      </div>

      <div className="filter-bar">
        <button
          className={view === 'all' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => { setView('all'); setCurrentPage(1); }}
        >
          All Logs
        </button>
        <button
          className={view === 'current' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setView('current')}
        >
          Currently Inside ({currentVisitors?.length || 0})
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Visitor</th>
              <th>Pass Number</th>
              <th>Check In Time</th>
              <th>Check Out Time</th>
              <th>Duration</th>
              <th>Check In By</th>
            </tr>
          </thead>
          <tbody>
            {(!listToRender || listToRender.length === 0) ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center' }}>
                  {view === 'current' ? 'No visitors currently inside' : 'No check logs found'}
                </td>
              </tr>
            ) : (
              listToRender.map((log) => (
                <tr key={log._id}>
                  <td>
                    <div>
                      <strong>{log.visitor?.name || 'N/A'}</strong>
                      <br />
                      <small>{log.visitor?.company || 'N/A'}</small>
                    </div>
                  </td>
                  <td>{log.pass?.passNumber || 'N/A'}</td>
                  <td>
                    {log.checkInTime ? format(new Date(log.checkInTime), 'MMM dd, yyyy HH:mm') : 'N/A'}
                  </td>
                  <td>
                    {log.checkOutTime
                      ? format(new Date(log.checkOutTime), 'MMM dd, yyyy HH:mm')
                      : <span className="badge badge-green">Inside</span>
                    }
                  </td>
                  <td>{calculateDuration(log.checkInTime, log.checkOutTime)}</td>
                  <td>{log.checkedInBy?.name || log.checkInBy?.name || 'N/A'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {view === 'all' && totalPages > 1 && (
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

export default CheckLogList;
