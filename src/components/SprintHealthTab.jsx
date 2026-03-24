import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend
} from 'recharts'

export default function SprintHealthTab({ data }) {
  const { sprint_health, meta } = data
  const { sprints, velocity, total_done, total_in_progress } = sprint_health
  const currentKey = meta.current_sprint

  const currentSprint   = sprints.find(s => s.key === currentKey)

  // Chart: velocity (done stories per sprint)
  const velocityData = sprints.map(s => ({
    name: s.name,
    done: s.done,
    isCurrent: s.key === currentKey,
  }))

  // Completion gauge for current sprint
  const currDone  = currentSprint?.done  || 0
  const currTotal = currentSprint?.total || 0
  const currPct   = currTotal > 0 ? Math.round(currDone / currTotal * 100) : 0

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Velocity (Ø Stories/Sprint)" value={velocity} sub="Abgeschlossene Sprints" />
        <KpiCard label="Done (gesamt)"                value={total_done} sub="Stories abgeschlossen" color="#16a34a" />
        <KpiCard label="In Progress"                  value={total_in_progress} sub="Stories in Arbeit" color="#2563eb" />
        <KpiCard label={`${currentSprint?.name || currentKey} Fortschritt`}
                 value={`${currPct}%`}
                 sub={`${currDone} / ${currTotal} Done`}
                 color={currPct >= 75 ? '#16a34a' : currPct >= 40 ? '#d97706' : '#ef4444'} />
      </div>

      {/* Velocity chart */}
      <div className="card">
        <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-4">
          Done Count (Stories) pro Sprint
        </h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={velocityData} barCategoryGap="35%">
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {velocity > 0 && (
              <ReferenceLine y={velocity} stroke="#d97706" strokeDasharray="5 3"
                label={{ value: `Velocity Ø ${velocity}`, position:'insideTopRight', fontSize:11, fill:'#d97706'}} />
            )}
            <Bar dataKey="done" name="Done (Stories)" fill="#1e3a5f" radius={[3,3,0,0]}
              label={{ position: 'top', fontSize: 11 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Sprint detail table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wide">Sprint-Übersicht</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">Sprint</th>
                <th className="table-th">Zeitraum</th>
                <th className="table-th text-right">Total</th>
                <th className="table-th text-right">Done</th>
                <th className="table-th text-right">In Progress</th>
                <th className="table-th">Fortschritt</th>
              </tr>
            </thead>
            <tbody>
              {sprints.map(s => {
                const pct = s.total > 0 ? Math.round(s.done / s.total * 100) : 0
                const isCurrent = s.key === currentKey
                return (
                  <tr
                    key={s.key}
                    className={`transition-colors ${isCurrent ? 'bg-navy-50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="table-td font-semibold">
                      {s.name}
                      {isCurrent && (
                        <span className="ml-2 text-xs bg-navy-700 text-white px-1.5 py-0.5 rounded">aktuell</span>
                      )}
                    </td>
                    <td className="table-td text-xs text-slate-500">{s.dates}</td>
                    <td className="table-td text-right">{s.total}</td>
                    <td className="table-td text-right font-semibold text-green-700">{s.done}</td>
                    <td className="table-td text-right text-blue-600">{s.in_progress}</td>
                    <td className="table-td">
                      <ProgressBar pct={pct} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, color }) {
  return (
    <div className="kpi-card">
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-extrabold mt-1" style={color ? { color } : undefined}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function ProgressBar({ pct }) {
  const col = pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : pct > 0 ? '#ef4444' : '#cbd5e1'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden max-w-[120px]">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: col }} />
      </div>
      <span className="text-xs font-semibold w-8" style={{ color: col }}>{pct}%</span>
    </div>
  )
}
