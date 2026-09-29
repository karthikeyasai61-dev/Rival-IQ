// ============================================================
// Data Parser & Column Mapper
// Handles CSV, XLSX, JSON, TXT parsing and intelligent mapping
// ============================================================

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ColumnSchema, ColumnMapping, SemanticField, NormalizedRecord, DataQualityReport, DataQualityIssue } from '@/types';

// ============================================================
// Semantic Field Detection Patterns
// ============================================================

const FIELD_PATTERNS: Record<SemanticField, RegExp[]> = {
  competitor: [/competitor/i, /company/i, /brand/i, /rival/i, /opponent/i, /player/i, /vendor/i, /firm/i],
  date: [/date/i, /time/i, /timestamp/i, /when/i, /created/i, /updated/i, /period/i, /day/i, /month/i, /year/i],
  eventType: [/event.?type/i, /type/i, /action/i, /activity/i, /kind/i, /category_type/i],
  price: [/price/i, /cost/i, /fee/i, /amount/i, /subscription/i, /plan.?price/i, /monthly/i, /annual/i, /pricing/i, /rate/i, /mrr/i, /arpu/i],
  product: [/product/i, /service/i, /offering/i, /solution/i, /tool/i, /platform/i, /app/i],
  feature: [/feature/i, /capability/i, /function/i, /module/i, /component/i],
  description: [/description/i, /detail/i, /note/i, /comment/i, /summary/i, /text/i, /content/i, /body/i, /info/i],
  source: [/source/i, /origin/i, /reference/i, /ref/i, /link/i, /from/i],
  region: [/region/i, /country/i, /geography/i, /geo/i, /location/i, /market/i, /territory/i, /area/i, /city/i, /state/i],
  segment: [/segment/i, /audience/i, /target/i, /customer/i, /vertical/i, /industry/i, /sector/i],
  channel: [/channel/i, /medium/i, /platform/i, /distribution/i],
  metric: [/metric/i, /measure/i, /kpi/i, /indicator/i, /stat/i],
  value: [/value/i, /count/i, /number/i, /quantity/i, /total/i, /score/i, /rating/i, /rank/i],
  category: [/category/i, /group/i, /class/i, /tag/i, /label/i, /bucket/i],
  sentiment: [/sentiment/i, /mood/i, /tone/i, /feeling/i, /positive/i, /negative/i],
  url: [/url/i, /link/i, /href/i, /website/i, /web/i, /page/i],
};

// ============================================================
// File Parsing
// ============================================================

export function parseCSV(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const result = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  return {
    headers: result.meta.fields || [],
    rows: result.data as Record<string, string>[],
  };
}

export function parseXLSX(buffer: ArrayBuffer): { headers: string[]; rows: Record<string, string>[] } {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheet];
  const data = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { raw: false });
  const headers = data.length > 0 ? Object.keys(data[0]) : [];

  return { headers, rows: data };
}

export function parseJSON(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const parsed = JSON.parse(content);
  const data = Array.isArray(parsed) ? parsed : parsed.data || parsed.records || parsed.items || [parsed];
  const headers = data.length > 0 ? Object.keys(data[0]) : [];

  return {
    headers,
    rows: data.map((item: Record<string, unknown>) => {
      const row: Record<string, string> = {};
      for (const [key, value] of Object.entries(item)) {
        row[key] = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
      }
      return row;
    }),
  };
}

export function parseTXT(content: string): { headers: string[]; rows: Record<string, string>[] } {
  // Try tab-delimited first, then comma
  if (content.includes('\t')) {
    return parseCSV(content); // Papa handles tab-delimited
  }
  // Treat as single-column text
  const lines = content.split('\n').filter(l => l.trim());
  return {
    headers: ['content'],
    rows: lines.map(line => ({ content: line.trim() })),
  };
}

// ============================================================
// Column Analysis & Mapping
// ============================================================

