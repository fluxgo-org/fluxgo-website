'use client';

import { useMemo, useRef, useState } from 'react';
import { errorText, isSessionExpired } from '../_lib/api';
import { EXPORT_FORMATS, exportTable } from '../_lib/export';
import { formatNumber } from '../_lib/format';
import { useStoredState } from '../_lib/hooks';
import { Button, EmptyState, Icon, IconButton, Popover, Skeleton, useToast } from './ui';

const MIN_WIDTH = 64;
export const PAGE_SIZES = [25, 50, 100];

/**
 * A server-paged table.
 * - Drag a header edge to change a column width. Widths are kept per table in this browser.
 * - Click a sortable header to sort. The parent sends the sort to the API.
 * - Use the Columns menu to show, hide, or move columns. Drag a header to move a column.
 * - Use the Export menu to download CSV, Markdown, PDF, or an image. Pass `exporter`:
 *   { title, filename(), load() → all rows, limit }. PDF, image, and Markdown use the shown columns.
 */
export function DataTable({
  tableId,
  columns,
  rows,
  loading,
  getRowId = (row) => row.id || row.publicId,
  onRowClick,
  selectedId,
  sort,
  onSortChange,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  empty,
  exporter,
  toolbar,
  label,
}) {
  const [widths, setWidths] = useStoredState(`table:${tableId}:widths`, {});
  const [hidden, setHidden] = useStoredState(`table:${tableId}:hidden`, null);
  const [density, setDensity] = useStoredState('table:density', 'comfortable');
  const [order, setOrder] = useStoredState(`table:${tableId}:order`, null);
  const [dragKey, setDragKey] = useState(null);
  const [dropKey, setDropKey] = useState(null);
  const [exporting, setExporting] = useState('');
  const bodyRef = useRef(null);
  const notify = useToast();

  // Apply the stored order. New columns that the stored order does not know go last.
  const ordered = useMemo(() => {
    if (!order?.length) return columns;
    const rank = new Map(order.map((key, index) => [key, index]));
    return [...columns].sort((left, right) => (rank.has(left.key) ? rank.get(left.key) : 1000 + columns.indexOf(left)) - (rank.has(right.key) ? rank.get(right.key) : 1000 + columns.indexOf(right)));
  }, [columns, order]);
  const hiddenKeys = useMemo(() => new Set(hidden ?? columns.filter((column) => column.defaultHidden).map((column) => column.key)), [hidden, columns]);
  const visible = ordered.filter((column) => !hiddenKeys.has(column.key));

  const moveColumn = (key, targetKey) => {
    if (!key || key === targetKey) return;
    const keys = ordered.map((column) => column.key);
    const from = keys.indexOf(key);
    const to = keys.indexOf(targetKey);
    if (from < 0 || to < 0) return;
    keys.splice(from, 1);
    keys.splice(to, 0, key);
    setOrder(keys);
  };
  const stepColumn = (key, step) => {
    const keys = ordered.map((column) => column.key);
    const from = keys.indexOf(key);
    const to = from + step;
    if (from < 0 || to < 0 || to >= keys.length) return;
    [keys[from], keys[to]] = [keys[to], keys[from]];
    setOrder(keys);
  };
  const widthOf = (column) => widths[column.key] || column.width || 160;
  const tableWidth = visible.reduce((sum, column) => sum + widthOf(column), 0);

  const runExport = async (format) => {
    setExporting(format);
    try {
      const all = await exporter.load();
      const message = await exportTable({ format, filename: exporter.filename(), title: exporter.title, columns: visible, allColumns: columns, rows: all, total, limit: exporter.limit, widthOf });
      notify(message);
    } catch (exportError) {
      if (!isSessionExpired(exportError)) notify(errorText(exportError, 'The export failed. Try again.'), 'danger');
    } finally {
      setExporting('');
    }
  };

  const startResize = (event, column) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = widths[column.key] || column.width || 160;
    const min = column.minWidth || MIN_WIDTH;
    document.body.classList.add('ax-resizing');
    const onMove = (moveEvent) => {
      const next = Math.max(min, Math.round(startWidth + moveEvent.clientX - startX));
      setWidths((current) => ({ ...current, [column.key]: next }));
    };
    const onUp = () => {
      document.body.classList.remove('ax-resizing');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const resizeByKey = (event, column) => {
    const step = event.shiftKey ? 40 : 10;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const current = widths[column.key] || column.width || 160;
    const next = Math.max(column.minWidth || MIN_WIDTH, current + (event.key === 'ArrowRight' ? step : -step));
    setWidths((all) => ({ ...all, [column.key]: next }));
  };

  const toggleSort = (column) => {
    if (!column.sortKey || !onSortChange) return;
    if (sort?.key !== column.sortKey) onSortChange({ key: column.sortKey, order: column.defaultOrder || 'desc' });
    else onSortChange({ key: column.sortKey, order: sort.order === 'desc' ? 'asc' : 'desc' });
  };

  const toggleColumn = (key) => {
    setHidden(() => {
      const next = new Set(hiddenKeys);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return [...next];
    });
  };

  const moveFocus = (event, index) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRowClick?.(rows[index]);
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const target = bodyRef.current?.querySelectorAll('tr[data-row]')[index + (event.key === 'ArrowDown' ? 1 : -1)];
    target?.focus();
  };

  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const showSkeleton = loading && !rows.length;

  return (
    <div className={`ax-table-card is-${density}`}>
      <div className="ax-table-toolbar">
        <div className="ax-table-toolbar-start">{toolbar}</div>
        <div className="ax-table-toolbar-end">
          {loading && rows.length ? <span className="ax-table-updating" role="status"><span className="ax-spinner" aria-hidden="true" />Updating</span> : null}
          <Popover label="Table options" trigger={(props) => <Button size="sm" icon="columns" onClick={props.toggle} aria-expanded={props['aria-expanded']}>Columns</Button>}>
            {() => (
              <div className="ax-menu">
                <p className="ax-menu-label">Show and order columns</p>
                {ordered.map((column, index) => (
                  <div key={column.key} className="ax-menu-column">
                    <label className="ax-menu-check">
                      <input type="checkbox" checked={!hiddenKeys.has(column.key)} disabled={column.locked} onChange={() => toggleColumn(column.key)} />
                      <span>{column.label || 'Actions'}</span>
                    </label>
                    <span className="ax-menu-move">
                      <IconButton icon="chevronUp" size={13} label={`Move ${column.label || 'column'} up`} disabled={index === 0} onClick={() => stepColumn(column.key, -1)} />
                      <IconButton icon="chevronDown" size={13} label={`Move ${column.label || 'column'} down`} disabled={index === ordered.length - 1} onClick={() => stepColumn(column.key, 1)} />
                    </span>
                  </div>
                ))}
                <p className="ax-menu-hint">You can also drag a column header.</p>
                <div className="ax-menu-sep" />
                <p className="ax-menu-label">Row height</p>
                <div className="ax-menu-row">
                  <button type="button" className={density === 'comfortable' ? 'is-active' : ''} onClick={() => setDensity('comfortable')}>Comfortable</button>
                  <button type="button" className={density === 'compact' ? 'is-active' : ''} onClick={() => setDensity('compact')}>Compact</button>
                </div>
                <div className="ax-menu-sep" />
                <button type="button" className="ax-menu-item" onClick={() => { setWidths({}); setHidden(null); setOrder(null); }}>Reset widths, order, and columns</button>
              </div>
            )}
          </Popover>
          {exporter ? (
            <Popover label="Export" trigger={(props) => <Button size="sm" icon="download" onClick={props.toggle} aria-expanded={props['aria-expanded']} busy={Boolean(exporting)} disabled={!total || Boolean(exporting)}>{exporting ? 'Exporting…' : 'Export'}</Button>}>
              {({ close }) => (
                <div className="ax-menu">
                  <p className="ax-menu-label">Export {exporter.limit && total > exporter.limit ? `the first ${formatNumber(exporter.limit)} rows` : formatNumber(total) + (total === 1 ? ' row' : ' rows')}</p>
                  {EXPORT_FORMATS.map((format) => (
                    <button key={format.value} type="button" className="ax-menu-item" onClick={() => { close(); void runExport(format.value); }}>
                      <span>{format.label}</span>
                      <span className="ax-muted">{format.hint}</span>
                    </button>
                  ))}
                </div>
              )}
            </Popover>
          ) : null}
        </div>
      </div>
      <div className="ax-table-scroll">
        <table className="ax-table" style={{ width: tableWidth, minWidth: '100%' }} aria-label={label} aria-busy={loading ? 'true' : 'false'}>
          <colgroup>{visible.map((column) => <col key={column.key} style={{ width: widthOf(column) }} />)}</colgroup>
          <thead>
            <tr>
              {visible.map((column) => {
                const active = column.sortKey && sort?.key === column.sortKey;
                const ariaSort = active ? (sort.order === 'asc' ? 'ascending' : 'descending') : column.sortKey ? 'none' : undefined;
                return (
                  <th key={column.key} scope="col" aria-sort={ariaSort}
                    className={`${column.align === 'end' ? 'is-end' : ''}${active ? ' is-sorted' : ''}${dragKey === column.key ? ' is-dragging' : ''}${dropKey === column.key && dragKey && dragKey !== column.key ? (ordered.findIndex((item) => item.key === dragKey) < ordered.findIndex((item) => item.key === column.key) ? ' is-drop-after' : ' is-drop-before') : ''}`}
                    draggable
                    onDragStart={(event) => {
                      if (event.target.closest?.('.ax-col-resize')) { event.preventDefault(); return; }
                      setDragKey(column.key);
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', column.key);
                    }}
                    onDragOver={(event) => { if (!dragKey) return; event.preventDefault(); event.dataTransfer.dropEffect = 'move'; if (dropKey !== column.key) setDropKey(column.key); }}
                    onDragLeave={() => { if (dropKey === column.key) setDropKey(null); }}
                    onDrop={(event) => { event.preventDefault(); moveColumn(dragKey, column.key); setDragKey(null); setDropKey(null); }}
                    onDragEnd={() => { setDragKey(null); setDropKey(null); }}
                    title="Drag to move this column">
                    {column.sortKey ? (
                      <button type="button" className="ax-th-sort" onClick={() => toggleSort(column)} title={`Sort by ${column.label.toLowerCase()}`}>
                        <span>{column.label}</span>
                        <Icon name={active ? (sort.order === 'asc' ? 'sortUp' : 'sortDown') : 'sortNone'} size={12} className="ax-sort-icon" />
                      </button>
                    ) : <span className="ax-th-label">{column.label}</span>}
                    <span className="ax-col-resize" draggable={false} role="separator" aria-orientation="vertical" aria-label={`Resize ${column.label} column`} tabIndex={0}
                      onPointerDown={(event) => startResize(event, column)} onKeyDown={(event) => resizeByKey(event, column)}
                      onDoubleClick={() => setWidths((current) => { const next = { ...current }; delete next[column.key]; return next; })} />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody ref={bodyRef}>
            {showSkeleton ? Array.from({ length: 8 }).map((_, index) => (
              <tr key={`skeleton-${index}`} className="ax-skeleton-row">{visible.map((column) => <td key={column.key}><Skeleton width={`${50 + ((index * 17 + column.key.length * 7) % 45)}%`} /></td>)}</tr>
            )) : rows.length ? rows.map((row, index) => {
              const id = getRowId(row);
              const selected = selectedId !== undefined && selectedId !== null && String(selectedId) === String(id);
              return (
                <tr key={id} data-row tabIndex={onRowClick ? 0 : undefined} className={`${onRowClick ? 'is-clickable' : ''}${selected ? ' is-selected' : ''}`}
                  onClick={onRowClick ? (event) => { if (event.target.closest('a,button,input')) return; onRowClick(row); } : undefined}
                  onKeyDown={onRowClick ? (event) => moveFocus(event, index) : undefined} aria-selected={onRowClick ? selected : undefined}>
                  {visible.map((column) => <td key={column.key} className={column.align === 'end' ? 'is-end' : ''}>{column.render ? column.render(row) : (row[column.key] ?? <span className="ax-muted">—</span>)}</td>)}
                </tr>
              );
            }) : (
              <tr><td colSpan={visible.length} className="ax-table-empty-cell">{empty || <EmptyState title="No records" />}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {onPageChange ? (
        <nav className="ax-pagination" aria-label="Pagination">
          <span className="ax-pagination-range">{total ? <>{formatNumber(from)}–{formatNumber(to)} of <strong>{formatNumber(total)}</strong></> : '0 results'}</span>
          <div className="ax-pagination-controls">
            {onPageSizeChange ? (
              <label className="ax-page-size"><span>Rows</span>
                <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>{PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}</select>
              </label>
            ) : null}
            <IconButton icon="arrowLeft" label="Previous page" disabled={page <= 0} onClick={() => onPageChange(page - 1)} />
            <span className="ax-page-indicator" aria-live="polite">Page {page + 1} of {pageCount}</span>
            <IconButton icon="arrowRight" label="Next page" disabled={page + 1 >= pageCount} onClick={() => onPageChange(page + 1)} />
          </div>
        </nav>
      ) : null}
    </div>
  );
}
