import { Fragment, useState, useMemo } from 'react'
import StatusBadge from './StatusBadge'

const pctColor = p => p >= 100 ? '#dc2626' : p >= 85 ? '#d97706' : p >= 0 ? '#16a34a' : '#cbd5e1'

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
  const SortIcon = ({ col }) => sortCol === col
    ? <span className="ml-1 text-navy-700">{sortAsc ? '↑' : '↓'}</span>
    : <span className="ml-1 text-slate-300">↕</span>

  return (
    <div className="space-y-4">
      {/* Filters + summary */}
      <div className="card flex flex-wrap gap-3 items-center py-3">
        <input
          type="text"
          placeholder="Suche: Ticket, Summary, Epic…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-700/30 flex-1 min-w-48"
        />
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-700/30"
        >
          <option value="">Alle Status</option>
          {statuses.map(s => <option key={s}>{s}</option>)}
        </select>
        <span className="text-sm text-slate-500 ml-auto">
          <b className="text-slate-700">{sorted.length}</b> Stories ·{' '}
          <b className="text-slate-700">{Math.round(totalH).toLocaleString('de')}h</b> gebucht ·{' '}
          <b className="text-slate-700">{totalSP}</b> Estimation (h)
        </span>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr>
                <Th col="key"       label="Ticket"    onClick={toggleSort} sortCol={sortCol} sortAsc={sortAsc} />
                <Th col="summary"   label="Summary"   onClick={toggleSort} sortCol={sortCol} sortAsc={sortAsc} />
                <Th col="status"    label="Status"    onClick={toggleSort} sortCol={sortCol} sortAsc={sortAsc} />
                <Th col="epic_name" label="Epic"      onClick={toggleSort} sortCol={sortCol} sortAsc={sortAsc} />
                <Th col="sp"        label="Estimation (h)" onClick={toggleSort} sortCol={sortCol} sortAsc={sortAsc} align="right" />
                <Th col="hours"     label="Actual (h)"     onClick={toggleSort} sortCol={sortCol} sortAsc={sortAsc} align="right" />
                <Th col="pct"       label="Est vs. Actual" onClick={toggleSort} sortCol={sortCol} sortAsc={sortAsc} align="right" />
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
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="table-td font-mono text-xs text-blue-600 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {hasSubtasks ? (
                            <button
                              type="button"
                              onClick={() => toggleExpanded(t.key)}
                              className="text-slate-500 hover:text-slate-700 text-xs"
                              title={isOpen ? 'Subtasks ausblenden' : 'Subtasks anzeigen'}
                            >
                              {isOpen ? '▼' : '▶'}
                            </button>
                          ) : <span className="w-3 inline-block" />}
                          <span>{t.key}</span>
                        </div>
                      </td>
                      <td className="table-td text-sm max-w-xs" title={t.summary}>
                        <span className="line-clamp-2">{t.summary}</span>
                      </td>
                      <td className="table-td"><StatusBadge status={t.status} /></td>
                      <td className="table-td text-xs text-slate-500 max-w-[140px] truncate" title={t.epic_name}>
                        {t.epic_name}
                      </td>
                      <td className="table-td text-right font-semibold text-sm">{t.sp ?? '–'}</td>
                      <td className="table-td text-right font-semibold text-sm">{t.hours}</td>
                      <td className="table-td text-right">
                        {t.pct != null ? (
                          <span className="font-bold text-sm" style={{ color: pctColor(pct) }}>
                            {pct}%
                          </span>
                        ) : '–'}
                      </td>
                      <td className="table-td text-xs text-slate-500">
                        {t.assignees?.join(', ') || t.assignee || '–'}
                      </td>
                    </tr>

                    {hasSubtasks && isOpen && (
                      <tr className="bg-slate-50/70">
                        <td className="table-td" colSpan={8}>
                          <div className="space-y-1">
                            {t.subtasks.map(st => (
                              <div key={st.key} className="flex items-center justify-between text-xs text-slate-600">
                                <div className="min-w-0 pr-3">
                                  <span className="font-mono text-blue-600">{st.key}</span>
                                  {' · '}
                                  <span className="text-slate-700">{st.summary}</span>
                                </div>
                                <div className="whitespace-nowrap font-semibold">{st.hours}h</div>
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

function Th({ col, label, onClick, sortCol, sortAsc, align = 'left' }) {
  return (
    <th
      className={`table-th cursor-pointer select-none hover:bg-slate-100 ${align === 'right' ? 'text-right' : ''}`}
      onClick={() => onClick(col)}
    >
      {label}
      {sortCol === col
        ? <span className="ml-1 text-navy-700">{sortAsc ? '↑' : '↓'}</span>
        : <span className="ml-1 text-slate-300">↕</span>
      }
    </th>
  )
}
