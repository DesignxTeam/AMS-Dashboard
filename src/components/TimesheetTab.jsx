import { useState, useMemo } from 'react'

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
    <div className="space-y-4 animate-slide-up">
      {/* Filters */}
      <div className="card flex flex-wrap gap-3 items-end py-4">
        <div className="relative flex-1 min-w-48">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Suche: Person, Ticket, Memo..."
            value={search}
            onChange={handleFilter(setSearch)}
            className="w-full bg-muted border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </div>
        <select
          value={person}
          onChange={handleFilter(setPerson)}
          className="bg-muted border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        >
          <option value="">Alle Personen</option>
          {persons.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={month}
          onChange={handleFilter(setMonth)}
          className="bg-muted border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        >
          <option value="">Alle Monate</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        
        {/* Stats */}
        <div className="flex items-center gap-3 ml-auto">
          <StatBadge label="Eintrage" value={filtered.length.toLocaleString('de')} gradient="from-primary to-accent-cyan" />
          <StatBadge label="Stunden" value={`${Math.round(totalH).toLocaleString('de')}h`} gradient="from-accent-pink to-accent-orange" />
        </div>
      </div>

      {/* Table */}
      <div className="card card-hover p-0 overflow-hidden">
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
                <tr key={i} className="hover:bg-muted/50 transition-colors">
                  <td className="table-td text-muted-foreground text-xs whitespace-nowrap">
                    <span className="flex items-center gap-2">
                      <CalendarIcon className="w-3 h-3" />
                      {r.date}
                    </span>
                  </td>
                  <td className="table-td font-medium text-sm text-foreground">
                    <span className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent-cyan flex items-center justify-center text-xs text-white font-bold">
                        {r.user?.charAt(0)?.toUpperCase()}
                      </div>
                      {r.user}
                    </span>
                  </td>
                  <td className="table-td font-mono text-xs text-primary hover:underline cursor-pointer">{r.ticket}</td>
                  <td className="table-td text-sm text-foreground max-w-xs truncate" title={r.memo}>{r.memo}</td>
                  <td className="table-td text-xs text-muted-foreground">{r.service_item}</td>
                  <td className="table-td text-right font-semibold text-sm text-foreground">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary">
                      {r.hours}h
                    </span>
                  </td>
                  <td className="table-td text-xs text-muted-foreground max-w-[150px] truncate" title={r.epic_name}>{r.epic_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-border bg-card text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted hover:border-primary/50 transition-all"
            >
              <ChevronLeftIcon className="w-4 h-4" />
              Zuruck
            </button>
            <div className="flex items-center gap-2">
              {[...Array(Math.min(pages, 5))].map((_, i) => {
                const pageNum = i + 1
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                      page === pageNum 
                        ? 'bg-primary text-primary-foreground shadow-glow' 
                        : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
              {pages > 5 && (
                <>
                  <span className="text-muted-foreground">...</span>
                  <button
                    onClick={() => setPage(pages)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                      page === pages 
                        ? 'bg-primary text-primary-foreground shadow-glow' 
                        : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                    }`}
                  >
                    {pages}
                  </button>
                </>
              )}
            </div>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-border bg-card text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted hover:border-primary/50 transition-all"
            >
              Weiter
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function StatBadge({ label, value, gradient }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg border border-border">
      <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${gradient}`} />
      <span className="text-xs text-muted-foreground">{label}:</span>
      <span className="text-sm font-bold text-foreground">{value}</span>
    </div>
  )
}

// Icons
function SearchIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function CalendarIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  )
}

function ChevronLeftIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function ChevronRightIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}
