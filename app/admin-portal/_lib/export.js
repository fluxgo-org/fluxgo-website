'use client';

import { formatDateTime, formatNumber, plural, statusLabel } from './format';

/**
 * Table exports. Every format runs in the browser with no extra package.
 * - CSV: every column, raw values, for spreadsheets.
 * - Markdown, PDF, image: the columns the admin shows, in their order, with readable values.
 *   PDF pages and the image are drawn on a canvas, so names in any script show correctly.
 */

export const EXPORT_FORMATS = [
  { value: 'csv', label: 'CSV', hint: 'Every column, for spreadsheets' },
  { value: 'md', label: 'Markdown', hint: 'Shown columns, as a text table' },
  { value: 'pdf', label: 'PDF', hint: 'Shown columns, on A4 pages' },
  { value: 'png', label: 'Image (PNG)', hint: 'Shown columns, as one picture' },
];

/** The most rows one image holds. A taller canvas fails in some browsers. */
export const IMAGE_ROW_LIMIT = 500;

const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const ENUM_VALUE = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$|^[A-Z]{4,}$/;

/** True when a column has data to export. The actions column has no label. */
export function exportable(column) {
  return Boolean(column.label) && column.export !== false;
}

/** The raw value that CSV uses. */
function rawValue(column, row) {
  return column.csv ? column.csv(row) : row[column.key];
}

/** The value as an admin reads it: dates, status names, Yes/No. */
export function cellText(column, row) {
  return readable(column.text ? column.text(row) : rawValue(column, row));
}

function readable(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.map(readable).join(', ') : '—';
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (ISO_DATE_TIME.test(text)) return formatDateTime(text);
  if (ENUM_VALUE.test(text)) return statusLabel(text);
  return text || '—';
}

/** Run one export and start the download. Returns a short message for a toast. */
export async function exportTable({ format, filename, title, columns, allColumns, rows, total, limit, widthOf }) {
  const stamp = new Date();
  if (format === 'csv') {
    downloadCsv(`${filename}.csv`, allColumns, rows);
    return limitNote(rows.length, total, limit);
  }
  const shown = columns.filter(exportable);
  if (format === 'md') {
    download(`${filename}.md`, new Blob([toMarkdown({ title, columns: shown, rows, stamp, total })], { type: 'text/markdown;charset=utf-8' }));
    return limitNote(rows.length, total, limit);
  }
  const table = { title, columns: shown.map((column) => ({ label: column.label, align: column.align, width: widthOf(column), verified: column.verified })), stamp, total };
  if (format === 'pdf') {
    download(`${filename}.pdf`, await toPdf({ ...table, rows: tableRows(shown, rows) }));
    return limitNote(rows.length, total, limit);
  }
  const imageRows = rows.slice(0, IMAGE_ROW_LIMIT);
  download(`${filename}.png`, await toPng({ ...table, rows: tableRows(shown, imageRows) }));
  if (rows.length > IMAGE_ROW_LIMIT) return `The image shows the first ${formatNumber(IMAGE_ROW_LIMIT)} of ${formatNumber(total)} rows. Use PDF for more.`;
  return limitNote(imageRows.length, total, limit);
}

function limitNote(count, total, limit) {
  return limit && total > limit ? `Exported the first ${formatNumber(count)} of ${formatNumber(total)} rows.` : `Exported ${plural(count, 'row')}.`;
}

function tableRows(columns, rows) {
  return rows.map((row) => columns.map((column) => ({ text: cellText(column, row), verified: Boolean(column.verified?.(row)) })));
}

function exportedLine(stamp, count, total) {
  const rows = total > count ? `${formatNumber(count)} of ${formatNumber(total)} rows` : plural(count, 'row');
  return `Fluxgo admin · exported ${formatDateTime(stamp.toISOString())} · ${rows}`;
}

/* CSV */