export function analyzeColumns(headers: string[], rows: Record<string, string>[]): ColumnSchema[] {
  return headers.map(header => {
    const values = rows.map(r => r[header] || '').filter(v => v !== '');
    const uniqueValues = new Set(values);
    const sampleValues = Array.from(uniqueValues).slice(0, 5);
    const nullCount = rows.length - values.length;

    return {
      name: header,
      detectedType: detectColumnType(values),
      sampleValues,
      nullCount,
      uniqueCount: uniqueValues.size,
    };
  });
}

function detectColumnType(values: string[]): 'string' | 'number' | 'date' | 'boolean' | 'unknown' {
  if (values.length === 0) return 'unknown';

  const sample = values.slice(0, 50);
  
  // Check boolean
  const boolPatterns = /^(true|false|yes|no|1|0|y|n)$/i;
  if (sample.every(v => boolPatterns.test(v.trim()))) return 'boolean';

  // Check number
  if (sample.every(v => !isNaN(parseFloat(v.trim())) && isFinite(Number(v.trim())))) return 'number';

  // Check date
  const dateCount = sample.filter(v => {
    const d = new Date(v.trim());
    return !isNaN(d.getTime()) && v.trim().length > 4;
  }).length;
  if (dateCount >= sample.length * 0.7) return 'date';

  return 'string';
}

export function suggestColumnMappings(schemas: ColumnSchema[]): ColumnMapping[] {
  const mappings: ColumnMapping[] = [];
  const usedFields = new Set<SemanticField>();

  for (const schema of schemas) {
    let bestField: SemanticField | null = null;
    let bestConfidence = 0;

    for (const [field, patterns] of Object.entries(FIELD_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(schema.name)) {
          const confidence = pattern.source.length > 10 ? 0.9 : 0.7;
          
          // Type-based boost
          let typeBoost = 0;
          if (field === 'date' && schema.detectedType === 'date') typeBoost = 0.1;
          if (field === 'price' && schema.detectedType === 'number') typeBoost = 0.1;
          if (field === 'value' && schema.detectedType === 'number') typeBoost = 0.1;

          const totalConfidence = confidence + typeBoost;

          if (totalConfidence > bestConfidence && !usedFields.has(field as SemanticField)) {
            bestField = field as SemanticField;
            bestConfidence = totalConfidence;
          }
        }
      }
    }

    // Fallback: type-based mapping for unmapped columns
    if (!bestField) {
      if (schema.detectedType === 'date' && !usedFields.has('date')) {
        bestField = 'date';
        bestConfidence = 0.5;
      } else if (schema.detectedType === 'number' && !usedFields.has('price') && !usedFields.has('value')) {
        bestField = 'value';
        bestConfidence = 0.3;
      }
    }

    if (bestField) {
      usedFields.add(bestField);
    }

    mappings.push({
      sourceColumn: schema.name,
      targetField: bestField,
      confidence: bestConfidence,
      isUserOverridden: false,
    });
  }

  return mappings;
}

// ============================================================
// Record Normalization
// ============================================================

export function normalizeRecords(
  rows: Record<string, string>[],
  mappings: ColumnMapping[]
): { records: NormalizedRecord[]; issues: DataQualityIssue[] } {
  const records: NormalizedRecord[] = [];
  const issues: DataQualityIssue[] = [];

  const mappingMap = new Map<string, SemanticField>();
  for (const m of mappings) {
    if (m.targetField) {
      mappingMap.set(m.sourceColumn, m.targetField);
    }
  }

  for (const row of rows) {
    const normalized: NormalizedRecord = {};

    for (const [col, value] of Object.entries(row)) {
      const targetField = mappingMap.get(col);
      if (!targetField) continue;

      switch (targetField) {
        case 'date': {
          const d = normalizeDate(value);
          if (d !== undefined) normalized.date = d;
          break;
        }
        case 'price': {
          const p = normalizeNumber(value);
          if (p !== undefined) normalized.price = p;
          break;
        }
        case 'value': {
          const v = normalizeNumber(value);
          if (v !== undefined) normalized.value = v;
          break;
        }
        case 'competitor': {
          const c = normalizeCompetitorName(value);
          if (c !== undefined) normalized.competitor = c;
          break;
        }
        default: {
          const val = value?.trim();
          if (val) normalized[targetField] = val;
          break;
        }
      }
    }

    // Keep raw data for unmapped columns (skip undefined/null)
    for (const [col, value] of Object.entries(row)) {
      if (!mappingMap.has(col) && value !== undefined && value !== null && value !== '') {
        normalized[col] = value;
      }
    }

    records.push(normalized);
  }

  // Detect issues
  const competitorMissing = records.filter(r => !r.competitor).length;
  if (competitorMissing > 0) {
    issues.push({
      severity: competitorMissing > records.length * 0.5 ? 'error' : 'warning',
      field: 'competitor',
      message: `${competitorMissing} records missing competitor name`,
      affectedRecords: competitorMissing,
    });
  }

  const dateMissing = records.filter(r => !r.date).length;
  if (dateMissing > records.length * 0.3) {
    issues.push({
      severity: dateMissing > records.length * 0.8 ? 'error' : 'warning',
      field: 'date',
      message: `${dateMissing} records missing date (${((dateMissing / records.length) * 100).toFixed(0)}%)`,
      affectedRecords: dateMissing,
    });
  }

  return { records, issues };
}

