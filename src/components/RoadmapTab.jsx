import { useState, useMemo } from 'react'
import StatusBadge from './StatusBadge'

const SPRINT_LABELS = { S0:'Sprint 0', S1:'Sprint 1', S2:'Sprint 2', S3:'Sprint 3', S4:'Sprint 4', S5:'Sprint 5', S6:'Sprint 6' }
const SPRINT_ORDER  = ['S0','S1','S2','S3','S4','S5','S6']

export default function RoadmapTab({ data }) {
  const epics = data.roadmap
  const meta  = data.meta
  const [expandedSprints, setExpandedSprints] = useState({})
  const [expandedEpics, setExpandedEpics] = useState({})
  const [statusFilter, setStatusFilter]   = useState('')

  const toggleSprint = sprintKey =>
    setExpandedSprints(p => ({ ...p, [sprintKey]: !(p[sprintKey] ?? true) }))

  const toggleEpic = (sprintKey, epicKey) =>
    setExpandedEpics(p => {
      const id = `${sprintKey}::${epicKey || '__no_epic__'}`
      return { ...p, [id]: !(p[id] ?? true) }
    })

  const allStories = useMemo(() => epics.flatMap(e => e.stories), [epics])
  const statusCounts = useMemo(() => {
    const counts = {}
    allStories.forEach(s => { counts[s.status] = (counts[s.status] || 0) + 1 })
    return counts
  }, [allStories])

  const filteredStories = useMemo(
    () => (statusFilter ? allStories.filter(s => s.status === statusFilter) : allStories),
    [allStories, statusFilter]
  )

  // Sprint progress overview
  const sprintCounts = useMemo(() => {
    const counts = {}
    filteredStories.forEach(s => {
      if (s.sprint) {
        if (!counts[s.sprint]) counts[s.sprint] = { total: 0, done: 0, est: 0 }
        counts[s.sprint].total++
        if (s.status === 'Done') { counts[s.sprint].done++; counts[s.sprint].est += (s.sp || 0) }
      }
    })
    return counts
  }, [filteredStories])

  // Build sprint -> epic groups for UX: first select sprint, then inspect epics.
  const sprintGroups = useMemo(() => {
    const bySprint = {}
    SPRINT_ORDER.forEach(sk => { bySprint[sk] = { sprint: sk, epics: {}, total: 0, done: 0, hours: 0 } })

    const epicLookup = {}
    epics.forEach(e => {
      const id = e.key || '__no_epic__'
      epicLookup[id] = e
    })

    filteredStories.forEach(story => {
      if (!story.sprint || !bySprint[story.sprint]) return

      const epicId = story.epic_key || '__no_epic__'
      const epicMeta = epicLookup[epicId] || { key: '', summary: 'Kein Epic' }
      if (!bySprint[story.sprint].epics[epicId]) {
        bySprint[story.sprint].epics[epicId] = {
          key: epicMeta.key || '',
          summary: epicMeta.summary || 'Kein Epic',
          stories: [],
          done: 0,
          hours: 0,
        }
      }
      bySprint[story.sprint].epics[epicId].stories.push(story)
      bySprint[story.sprint].epics[epicId].hours += (story.hours || 0)
      if (story.status === 'Done') bySprint[story.sprint].epics[epicId].done += 1

      bySprint[story.sprint].total += 1
      bySprint[story.sprint].hours += (story.hours || 0)
      if (story.status === 'Done') bySprint[story.sprint].done += 1
    })

    return SPRINT_ORDER
      .map(sk => {
        const g = bySprint[sk]
        const epicList = Object.values(g.epics).sort((a, b) => (b.hours - a.hours) || a.summary.localeCompare(b.summary))
        return { ...g, epicList }
      })
      .filter(g => g.total > 0)
  }, [epics, filteredStories])

  return (
    <div className="space-y-5">
      {/* Sprint overview strip */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {SPRINT_ORDER.map(sk => {
          const sc = sprintCounts[sk] || { total: 0, done: 0, est: 0 }
          const isCurrent = sk === meta.current_sprint
          const pct = sc.total > 0 ? Math.round(sc.done / sc.total * 100) : 0
          return (
            <div
              key={sk}
              className={`rounded-xl p-3 text-center border ${
                isCurrent
                  ? 'bg-navy-700 text-white border-navy-700 shadow-md'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className={`text-xs font-bold ${isCurrent ? 'text-white' : 'text-slate-500'}`}>
                {SPRINT_LABELS[sk]} {isCurrent && '▶'}
              </div>
              <div className={`text-lg font-extrabold ${isCurrent ? 'text-white' : 'text-slate-800'}`}>
                {sc.done}/{sc.total}
              </div>
              <div className={`text-xs ${isCurrent ? 'text-white/70' : 'text-slate-400'}`}>
                {sc.est > 0 ? `${sc.est}h est.` : '–'}
              </div>
              {sc.total > 0 && (
                <div className="mt-1.5 h-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: isCurrent ? '#60a5fa' : '#1e3a5f',
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Status filter */}
      <div className="card py-3 flex flex-wrap gap-2 items-center">
        <span className="text-xs font-semibold text-slate-500 uppercase">Filter:</span>
        <button
          onClick={() => setStatusFilter('')}
          className={`text-xs px-3 py-1 rounded-full border transition-all ${!statusFilter ? 'bg-navy-700 text-white border-navy-700' : 'border-slate-300 text-slate-600 hover:border-navy-700'}`}
        >
          Alle ({allStories.length})
        </button>
        {Object.entries(statusCounts).sort((a,b) => b[1]-a[1]).map(([s, n]) => (
          <button
            key={s}
            onClick={() => setStatusFilter(sf => sf === s ? '' : s)}
            className={`text-xs px-3 py-1 rounded-full border transition-all ${statusFilter === s ? 'bg-navy-700 text-white border-navy-700' : 'border-slate-300 text-slate-600 hover:border-navy-700'}`}
          >
            {s} ({n})
          </button>
        ))}
      </div>

      {/* Sprint-first roadmap */}
      <div className="space-y-3">
        {sprintGroups.map(group => {
          const sprintLabel = SPRINT_LABELS[group.sprint] || group.sprint
          const sprintOpen = expandedSprints[group.sprint] ?? true
          const sprintDonePct = group.total > 0 ? Math.round(group.done / group.total * 100) : 0

          return (
            <div key={group.sprint} className="card p-0 overflow-hidden">
              <button
                onClick={() => toggleSprint(group.sprint)}
                className="w-full flex items-center justify-between px-5 py-3 bg-slate-100 hover:bg-slate-200 transition-colors text-left border-b border-slate-200"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-800">{sprintLabel}</span>
                  {group.sprint === meta.current_sprint && (
                    <span className="text-[10px] bg-navy-700 text-white px-1.5 py-0.5 rounded">aktuell</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-600">
                  <span>{group.done}/{group.total} done ({sprintDonePct}%)</span>
                  <span>{Math.round(group.hours)}h</span>
                  <span>{sprintOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {sprintOpen && (
                <div className="space-y-2 p-3 bg-white">
                  {group.epicList.map(epic => {
                    const epicOpen = expandedEpics[`${group.sprint}::${epic.key || '__no_epic__'}`] ?? true
                    return (
                      <div key={`${group.sprint}-${epic.key || '__no_epic__'}`} className="border border-slate-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleEpic(group.sprint, epic.key)}
                          className="w-full flex items-center justify-between px-4 py-2.5 bg-navy-700 text-white hover:bg-navy-800 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-sm truncate">{epic.summary || 'Kein Epic'}</span>
                            {epic.key && <span className="text-white/60 text-[11px] font-mono">{epic.key}</span>}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-white/80 shrink-0">
                            <span>{epic.done}/{epic.stories.length} done</span>
                            <span>{Math.round(epic.hours)}h</span>
                            <span>{epicOpen ? '▲' : '▼'}</span>
                          </div>
                        </button>

                        {epicOpen && (
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[700px]">
                              <thead>
                                <tr>
                                  <th className="table-th">Ticket</th>
                                  <th className="table-th">Summary</th>
                                  <th className="table-th">Status</th>
                                  <th className="table-th text-right">Estimation (h)</th>
                                  <th className="table-th text-right">Actual (h)</th>
                                  <th className="table-th">Assignee</th>
                                </tr>
                              </thead>
                              <tbody>
                                {epic.stories.map(s => (
                                  <tr key={s.key} className="hover:bg-slate-50 transition-colors">
                                    <td className="table-td font-mono text-xs text-blue-600 whitespace-nowrap">{s.key}</td>
                                    <td className="table-td text-sm max-w-xs">
                                      <span className="line-clamp-2" title={s.summary}>{s.summary}</span>
                                    </td>
                                    <td className="table-td"><StatusBadge status={s.status} /></td>
                                    <td className="table-td text-right text-sm font-semibold">{s.sp ?? '–'}</td>
                                    <td className="table-td text-right text-sm font-semibold">{s.hours || 0}</td>
                                    <td className="table-td text-xs text-slate-500">{s.assignee || '–'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
