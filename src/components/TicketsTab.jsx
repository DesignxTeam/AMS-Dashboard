import { Fragment, useState, useMemo } from 'react'
import StatusBadge from './StatusBadge'

const STATUS_ORDER = [
  'In Progress', 'Selected for Development', 'Acuity QA', 'Acuity Approval',
  'DESIGN APPROVAL', 'Design Todo', 'Done', 'Closed', 'Post MVP', 'Backlog',
]

// Color helper for Est vs Act percentage
function getPctStyle(pct) {
  if (pct == null) return { text: 'text-zinc-500', bg: 'bg-zinc-700', barBg: 'bg-zinc-600' }
  if (pct >= 120) return { text: 'text-red-400', bg: 'bg-red-500/20', barBg: 'bg-gradient-to-r from-red-500 to-pink-500', glow: 'shadow-red-500/30' }
  if (pct >= 100) return { text: 'text-orange-400', bg: 'bg-orange-500/20', barBg: 'bg-gradient-to-r from-orange-500 to-amber-500', glow: 'shadow-orange-500/30' }
  if (pct >= 85) return { text: 'text-yellow-400', bg: 'bg-yellow-500/20', barBg: 'bg-gradient-to-r from-yellow-500 to-amber-400' }
  if (pct >= 50) return { text: 'text-cyan-400', bg: 'bg-cyan-500/20', barBg: 'bg-gradient-to-r from-cyan-500 to-blue-500' }
  return { text: 'text-green-400', bg: 'bg-green-500/20', barBg: 'bg-gradient-to-r from-green-500 to-emerald-400' }
}

