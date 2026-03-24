import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const DE_MONTHS = ['Jan','Feb','Mar','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
const fmt  = n => n?.toLocaleString('de-AT')
const fmtH = n => `${fmt(Math.round(n))}h`
const fmtE = n => `${fmt(Math.round(n))}`
const monthLabel = ym => { try { return DE_MONTHS[parseInt(ym.split('-')[1]) - 1] } catch { return ym } }

// Custom tooltip component
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow-2xl min-w-[160px]">
      <p className="text-sm font-bold text-zinc-100 mb-3 pb-2 border-b border-zinc-700">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center justify-between gap-4 py-1">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded" 
              style={{ 
                background: entry.dataKey === 'Ist' 
                  ? 'linear-gradient(to bottom, #3b82f6, #06b6d4)' 
                  : '#3f3f46' 
              }} 
            />
            <span className="text-zinc-400 text-sm">{entry.dataKey}</span>
          </div>
          <span className="text-zinc-100 font-bold">{Math.round(entry.value)}h</span>
        </div>
      ))}
    </div>
  )
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

  const pctColor = p => p >= 85 ? 'text-green-400' : p >= 60 ? 'text-yellow-400' : p > 0 ? 'text-red-400' : 'text-zinc-500'
  const pctGradient = p => p >= 85 ? 'from-green-500 to-cyan-500' : p >= 60 ? 'from-yellow-500 to-orange-500' : p > 0 ? 'from-red-500 to-pink-500' : 'from-zinc-700 to-zinc-700'

  return (
    <div className="space-y-5 animate-slide-up">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          label={`Ist ${monthLabel(currM)}`}  
          value={fmtH(kpis.totalIst)}  
          sublabel={`Soll: ${fmtH(kpis.totalSoll)}`}
          icon={<ClockIcon />}
          gradient="from-blue-500 to-cyan-500"
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
          gradient="from-green-500 to-emerald-400"
          valueColor="text-green-400"
        />
        <KpiCard 
          label="Team"                        
          value={`${persons.length}`} 
          sublabel="Personen im Projekt"
          icon={<UsersIcon />}
          gradient="from-pink-500 to-orange-500"
        />
      </div>

      {/* Soll/Ist chart */}
      <div className="card card-hover">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wide">
              Soll vs. Ist - Stunden pro Monat
            </h2>
            <p className="text-xs text-zinc-500 mt-1">Vergleich geplanter und tatsachlicher Stunden</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-400">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-zinc-600"></span>
              Soll
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-gradient-to-r from-blue-500 to-cyan-500"></span>
              Ist
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} barCategoryGap="25%" barGap={4}>
            <defs>
              <linearGradient id="istGradientForecast" x1="0" y1="0" x2="0" y2="1">
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
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(59, 130, 246, 0.1)', radius: 4 }}
            />
            <Bar dataKey="Soll" fill="#3f3f46" radius={[4, 4, 0, 0]} />
            <Bar 
              dataKey="Ist" 
              fill="url(#istGradientForecast)" 
              radius={[4, 4, 0, 0]} 
              style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Per-person table */}
      <div className="card card-hover p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-800/50">
          <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wide">
            Auslastung pro Person - {monthLabel(currM)}
          </h2>
          <span className="text-xs text-zinc-500">{persons.length} Teammitglieder</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-zinc-800/30">
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
                  <tr key={p.name} className="hover:bg-zinc-800/30 transition-colors border-b border-zinc-800/50">
                    <td className="table-td font-medium text-zinc-100">{p.name}</td>
                    <td className="table-td text-zinc-500 text-xs">{p.role}</td>
                    {meta.past_months?.map(m => (
                      <td key={m} className="table-td text-right text-zinc-500">{fmtH(p.ist[m] || 0)}</td>
                    ))}
                    <td className="table-td text-right font-semibold text-zinc-100">{fmtH(ist)}</td>
                    <td className="table-td text-right text-zinc-500">{fmtH(soll)}</td>
                    <td className="table-td text-right">
                      <PctBar pct={pct} />
                    </td>
                    {meta.future_months?.map(m => (
                      <td key={m} className="table-td text-right text-zinc-600 italic">{fmtH(p.soll[m] || 0)}</td>
                    ))}
                  </tr>
                )
              })}
              {/* Totals row */}
              <tr className="bg-zinc-800/50 font-bold border-t-2 border-zinc-700">
                <td className="table-td text-zinc-100" colSpan={2}>Gesamt</td>
                {meta.past_months?.map(m => (
                  <td key={m} className="table-td text-right text-zinc-100">{fmtH(ist_totals[m] || 0)}</td>
                ))}
                <td className="table-td text-right text-zinc-100">{fmtH(ist_totals[currM] || 0)}</td>
                <td className="table-td text-right text-zinc-100">{fmtH(soll_totals[currM] || 0)}</td>
                <td className="table-td text-right">
                  <PctBar pct={kpis.pct} />
                </td>
                {meta.future_months?.map(m => (
                  <td key={m} className="table-td text-right text-zinc-100">{fmtH(soll_totals[m] || 0)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, sublabel, icon, gradient, valueColor = 'text-zinc-100', progress }) {
  return (
    <div className="kpi-card relative overflow-hidden group">
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} opacity-10 group-hover:opacity-20 transition-opacity`} />
      
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">{label}</p>
            <p className={`text-3xl font-extrabold mt-2 ${valueColor}`}>{value}</p>
            {sublabel && <p className="text-xs text-zinc-500 mt-1">{sublabel}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center opacity-80 shadow-lg`}>
            {icon}
          </div>
        </div>
        
        {progress !== undefined && (
          <div className="mt-3 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
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
  const gradient = pct >= 85 ? 'from-green-500 to-cyan-500' : pct >= 60 ? 'from-yellow-500 to-orange-500' : pct > 0 ? 'from-red-500 to-pink-500' : 'from-zinc-700 to-zinc-700'
  const textColor = pct >= 85 ? 'text-green-400' : pct >= 60 ? 'text-yellow-400' : pct > 0 ? 'text-red-400' : 'text-zinc-500'
  const w = Math.min(pct, 100)
  
  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
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
