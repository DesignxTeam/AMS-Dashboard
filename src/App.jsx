import { useState } from 'react'
import { useDashboardData } from './hooks/useDashboardData'
import ForecastTab      from './components/ForecastTab'
import TimesheetTab     from './components/TimesheetTab'
import TicketsTab       from './components/TicketsTab'
import RoadmapTab       from './components/RoadmapTab'
import SprintHealthTab  from './components/SprintHealthTab'

const TABS = [
  { id: 'forecast',  label: '📈 Forecast'        },
  { id: 'timesheet', label: '🕒 Timesheet'        },
  { id: 'tickets',   label: '🎫 Ticketbuchungen'  },
  { id: 'roadmap',   label: '🗺️ Roadmap'          },
  { id: 'health',    label: '🏃 Sprint Health'    },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('forecast')
  const { data, loading, error }  = useDashboardData()

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="bg-navy-700 shadow-lg sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-white font-extrabold text-lg leading-tight">
              AMS Dashboard
            </h1>
            <p className="text-white/50 text-xs">
              {data?.meta?.generated_date
                ? `Stand: ${data.meta.generated_date} · Sprint: ${data.meta.current_sprint}`
                : 'Lade Daten…'}
            </p>
          </div>
          <nav className="flex flex-wrap gap-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`tab-btn ${activeTab === t.id ? 'tab-btn-active' : 'tab-btn-idle'}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Main content ───────────────────────────────────────── */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 py-6">
        {loading && (
          <div className="flex items-center justify-center h-64 text-slate-400">
            <div className="text-center">
              <div className="text-4xl mb-3">⏳</div>
              <p className="font-medium">Lade Dashboard-Daten…</p>
            </div>
          </div>
        )}

        {error && (
          <div className="card border-red-200 bg-red-50 text-red-700">
            <p className="font-semibold">Fehler beim Laden von dashboard.json</p>
            <p className="text-sm mt-1 font-mono">{error}</p>
            <p className="text-sm mt-2">
              Bitte zuerst <code className="bg-red-100 px-1 rounded">python3 scripts/export_json.py</code> ausführen.
            </p>
          </div>
        )}

        {data && (
          <>
            {activeTab === 'forecast' && <ForecastTab data={data} />}
            {activeTab === 'timesheet' && <TimesheetTab data={data} />}
            {activeTab === 'tickets'  && <TicketsTab  data={data} />}
            {activeTab === 'roadmap'  && <RoadmapTab  data={data} />}
            {activeTab === 'health'   && <SprintHealthTab data={data} />}
          </>
        )}
      </main>
    </div>
  )
}
