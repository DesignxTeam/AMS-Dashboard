import { Fragment, useState, useMemo } from 'react'
import StatusBadge from './StatusBadge'

const pctColor = p => p >= 100 ? 'text-danger' : p >= 85 ? 'text-warning' : p >= 0 ? 'text-success' : 'text-muted-foreground'

const STATUS_ORDER = [
  'In Progress', 'Selected for Development', 'Acuity QA', 'Acuity Approval',
  'DESIGN APPROVAL', 'Design Todo', 'Done', 'Closed', 'Post MVP', 'Backlog',
]

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
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Suche: Ticket, Summary, Epic..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-muted border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </div>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="bg-muted border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        >
          <option value="">Alle Status</option>
          {statuses.map(s => <option key={s}>{s}</option>)}
        </select>
        
        {/* Stats badges */}
        <div className="flex items-center gap-3 ml-auto">
          <StatBadge label="Stories" value={sorted.length} gradient="from-primary to-accent-cyan" />
          <StatBadge label="Gebucht" value={`${Math.round(totalH).toLocaleString('de')}h`} gradient="from-accent-pink to-accent-orange" />
          <StatBadge label="Estimation" value={`${totalSP}h`} gradient="from-success to-accent-cyan" />
        </div>
      </div>

      {/* Table */}
      <div className="card card-hover p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr>
                <Th col="key"       label="Ticket"    onClick={toggleSort} sortCol={sortCol} sortAsc={sortAsc} />
                <Th col="summary"   label="Summary"   onClick={toggleSort} sortCol={sortCol} sortAsc={sortAsc} />
                <Th col="status"    label="Status"    onClick={toggleSort} sortCol={sortCol} sortAsc={sortAsc} />
                <Th col="epic_name" label="Epic"      onClick={toggleSort} sortCol={sortCol} sortAsc={sortAsc} />
                <Th col="sp"        label="Est. (h)"  onClick={toggleSort} sortCol={sortCol} sortAsc={sortAsc} align="right" />
                <Th col="hours"     label="Actual (h)" onClick={toggleSort} sortCol={sortCol} sortAsc={sortAsc} align="right" />
                <Th col="pct"       label="Est vs Act" onClick={toggleSort} sortCol={sortCol} sortAsc={sortAsc} align="right" />
                <th className="table-th">Personen</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(t => {
                const pct = t.pct ?? 0
                const hasSubtasks = Array.isArray(t.subtasks) && t.subtasks.length > 0
                const isOpen = expanded.has(t.key)
                return (
                  <Fragment key={t.key}>
                    <tr className="hover:bg-muted/50 transition-colors">
                      <td className="table-td font-mono text-xs text-primary whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {hasSubtasks ? (
                            <button
                              type="button"
                              onClick={() => toggleExpanded(t.key)}
                              className="text-muted-foreground hover:text-primary transition-colors"
                              title={isOpen ? 'Subtasks ausblenden' : 'Subtasks anzeigen'}
                            >
                              <ChevronIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                            </button>
                          ) : <span className="w-4 inline-block" />}
                          <span className="hover:underline cursor-pointer">{t.key}</span>
                        </div>
                      </td>
                      <td className="table-td text-sm text-foreground max-w-xs" title={t.summary}>
                        <span className="line-clamp-2">{t.summary}</span>
                      </td>
                      <td className="table-td"><StatusBadge status={t.status} /></td>
                      <td className="table-td text-xs text-muted-foreground max-w-[140px] truncate" title={t.epic_name}>
                        {t.epic_name}
                      </td>
                      <td className="table-td text-right font-semibold text-sm text-foreground">{t.sp ?? '-'}</td>
                      <td className="table-td text-right font-semibold text-sm text-foreground">{t.hours}</td>
                      <td className="table-td text-right">
                        {t.pct != null ? (
                          <span className={`font-bold text-sm ${pctColor(pct)}`}>
                            {pct}%
                          </span>
                        ) : '-'}
                      </td>
                      <td className="table-td text-xs text-muted-foreground">
                        {t.assignees?.join(', ') || t.assignee || '-'}
                      </td>
                    </tr>

                    {hasSubtasks && isOpen && (
                      <tr className="bg-muted/30">
                        <td className="table-td" colSpan={8}>
                          <div className="space-y-1 pl-6">
                            {t.subtasks.map(st => (
                              <div key={st.key} className="flex items-center justify-between text-xs py-1 border-l-2 border-primary/30 pl-3">
                                <div className="min-w-0 pr-3 flex items-center gap-2">
                                  <span className="font-mono text-primary">{st.key}</span>
                                  <span className="text-muted-foreground">|</span>
                                  <span className="text-foreground">{st.summary}</span>
                                </div>
                                <div className="whitespace-nowrap font-semibold text-foreground">{st.hours}h</div>
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

function StatBadge({ label, value, gradient }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg border border-border">
      <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${gradient}`} />
      <span className="text-xs text-muted-foreground">{label}:</span>
      <span className="text-sm font-bold text-foreground">{value}</span>
    </div>
  )
}

function Th({ col, label, onClick, sortCol, sortAsc, align = 'left' }) {
  const isActive = sortCol === col
  return (
    <th
      className={`table-th cursor-pointer select-none hover:bg-muted transition-colors ${align === 'right' ? 'text-right' : ''}`}
      onClick={() => onClick(col)}
    >
      <span className="flex items-center gap-1 justify-start">
        {align === 'right' && <span className="flex-1" />}
        {label}
        <span className={`transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
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