export function downloadCsv(filename, columns, rows) {
  const escape = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csvColumns = columns.filter(exportable);
  const lines = [csvColumns.map((column) => escape(column.label)).join(',')];
  rows.forEach((row) => lines.push(csvColumns.map((column) => escape(rawValue(column, row))).join(',')));
  download(filename, new Blob([`﻿${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' }));
}

/* Markdown */

export function toMarkdown({ title, columns, rows, stamp, total }) {
  const cell = (text) => text.replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
  const lines = [
    `# ${title}`,
    '',
    exportedLine(stamp, rows.length, total),
    '',
    `| ${columns.map((column) => cell(column.label)).join(' | ')} |`,
    `| ${columns.map((column) => (column.align === 'end' ? '---:' : '---')).join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => cell(cellText(column, row) + (column.verified?.(row) ? ' ✓' : ''))).join(' | ')} |`),
  ];
  return `${lines.join('\n')}\n`;
}

/* Canvas drawing for PDF and PNG */

const COLORS = { ink: '#1B1B19', ink2: '#55554E', ink3: '#85857C', line: '#E3E3DC', lineSoft: '#EDEDE7', head: '#FAFAF7', page: '#FFFFFF', brand: '#2F6B46' };
const PAD = 32;
const TITLE_BLOCK = 58;
const CELL_X = 10;

function fontFamily() {
  const root = typeof document !== 'undefined' ? document.querySelector('.admin-root') : null;
  return (root && getComputedStyle(root).fontFamily) || 'system-ui, sans-serif';
}

/** Cut text to fit the width, with an ellipsis. */
function fit(ctx, text, width) {
  if (ctx.measureText(text).width <= width) return text;
  let low = 0;
  let high = text.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (ctx.measureText(`${text.slice(0, middle)}…`).width <= width) low = middle;
    else high = middle - 1;
  }
  return low ? `${text.slice(0, low)}…` : '';
}

