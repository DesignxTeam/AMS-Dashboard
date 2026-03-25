import { useState, useEffect } from 'react'
import { useDashboardData } from './hooks/useDashboardData'
import ForecastTab      from './components/ForecastTab'
import TimesheetTab     from './components/TimesheetTab'
import TicketsTab       from './components/TicketsTab'
import RoadmapTab       from './components/RoadmapTab'
import SprintHealthTab  from './components/SprintHealthTab'
import MonthlyReportTab from './components/MonthlyReportTab'

const TABS = [
  { id: 'forecast',  label: 'Forecast',        icon: TrendingUp },
  { id: 'timesheet', label: 'Timesheet',       icon: Clock },
  { id: 'tickets',   label: 'Ticketbuchungen', icon: Ticket },
  { id: 'roadmap',   label: 'Roadmap',         icon: Map },
  { id: 'health',    label: 'Sprint Health',   icon: Activity },
  { id: 'report',    label: 'Monthly Report',  icon: FileText },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('forecast')
  const { data, loading, error }  = useDashboardData()

  const [isLight, setIsLight] = useState(() => {
    const stored = localStorage.getItem('theme')
    return stored ? stored === 'light' : false
  })

  useEffect(() => {
    document.documentElement.classList.toggle('light', isLight)
    localStorage.setItem('theme', isLight ? 'light' : 'dark')
  }, [isLight])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header with glassmorphism effect */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
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
            
            {/* Theme Toggle + Tab Navigation */}
            <div className="flex items-center gap-3">
            <button
              onClick={() => setIsLight(v => !v)}
              title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              className="w-9 h-9 rounded-lg flex items-center justify-center border border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              {isLight ? <MoonIcon /> : <SunIcon />}
            </button>
            <nav className="flex flex-wrap gap-1 p-1 bg-muted/50 rounded-xl border border-border">
              {TABS.map(t => {
                const Icon = t.icon
                const isActive = activeTab === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer border-none flex items-center gap-2 ${
                      isActive 
                        ? 'bg-primary text-primary-foreground shadow-glow' 
                        : 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                )
              })}
            </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Main content with animation */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 py-6">
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
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
            {activeTab === 'report'   && <MonthlyReportTab data={data} />}
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

function FileText({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <polyline points="10 9 9 9 8 9" />
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

function SunIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}
