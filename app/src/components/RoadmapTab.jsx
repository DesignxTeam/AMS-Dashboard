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
      const sp = (s.status === 'Done' && s.done_sprint) ? s.done_sprint : s.sprint
      if (sp) {
        if (!counts[sp]) counts[sp] = { total: 0, done: 0, est: 0 }
        counts[sp].total++
        if (s.status === 'Done') { counts[sp].done++; counts[sp].est += (s.sp || 0) }
      }
    })
    return counts
  }, [filteredStories])

  // Build sprint -> epic groups
  const sprintGroups = useMemo(() => {
    const bySprint = {}
    SPRINT_ORDER.forEach(sk => { bySprint[sk] = { sprint: sk, epics: {}, total: 0, done: 0, hours: 0 } })

    const epicLookup = {}
    epics.forEach(e => {
      const id = e.key || '__no_epic__'
      epicLookup[id] = e
    })

    filteredStories.forEach(story => {
      const sp = (story.status === 'Done' && story.done_sprint) ? story.done_sprint : story.sprint
      if (!sp || !bySprint[sp]) return

      const epicId = story.epic_key || '__no_epic__'
      const epicMeta = epicLookup[epicId] || { key: '', summary: 'Kein Epic' }
      if (!bySprint[sp].epics[epicId]) {
        bySprint[sp].epics[epicId] = {
          key: epicMeta.key || '',
          summary: epicMeta.summary || 'Kein Epic',
          stories: [],
          done: 0,
          hours: 0,
        }
      }
      bySprint[sp].epics[epicId].stories.push(story)
      bySprint[sp].epics[epicId].hours += (story.hours || 0)
      if (story.status === 'Done') bySprint[sp].epics[epicId].done += 1

      bySprint[sp].total += 1
      bySprint[sp].hours += (story.hours || 0)
      if (story.status === 'Done') bySprint[sp].done += 1
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
    <div className="space-y-5 animate-slide-up">
      {/* Sprint overview strip */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {SPRINT_ORDER.map(sk => {
          const sc = sprintCounts[sk] || { total: 0, done: 0, est: 0 }
          const isCurrent = sk === meta.current_sprint
          const pct = sc.total > 0 ? Math.round(sc.done / sc.total * 100) : 0
          return (
            <div
              key={sk}
              className={`rounded-xl p-3 text-center border transition-all duration-300 ${
                isCurrent
                  ? 'bg-gradient-to-br from-primary/20 to-accent-cyan/20 border-primary shadow-glow'
                  : 'bg-card border-border hover:border-primary/50'
              }`}
            >
              <div className={`text-xs font-bold ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                {SPRINT_LABELS[sk]}
                {isCurrent && <span className="ml-1 inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />}
              </div>
              <div className={`text-lg font-extrabold mt-1 ${isCurrent ? 'text-foreground' : 'text-foreground'}`}>
                {sc.done}/{sc.total}
              </div>
              <div className={`text-xs ${isCurrent ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                {sc.est > 0 ? `${sc.est}h est.` : '-'}
              </div>
              {sc.total > 0 && (
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background: isCurrent 
                        ? 'linear-gradient(90deg, #3b82f6, #06b6d4)' 
                        : pct >= 80 ? '#22c55e' : pct >= 50 ? '#eab308' : '#ef4444',
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
        <span className="text-xs font-semibold text-muted-foreground uppercase mr-2">Filter:</span>
        <button
          onClick={() => setStatusFilter('')}
          className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
            !statusFilter 
              ? 'bg-primary text-primary-foreground border-primary shadow-glow' 
              : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
          }`}
        >
          Alle ({allStories.length})
        </button>
        {Object.entries(statusCounts).sort((a,b) => b[1]-a[1]).map(([s, n]) => (
          <button
            key={s}
            onClick={() => setStatusFilter(sf => sf === s ? '' : s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              statusFilter === s 
                ? 'bg-primary text-primary-foreground border-primary shadow-glow' 
                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
            }`}
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
          const isCurrent = group.sprint === meta.current_sprint

          return (
            <div key={group.sprint} className="card card-hover p-0 overflow-hidden">
              <button
                onClick={() => toggleSprint(group.sprint)}
                className={`w-full flex items-center justify-between px-5 py-4 transition-colors text-left border-b border-border ${
                  isCurrent ? 'bg-primary/10' : 'bg-muted/30 hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ChevronIcon className={`w-5 h-5 text-muted-foreground transition-transform ${sprintOpen ? 'rotate-90' : ''}`} />
                  <span className="font-bold text-foreground">{sprintLabel}</span>
                  {isCurrent && (
                    <span className="text-[10px] bg-gradient-to-r from-primary to-accent-cyan text-white px-2 py-0.5 rounded-full font-bold">
                      AKTUELL
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-muted-foreground">
                    <span className="text-success font-bold">{group.done}</span>/{group.total} done
                  </span>
                  <span className="px-2 py-0.5 rounded bg-muted text-foreground font-semibold">{sprintDonePct}%</span>
                  <span className="text-muted-foreground">{Math.round(group.hours)}h</span>
                </div>
              </button>

              {sprintOpen && (
                <div className="space-y-2 p-3">
                  {group.epicList.map(epic => {
                    const epicOpen = expandedEpics[`${group.sprint}::${epic.key || '__no_epic__'}`] ?? true
                    const epicPct = epic.stories.length > 0 ? Math.round(epic.done / epic.stories.length * 100) : 0
                    
                    return (
                      <div key={`${group.sprint}-${epic.key || '__no_epic__'}`} className="border border-border rounded-xl overflow-hidden">
                        <button
                          onClick={() => toggleEpic(group.sprint, epic.key)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-muted to-muted/50 hover:from-muted/80 hover:to-muted/30 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <ChevronIcon className={`w-4 h-4 text-muted-foreground transition-transform ${epicOpen ? 'rotate-90' : ''}`} />
                            <div className="w-1 h-6 rounded-full bg-gradient-to-b from-primary to-accent-cyan" />
                            <span className="font-semibold text-sm text-foreground truncate">{epic.summary || 'Kein Epic'}</span>
                            {epic.key && <span className="text-muted-foreground text-[11px] font-mono">{epic.key}</span>}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] shrink-0">
                            <span className="text-muted-foreground">
                              <span className="text-success font-bold">{epic.done}</span>/{epic.stories.length}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-card text-foreground font-semibold">{epicPct}%</span>
                            <span className="text-muted-foreground">{Math.round(epic.hours)}h</span>
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
                                  <th className="table-th text-right">Est. (h)</th>
                                  <th className="table-th text-right">Actual (h)</th>
                                  <th className="table-th">Assignee</th>
                                </tr>
                              </thead>
                              <tbody>
                                {epic.stories.map(s => (
                                  <tr key={s.key} className="hover:bg-muted/50 transition-colors">
                                    <td className="table-td font-mono text-xs text-primary whitespace-nowrap hover:underline cursor-pointer">{s.key}</td>
                                    <td className="table-td text-sm text-foreground max-w-xs">
                                      <span className="line-clamp-2" title={s.summary}>{s.summary}</span>
                                    </td>
                                    <td className="table-td"><StatusBadge status={s.status} /></td>
                                    <td className="table-td text-right text-sm font-semibold text-foreground">{s.sp ?? '-'}</td>
                                    <td className="table-td text-right text-sm font-semibold text-foreground">{s.hours || 0}</td>
                                    <td className="table-td text-xs text-muted-foreground">{s.assignee || '-'}</td>
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

function ChevronIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}
