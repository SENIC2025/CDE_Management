// ── Import Engine ───────────────────────────────────────────────────────────
// Config-driven CSV/Excel import engine. Entity-agnostic — each module provides
// an ImportConfig describing its fields, validation, and insert logic.
//
// Adding import for a new module = one config file + one button. Zero changes here.

import * as XLSX from 'xlsx';

// ── Types ───────────────────────────────────────────────────────────────────

/** Describes one field the user can import into */
export interface ImportField {
  key: string;                    // Mapped key (e.g. 'name', 'role')
  label: string;                  // Display label (e.g. 'Stakeholder Name')
  required: boolean;
  type: 'text' | 'select' | 'number';
  options?: { value: string; label: string }[];  // For select fields
  synonyms: string[];             // Auto-match headers (e.g. ['name', 'company', 'organisation'])
  defaultValue?: string | number;
  transform?: (raw: string) => string | number;  // Normalize input values
}

/** Column mapping: spreadsheet column index → app field key (or null = skip) */
export type ColumnMapping = Record<number, string | null>;

/** One parsed row with validation status */
export interface ImportRow {
  rowIndex: number;               // Original spreadsheet row number (1-based)
  raw: Record<string, string>;    // Raw values keyed by mapped field key
  errors: string[];               // Validation errors for this row
  status: 'pending' | 'valid' | 'error' | 'duplicate' | 'imported' | 'skipped';
}

/** Summary after import completes */
export interface ImportSummary {
  total: number;
  imported: number;
  skipped: number;
  duplicates: number;
  errors: number;
  errorDetails: { row: number; message: string }[];
}

/** The config each module provides */
export interface ImportConfig {
  entityName: string;             // e.g. 'Stakeholder'
  entityNamePlural: string;       // e.g. 'Stakeholders'
  fields: ImportField[];
  maxRows: number;                // Safety limit (e.g. 500)
  validateRow: (row: Record<string, string>) => string[];
  checkDuplicate: (row: Record<string, string>, projectId: string) => Promise<boolean>;
  insertRow: (row: Record<string, string>, projectId: string) => Promise<void>;
  templateFileName: string;       // e.g. 'stakeholder_import_template.csv'
}

// ── File Parsing ────────────────────────────────────────────────────────────