/** A filled circle with a check, the same mark as the portal. */
function drawVerified(ctx, x, y, size) {
  const radius = size / 2;
  ctx.save();
  ctx.fillStyle = COLORS.brand;
  ctx.beginPath();
  ctx.arc(x + radius, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = size * 0.14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x + size * 0.28, y + size * 0.02);
  ctx.lineTo(x + size * 0.44, y + size * 0.18);
  ctx.lineTo(x + size * 0.73, y - size * 0.16);
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw a title block (optional), a header row, and body rows.
 * Sizes are CSS pixels times `zoom`; the caller sets the canvas scale for sharp output.
 */
function drawTable(ctx, { title, subtitle, columns, widths, rows, x, y, zoom, family }) {
  const rowHeight = 30 * zoom;
  const headHeight = 32 * zoom;
  const tableWidth = widths.reduce((sum, width) => sum + width, 0);
  let top = y;
  if (title) {
    ctx.fillStyle = COLORS.ink;
    ctx.font = `700 ${18 * zoom}px ${family}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(title, x, top + 20 * zoom);
    ctx.fillStyle = COLORS.ink3;
    ctx.font = `400 ${12 * zoom}px ${family}`;
    ctx.fillText(subtitle, x, top + 40 * zoom);
    top += TITLE_BLOCK * zoom;
  }
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.head;
  ctx.fillRect(x, top, tableWidth, headHeight);
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, top + 0.5, tableWidth - 1, headHeight + rows.length * rowHeight - 1);
  ctx.font = `600 ${12 * zoom}px ${family}`;
  ctx.fillStyle = COLORS.ink2;
  let left = x;
  columns.forEach((column, index) => {
    const room = widths[index] - CELL_X * 2 * zoom;
    const text = fit(ctx, column.label, room);
    const textX = column.align === 'end' ? left + widths[index] - CELL_X * zoom - ctx.measureText(text).width : left + CELL_X * zoom;
    ctx.fillText(text, textX, top + headHeight / 2);
    left += widths[index];
  });
  top += headHeight;
  ctx.font = `400 ${12.5 * zoom}px ${family}`;
  const mark = 12 * zoom;
  rows.forEach((cells) => {
    ctx.strokeStyle = COLORS.lineSoft;
    ctx.beginPath();
    ctx.moveTo(x, Math.round(top) + 0.5);
    ctx.lineTo(x + tableWidth, Math.round(top) + 0.5);
    ctx.stroke();
    let cellLeft = x;
    cells.forEach((cell, index) => {
      const column = columns[index];
      const extra = cell.verified ? mark + 5 * zoom : 0;
      const room = widths[index] - CELL_X * 2 * zoom - extra;
      ctx.fillStyle = cell.text === '—' ? COLORS.ink3 : COLORS.ink;
      const text = fit(ctx, cell.text, room);
      const textWidth = ctx.measureText(text).width;
      const textX = column.align === 'end' ? cellLeft + widths[index] - CELL_X * zoom - textWidth - extra : cellLeft + CELL_X * zoom;
      ctx.fillText(text, textX, top + rowHeight / 2);
      if (cell.verified) drawVerified(ctx, textX + textWidth + 5 * zoom, top + rowHeight / 2, mark);
      cellLeft += widths[index];
    });
    top += rowHeight;
  });
  return top;
}

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The browser could not make the file.'))), type, quality));
}

async function toPng({ title, columns, rows, stamp, total }) {
  const family = fontFamily();
  const widths = columns.map((column) => column.width);
  const width = PAD * 2 + widths.reduce((sum, value) => sum + value, 0);
  const height = PAD * 2 + TITLE_BLOCK + 32 + rows.length * 30;
  // Keep the canvas under 16,000 px on each side and about 120 million pixels.
  const scale = Math.max(1, Math.min(2, 16000 / height, 16000 / width, Math.sqrt(120e6 / (width * height))));
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.fillStyle = COLORS.page;
  ctx.fillRect(0, 0, width, height);
  drawTable(ctx, { title, subtitle: exportedLine(stamp, rows.length, total), columns, widths, rows, x: PAD, y: PAD, zoom: 1, family });
  return canvasBlob(canvas, 'image/png');
}

/* PDF: A4 landscape pages, each one a JPEG drawn on a canvas */

const PAGE = { width: 1123, height: 794 }; // A4 landscape in CSS pixels at 96 dpi
const PAGE_POINTS = { width: 841.89, height: 595.28 };
const PAGE_SCALE = 2;
const FOOTER = 28;

async function toPdf({ title, columns, rows, stamp, total }) {
  const family = fontFamily();
  const room = PAGE.width - PAD * 2;
  const natural = columns.reduce((sum, column) => sum + column.width, 0);
  // Shrink a wide table to the page. Below 60% the text gets too small, so the columns cut text instead.
  const zoom = Math.min(1, Math.max(0.6, room / natural));
  const widths = columns.map((column) => (column.width * Math.min(1, room / natural)));
  const rowHeight = 30 * zoom;
  const headHeight = 32 * zoom;
  const bodyRoom = (first) => PAGE.height - PAD * 2 - FOOTER - headHeight - (first ? TITLE_BLOCK * zoom : 0);
  const pages = [];
  let index = 0;
  do {
    const count = Math.max(1, Math.floor(bodyRoom(index === 0) / rowHeight));
    pages.push(rows.slice(index, index + count));
    index += count;
  } while (index < rows.length);

  const subtitle = exportedLine(stamp, rows.length, total);
  const images = [];
  for (let page = 0; page < pages.length; page += 1) {
    const canvas = document.createElement('canvas');
    canvas.width = PAGE.width * PAGE_SCALE;
    canvas.height = PAGE.height * PAGE_SCALE;
    const ctx = canvas.getContext('2d');
    ctx.scale(PAGE_SCALE, PAGE_SCALE);
    ctx.fillStyle = COLORS.page;
    ctx.fillRect(0, 0, PAGE.width, PAGE.height);
    drawTable(ctx, { title: page === 0 ? title : null, subtitle, columns, widths, rows: pages[page], x: PAD, y: PAD, zoom, family });
    ctx.fillStyle = COLORS.ink3;
    ctx.font = `400 11px ${family}`;
    ctx.textBaseline = 'alphabetic';
    const footer = pages.length > 1 ? `${title} · page ${page + 1} of ${pages.length}` : title;
    ctx.fillText(footer, PAD, PAGE.height - PAD + 4);
    const blob = await canvasBlob(canvas, 'image/jpeg', 0.92);
    images.push({ bytes: new Uint8Array(await blob.arrayBuffer()), width: canvas.width, height: canvas.height });
  }
  return new Blob([buildPdf(images)], { type: 'application/pdf' });
}

/** Write a PDF with one full-page JPEG per page. */
export function buildPdf(images) {
  const encoder = new TextEncoder();
  const parts = [];
  const offsets = [];
  let length = 0;
  const push = (chunk) => {
    const bytes = typeof chunk === 'string' ? encoder.encode(chunk) : chunk;
    parts.push(bytes);
    length += bytes.length;
  };
  const object = (id, body, stream) => {
    offsets[id] = length;
    push(`${id} 0 obj\n${body}\n`);
    if (stream) { push('stream\n'); push(stream); push('\nendstream\n'); }
    push('endobj\n');
  };
  push('%PDF-1.4\n');
  push(new Uint8Array([37, 226, 227, 207, 211, 10]));
  const pageIds = images.map((_, index) => 3 + index * 3);
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${images.length} >>`);
  images.forEach((image, index) => {
    const pageId = pageIds[index];
    const { width, height } = PAGE_POINTS;
    const content = encoder.encode(`q ${width} 0 0 ${height} 0 0 cm /Im0 Do Q`);
    object(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 ${pageId + 2} 0 R >> >> /Contents ${pageId + 1} 0 R >>`);
    object(pageId + 1, `<< /Length ${content.length} >>`, content);
    object(pageId + 2, `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>`, image.bytes);
  });
  const size = 3 + images.length * 3;
  const xref = length;
  push(`xref\n0 ${size}\n0000000000 65535 f \n${Array.from({ length: size - 1 }, (_, index) => `${String(offsets[index + 1]).padStart(10, '0')} 00000 n \n`).join('')}`);
  push(`trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(length);
  let at = 0;
  parts.forEach((part) => { out.set(part, at); at += part.length; });
  return out;
}

function download(filename, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
