import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  Search,
  Download,
  Calendar,
  ShieldAlert,
  User,
  Clock,
  Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { auditService } from '../../services/api';
import { PageHeader, SearchInput } from '../Common/UIComponents';
import { useToast } from '../Common/Toast';

const AuditLogs = () => {
  const { showError, showSuccess, showWarning } = useToast();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await auditService.getLogs();
      if (res.success) {
        setLogs(res.data);
      }
    } catch (err) {
      console.error(err);
      showError('Failed to fetch audit log records');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !searchTerm ||
      log.user?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = !actionFilter || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const actionsList = [...new Set(logs.map((l) => l.action).filter(Boolean))];

  const handleExportExcel = () => {
    if (filteredLogs.length === 0) return;
    const data = filteredLogs.map((l) => ({
      Timestamp: new Date(l.createdAt).toLocaleString('en-IN'),
      User: l.user,
      Action: l.action,
      Details: l.details || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit_Logs');
    XLSX.writeFile(wb, `Balaji_Audit_Logs_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSuccess('Exported audit log to Excel');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader
        title="Security & System Audit Log"
        hindiTitle="सिस्टम ऑडिट व कार्य विवरण"
        subtitle="Immutable audit trail of milk entry edits, rate overrides, payments, user changes, and deletions."
        actions={
          <button onClick={handleExportExcel} className="btn btn-secondary btn-sm">
            <Download size={14} />
            <span>Export Excel</span>
          </button>
        }
      />

      {/* Filter Bar */}
      <div className="card" style={{ padding: '0.85rem 1rem' }}>
        <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by user, action type, or details..."
            />
          </div>

          <div style={{ minWidth: '180px' }}>
            <select
              className="form-control"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              style={{ height: '40px' }}
            >
              <option value="">All Action Types ({actionsList.length})</option>
              {actionsList.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="dairy-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Operator / User</th>
                <th>Action Type</th>
                <th>Details / Changes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="spinner spinner-gold" style={{ margin: '0 auto 0.5rem auto' }} />
                    <p>Loading audit trail...</p>
                  </td>
                </tr>
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log._id}>
                    <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td>
                      <strong style={{ color: 'var(--color-primary)' }}>{log.user}</strong>
                    </td>
                    <td>
                      <span className="badge badge-gold font-mono-num" style={{ fontWeight: 800 }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.825rem', color: 'var(--color-text-main)', maxWidth: '500px' }}>
                      {log.details}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    No audit records found matching the filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
