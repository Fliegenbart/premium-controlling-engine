'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';

interface ExportButtonsProps {
  type: 'variance' | 'triple';
  data: unknown;
  disabled?: boolean;
  filename?: string;
}

export default function ExportButtons({ type, data, disabled, filename }: ExportButtonsProps) {
  const [isExportingXlsx, setIsExportingXlsx] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportXlsx = async () => {
    setIsExportingXlsx(true);
    try {
      const response = await fetch('/api/export/xlsx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          data,
          filename: filename || `${type}-analyse.xlsx`
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export fehlgeschlagen');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `${type}-analyse.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setIsExportingXlsx(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const response = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          data,
          options: { title: type === 'variance' ? 'Varianz-Analyse' : 'Plan-Ist-VJ Analyse' },
          filename: filename?.replace('.xlsx', '.pdf') || `${type}-report.pdf`
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export fehlgeschlagen');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename?.replace('.xlsx', '.pdf') || `${type}-report.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExportXlsx}
        disabled={disabled || isExportingXlsx}
        className="flex items-center gap-2 px-3 py-2 bg-green-600/20 hover:bg-green-600/30 disabled:bg-gray-700/20 text-green-400 disabled:text-gray-500 rounded-lg text-sm transition-colors border border-green-600/30 disabled:border-gray-700/30"
        title="Excel-Export"
      >
        {isExportingXlsx ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="w-4 h-4" />
        )}
        XLSX
      </button>

      <button
        onClick={handleExportPdf}
        disabled={disabled || isExportingPdf}
        className="flex items-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 disabled:bg-gray-700/20 text-red-400 disabled:text-gray-500 rounded-lg text-sm transition-colors border border-red-600/30 disabled:border-gray-700/30"
        title="PDF-Export"
      >
        {isExportingPdf ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileText className="w-4 h-4" />
        )}
        PDF
      </button>
    </div>
  );
}
