'use client';

import { useState, useEffect } from 'react';
import {
  History,
  Loader2,
  User,
  LogIn,
  LogOut,
  Upload,
  Search,
  FileText,
  Database,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';

interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  details?: Record<string, unknown>;
  timestamp: string;
  ip?: string;
}

interface AuditLogProps {
  authToken: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  LOGIN: <LogIn className="w-4 h-4 text-green-400" />,
  LOGOUT: <LogOut className="w-4 h-4 text-gray-400" />,
  UPLOAD: <Upload className="w-4 h-4 text-pink-300" />,
  ANALYZE: <Search className="w-4 h-4 text-purple-400" />,
  EXPORT: <FileText className="w-4 h-4 text-orange-400" />,
  QUERY: <Database className="w-4 h-4 text-fuchsia-300" />,
  VIEW: <Eye className="w-4 h-4 text-gray-400" />,
};

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Anmeldung',
  LOGOUT: 'Abmeldung',
  UPLOAD: 'Daten-Upload',
  ANALYZE: 'Analyse',
  EXPORT: 'Export',
  QUERY: 'SQL-Abfrage',
  VIEW: 'Ansicht',
};

export default function AuditLog({ authToken }: AuditLogProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filterAction, setFilterAction] = useState<string>('');
  const limit = 20;

  useEffect(() => {
    loadEntries();
  }, [offset, filterAction]);

  const loadEntries = async () => {
    setIsLoading(true);
    try {
      let url = `/api/audit?limit=${limit}&offset=${offset}`;
      if (filterAction) {
        url += `&action=${filterAction}`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      const data = await response.json();
      if (data.success) {
        setEntries(data.entries);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to load audit log:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center">
            <History className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Audit Trail</h2>
            <p className="text-gray-500 text-sm">Protokoll aller Aktivitäten</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filterAction}
            onChange={(e) => {
              setFilterAction(e.target.value);
              setOffset(0);
            }}
            className="px-3 py-2 bg-white/5 text-white rounded-lg border border-white/10 text-sm"
          >
            <option value="">Alle Aktionen</option>
            <option value="LOGIN">Anmeldungen</option>
            <option value="UPLOAD">Uploads</option>
            <option value="ANALYZE">Analysen</option>
            <option value="EXPORT">Exporte</option>
            <option value="QUERY">SQL-Abfragen</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#12121a] rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr className="text-left text-gray-400 text-sm">
                <th className="p-4">Zeitpunkt</th>
                <th className="p-4">Benutzer</th>
                <th className="p-4">Aktion</th>
                <th className="p-4">Ressource</th>
                <th className="p-4">Details</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center">
                    <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    Keine Einträge gefunden
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="p-4">
                      <p className="text-white text-sm">{formatDate(entry.timestamp)}</p>
                      {entry.ip && (
                        <p className="text-gray-500 text-xs">{entry.ip}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-500 flex items-center justify-center">
                          <User className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-white text-sm">{entry.userName}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {ACTION_ICONS[entry.action] || <Eye className="w-4 h-4 text-gray-400" />}
                        <span className="text-gray-300 text-sm">
                          {ACTION_LABELS[entry.action] || entry.action}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-400 text-sm">{entry.resource}</td>
                    <td className="p-4">
                      {entry.details && (
                        <code className="text-gray-500 text-xs bg-black/30 px-2 py-1 rounded">
                          {JSON.stringify(entry.details).substring(0, 50)}
                          {JSON.stringify(entry.details).length > 50 ? '...' : ''}
                        </code>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between">
            <p className="text-gray-500 text-sm">
              {offset + 1} - {Math.min(offset + limit, total)} von {total} Einträgen
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="p-2 text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-gray-400 text-sm">
                Seite {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="p-2 text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
