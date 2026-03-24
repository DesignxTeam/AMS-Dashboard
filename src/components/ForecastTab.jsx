import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const DE_MONTHS = ['Jan','Feb','Mar','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
const fmt  = n => n?.toLocaleString('de-AT')
const fmtH = n => `${fmt(Math.round(n))}h`
const fmtE = n => `${fmt(Math.round(n))}`
const monthLabel = ym => { try { return DE_MONTHS[parseInt(ym.split('-')[1]) - 1] } catch { return ym } }

const CHART_COLORS = {
  soll: '#27272a',
  ist: '#3b82f6',
  istGradient: ['#3b82f6', '#06b6d4'],
}

export default function ForecastTab({ data }) {
  const { forecast, meta } = data
  const { persons, soll_totals, ist_totals, months } = forecast
  const currM = meta.curr_month

  // KPIs
  const kpis = useMemo(() => {
    const totalIst  = ist_totals[currM] || 0
    const totalSoll = soll_totals[currM] || 0
    const pct       = totalSoll > 0 ? Math.round(totalIst / totalSoll * 100) : 0
    const avgRate   = meta.avg_rate || 92
    return { totalIst, totalSoll, pct, rev: Math.round(totalIst * avgRate) }
  }, [ist_totals, soll_totals, currM, meta])

  // Chart data: bar chart per month
  const chartData = useMemo(() =>
    months.map(m => ({
      month: monthLabel(m),
      Soll: soll_totals[m] || 0,
      Ist:  ist_totals[m]  || 0,
    })),
  [months, soll_totals, ist_totals])

  const pctColor = p => p >= 85 ? 'text-success' : p >= 60 ? 'text-warning' : p > 0 ? 'text-danger' : 'text-muted-foreground'
  const pctGradient = p => p >= 85 ? 'from-success to-accent-cyan' : p >= 60 ? 'from-warning to-accent-orange' : p > 0 ? 'from-danger to-accent-pink' : 'from-muted to-muted'

  return (
    <div className="space-y-5 animate-slide-up">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          label={`Ist ${monthLabel(currM)}`}  
          value={fmtH(kpis.totalIst)}  
          sublabel={`Soll: ${fmtH(kpis.totalSoll)}`}
          icon={<ClockIcon />}
          gradient="from-primary to-accent-cyan"
        />
        <KpiCard 
          label="Auslastung"                  
          value={`${kpis.pct}%`}         
          sublabel="Ist / Soll"
          icon={<GaugeIcon />}
          gradient={pctGradient(kpis.pct)}
          valueColor={pctColor(kpis.pct)}
          progress={Math.min(kpis.pct, 100)}
        />
        <KpiCard 
          label="Umsatz (Ist)"                
          value={fmtE(kpis.rev)}          
          sublabel={`@ ${meta.avg_rate} EUR/h`}
          icon={<EuroIcon />}
          gradient="from-success to-accent-cyan"
          valueColor="text-success"
        />
        <KpiCard 
          label="Team"                        
          value={`${persons.length}`} 
          sublabel="Personen im Projekt"
          icon={<UsersIcon />}
          gradient="from-accent-pink to-accent-orange"
        />
      </div>

      {/* Soll/Ist chart */}
      <div className="card card-hover">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">
              Soll vs. Ist - Stunden pro Monat
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Vergleich geplanter und tatsachlicher Stunden</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-muted"></span>
              Soll
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-primary"></span>
              Ist
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} barCategoryGap="25%" barGap={4}>
            <defs>
              <linearGradient id="istGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12, fill: '#71717a' }} 
              axisLine={{ stroke: '#27272a' }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#71717a' }} 
              axisLine={false}
              tickLine={false}
            />
            <Tooltip 
              formatter={(v) => `${Math.round(v)}h`}
              contentStyle={{ 
                background: '#18181b', 
                border: '1px solid #27272a', 
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
              }}
              labelStyle={{ color: '#fafafa', fontWeight: 'bold' }}
            />
            <Bar dataKey="Soll" fill="#27272a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Ist" fill="url(#istGradient)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Per-person table */}
      <div className="card card-hover p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">
            Auslastung pro Person - {monthLabel(currM)}
          </h2>
          <span className="text-xs text-muted-foreground">{persons.length} Teammitglieder</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr>
                <th className="table-th">Person</th>
                <th className="table-th">Rolle</th>
                {meta.past_months?.map(m => (
                  <th key={m} className="table-th text-right">{monthLabel(m)} Ist</th>
                ))}
                <th className="table-th text-right">{monthLabel(currM)} Ist</th>
                <th className="table-th text-right">{monthLabel(currM)} Soll</th>
                <th className="table-th text-right">%</th>
                {meta.future_months?.map(m => (
                  <th key={m} className="table-th text-right">{monthLabel(m)} Soll</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {persons.map(p => {
                const ist  = p.ist[currM]  || 0
                const soll = p.soll[currM] || 0
                const pct  = soll > 0 ? Math.round(ist / soll * 100) : 0
                return (
                  <tr key={p.name} className="hover:bg-muted/50 transition-colors">
                    <td className="table-td font-medium text-foreground">{p.name}</td>
                    <td className="table-td text-muted-foreground text-xs">{p.role}</td>
                    {meta.past_months?.map(m => (
                      <td key={m} className="table-td text-right text-muted-foreground">{fmtH(p.ist[m] || 0)}</td>
                    ))}
                    <td className="table-td text-right font-semibold text-foreground">{fmtH(ist)}</td>
                    <td className="table-td text-right text-muted-foreground">{fmtH(soll)}</td>
                    <td className="table-td text-right">
                      <PctBar pct={pct} />
                    </td>
                    {meta.future_months?.map(m => (
                      <td key={m} className="table-td text-right text-muted-foreground/60 italic">{fmtH(p.soll[m] || 0)}</td>
                    ))}
                  </tr>
                )
              })}
              {/* Totals row */}
              <tr className="bg-muted/50 font-bold border-t-2 border-border">
                <td className="table-td text-foreground" colSpan={2}>Gesamt</td>
                {meta.past_months?.map(m => (
                  <td key={m} className="table-td text-right text-foreground">{fmtH(ist_totals[m] || 0)}</td>
                ))}
                <td className="table-td text-right text-foreground">{fmtH(ist_totals[currM] || 0)}</td>
                <td className="table-td text-right text-foreground">{fmtH(soll_totals[currM] || 0)}</td>
                <td className="table-td text-right">
                  <PctBar pct={kpis.pct} />
                </td>
                {meta.future_months?.map(m => (
                  <td key={m} className="table-td text-right text-foreground">{fmtH(soll_totals[m] || 0)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, sublabel, icon, gradient, valueColor = 'text-foreground', progress }) {
  return (
    <div className="kpi-card relative overflow-hidden group">
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />
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

function PctBar({ pct }) {
  const gradient = pct >= 85 ? 'from-success to-accent-cyan' : pct >= 60 ? 'from-warning to-accent-orange' : pct > 0 ? 'from-danger to-accent-pink' : 'from-muted to-muted'
  const textColor = pct >= 85 ? 'text-success' : pct >= 60 ? 'text-warning' : pct > 0 ? 'text-danger' : 'text-muted-foreground'
  const w = Math.min(pct, 100)
  
  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${gradient}`} style={{ width: `${w}%` }} />
      </div>
      <span className={`text-xs font-bold w-10 text-right ${textColor}`}>{pct}%</span>
    </div>
  )
}

// Icons
function ClockIcon() {
  return (
    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
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

function EuroIcon() {
  return (
    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10h12" />
      <path d="M4 14h9" />
      <path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
