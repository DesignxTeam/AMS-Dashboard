import { useState } from 'react'
import { useDashboardData } from './hooks/useDashboardData'
import ForecastTab      from './components/ForecastTab'
import TimesheetTab     from './components/TimesheetTab'
import TicketsTab       from './components/TicketsTab'
import RoadmapTab       from './components/RoadmapTab'
import SprintHealthTab  from './components/SprintHealthTab'

const TABS = [
  { id: 'forecast',  label: 'Forecast',        icon: TrendingUp },
  { id: 'timesheet', label: 'Timesheet',       icon: Clock },
  { id: 'tickets',   label: 'Ticketbuchungen', icon: Ticket },
  { id: 'roadmap',   label: 'Roadmap',         icon: Map },
  { id: 'health',    label: 'Sprint Health',   icon: Activity },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('forecast')
  const { data, loading, error }  = useDashboardData()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header with gradient border */}
      <header className="sticky top-0 z-10 gradient-header border-b border-border">
        <div className="max-w-screen-2xl mx-auto px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent-cyan flex items-center justify-center shadow-glow">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-foreground font-bold text-xl tracking-tight">
                  AMS Dashboard
                </h1>
                <p className="text-muted-foreground text-xs">
                  {data?.meta?.generated_date
                    ? `Stand: ${data.meta.generated_date} | Sprint: ${data.meta.current_sprint}`
                    : 'Lade Daten...'}
                </p>
              </div>
            </div>
            
            {/* Tab Navigation */}
            <nav className="flex flex-wrap gap-1 p-1 bg-muted/50 rounded-xl border border-border">
              {TABS.map(t => {
                const Icon = t.icon
                const isActive = activeTab === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`tab-btn flex items-center gap-2 ${isActive ? 'tab-btn-active' : 'tab-btn-idle'}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main content with animation */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 py-6">
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center animate-pulse-slow">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-primary to-accent-cyan flex items-center justify-center">
                <Loader className="w-8 h-8 text-white animate-spin" />
              </div>
              <p className="text-muted-foreground font-medium">Lade Dashboard-Daten...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="card border-danger/50 bg-danger/10 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-danger/20 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-danger" />
              </div>
              <div>
                <p className="font-semibold text-danger">Fehler beim Laden</p>
                <p className="text-sm mt-1 font-mono text-muted-foreground">{error}</p>
                <p className="text-sm mt-2 text-muted-foreground">
                  Bitte zuerst <code className="bg-muted px-2 py-0.5 rounded text-foreground">python3 scripts/export_json.py</code> ausfuhren.
                </p>
              </div>
            </div>
          </div>
        )}

        {data && (
          <div className="animate-fade-in">
            {activeTab === 'forecast' && <ForecastTab data={data} />}
            {activeTab === 'timesheet' && <TimesheetTab data={data} />}
            {activeTab === 'tickets'  && <TicketsTab  data={data} />}
            {activeTab === 'roadmap'  && <RoadmapTab  data={data} />}
            {activeTab === 'health'   && <SprintHealthTab data={data} />}
          </div>
        )}
      </main>
    </div>
  )
}

// Icons as simple SVG components
function TrendingUp({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

function Clock({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function Ticket({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" />
      <path d="M13 17v2" />
      <path d="M13 11v2" />
    </svg>
  )
}

function Map({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" x2="9" y1="3" y2="18" />
      <line x1="15" x2="15" y1="6" y2="21" />
    </svg>
  )
}

function Activity({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}

function Zap({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function Loader({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="2" y2="6" />
      <line x1="12" x2="12" y1="18" y2="22" />
      <line x1="4.93" x2="7.76" y1="4.93" y2="7.76" />
      <line x1="16.24" x2="19.07" y1="16.24" y2="19.07" />
      <line x1="2" x2="6" y1="12" y2="12" />
      <line x1="18" x2="22" y1="12" y2="12" />
      <line x1="4.93" x2="7.76" y1="19.07" y2="16.24" />
      <line x1="16.24" x2="19.07" y1="7.76" y2="4.93" />
    </svg>
  )
}

function AlertCircle({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  )
}