function normalizeDate(value: string): string | undefined {
  if (!value?.trim()) return undefined;
  
  const cleaned = value.trim();
  const date = new Date(cleaned);
  
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  // Try common formats
  const formats = [
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/, // MM/DD/YYYY or DD/MM/YYYY
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/, // YYYY/MM/DD
  ];

  for (const fmt of formats) {
    const match = cleaned.match(fmt);
    if (match) {
      const d = new Date(cleaned);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
  }

  return undefined;
}

function normalizeNumber(value: string): number | undefined {
  if (!value?.trim()) return undefined;
  
  // Remove currency symbols and commas
  const cleaned = value.trim().replace(/[$€£¥,]/g, '').trim();
  const num = parseFloat(cleaned);
  
  return isNaN(num) ? undefined : num;
}

function normalizeCompetitorName(value: string): string | undefined {
  if (!value?.trim()) return undefined;
  
  let name = value.trim();
  
  // Normalize common suffixes
  name = name.replace(/\s*(Inc\.?|LLC|Ltd\.?|Corp\.?|Co\.?|GmbH|SA|AG)\s*$/i, '').trim();
  
  // Capitalize
  name = name.charAt(0).toUpperCase() + name.slice(1);
  
  return name || undefined;
}

// ============================================================
// Data Quality Report
// ============================================================

export function generateDataQualityReport(
  records: NormalizedRecord[],
  issues: DataQualityIssue[]
): DataQualityReport {
  const validRecords = records.filter(r => r.competitor && r.date);
  const competitors = new Set<string>();
  const eventTypes = new Set<string>();
  let minDate: string | null = null;
  let maxDate: string | null = null;

  for (const r of records) {
    if (r.competitor) competitors.add(r.competitor);
    if (r.eventType) eventTypes.add(r.eventType);
    if (r.date) {
      if (!minDate || r.date < minDate) minDate = r.date;
      if (!maxDate || r.date > maxDate) maxDate = r.date;
    }
  }

  // Detect duplicates
  const seen = new Set<string>();
  let duplicates = 0;
  for (const r of records) {
    const key = `${r.competitor}-${r.date}-${r.eventType}-${r.price}`;
    if (seen.has(key)) duplicates++;
    else seen.add(key);
  }

  // Missing fields analysis
  const fields = ['competitor', 'date', 'eventType', 'price', 'product', 'feature', 'description'] as const;
  const missingFields = fields.map(field => {
    const count = records.filter(r => !r[field]).length;
    return {
      field,
      count,
      percentage: parseFloat(((count / records.length) * 100).toFixed(1)),
    };
  }).filter(f => f.count > 0);

  return {
    totalRecords: records.length,
    validRecords: validRecords.length,
    invalidRecords: records.length - validRecords.length,
    missingFields,
    duplicateRecords: duplicates,
    dateRange: minDate && maxDate ? { start: minDate, end: maxDate } : null,
    detectedCompetitors: Array.from(competitors),
    detectedEventTypes: Array.from(eventTypes),
    issues,
  };
}
