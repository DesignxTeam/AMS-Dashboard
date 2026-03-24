import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend, Cell
} from 'recharts'

const CHART_COLORS = {
  primary: '#3b82f6',
  cyan: '#06b6d4',
  green: '#22c55e',
  orange: '#f97316',
  pink: '#ec4899',
}

export default function SprintHealthTab({ data }) {
  const { sprint_health, meta } = data
  const { sprints, velocity, total_done, total_in_progress } = sprint_health
  const currentKey = meta.current_sprint

  const currentSprint = sprints.find(s => s.key === currentKey)

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
    <div className="space-y-5 animate-slide-up">
      {/* KPI cards with gradient accents */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          label="Velocity" 
          sublabel="Avg Stories/Sprint"
          value={velocity} 
          icon={<TrendingUpIcon />}
          gradient="from-primary to-accent-cyan"
        />
        <KpiCard 
          label="Done" 
          sublabel="Stories completed"
          value={total_done} 
          icon={<CheckCircleIcon />}
          gradient="from-success to-accent-cyan"
          valueColor="text-success"
        />
        <KpiCard 
          label="In Progress" 
          sublabel="Stories active"
          value={total_in_progress} 
          icon={<PlayCircleIcon />}
          gradient="from-primary to-accent-pink"
          valueColor="text-primary"
        />
        <KpiCard 
          label={currentSprint?.name || currentKey}
          sublabel={`${currDone} / ${currTotal} Done`}
          value={`${currPct}%`}
          icon={<GaugeIcon />}
          gradient={currPct >= 75 ? 'from-success to-accent-cyan' : currPct >= 40 ? 'from-warning to-accent-orange' : 'from-danger to-accent-pink'}
          valueColor={currPct >= 75 ? 'text-success' : currPct >= 40 ? 'text-warning' : 'text-danger'}
          progress={currPct}
        />
      </div>

      {/* Velocity chart */}
      <div className="card card-hover">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">
              Done Count (Stories) pro Sprint
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Velocity-Trend uber alle Sprints</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-3 h-3 rounded bg-primary"></span>
            <span>Done</span>
            <span className="w-3 h-0.5 bg-warning ml-2"></span>
            <span>Avg Velocity</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={velocityData} barCategoryGap="25%">
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.primary} />
                <stop offset="100%" stopColor={CHART_COLORS.cyan} />
              </linearGradient>
              <linearGradient id="barGradientCurrent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.pink} />
                <stop offset="100%" stopColor={CHART_COLORS.orange} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 11, fill: '#71717a' }} 
              axisLine={{ stroke: '#27272a' }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#71717a' }} 
              axisLine={false}
              tickLine={false}
            />
            <Tooltip 
              contentStyle={{ 
                background: '#18181b', 
                border: '1px solid #27272a', 
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
              }}
              labelStyle={{ color: '#fafafa', fontWeight: 'bold' }}
              itemStyle={{ color: '#71717a' }}
            />
            {velocity > 0 && (
              <ReferenceLine 
                y={velocity} 
                stroke={CHART_COLORS.orange} 
                strokeDasharray="5 3"
                strokeWidth={2}
                label={{ 
                  value: `Avg ${velocity}`, 
                  position:'insideTopRight', 
                  fontSize: 11, 
                  fill: CHART_COLORS.orange,
                  fontWeight: 'bold'
                }} 
              />
            )}
            <Bar 
              dataKey="done" 
              name="Done (Stories)" 
              radius={[6, 6, 0, 0]}
              label={{ position: 'top', fontSize: 11, fill: '#71717a', fontWeight: 'bold' }}
            >
              {velocityData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.isCurrent ? 'url(#barGradientCurrent)' : 'url(#barGradient)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Sprint detail table */}
      <div className="card card-hover p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Sprint-Ubersicht</h2>
          <span className="text-xs text-muted-foreground">{sprints.length} Sprints</span>
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
                    className={`transition-colors ${isCurrent ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                  >
                    <td className="table-td font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        {s.name}
                        {isCurrent && (
                          <span className="text-[10px] bg-gradient-to-r from-primary to-accent-cyan text-white px-2 py-0.5 rounded-full font-bold">
                            AKTUELL
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-td text-xs text-muted-foreground">{s.dates}</td>
                    <td className="table-td text-right text-foreground">{s.total}</td>
                    <td className="table-td text-right font-semibold text-success">{s.done}</td>
                    <td className="table-td text-right text-primary">{s.in_progress}</td>
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

function KpiCard({ label, sublabel, value, icon, gradient, valueColor = 'text-foreground', progress }) {
  return (
    <div className="kpi-card relative overflow-hidden group">
      {/* Gradient accent line */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />
      
      {/* Icon background */}
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} opacity-10 group-hover:opacity-20 transition-opacity`} />
      
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
            <p className={`text-3xl font-extrabold mt-2 ${valueColor}`}>{value}</p>
            {sublabel && <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center opacity-80`}>
            {icon}
          </div>
        </div>
        
        {/* Mini progress bar if provided */}
        {progress !== undefined && (
          <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-500`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function ProgressBar({ pct }) {
  const gradient = pct >= 80 ? 'from-success to-accent-cyan' : pct >= 50 ? 'from-warning to-accent-orange' : pct > 0 ? 'from-danger to-accent-pink' : 'from-muted to-muted'
  const textColor = pct >= 80 ? 'text-success' : pct >= 50 ? 'text-warning' : pct > 0 ? 'text-danger' : 'text-muted-foreground'
  
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[120px]">
        <div 
          className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-500`} 
          style={{ width: `${pct}%` }} 
        />
      </div>
      <span className={`text-xs font-bold w-10 ${textColor}`}>{pct}%</span>
    </div>
  )
}

// Icons
function TrendingUpIcon() {
  return (
    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function PlayCircleIcon() {
  return (
    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
    </svg>
  )
}

function GaugeIcon() {
  return (
    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 14 4-4" />
      <path d="M3.34 19a10 10 0 1 1 17.32 0" />
    </svg>
  )
}
