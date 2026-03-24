import { useState, useMemo } from 'react'

// Color palette for service items and epics
const SERVICE_COLORS = [
  { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30' },
  { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
]

const AVATAR_GRADIENTS = [
  'from-blue-500 to-cyan-400',
  'from-pink-500 to-orange-400',
  'from-green-500 to-teal-400',
  'from-purple-500 to-pink-400',
  'from-orange-500 to-yellow-400',
  'from-cyan-500 to-blue-400',
  'from-red-500 to-pink-400',
  'from-emerald-500 to-cyan-400',
]

const HOURS_COLORS = [
  { min: 0, max: 2, bg: 'bg-green-500/20', text: 'text-green-400' },
  { min: 2, max: 4, bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  { min: 4, max: 6, bg: 'bg-blue-500/20', text: 'text-blue-400' },
  { min: 6, max: 8, bg: 'bg-orange-500/20', text: 'text-orange-400' },
  { min: 8, max: Infinity, bg: 'bg-pink-500/20', text: 'text-pink-400' },
]

function getColorForString(str, colorArray) {
  if (!str) return colorArray[0]
  const hash = str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colorArray[hash % colorArray.length]
}

function getHoursColor(hours) {
  const found = HOURS_COLORS.find(c => hours >= c.min && hours < c.max)
  return found || HOURS_COLORS[HOURS_COLORS.length - 1]
}

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
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Suche: Person, Ticket, Memo..."
            value={search}
            onChange={handleFilter(setSearch)}
            className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
          />
        </div>
        <select
          value={person}
          onChange={handleFilter(setPerson)}
          className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
        >
          <option value="">Alle Personen</option>
          {persons.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={month}
          onChange={handleFilter(setMonth)}
          className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
        >
          <option value="">Alle Monate</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        
        {/* Stats */}
        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <DocumentIcon className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-zinc-400">Eintrage:</span>
            <span className="text-sm font-bold text-blue-400">{filtered.length.toLocaleString('de')}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-pink-500/10 border border-pink-500/20 rounded-lg">
            <ClockIcon className="w-4 h-4 text-pink-400" />
            <span className="text-xs text-zinc-400">Stunden:</span>
            <span className="text-sm font-bold text-pink-400">{Math.round(totalH).toLocaleString('de')}h</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card card-hover p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-zinc-800/70">
                <th className="table-th">Datum</th>
                <th className="table-th">Person</th>
                <th className="table-th">Ticket</th>
                <th className="table-th">Memo</th>
                <th className="table-th">Service Item</th>
                <th className="table-th text-right">Stunden</th>
                <th className="table-th">Epic</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((r, i) => {
                const serviceColor = getColorForString(r.service_item, SERVICE_COLORS)
                const epicColor = getColorForString(r.epic_name, SERVICE_COLORS)
                const avatarGradient = getColorForString(r.user, AVATAR_GRADIENTS)
                const hoursColor = getHoursColor(r.hours || 0)
                
                return (
                  <tr 
                    key={i} 
                    className="hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 group"
                  >
                    <td className="table-td whitespace-nowrap">
                      <span className="flex items-center gap-2 text-zinc-400">
                        <CalendarIcon className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-xs">{r.date}</span>
                      </span>
                    </td>
                    <td className="table-td">
                      <span className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-xs text-white font-bold shadow-lg`}>
                          {r.user?.charAt(0)?.toUpperCase()}
                        </div>
                        <span className="font-medium text-sm text-zinc-100">{r.user}</span>
                      </span>
                    </td>
                    <td className="table-td">
                      <span className="font-mono text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 cursor-pointer transition-colors">
                        {r.ticket}
                      </span>
                    </td>
                    <td className="table-td text-sm text-zinc-300 max-w-xs truncate" title={r.memo}>
                      {r.memo}
                    </td>
                    <td className="table-td">
                      {r.service_item && (
                        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${serviceColor.bg} ${serviceColor.text} border ${serviceColor.border}`}>
                          <TagIcon className="w-3 h-3" />
                          {r.service_item}
                        </span>
                      )}
                    </td>
                    <td className="table-td text-right">
                      <span className={`inline-flex items-center justify-center min-w-[3rem] text-sm font-bold px-2.5 py-1 rounded-lg ${hoursColor.bg} ${hoursColor.text}`}>
                        {r.hours}h
                      </span>
                    </td>
                    <td className="table-td">
                      {r.epic_name && (
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${epicColor.bg} ${epicColor.text} max-w-[150px] truncate`} title={r.epic_name}>
                          <FolderIcon className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{r.epic_name}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 bg-zinc-900/50">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-700 hover:text-zinc-100 transition-all"
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
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                      page === pageNum 
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30' 
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
              {pages > 5 && (
                <>
                  <span className="text-zinc-500 px-1">...</span>
                  <button
                    onClick={() => setPage(pages)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                      page === pages 
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30' 
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700'
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
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-700 hover:text-zinc-100 transition-all"
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

function ClockIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function DocumentIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

function TagIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
      <path d="M7 7h.01" />
    </svg>
  )
}

function FolderIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
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