/** Parse a CSV or Excel file and return headers + data rows */
export async function parseFile(file: File): Promise<{
  headers: string[];
  rows: string[][];
  sheetName: string;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Use first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert to 2D array (raw strings, no type detection)
        const rawData: string[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          raw: false,
          defval: '',
        });

        if (rawData.length < 2) {
          reject(new Error('File must have at least a header row and one data row'));
          return;
        }

        // First row = headers, rest = data
        const headers = rawData[0].map((h) => String(h).trim());
        const rows = rawData.slice(1).filter((row) =>
          // Filter out completely empty rows
          row.some((cell) => String(cell).trim() !== '')
        );

        resolve({ headers, rows, sheetName });
      } catch (err) {
        reject(new Error('Failed to parse file. Please check the format.'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

// ── Column Auto-Mapping ─────────────────────────────────────────────────────

/** Normalize a string for fuzzy matching (lowercase, strip special chars) */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/** Auto-map spreadsheet headers to app fields using synonym matching */
export function autoMapColumns(
  headers: string[],
  fields: ImportField[]
): ColumnMapping {
  const mapping: ColumnMapping = {};
  const usedFieldKeys = new Set<string>();

  headers.forEach((header, colIndex) => {
    const normalizedHeader = normalize(header);
    if (!normalizedHeader) {
      mapping[colIndex] = null;
      return;
    }

    // Find best matching field
    for (const field of fields) {
      if (usedFieldKeys.has(field.key)) continue;

      const matchesSynonym = field.synonyms.some((synonym) => {
        const normalizedSynonym = normalize(synonym);
        return (
          normalizedHeader === normalizedSynonym ||
          normalizedHeader.includes(normalizedSynonym) ||
          normalizedSynonym.includes(normalizedHeader)
        );
      });

      // Also match against the field label itself
      const matchesLabel = normalize(field.label) === normalizedHeader;

      if (matchesSynonym || matchesLabel) {
        mapping[colIndex] = field.key;
        usedFieldKeys.add(field.key);
        break;
      }
    }

    // If no match found, skip this column
    if (mapping[colIndex] === undefined) {
      mapping[colIndex] = null;
    }
  });

  return mapping;
}

// ── Apply Mapping ───────────────────────────────────────────────────────────

/** Transform raw spreadsheet rows into mapped ImportRow objects */
export function applyMapping(
  rows: string[][],
  mapping: ColumnMapping,
  fields: ImportField[]
): ImportRow[] {
  return rows.map((row, idx) => {
    const mapped: Record<string, string> = {};

    // Apply column mapping
    Object.entries(mapping).forEach(([colIndexStr, fieldKey]) => {
      if (!fieldKey) return;
      const colIndex = parseInt(colIndexStr);
      const rawValue = String(row[colIndex] || '').trim();

      // Apply transform if the field has one
      const field = fields.find((f) => f.key === fieldKey);
      if (field?.transform && rawValue) {
        mapped[fieldKey] = String(field.transform(rawValue));
      } else {
        mapped[fieldKey] = rawValue;
      }
    });

    // Apply default values for missing fields
    fields.forEach((field) => {
      if (!mapped[field.key] && field.defaultValue !== undefined) {
        mapped[field.key] = String(field.defaultValue);
      }
    });

    return {
      rowIndex: idx + 2, // +2 because row 1 is headers, array is 0-indexed
      raw: mapped,
      errors: [],
      status: 'pending' as const,
    };
  });
}

// ── Validation ──────────────────────────────────────────────────────────────

/** Validate all rows using the config's validateRow function */
export function validateRows(
  rows: ImportRow[],
  config: ImportConfig
): ImportRow[] {
  return rows.map((row) => {
    const errors = config.validateRow(row.raw);
    return {
      ...row,
      errors,
      status: errors.length > 0 ? ('error' as const) : ('valid' as const),
    };
  });
}

// ── Duplicate Detection ─────────────────────────────────────────────────────

/** Check each valid row for duplicates */
export async function detectDuplicates(
  rows: ImportRow[],
  config: ImportConfig,
  projectId: string
): Promise<ImportRow[]> {
  const result: ImportRow[] = [];

  for (const row of rows) {
    if (row.status !== 'valid') {
      result.push(row);
      continue;
    }

    try {
      const isDuplicate = await config.checkDuplicate(row.raw, projectId);
      result.push({
        ...row,
        status: isDuplicate ? 'duplicate' : 'valid',
        errors: isDuplicate ? ['Duplicate — a record with this name already exists'] : [],
      });
    } catch {
      result.push(row);
    }
  }

  return result;
}

// ── Template Generation ─────────────────────────────────────────────────────

/** Generate and download a CSV template with correct headers and one example row */
export function generateTemplate(config: ImportConfig): void {
  const headers = config.fields.map((f) => f.label);

  // Generate example values
  const exampleRow = config.fields.map((f) => {
    if (f.options && f.options.length > 0) {
      return f.options[0].label;
    }
    if (f.type === 'number') return '5';
    if (f.key === 'name') return `Example ${config.entityName}`;
    if (f.key === 'description') return 'Brief description here';
    return '';
  });

  // Build CSV content
  const csvContent = [
    headers.join(','),
    exampleRow.map((v) => `"${v}"`).join(','),
  ].join('\n');

  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = config.templateFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── Import Execution ────────────────────────────────────────────────────────

/** Run the actual import — sequential inserts with progress callback */
export async function executeImport(
  rows: ImportRow[],
  config: ImportConfig,
  projectId: string,
  onProgress: (current: number, total: number) => void
): Promise<ImportSummary> {
  const importableRows = rows.filter((r) => r.status === 'valid');
  const skippedRows = rows.filter((r) => r.status === 'duplicate' || r.status === 'error');

  const summary: ImportSummary = {
    total: rows.length,
    imported: 0,
    skipped: skippedRows.filter((r) => r.status === 'error').length,
    duplicates: skippedRows.filter((r) => r.status === 'duplicate').length,
    errors: 0,
    errorDetails: [],
  };

  for (let i = 0; i < importableRows.length; i++) {
    const row = importableRows[i];
    onProgress(i + 1, importableRows.length);

    try {
      await config.insertRow(row.raw, projectId);
      row.status = 'imported';
      summary.imported++;
    } catch (err: any) {
      row.status = 'error';
      summary.errors++;
      summary.errorDetails.push({
        row: row.rowIndex,
        message: err?.message || 'Insert failed',
      });
    }
  }

  return summary;
}