export default function TicketsTab({ data }) {
  const tickets = data.tickets
  const [search,  setSearch]  = useState('')
  const [status,  setStatus]  = useState('')
  const [sortCol, setSortCol] = useState('hours')
  const [sortAsc, setSortAsc] = useState(false)
  const [expanded, setExpanded] = useState(() => new Set())

  const statuses = useMemo(() =>
    STATUS_ORDER.filter(s => tickets.some(t => t.status === s)),
  [tickets])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return tickets.filter(t =>
      (!status || t.status === status) &&
      (!q || t.key?.toLowerCase().includes(q) || t.summary?.toLowerCase().includes(q) ||
             t.epic_name?.toLowerCase().includes(q))
    )
  }, [tickets, search, status])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      let av = a[sortCol] ?? -1, bv = b[sortCol] ?? -1
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      return sortAsc ? (av < bv ? -1 : 1) : (av > bv ? -1 : 1)
    })
    return arr
  }, [filtered, sortCol, sortAsc])

  const totalH  = useMemo(() => sorted.reduce((s, t) => s + (t.hours || 0), 0), [sorted])
  const totalSP = useMemo(() => sorted.reduce((s, t) => s + (t.sp || 0), 0), [sorted])

  const toggleSort = col => {
    if (sortCol === col) setSortAsc(a => !a)
    else { setSortCol(col); setSortAsc(false) }
  }
  const toggleExpanded = key => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Filters + summary */}
      <div className="card flex flex-wrap gap-3 items-center py-4">
        <div className="relative flex-1 min-w-48">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Suche: Ticket, Summary, Epic..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
          />
        </div>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
        >
          <option value="">Alle Status</option>
          {statuses.map(s => <option key={s}>{s}</option>)}
        </select>
        
        {/* Stats badges */}
        <div className="flex items-center gap-3 ml-auto">
          <StatBadge icon={<TicketIcon />} label="Stories" value={sorted.length} color="blue" />
          <StatBadge icon={<ClockIcon />} label="Gebucht" value={`${Math.round(totalH).toLocaleString('de')}h`} color="pink" />
          <StatBadge icon={<TargetIcon />} label="Estimation" value={`${totalSP}h`} color="green" />
        </div>
      </div>

      {/* Table */}
      <div className="card card-hover p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-zinc-800/70">
                <Th col="key"       label="Ticket"    onClick={toggleSort} sortCol={sortCol} sortAsc={sortAsc} />
                <Th col="summary"   label="Summary"   onClick={toggleSort} sortCol={sortCol} sortAsc={sortAsc} />
                <Th col="status"    label="Status"    onClick={toggleSort} sortCol={sortCol} sortAsc={sortAsc} />
                <Th col="epic_name" label="Epic"      onClick={toggleSort} sortCol={sortCol} sortAsc={sortAsc} />
                <Th col="sp"        label="Est. (h)"  onClick={toggleSort} sortCol={sortCol} sortAsc={sortAsc} align="right" />
                <Th col="hours"     label="Actual (h)" onClick={toggleSort} sortCol={sortCol} sortAsc={sortAsc} align="right" />
                <Th col="pct"       label="Est vs Act" onClick={toggleSort} sortCol={sortCol} sortAsc={sortAsc} align="center" />
                <th className="table-th">Personen</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(t => {
                const pct = t.pct ?? null
                const pctStyle = getPctStyle(pct)
                const hasSubtasks = Array.isArray(t.subtasks) && t.subtasks.length > 0
                const isOpen = expanded.has(t.key)
                return (
                  <Fragment key={t.key}>
                    <tr className="hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 group">
                      <td className="table-td whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {hasSubtasks ? (
                            <button
                              type="button"
                              onClick={() => toggleExpanded(t.key)}
                              className="text-zinc-500 hover:text-blue-400 transition-colors p-0.5 rounded hover:bg-blue-500/10"
                              title={isOpen ? 'Subtasks ausblenden' : 'Subtasks anzeigen'}
                            >
                              <ChevronIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                            </button>
                          ) : <span className="w-5 inline-block" />}
                          <span className="font-mono text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 cursor-pointer transition-colors">
                            {t.key}
                          </span>
                        </div>
                      </td>
                      <td className="table-td text-sm text-zinc-200 max-w-xs" title={t.summary}>
                        <span className="line-clamp-2">{t.summary}</span>
                      </td>
                      <td className="table-td"><StatusBadge status={t.status} /></td>
                      <td className="table-td">
                        {t.epic_name && (
                          <span className="text-xs px-2 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 max-w-[140px] truncate inline-block" title={t.epic_name}>
                            {t.epic_name}
                          </span>
                        )}
                      </td>
                      <td className="table-td text-right">
                        <span className="font-semibold text-sm text-zinc-300">{t.sp ?? '-'}</span>
                      </td>
                      <td className="table-td text-right">
                        <span className="font-semibold text-sm text-zinc-100">{t.hours}</span>
                      </td>
                      <td className="table-td">
                        {pct != null ? (
                          <div className="flex items-center gap-2 justify-center">
                            {/* Progress bar */}
                            <div className="w-16 h-2 bg-zinc-800 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${pctStyle.barBg} transition-all`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            {/* Percentage badge */}
                            <span className={`inline-flex items-center justify-center min-w-[3.5rem] text-xs font-bold px-2 py-1 rounded-lg ${pctStyle.bg} ${pctStyle.text} ${pct >= 100 ? `shadow-lg ${pctStyle.glow}` : ''}`}>
                              {pct >= 120 && <AlertIcon className="w-3 h-3 mr-1" />}
                              {pct}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-600 text-sm">-</span>
                        )}
                      </td>
                      <td className="table-td">
                        <div className="flex flex-wrap gap-1">
                          {(t.assignees || (t.assignee ? [t.assignee] : [])).map((person, idx) => (
                            <span key={idx} className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                              {person}
                            </span>
                          ))}
                          {!t.assignees?.length && !t.assignee && <span className="text-zinc-600">-</span>}
                        </div>
                      </td>
                    </tr>

                    {hasSubtasks && isOpen && (
                      <tr className="bg-zinc-900/50">
                        <td className="table-td py-3" colSpan={8}>
                          <div className="space-y-1 pl-8">
                            {t.subtasks.map(st => (
                              <div key={st.key} className="flex items-center gap-4 text-xs py-2 px-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 transition-colors">
                                <span className="font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                  {st.key}
                                </span>
                                <span className="text-zinc-300 flex-1 truncate">{st.summary}</span>
                                <span className="font-bold text-zinc-100 bg-zinc-700 px-2 py-0.5 rounded">
                                  {st.hours}h
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatBadge({ icon, label, value, color }) {
  const colors = {
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
    pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/20', text: 'text-pink-400' },
    green: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400' },
  }
  const c = colors[color] || colors.blue
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${c.bg} border ${c.border}`}>
      <span className={c.text}>{icon}</span>
      <span className="text-xs text-zinc-400">{label}:</span>
      <span className={`text-sm font-bold ${c.text}`}>{value}</span>
    </div>
  )
}

function Th({ col, label, onClick, sortCol, sortAsc, align = 'left' }) {
  const isActive = sortCol === col
  return (
    <th
      className={`table-th cursor-pointer select-none hover:bg-zinc-700/50 transition-colors ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : ''}`}
      onClick={() => onClick(col)}
    >
      <span className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
        {label}
        <span className={`transition-colors ${isActive ? 'text-blue-400' : 'text-zinc-600'}`}>
          {isActive ? (sortAsc ? <ArrowUpIcon /> : <ArrowDownIcon />) : <ArrowsIcon />}
        </span>
      </span>
    </th>
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

function ChevronIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function ArrowUpIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m18 15-6-6-6 6" />
    </svg>
  )
}

function ArrowDownIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function ArrowsIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" />
    </svg>
  )
}

function TicketIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" />
      <path d="M13 17v2" />
      <path d="M13 11v2" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function TargetIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

function AlertIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}
