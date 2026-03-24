// ── Import Wizard ───────────────────────────────────────────────────────────
// Reusable 3-step CSV/Excel import modal. Entity-agnostic — driven by ImportConfig.
//
// Step 1: Upload file (drag & drop or click)
// Step 2: Map spreadsheet columns to app fields
// Step 3: Preview, validate, and import with progress

import { useState, useRef, useMemo, useCallback } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  Check,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Copy,
  Info,
  Search,
} from 'lucide-react';
import type {
  ImportConfig,
  ImportRow,
  ImportSummary,
  ColumnMapping,
} from '../../lib/importEngine';
import {
  parseFile,
  autoMapColumns,
  applyMapping,
  validateRows,
  detectDuplicates,
  executeImport,
  generateTemplate,
} from '../../lib/importEngine';

// ── Props ───────────────────────────────────────────────────────────────────

interface ImportWizardProps {
  config: ImportConfig;
  projectId: string;
  onClose: () => void;
  onComplete: (summary: ImportSummary) => void;
}

// ── Step type ───────────────────────────────────────────────────────────────

type Step = 'upload' | 'mapping' | 'preview';

// ── Component ───────────────────────────────────────────────────────────────

export default function ImportWizard({
  config,
  projectId,
  onClose,
  onComplete,
}: ImportWizardProps) {
  // Step state
  const [step, setStep] = useState<Step>('upload');

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [sheetName, setSheetName] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mapping state
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});

  // Preview state
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [validating, setValidating] = useState(false);

  // Import state
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);

  // ── Computed values ─────────────────────────────────────────────────────

  const requiredFields = config.fields.filter((f) => f.required);
  const mappedFieldKeys = new Set(Object.values(columnMapping).filter(Boolean));
  const requiredFieldsMapped = requiredFields.every((f) => mappedFieldKeys.has(f.key));
  const mappedCount = [...mappedFieldKeys].length;

  const validRows = importRows.filter((r) => r.status === 'valid');
  const errorRows = importRows.filter((r) => r.status === 'error');
  const duplicateRows = importRows.filter((r) => r.status === 'duplicate');

  // ── Step indicator config ───────────────────────────────────────────────

  const steps = [
    { key: 'upload', label: 'Upload', icon: Upload },
    { key: 'mapping', label: 'Map Columns', icon: Copy },
    { key: 'preview', label: 'Preview & Import', icon: CheckCircle2 },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  // ── File handling ───────────────────────────────────────────────────────

  const handleFile = useCallback(async (selectedFile: File) => {
    // Validate file type
    const validTypes = [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const extension = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf('.'));

    if (!validTypes.includes(selectedFile.type) && !validExtensions.includes(extension)) {
      setParseError('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      return;
    }

    // Validate file size (5MB max)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setParseError('File must be smaller than 5 MB');
      return;
    }

    setParsing(true);
    setParseError(null);

    try {
      const result = await parseFile(selectedFile);

      // Check row limit
      if (result.rows.length > config.maxRows) {
        setParseError(`File has ${result.rows.length} rows. Maximum allowed is ${config.maxRows}.`);
        setParsing(false);
        return;
      }

      setFile(selectedFile);
      setHeaders(result.headers);
      setRawRows(result.rows);
      setSheetName(result.sheetName);

      // Auto-map columns
      const mapping = autoMapColumns(result.headers, config.fields);
      setColumnMapping(mapping);

      // Move to mapping step
      setStep('mapping');
    } catch (err: any) {
      setParseError(err.message || 'Failed to parse file');
    } finally {
      setParsing(false);
    }
  }, [config]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) handleFile(droppedFile);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  // ── Mapping → Preview transition ────────────────────────────────────────

  const handleProceedToPreview = useCallback(async () => {
    setValidating(true);

    try {
      // Apply mapping
      let rows = applyMapping(rawRows, columnMapping, config.fields);

      // Validate
      rows = validateRows(rows, config);

      // Check duplicates (only for valid rows)
      rows = await detectDuplicates(rows, config, projectId);

      setImportRows(rows);
      setStep('preview');
    } catch (err: any) {
      setParseError(err.message || 'Validation failed');
    } finally {
      setValidating(false);
    }
  }, [rawRows, columnMapping, config, projectId]);

  // ── Import execution ────────────────────────────────────────────────────

  const handleImport = useCallback(async () => {
    setImporting(true);

    try {
      const summary = await executeImport(
        importRows,
        config,
        projectId,
        (current, total) => setImportProgress({ current, total })
      );

      setImportSummary(summary);
      onComplete(summary);
    } catch (err: any) {
      setParseError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  }, [importRows, config, projectId, onComplete]);

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8 flex flex-col max-h-[90vh]">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#1BAE70]/10 flex items-center justify-center">
              <FileSpreadsheet size={20} className="text-[#1BAE70]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#14261C]">
                Import {config.entityNamePlural}
              </h2>
              <p className="text-xs text-[#4E5652]">
                Upload a CSV or Excel file to bulk import
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#4E5652] hover:text-[#14261C] p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Step Indicator ──────────────────────────────────────────── */}
        <div className="px-6 py-3 border-b bg-slate-50 flex items-center justify-center gap-2 flex-shrink-0">
          {steps.map((s, idx) => {
            const isActive = idx === currentStepIndex;
            const isComplete = idx < currentStepIndex;
            const StepIcon = s.icon;

            return (
              <div key={s.key} className="flex items-center">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  isActive
                    ? 'bg-[#1BAE70] text-white'
                    : isComplete
                    ? 'bg-[#1BAE70]/10 text-[#06752E]'
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  {isComplete ? (
                    <Check size={14} />
                  ) : (
                    <StepIcon size={14} />
                  )}
                  {s.label}
                </div>
                {idx < steps.length - 1 && (
                  <ChevronRight size={16} className="text-slate-300 mx-1" />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Content ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error banner */}
          {parseError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
              <XCircle size={16} className="text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700 flex-1">{parseError}</p>
              <button onClick={() => setParseError(null)} className="text-red-400 hover:text-red-600">
                <X size={14} />
              </button>
            </div>
          )}

          {/* ═══════════════ STEP 1: UPLOAD ═══════════════ */}
          {step === 'upload' && (
            <div className="space-y-5">
              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-[#1BAE70] bg-[#1BAE70]/5'
                    : 'border-slate-300 hover:border-[#1BAE70] hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />

                {parsing ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={40} className="text-[#1BAE70] animate-spin" />
                    <p className="text-sm font-medium text-[#14261C]">Reading file...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-[#1BAE70]/10 flex items-center justify-center">
                      <Upload size={28} className="text-[#1BAE70]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#14261C]">
                        Drop your file here or <span className="text-[#1BAE70] underline">browse</span>
                      </p>
                      <p className="text-xs text-[#4E5652] mt-1">
                        Supports CSV, Excel (.xlsx, .xls) · Max 5 MB · Max {config.maxRows} rows
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Template download */}
              <div className="bg-slate-50 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Info size={16} className="text-[#1BAE70] flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[#14261C]">
                      Not sure about the format?
                    </p>
                    <p className="text-xs text-[#4E5652]">
                      Download our template with the right column headers
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    generateTemplate(config);
                  }}
                  className="flex items-center gap-1.5 text-[#1BAE70] hover:text-[#06752E] text-sm font-medium transition"
                >
                  <Download size={14} />
                  Download Template
                </button>
              </div>

              {/* Expected fields */}
              <div>
                <h4 className="text-xs font-semibold text-[#4E5652] uppercase tracking-wider mb-2">
                  Expected Fields
                </h4>
                <div className="flex flex-wrap gap-2">
                  {config.fields.map((field) => (
                    <span
                      key={field.key}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        field.required
                          ? 'bg-[#1BAE70]/10 text-[#06752E] ring-1 ring-[#1BAE70]/20'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {field.label}
                      {field.required && <span className="text-red-500">*</span>}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ STEP 2: MAPPING ═══════════════ */}
          {step === 'mapping' && (
            <div className="space-y-5">
              {/* File info */}
              <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet size={18} className="text-[#1BAE70]" />
                  <div>
                    <p className="text-sm font-medium text-[#14261C]">{file?.name}</p>
                    <p className="text-xs text-[#4E5652]">
                      {rawRows.length} rows · {headers.length} columns
                      {sheetName && ` · Sheet: ${sheetName}`}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  requiredFieldsMapped
                    ? 'bg-[#1BAE70]/10 text-[#06752E]'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {mappedCount} of {config.fields.length} fields mapped
                </span>
              </div>

              {/* Mapping table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#4E5652] uppercase tracking-wider w-1/3">
                        Spreadsheet Column
                      </th>
                      <th className="text-center py-2.5 px-2 w-8">
                        <ArrowRight size={14} className="text-slate-400 mx-auto" />
                      </th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#4E5652] uppercase tracking-wider w-1/3">
                        Maps To
                      </th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#4E5652] uppercase tracking-wider">
                        Sample
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {headers.map((header, colIndex) => {
                      const mappedTo = columnMapping[colIndex];
                      const field = mappedTo ? config.fields.find((f) => f.key === mappedTo) : null;
                      const sampleValue = rawRows[0]?.[colIndex] || '';

                      return (
                        <tr key={colIndex} className="border-b last:border-b-0 hover:bg-slate-50/50">
                          <td className="py-2.5 px-4">
                            <span className="text-sm font-medium text-[#14261C]">{header || `Column ${colIndex + 1}`}</span>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            {mappedTo ? (
                              <Check size={14} className="text-[#1BAE70] mx-auto" />
                            ) : (
                              <span className="w-3.5 h-0.5 bg-slate-300 block mx-auto rounded" />
                            )}
                          </td>
                          <td className="py-2.5 px-4">
                            <select
                              value={mappedTo || ''}
                              onChange={(e) => {
                                const newMapping = { ...columnMapping };
                                const newValue = e.target.value || null;

                                // If this field was mapped elsewhere, unmap it
                                if (newValue) {
                                  Object.keys(newMapping).forEach((key) => {
                                    if (newMapping[parseInt(key)] === newValue) {
                                      newMapping[parseInt(key)] = null;
                                    }
                                  });
                                }

                                newMapping[colIndex] = newValue;
                                setColumnMapping(newMapping);
                              }}
                              className={`w-full px-2 py-1.5 text-sm border rounded-lg transition ${
                                mappedTo
                                  ? 'border-[#1BAE70]/30 bg-[#1BAE70]/5 text-[#06752E]'
                                  : 'border-slate-200 text-slate-600'
                              }`}
                            >
                              <option value="">— Skip this column —</option>
                              {config.fields.map((f) => (
                                <option key={f.key} value={f.key}>
                                  {f.label} {f.required ? '*' : ''}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="text-xs text-[#4E5652] truncate block max-w-[200px]">
                              {sampleValue || '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Required fields warning */}
              {!requiredFieldsMapped && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-700">
                    Required fields not mapped:{' '}
                    <strong>
                      {requiredFields
                        .filter((f) => !mappedFieldKeys.has(f.key))
                        .map((f) => f.label)
                        .join(', ')}
                    </strong>
                  </p>
                </div>
              )}

              {/* Data preview */}
              {rawRows.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-[#4E5652] uppercase tracking-wider mb-2">
                    Data Preview (first 3 rows)
                  </h4>
                  <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b">
                          {headers.map((h, i) => (
                            <th key={i} className="py-2 px-3 text-left font-medium text-[#4E5652] whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rawRows.slice(0, 3).map((row, rowIdx) => (
                          <tr key={rowIdx} className="border-b last:border-b-0">
                            {headers.map((_, colIdx) => (
                              <td key={colIdx} className="py-1.5 px-3 text-[#4E5652] whitespace-nowrap max-w-[150px] truncate">
                                {row[colIdx] || ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════ STEP 3: PREVIEW & IMPORT ═══════════════ */}
          {step === 'preview' && !importSummary && (
            <div className="space-y-5">
              {/* Summary bar */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#1BAE70]/5 border border-[#1BAE70]/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-[#06752E]">{validRows.length}</div>
                  <div className="text-xs text-[#4E5652]">Ready to import</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-amber-700">{duplicateRows.length}</div>
                  <div className="text-xs text-[#4E5652]">Duplicates (skip)</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">{errorRows.length}</div>
                  <div className="text-xs text-[#4E5652]">Errors (skip)</div>
                </div>
              </div>

              {/* Import progress */}
              {importing && (
                <div className="bg-[#1BAE70]/5 border border-[#1BAE70]/20 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Loader2 size={18} className="text-[#1BAE70] animate-spin" />
                    <span className="text-sm font-medium text-[#14261C]">
                      Importing {importProgress.current} of {importProgress.total}...
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-[#1BAE70] h-2 rounded-full transition-all duration-300"
                      style={{
                        width: importProgress.total > 0
                          ? `${(importProgress.current / importProgress.total) * 100}%`
                          : '0%',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Row table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-[40vh] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 z-10">
                      <tr className="border-b">
                        <th className="py-2 px-3 text-left text-xs font-semibold text-[#4E5652] w-10">#</th>
                        <th className="py-2 px-3 text-left text-xs font-semibold text-[#4E5652] w-16">Status</th>
                        {config.fields.map((f) => (
                          <th key={f.key} className="py-2 px-3 text-left text-xs font-semibold text-[#4E5652]">
                            {f.label}
                          </th>
                        ))}
                        <th className="py-2 px-3 text-left text-xs font-semibold text-[#4E5652]">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.map((row, idx) => (
                        <tr
                          key={idx}
                          className={`border-b last:border-b-0 ${
                            row.status === 'error' ? 'bg-red-50/50' :
                            row.status === 'duplicate' ? 'bg-amber-50/50' :
                            row.status === 'imported' ? 'bg-green-50/50' :
                            ''
                          }`}
                        >
                          <td className="py-2 px-3 text-xs text-[#4E5652]">{row.rowIndex}</td>
                          <td className="py-2 px-3">
                            {row.status === 'valid' && <Check size={14} className="text-[#1BAE70]" />}
                            {row.status === 'error' && <XCircle size={14} className="text-red-500" />}
                            {row.status === 'duplicate' && <AlertTriangle size={14} className="text-amber-500" />}
                            {row.status === 'imported' && <CheckCircle2 size={14} className="text-[#1BAE70]" />}
                            {row.status === 'skipped' && <X size={14} className="text-slate-400" />}
                          </td>
                          {config.fields.map((f) => (
                            <td key={f.key} className="py-2 px-3 text-xs text-[#14261C] max-w-[150px] truncate">
                              {row.raw[f.key] || <span className="text-slate-300">—</span>}
                            </td>
                          ))}
                          <td className="py-2 px-3 text-xs text-red-600">
                            {row.errors.length > 0 ? row.errors.join('; ') : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ IMPORT COMPLETE ═══════════════ */}
          {importSummary && (
            <div className="flex flex-col items-center text-center py-8 space-y-6">
              <div className="w-16 h-16 rounded-full bg-[#1BAE70]/10 flex items-center justify-center">
                <CheckCircle2 size={36} className="text-[#1BAE70]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#14261C] mb-1">Import Complete</h3>
                <p className="text-sm text-[#4E5652]">
                  Your {config.entityNamePlural.toLowerCase()} have been imported
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-lg">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-[#14261C]">{importSummary.total}</div>
                  <div className="text-xs text-[#4E5652]">Total Rows</div>
                </div>
                <div className="bg-[#1BAE70]/5 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-[#06752E]">{importSummary.imported}</div>
                  <div className="text-xs text-[#4E5652]">Imported</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-amber-700">{importSummary.duplicates}</div>
                  <div className="text-xs text-[#4E5652]">Duplicates</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">{importSummary.errors + importSummary.skipped}</div>
                  <div className="text-xs text-[#4E5652]">Skipped</div>
                </div>
              </div>

              {/* Error details */}
              {importSummary.errorDetails.length > 0 && (
                <div className="w-full max-w-lg bg-red-50 border border-red-200 rounded-lg p-4 text-left">
                  <h4 className="text-sm font-semibold text-red-800 mb-2">Error Details</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {importSummary.errorDetails.map((err, i) => (
                      <p key={i} className="text-xs text-red-700">
                        Row {err.row}: {err.message}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between flex-shrink-0 rounded-b-xl">
          <div className="text-xs text-[#4E5652]">
            {step === 'upload' && `Step 1 of 3`}
            {step === 'mapping' && `Step 2 of 3 · ${rawRows.length} rows loaded`}
            {step === 'preview' && !importSummary && `Step 3 of 3 · ${validRows.length} ready`}
            {importSummary && `Import finished`}
          </div>

          <div className="flex items-center gap-2">
            {/* Back button */}
            {step === 'mapping' && (
              <button
                onClick={() => {
                  setStep('upload');
                  setFile(null);
                  setHeaders([]);
                  setRawRows([]);
                  setParseError(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#4E5652] hover:text-[#14261C] transition"
              >
                <ChevronLeft size={16} />
                Back
              </button>
            )}
            {step === 'preview' && !importSummary && !importing && (
              <button
                onClick={() => setStep('mapping')}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#4E5652] hover:text-[#14261C] transition"
              >
                <ChevronLeft size={16} />
                Back
              </button>
            )}

            {/* Cancel / Close */}
            {!importSummary && (
              <button
                onClick={onClose}
                disabled={importing}
                className="px-4 py-2 text-sm font-medium text-[#4E5652] bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
            )}

            {/* Next / Import / Done */}
            {step === 'mapping' && (
              <button
                onClick={handleProceedToPreview}
                disabled={!requiredFieldsMapped || validating}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-[#1BAE70] rounded-lg hover:bg-[#06752E] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {validating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    Preview
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            )}

            {step === 'preview' && !importSummary && (
              <button
                onClick={handleImport}
                disabled={validRows.length === 0 || importing}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-[#1BAE70] rounded-lg hover:bg-[#06752E] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Import {validRows.length} {validRows.length === 1 ? config.entityName : config.entityNamePlural}
                  </>
                )}
              </button>
            )}

            {importSummary && (
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-[#1BAE70] rounded-lg hover:bg-[#06752E] transition"
              >
                <Check size={16} />
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
