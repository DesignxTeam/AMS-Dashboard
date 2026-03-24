import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const DE_MONTHS = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
const fmt  = n => n?.toLocaleString('de-AT')
const fmtH = n => `${fmt(Math.round(n))}h`
const fmtE = n => `€${fmt(Math.round(n))}`
const pctColor = p => p >= 85 ? '#16a34a' : p >= 60 ? '#d97706' : p > 0 ? '#ef4444' : '#cbd5e1'
const monthLabel = ym => { try { return DE_MONTHS[parseInt(ym.split('-')[1]) - 1] } catch { return ym } }

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

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label={`Ist ${monthLabel(currM)}`}  value={fmtH(kpis.totalIst)}  sub={`Soll: ${fmtH(kpis.totalSoll)}`} />
        <KpiCard label="Auslastung"                  value={`${kpis.pct}%`}         sub="Ist / Soll" color={pctColor(kpis.pct)} />
        <KpiCard label="Umsatz (Ist)"                value={fmtE(kpis.rev)}          sub={`@ ${meta.avg_rate} €/h avg`} />
        <KpiCard label="Team"                        value={`${persons.length} Pers.`} sub="im Projekt" />
      </div>

      {/* Soll/Ist chart */}
      <div className="card">
        <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-4">
          Soll vs. Ist – Stunden pro Monat
        </h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barCategoryGap="30%" barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => `${Math.round(v)}h`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Soll" fill="#cbd5e1" radius={[3,3,0,0]} />
            <Bar dataKey="Ist"  fill="#1e3a5f" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Per-person table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wide">
            Auslastung pro Person – {monthLabel(currM)}
          </h2>
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
                  <tr key={p.name} className="hover:bg-slate-50 transition-colors">
                    <td className="table-td font-medium">{p.name}</td>
                    <td className="table-td text-slate-500 text-xs">{p.role}</td>
                    {meta.past_months?.map(m => (
                      <td key={m} className="table-td text-right text-slate-500">{fmtH(p.ist[m] || 0)}</td>
                    ))}
                    <td className="table-td text-right font-semibold">{fmtH(ist)}</td>
                    <td className="table-td text-right text-slate-500">{fmtH(soll)}</td>
                    <td className="table-td text-right">
                      <PctBar pct={pct} />
                    </td>
                    {meta.future_months?.map(m => (
                      <td key={m} className="table-td text-right text-slate-400 italic">{fmtH(p.soll[m] || 0)}</td>
                    ))}
                  </tr>
                )
              })}
              {/* Totals row */}
              <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                <td className="table-td" colSpan={2}>Gesamt</td>
                {meta.past_months?.map(m => (
                  <td key={m} className="table-td text-right">{fmtH(ist_totals[m] || 0)}</td>
                ))}
                <td className="table-td text-right">{fmtH(ist_totals[currM] || 0)}</td>
                <td className="table-td text-right">{fmtH(soll_totals[currM] || 0)}</td>
                <td className="table-td text-right">
                  <PctBar pct={kpis.pct} />
                </td>
                {meta.future_months?.map(m => (
                  <td key={m} className="table-td text-right">{fmtH(soll_totals[m] || 0)}</td>
                ))}
              </tr>
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
      <p className="text-2xl font-extrabold mt-1" style={color ? { color } : undefined}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function PctBar({ pct }) {
  const w   = Math.min(pct, 100)
  const col = pctColor(pct)
  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${w}%`, background: col }} />
      </div>
      <span className="text-xs font-semibold w-9 text-right" style={{ color: col }}>{pct}%</span>
    </div>
  )
}
