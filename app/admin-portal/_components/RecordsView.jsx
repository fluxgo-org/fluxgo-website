'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RECORD_SECTIONS } from '../_config/sections';
import { errorText, isSessionExpired, queryString, requestApi } from '../_lib/api';
import { isTypingTarget, useNow } from '../_lib/hooks';
import { useLiveRefresh } from '../_lib/live';
import { DataTable, PAGE_SIZES } from './DataTable';
import { FilterBar } from './FilterBar';
import { Button, EmptyState } from './ui';

const EXPORT_LIMIT = 1000;

/** Read list state from URL params. */
export function readListState(section, params) {
  const config = RECORD_SECTIONS[section];
  const keys = new Set(['query']);
  config.filters.forEach((field) => {
    if (field.type === 'dateRange') { keys.add(field.fromKey); keys.add(field.toKey); }
    else { keys.add(field.key); if (field.labelKey) keys.add(field.labelKey); }
  });
  const filters = {};
  keys.forEach((key) => { if (params[key]) filters[key] = params[key]; });
  const page = Math.max(0, (Number.parseInt(params.page || '1', 10) || 1) - 1);
  const size = PAGE_SIZES.includes(Number(params.size)) ? Number(params.size) : PAGE_SIZES[0];
  const sort = params.sort ? { key: params.sort, order: params.order === 'asc' ? 'asc' : 'desc' } : config.defaultSort || null;
  return { filters, page, size, sort };
}

export function RecordsView({ section, params, setParams, openRecord, selected, admins }) {
  const config = RECORD_SECTIONS[section];
  const now = useNow();
  const { filters, page, size, sort } = readListState(section, params);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const sequence = useRef(0);
  const searchRef = useRef(null);

  const apiParams = useMemo(() => {
    const base = { ...(sort ? { sort: sort.key, order: sort.order } : {}), ...config.toParams(filters, sort) };
    return base;
    // The serialized params identify the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters), sort?.key, sort?.order, section]);

  const load = useCallback(async ({ silent = false } = {}) => {
    const id = ++sequence.current;
    if (!silent) setLoading(true);
    try {
      const result = await requestApi(`${config.endpoint}${queryString({ ...apiParams, limit: size, offset: page * size })}`);
      if (id !== sequence.current) return;
      setRows(result?.items || []);
      setTotal(result?.total || 0);
      setError('');
    } catch (requestError) {
      if (id !== sequence.current || isSessionExpired(requestError)) return;
      setError(errorText(requestError));
    } finally {
      if (id === sequence.current) setLoading(false);
    }
  }, [apiParams, config.endpoint, page, size]);

  useEffect(() => { void load(); }, [load]);
  useLiveRefresh(config.liveKeys, () => { void load({ silent: true }); });

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === '/' && !isTypingTarget(event.target) && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const updateFilters = (patch) => setParams({ ...patch, page: undefined });
  const columns = useMemo(() => config.columns({ now, open: openRecord }), [config, now, openRecord]);
  const resolvedConfig = useMemo(() => ({
    ...config,
    filters: config.filters.map((field) => (field.dynamic === 'admins'
      ? { ...field, options: (admins || []).map((admin) => ({ value: admin.id, label: admin.email || admin.username })) }
      : field)),
  }), [config, admins]);

  const exporter = useMemo(() => ({
    title: config.label,
    limit: EXPORT_LIMIT,
    filename: () => `fluxgo-${section}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}`,
    load: async () => {
      const all = [];
      for (let offset = 0; offset < Math.min(total, EXPORT_LIMIT); offset += 100) {
        const result = await requestApi(`${config.endpoint}${queryString({ ...apiParams, limit: 100, offset })}`);
        all.push(...(result?.items || []));
        if (!result?.hasMore) break;
      }
      return all;
    },
  }), [config, section, total, apiParams]);

  const hasFilters = Object.keys(filters).length > 0;
  const getRowId = config.getRowId || ((row) => row.id || row.publicId);

  return (
    <div className="ax-view">
      {config.filters.length || config.search !== false ? <FilterBar config={resolvedConfig} filters={filters} onChange={updateFilters} searchRef={searchRef} /> : null}
      {error ? (
        <div className="ax-inline-error" role="alert"><span>{error}</span><Button size="sm" onClick={() => load()}>Try again</Button></div>
      ) : null}
      <DataTable
        tableId={section}
        label={config.label}
        columns={columns}
        rows={rows}
        loading={loading}
        getRowId={getRowId}
        onRowClick={config.detailKind ? (row) => openRecord(config.detailKind, getRowId(row), row) : undefined}
        selectedId={selected?.kind === config.detailKind ? selected.id : null}
        sort={sort}
        onSortChange={(next) => setParams({ sort: next.key, order: next.order, page: undefined })}
        total={total}
        page={page}
        pageSize={size}
        onPageChange={(next) => setParams({ page: next > 0 ? String(next + 1) : undefined })}
        onPageSizeChange={(next) => setParams({ size: next === PAGE_SIZES[0] ? undefined : String(next), page: undefined })}
        exporter={exporter}
        empty={<EmptyState title={hasFilters ? 'No matching records' : `No ${config.label.toLowerCase()} yet`}>{hasFilters ? 'Change or clear the filters to see more.' : null}</EmptyState>}
      />
    </div>
  );
}
