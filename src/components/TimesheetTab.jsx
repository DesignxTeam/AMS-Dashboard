import { useState, useMemo } from 'react'

const fmtDate = s => s?.slice(5).replace('-', '.')  // 2026-03-12 → 03.12

export default function TimesheetTab({ data }) {
  const rows = data.timesheet
  const [search, setSearch]   = useState('')
  const [person, setPerson]   = useState('')
  const [month, setMonth]     = useState('')
  const [page, setPage]       = useState(1)
  const PAGE_SIZE = 50

  const persons = useMemo(() => [...new Set(rows.map(r => r.user))].filter(Boolean).sort(), [rows])
  const months  = useMemo(() => [...new Set(rows.map(r => r.month))].sort().reverse(), [rows])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter(r =>
      (!person || r.user === person) &&
      (!month  || r.month === month) &&
      (!q || r.memo?.toLowerCase().includes(q) || r.ticket?.toLowerCase().includes(q) ||
             r.user?.toLowerCase().includes(q))
    )
  }, [rows, search, person, month])

  const totalH   = useMemo(() => filtered.reduce((s, r) => s + (r.hours || 0), 0), [filtered])
  const paged    = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const pages    = Math.ceil(filtered.length / PAGE_SIZE)

  const handleFilter = (setter) => (e) => { setter(e.target.value); setPage(1) }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card flex flex-wrap gap-3 items-end py-3">
        <FilterInput
          placeholder="Suche: Person, Ticket, Memo…"
          value={search}
          onChange={handleFilter(setSearch)}
          className="flex-1 min-w-48"
        />
        <FilterSelect value={person} onChange={handleFilter(setPerson)} options={persons} placeholder="Alle Personen" />
        <FilterSelect value={month}  onChange={handleFilter(setMonth)}  options={months}  placeholder="Alle Monate" />
        <div className="text-sm text-slate-500 ml-auto">
          <span className="font-bold text-slate-700">{filtered.length.toLocaleString('de')}</span> Einträge ·{' '}
          <span className="font-bold text-slate-700">{Math.round(totalH).toLocaleString('de')}h</span>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr>
                <th className="table-th">Datum</th>
                <th className="table-th">Person</th>
                <th className="table-th">Ticket</th>
                <th className="table-th">Memo</th>
                <th className="table-th">Service Item</th>
                <th className="table-th text-right">h</th>
                <th className="table-th">Epic</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="table-td text-slate-500 text-xs whitespace-nowrap">{r.date}</td>
                  <td className="table-td font-medium text-sm">{r.user}</td>
                  <td className="table-td font-mono text-xs text-blue-600">{r.ticket}</td>
                  <td className="table-td text-sm text-slate-700 max-w-xs truncate" title={r.memo}>{r.memo}</td>
                  <td className="table-td text-xs text-slate-500">{r.service_item}</td>
                  <td className="table-td text-right font-semibold text-sm">{r.hours}</td>
                  <td className="table-td text-xs text-slate-400 max-w-[150px] truncate" title={r.epic_name}>{r.epic_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200 bg-slate-50">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-sm px-3 py-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-white"
            >
              ← Zurück
            </button>
            <span className="text-xs text-slate-500">Seite {page} / {pages}</span>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="text-sm px-3 py-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-white"
            >
              Weiter →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function FilterInput({ placeholder, value, onChange, className = '' }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-700/30 ${className}`}
    />
  )
}

function FilterSelect({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-700/30 bg-white"
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}
