import { useMemo, useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

const EN_MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December']
const EN_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const fmt  = n => n?.toLocaleString('en-US')
const fmtH = n => `${fmt(Math.round(n))}h`
const monthLabel = ym => { try { return EN_MONTHS[parseInt(ym.split('-')[1]) - 1] } catch { return ym } }
const monthLabelFull = ym => { try { return `${EN_MONTHS_FULL[parseInt(ym.split('-')[1]) - 1]} ${ym.split('-')[0]}` } catch { return ym } }

// Activity categories with descriptions explaining what each discipline involves
const ACTIVITY_MAP = {
  'Software Engineer - NS': {
    label: 'Software Development',
    color: '#3b82f6',
    description: 'Includes feature implementation, bug fixes, code reviews, pair programming, refactoring, technical debt reduction, backlog refinement participation, sprint planning estimation, architecture discussions, CI/CD pipeline maintenance, and deployment support.',
  },
  'Product Owner': {
    label: 'Coordination / Product Management',
    color: '#f59e0b',
    description: 'Includes backlog grooming and prioritization, stakeholder alignment, sprint planning and review facilitation, acceptance criteria definition, requirement clarification, daily stand-ups, retrospectives, cross-team coordination, and release management.',
  },
  'UX/UI Designer - NS': {
    label: 'UI/UX Design',
    color: '#a855f7',
    description: 'Includes user interface design, wireframing, prototyping, design system maintenance, usability reviews, interaction design, visual QA, component specification, design handoff to development, and accessibility considerations.',
  },
  'QA Engineer - NS': {
    label: 'QA / Testing Preparation',
    color: '#10b981',
    description: 'Includes test case design and documentation, test plan creation, manual and exploratory testing, regression testing, test environment setup, defect reporting and verification, acceptance testing support, and quality metrics tracking.',
  },
  'Data Scientist': {
    label: 'Data Science / Analytics',
    color: '#ec4899',
    description: 'Includes data modeling, analysis and reporting, data pipeline development, algorithm design and optimization, data quality assurance, and analytical support for product decisions.',
  },
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3 shadow-2xl">
      {payload.map((e, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded" style={{ background: e.color || e.fill }} />
            <span className="text-zinc-400 text-xs">{e.name}</span>
          </div>
          <span className="text-zinc-100 font-bold text-xs">{fmtH(e.value)}</span>
        </div>
      ))}
    </div>
  )
}

// Generate Word document content as HTML for export
function generateWordHtml(report, selectedMonth) {
  const ml = monthLabelFull(selectedMonth)
  const actRows = report.activityData.map(a =>
    `<tr><td style="padding:6px 12px;border:1px solid #ddd">${a.name}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right">${fmtH(a.hours)}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right">${a.pct}%</td></tr>`
  ).join('')
  const actDescs = report.activityData.map(a =>
    `<p style="margin:8px 0"><strong>${a.name}:</strong> ${a.activityDescription}</p>`
  ).join('')
  const epicRows = report.epicData.map(e =>
    `<tr><td style="padding:6px 12px;border:1px solid #ddd">${e.name}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right">${fmtH(e.hours)}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right">${e.pct}%</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right">${e.ticketCount}</td></tr>`
  ).join('')
  const epicNarratives = report.epicData.map(e => {
    const isGeneral = e.name === 'General / Cross-cutting'
    const narrative = isGeneral
      ? 'This category covers cross-cutting activities not linked to specific epics, including sprint ceremonies (planning, reviews, retrospectives), refinement sessions, technical onboarding, architecture discussions, code reviews, and general coordination. These activities are foundational to delivery and ensure alignment across all workstreams.'
      : `${e.ticketCount > 0 ? `${e.ticketCount} tracked item${e.ticketCount > 1 ? 's were' : ' was'} actively worked on during this period across ${e.bookings} time bookings. ` : ''}${e.noTicketHours > 0 ? `Additionally, ${fmtH(e.noTicketHours)} were invested in supporting activities such as refinement, planning, and technical discussions related to this workstream.` : 'Effort included implementation, testing, and review activities contributing to this module\'s progress.'}`
    return `<p style="margin:8px 0"><strong>${e.name}</strong> (${fmtH(e.hours)}, ${e.pct}% of total effort): ${narrative}</p>`
  }).join('')
  const roleRows = report.roleData.map(r =>
    `<tr><td style="padding:6px 12px;border:1px solid #ddd">${r.role}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right">${r.count}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right">${fmtH(r.soll)}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right">${fmtH(r.ist)}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right">${r.pct}%</td></tr>`
  ).join('')

  return `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><style>
body { font-family: Calibri, Arial, sans-serif; color: #222; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px; }
h1 { color: #1a365d; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
h2 { color: #1e40af; margin-top: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
h3 { color: #374151; margin-top: 20px; }
table { border-collapse: collapse; width: 100%; margin: 12px 0; }
th { background: #f1f5f9; padding: 8px 12px; border: 1px solid #ddd; text-align: left; font-size: 13px; }
td { font-size: 13px; }
.note { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 16px 0; font-size: 13px; }
.kpi-row { display: flex; gap: 20px; margin: 16px 0; }
.kpi { background: #f1f5f9; padding: 12px 20px; border-radius: 8px; text-align: center; flex: 1; }
.kpi-value { font-size: 24px; font-weight: bold; color: #1e40af; }
.kpi-label { font-size: 11px; color: #6b7280; text-transform: uppercase; }
</style></head><body>

<h1>Monthly Delivery &amp; Effort Report — ${ml}</h1>

<h2>1. Executive Summary</h2>
<p>During ${ml}, a total of <strong>${fmtH(report.totalHours)}</strong> of project effort was delivered against a planned capacity of <strong>${fmtH(report.totalSoll)}</strong>, resulting in a <strong>${report.pctUtilization}%</strong> utilization rate.</p>
<p>The primary focus areas were ${report.epicData.slice(0, 3).map(e => `<strong>${e.name}</strong>`).join(', ')}.</p>
<div class="note">
<strong>Note:</strong> Billed effort covers the full scope of project work — including architecture, infrastructure, technical design, sprint ceremonies, refinements, code reviews, QA preparation, and coordination. These activities do not always result in completed tickets but are essential for sustainable project delivery.
</div>

<table>
<tr><th>Metric</th><th style="text-align:right">Value</th></tr>
<tr><td style="padding:6px 12px;border:1px solid #ddd">Total Effort</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right">${fmtH(report.totalHours)}</td></tr>
<tr><td style="padding:6px 12px;border:1px solid #ddd">Planned Capacity</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right">${fmtH(report.totalSoll)}</td></tr>
<tr><td style="padding:6px 12px;border:1px solid #ddd">Utilization</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right">${report.pctUtilization}%</td></tr>
<tr><td style="padding:6px 12px;border:1px solid #ddd">Items Completed</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right">${report.doneTickets.length}</td></tr>
<tr><td style="padding:6px 12px;border:1px solid #ddd">Items In Progress</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right">${report.inProgressTickets.length}</td></tr>
</table>

<h2>2. Effort Breakdown by Activity Type</h2>
<p>The following table shows how effort was distributed across the different disciplines involved in the project:</p>
<table>
<tr><th>Activity Type</th><th style="text-align:right">Hours</th><th style="text-align:right">Share</th></tr>
${actRows}
<tr style="font-weight:bold;background:#f1f5f9"><td style="padding:6px 12px;border:1px solid #ddd">Total</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right">${fmtH(report.totalHours)}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right">100%</td></tr>
</table>

<h3>What Each Activity Type Includes</h3>
${actDescs}

<h2>3. Effort Mapping to Epics / Workstreams</h2>
<p>Effort was distributed across the following functional areas and modules:</p>
<table>
<tr><th>Epic / Workstream</th><th style="text-align:right">Hours</th><th style="text-align:right">Share</th><th style="text-align:right">Tracked Items</th></tr>
${epicRows}
<tr style="font-weight:bold;background:#f1f5f9"><td style="padding:6px 12px;border:1px solid #ddd">Total</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right">${fmtH(report.totalHours)}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right">100%</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right">${report.tickets.length}</td></tr>
</table>

<h3>Workstream Narratives</h3>
${epicNarratives}

<h2>4. Delivery Progress Overview</h2>
<p>During ${ml}, a total of <strong>${report.tickets.length}</strong> items were actively worked on:</p>
<ul>
<li><strong>${report.doneTickets.length}</strong> items were completed (${fmtH(report.doneTickets.reduce((s,t) => s+t.hours, 0))} effort)</li>
<li><strong>${report.inProgressTickets.length}</strong> items remain in progress (${fmtH(report.inProgressTickets.reduce((s,t) => s+t.hours, 0))} effort)</li>
<li><strong>${report.otherTickets.length}</strong> items are in review, QA, or other stages (${fmtH(report.otherTickets.reduce((s,t) => s+t.hours, 0))} effort)</li>
</ul>
<div class="note">
<strong>Note on Enabling Work:</strong> A portion of effort is invested in cross-cutting activities such as architecture, infrastructure, CI/CD pipelines, sprint planning, refinements, and code reviews. These activities are included in the total effort but are not tracked as individual tickets, as they provide the foundation for all delivery.
</div>

<h2>5. Plan vs. Actual (by Role)</h2>
<p>The following table compares planned and actual effort by role:</p>
<table>
<tr><th>Role</th><th style="text-align:right">Team Members</th><th style="text-align:right">Planned</th><th style="text-align:right">Actual</th><th style="text-align:right">Utilization</th></tr>
${roleRows}
<tr style="font-weight:bold;background:#f1f5f9"><td style="padding:6px 12px;border:1px solid #ddd">Total</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right">${report.roleData.reduce((s,r) => s+r.count, 0)}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right">${fmtH(report.totalSoll)}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right">${fmtH(report.totalHours)}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right">${report.pctUtilization}%</td></tr>
</table>
${Math.abs(report.totalHours - report.totalSoll) > 50 ? `<div class="note"><strong>Regarding the deviation:</strong> ${report.totalHours < report.totalSoll ? 'Actual effort was below planned capacity. This may be attributed to availability differences, public holidays, or lower coordination overhead than initially forecasted.' : 'Actual effort exceeded planned capacity. This may be attributed to additional alignment rounds, unforeseen technical requirements, or more extensive QA measures.'}</div>` : ''}

<h2>6. Transparency Notes</h2>
<p><strong>Effort-Based Billing:</strong> Billing is based on actual effort delivered (Time &amp; Materials) as per the Statement of Work. Effort includes all activities necessary for project delivery, not only completed tickets.</p>
<p><strong>Sprint Governance:</strong> All work was organized within the agreed sprint framework, including Sprint Planning, Daily Stand-ups, Sprint Reviews, and Retrospectives.</p>
<p><strong>Traceability:</strong> All effort is fully documented through Jira and the time tracking system, and is available for review at any time.</p>
<p><strong>Enabling Work:</strong> Effort invested in architecture, infrastructure, CI/CD, code reviews, and technical debt management is an integral part of delivery and is included in total effort figures.</p>

<hr style="margin-top:40px;border:none;border-top:1px solid #e5e7eb">
<p style="font-size:11px;color:#9ca3af;text-align:center">This report was generated from project data. Reporting period: ${ml}</p>

</body></html>`
}

export default function MonthlyReportTab({ data }) {
  const { forecast, meta, timesheet } = data
  const { persons, soll_totals, ist_totals, months } = forecast
  const currM = meta.curr_month

  const closedMonths = useMemo(() =>
    months.filter(m => m < currM),
  [months, currM])

  const [selectedMonth, setSelectedMonth] = useState(
    closedMonths.length > 0 ? closedMonths[closedMonths.length - 1] : null
  )

  const report = useMemo(() => {
    if (!selectedMonth) return null
    const sm = selectedMonth

    const entries = timesheet.filter(e => e.month === sm)
    const totalHours = entries.reduce((s, e) => s + (e.hours || 0), 0)

    // Determine which sprints overlap with this month
    const sprintHealth = data.sprint_health
    const monthStart = new Date(sm + '-01')
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
    const overlappingSprints = (sprintHealth?.sprints || [])
      .filter(s => {
        const sStart = new Date(s.start)
        const sEnd = new Date(s.end)
        return sStart <= monthEnd && sEnd >= monthStart
      })
      .map(s => s.name.replace('Sprint ', 'S'))

    // Build a map of all Jira tickets active in this month's sprints, by epic
    const jiraTicketsByEpic = {}
    ;(data.tickets || []).forEach(t => {
      if (!t.sprint || !overlappingSprints.includes(t.sprint)) return
      const epic = t.epic_name || 'General / Cross-cutting'
      if (!jiraTicketsByEpic[epic]) jiraTicketsByEpic[epic] = new Set()
      jiraTicketsByEpic[epic].add(t.key)
    })

    // Effort by activity type
    const byActivity = {}
    entries.forEach(e => {
      const key = e.service_item || 'Other'
      if (!byActivity[key]) byActivity[key] = 0
      byActivity[key] += e.hours || 0
    })
    const activityData = Object.entries(byActivity)
      .map(([key, hours]) => ({
        name: ACTIVITY_MAP[key]?.label || key,
        hours: Math.round(hours * 10) / 10,
        color: ACTIVITY_MAP[key]?.color || '#6b7280',
        activityDescription: ACTIVITY_MAP[key]?.description || '',
        pct: Math.round(hours / totalHours * 100),
      }))
      .sort((a, b) => b.hours - a.hours)

    // Effort by epic — combine timesheet tickets + Jira sprint tickets
    const byEpic = {}
    entries.forEach(e => {
      const key = e.epic_name || 'General / Cross-cutting'
      if (!byEpic[key]) byEpic[key] = { hours: 0, tickets: new Set(), bookings: 0, noTicketHours: 0 }
      byEpic[key].hours += e.hours || 0
      byEpic[key].bookings++
      if (e.ticket) byEpic[key].tickets.add(e.ticket)
      else byEpic[key].noTicketHours += e.hours || 0
    })
    // Merge in Jira tickets from overlapping sprints
    Object.entries(jiraTicketsByEpic).forEach(([epic, ticketSet]) => {
      if (!byEpic[epic]) byEpic[epic] = { hours: 0, tickets: new Set(), bookings: 0, noTicketHours: 0 }
      ticketSet.forEach(t => byEpic[epic].tickets.add(t))
    })
    const epicData = Object.entries(byEpic)
      .map(([name, d]) => ({
        name,
        hours: Math.round(d.hours * 10) / 10,
        ticketCount: d.tickets.size,
        bookings: d.bookings,
        noTicketHours: Math.round(d.noTicketHours * 10) / 10,
        pct: Math.round(d.hours / totalHours * 100),
      }))
      .sort((a, b) => b.hours - a.hours)

    // Tickets
    const ticketMap = {}
    entries.forEach(e => {
      if (!e.ticket) return
      if (!ticketMap[e.ticket]) {
        ticketMap[e.ticket] = { key: e.ticket, type: e.issue_type, status: e.jira_status, epic: e.epic_name, hours: 0 }
      }
      ticketMap[e.ticket].hours += e.hours || 0
    })
    const tickets = Object.values(ticketMap).sort((a, b) => b.hours - a.hours)
    const doneTickets = tickets.filter(t => t.status === 'Done')
    const inProgressTickets = tickets.filter(t => t.status === 'In Progress' || t.status === 'Selected for Development')
    const otherTickets = tickets.filter(t => t.status !== 'Done' && t.status !== 'In Progress' && t.status !== 'Selected for Development')

    // Plan vs Actual — aggregated by role (no names)
    const totalSoll = soll_totals[sm] || 0
    const totalIst = ist_totals[sm] || 0
    const pctUtilization = totalSoll > 0 ? Math.round(totalIst / totalSoll * 100) : 0

    const byRole = {}
    persons.forEach(p => {
      const ist = p.ist[sm] || 0
      const soll = p.soll[sm] || 0
      if (ist === 0 && soll === 0) return
      if (!byRole[p.role]) byRole[p.role] = { role: p.role, count: 0, soll: 0, ist: 0 }
      byRole[p.role].count++
      byRole[p.role].soll += soll
      byRole[p.role].ist += ist
    })
    const roleData = Object.values(byRole)
      .map(r => ({ ...r, pct: r.soll > 0 ? Math.round(r.ist / r.soll * 100) : 0 }))
      .sort((a, b) => b.ist - a.ist)

    const totalRevenue = persons.reduce((s, p) => s + Math.round((p.ist[sm] || 0) * (p.rate || 0)), 0)

    return {
      totalHours: Math.round(totalHours * 10) / 10,
      totalSoll, totalIst, pctUtilization,
      activityData, epicData, tickets, doneTickets, inProgressTickets, otherTickets,
      roleData, totalRevenue,
    }
  }, [selectedMonth, timesheet, persons, soll_totals, ist_totals, data])

  // Word export
  const exportWord = useCallback(() => {
    if (!report) return
    const html = generateWordHtml(report, selectedMonth)
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Monthly_Report_${selectedMonth}.doc`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [report, selectedMonth])

  if (closedMonths.length === 0) {
    return (
      <div className="card text-center py-16">
        <div className="text-4xl mb-4">📅</div>
        <h2 className="text-xl font-bold text-zinc-100 mb-2">No Closed Month Available</h2>
        <p className="text-zinc-400">The Monthly Report will be generated once a month is closed.</p>
        <p className="text-zinc-500 text-sm mt-2">Current month: {monthLabelFull(currM)} (in progress)</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Month Selector + Export */}
      <div className="flex items-center gap-4 flex-wrap">
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wide">Reporting Period:</h2>
        <div className="flex gap-2">
          {closedMonths.map(m => (
            <button
              key={m}
              onClick={() => setSelectedMonth(m)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                m === selectedMonth
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
              }`}
            >
              {monthLabelFull(m)}
            </button>
          ))}
        </div>
        <span className="text-xs text-zinc-600">Closed months only</span>
        <button
          onClick={exportWord}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors shadow-lg shadow-blue-600/25"
        >
          <DownloadIcon />
          Export as Word
        </button>
      </div>

      {report && (
        <>
          {/* 1. EXECUTIVE SUMMARY */}
          <div className="card card-hover border-l-4 border-l-blue-500">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg flex-shrink-0">
                <ReportIcon />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-zinc-100 mb-1">
                  Monthly Delivery & Effort Report — {monthLabelFull(selectedMonth)}
                </h2>
                <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                  During {monthLabelFull(selectedMonth)}, a total of{' '}
                  <span className="text-zinc-100 font-semibold">{fmtH(report.totalHours)}</span> of
                  project effort was delivered. The primary focus areas were{' '}
                  {report.epicData.slice(0, 3).map((e, i) => (
                    <span key={e.name}>
                      {i > 0 && (i === Math.min(report.epicData.length, 3) - 1 ? ' and ' : ', ')}
                      <span className="text-zinc-200 font-medium">{e.name}</span>
                    </span>
                  ))}.
                </p>
                <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    <span className="text-zinc-300 font-medium">Note:</span>{' '}
                    Billed effort covers the full scope of project work — including architecture,
                    infrastructure, technical design, sprint ceremonies, refinements, code reviews,
                    QA preparation, and coordination. These activities do not always result in
                    completed tickets but are essential for sustainable project delivery.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <MiniKpi label="Total Effort" value={fmtH(report.totalHours)} color="text-blue-400" />
              <MiniKpi label="Planned Capacity" value={fmtH(report.totalSoll)} color="text-zinc-400" />
              <MiniKpi label="Utilization" value={`${report.pctUtilization}%`} color={report.pctUtilization >= 85 ? 'text-green-400' : report.pctUtilization >= 60 ? 'text-yellow-400' : 'text-red-400'} />
              <MiniKpi label="Items Completed" value={report.doneTickets.length} color="text-green-400" />
            </div>
          </div>

          {/* 2. EFFORT BY ACTIVITY TYPE */}
          <div className="card card-hover">
            <SectionHeader number="1" title="Effort Breakdown by Activity Type" subtitle="Distribution of effort across disciplines" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={report.activityData} cx="50%" cy="50%" innerRadius={65} outerRadius={110} paddingAngle={3} dataKey="hours" nameKey="name">
                      {report.activityData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                {report.activityData.map(a => (
                  <div key={a.name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: a.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-200 truncate">{a.name}</span>
                        <span className="text-sm font-bold text-zinc-100 ml-2">{fmtH(a.hours)}</span>
                      </div>
                      <div className="mt-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${a.pct}%`, background: a.color }} />
                      </div>
                    </div>
                    <span className="text-xs text-zinc-500 w-10 text-right">{a.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity descriptions */}
            <div className="mt-6 space-y-3">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wide">What Each Activity Type Includes</h4>
              {report.activityData.map(a => (
                <div key={a.name} className="bg-zinc-800/30 rounded-lg p-4 border border-zinc-700/50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: a.color }} />
                    <span className="text-sm font-bold text-zinc-200">{a.name}</span>
                    <span className="text-xs text-zinc-500 ml-auto">{fmtH(a.hours)} · {a.pct}%</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{a.activityDescription}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 3. EFFORT BY EPICS */}
          <div className="card card-hover">
            <SectionHeader number="2" title="Effort Mapping to Epics / Workstreams" subtitle="How effort was distributed across functional areas" />

            <div className="mt-6">
              <ResponsiveContainer width="100%" height={Math.max(200, report.epicData.length * 44)}>
                <BarChart data={report.epicData} layout="vertical" barSize={20} margin={{ left: 160 }}>
                  <defs>
                    <linearGradient id="epicBarGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#a1a1aa' }} axisLine={false} tickLine={false} width={155} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.08)' }} />
                  <Bar dataKey="hours" name="Hours" fill="url(#epicBarGrad)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Epic table */}
            <div className="overflow-x-auto mt-4">
              <table className="w-full">
                <thead>
                  <tr className="bg-zinc-800/30">
                    <th className="table-th">Epic / Workstream</th>
                    <th className="table-th text-right">Hours</th>
                    <th className="table-th text-right">Share</th>
                    <th className="table-th text-right">Tracked Items</th>
                  </tr>
                </thead>
                <tbody>
                  {report.epicData.map(e => (
                    <tr key={e.name} className="hover:bg-zinc-800/30 transition-colors border-b border-zinc-800/50">
                      <td className="table-td font-medium text-zinc-100">{e.name}</td>
                      <td className="table-td text-right text-zinc-200">{fmtH(e.hours)}</td>
                      <td className="table-td text-right"><span className="text-xs font-bold text-blue-400">{e.pct}%</span></td>
                      <td className="table-td text-right text-zinc-400">{e.ticketCount}</td>
                    </tr>
                  ))}
                  <tr className="bg-zinc-800/50 font-bold border-t-2 border-zinc-700">
                    <td className="table-td text-zinc-100">Total</td>
                    <td className="table-td text-right text-zinc-100">{fmtH(report.totalHours)}</td>
                    <td className="table-td text-right text-blue-400">100%</td>
                    <td className="table-td text-right text-zinc-100">{report.tickets.length}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Textual epic narratives */}
            <div className="mt-6 space-y-2">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Workstream Narratives</h4>
              {report.epicData.map(e => {
                const hasTickets = e.ticketCount > 0
                const hasNonTicket = e.noTicketHours > 0
                const isGeneral = e.name === 'General / Cross-cutting'
                return (
                  <div key={e.name} className="px-4 py-3 bg-zinc-800/20 rounded-lg border border-zinc-800/50">
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      <span className="font-semibold text-zinc-100">{e.name}</span>{' '}
                      <span className="text-zinc-500">({fmtH(e.hours)}, {e.pct}% of total effort)</span> —{' '}
                      {isGeneral
                        ? `This category covers cross-cutting activities not linked to specific epics, including sprint ceremonies (planning, reviews, retrospectives), refinement sessions, technical onboarding, architecture discussions, code reviews, and general coordination. These activities are foundational to delivery and ensure alignment across all workstreams.`
                        : <>
                            {hasTickets && `${e.ticketCount} tracked item${e.ticketCount > 1 ? 's were' : ' was'} actively worked on during this period across ${e.bookings} time bookings. `}
                            {hasNonTicket && `Additionally, ${fmtH(e.noTicketHours)} were invested in supporting activities such as refinement, planning, and technical discussions related to this workstream. `}
                            {!hasNonTicket && hasTickets && 'Effort included implementation, testing, and review activities contributing to this module\'s progress. '}
                          </>
                      }
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 4. DELIVERY PROGRESS */}
          <div className="card card-hover">
            <SectionHeader number="3" title="Delivery Progress Overview" subtitle="Status of items worked on during this period" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <StatusCard label="Completed (Done)" count={report.doneTickets.length} hours={report.doneTickets.reduce((s, t) => s + t.hours, 0)} color="green" icon="✅" />
              <StatusCard label="In Progress" count={report.inProgressTickets.length} hours={report.inProgressTickets.reduce((s, t) => s + t.hours, 0)} color="blue" icon="🔄" />
              <StatusCard label="Other (Review, QA, etc.)" count={report.otherTickets.length} hours={report.otherTickets.reduce((s, t) => s + t.hours, 0)} color="amber" icon="📋" />
            </div>

            {report.doneTickets.length > 0 && (
              <div className="mt-6">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-3">
                  Items Completed in {monthLabel(selectedMonth)}
                </h4>
                <div className="space-y-1.5">
                  {report.doneTickets.map(t => (
                    <div key={t.key} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800/30 transition-colors">
                      <span className="text-xs font-mono text-blue-400 w-20">{t.key}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${t.type === 'Story' ? 'bg-green-500/20 text-green-400' : t.type === 'Bug' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {t.type || 'Task'}
                      </span>
                      <span className="text-sm text-zinc-300 flex-1 truncate">{t.epic || '-'}</span>
                      <span className="text-sm font-semibold text-zinc-200">{fmtH(t.hours)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 bg-zinc-800/30 rounded-lg p-4 border border-zinc-700/50">
              <p className="text-xs text-zinc-400 leading-relaxed">
                <span className="text-zinc-300 font-medium">Note on Enabling Work:</span>{' '}
                A portion of effort is invested in cross-cutting activities such as architecture,
                infrastructure, CI/CD pipelines, sprint planning, refinements, and code reviews.
                These activities are included in total effort but are not tracked as individual
                tickets, as they provide the foundation for all delivery.
              </p>
            </div>
          </div>

          {/* 5. PLAN VS ACTUAL — by role, no names */}
          <div className="card card-hover">
            <SectionHeader number="4" title="Plan vs. Actual (by Role)" subtitle="Comparison of planned and actual effort by discipline" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              <div className="flex flex-col items-center justify-center p-6 bg-zinc-800/30 rounded-xl">
                <div className="relative w-32 h-32">
                  <svg viewBox="0 0 36 36" className="w-32 h-32 -rotate-90">
                    <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#27272a" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9155" fill="none"
                      stroke={report.pctUtilization >= 85 ? '#22c55e' : report.pctUtilization >= 60 ? '#eab308' : '#ef4444'}
                      strokeWidth="3" strokeDasharray={`${report.pctUtilization} ${100 - report.pctUtilization}`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-extrabold text-zinc-100">{report.pctUtilization}%</span>
                    <span className="text-[10px] text-zinc-500">Utilization</span>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm text-zinc-400">
                    <span className="text-zinc-100 font-bold">{fmtH(report.totalHours)}</span> of{' '}
                    <span className="text-zinc-300">{fmtH(report.totalSoll)}</span> planned
                  </p>
                </div>
              </div>

              <div className="lg:col-span-2 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-zinc-800/30">
                      <th className="table-th">Role</th>
                      <th className="table-th text-right">Team Members</th>
                      <th className="table-th text-right">Planned</th>
                      <th className="table-th text-right">Actual</th>
                      <th className="table-th text-right">Δ</th>
                      <th className="table-th text-right">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.roleData.map(r => {
                      const delta = r.ist - r.soll
                      return (
                        <tr key={r.role} className="hover:bg-zinc-800/30 transition-colors border-b border-zinc-800/50">
                          <td className="table-td text-zinc-100 text-sm">{r.role}</td>
                          <td className="table-td text-right text-zinc-400 text-sm">{r.count}</td>
                          <td className="table-td text-right text-zinc-400 text-sm">{fmtH(r.soll)}</td>
                          <td className="table-td text-right text-zinc-100 font-semibold text-sm">{fmtH(r.ist)}</td>
                          <td className={`table-td text-right text-sm font-medium ${delta > 0 ? 'text-yellow-400' : delta < -10 ? 'text-red-400' : 'text-zinc-500'}`}>
                            {delta > 0 ? '+' : ''}{fmtH(delta)}
                          </td>
                          <td className="table-td text-right">
                            <span className={`text-xs font-bold ${r.pct >= 85 ? 'text-green-400' : r.pct >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{r.pct}%</span>
                          </td>
                        </tr>
                      )
                    })}
                    <tr className="bg-zinc-800/50 font-bold border-t-2 border-zinc-700">
                      <td className="table-td text-zinc-100">Total</td>
                      <td className="table-td text-right text-zinc-100">{report.roleData.reduce((s,r) => s+r.count, 0)}</td>
                      <td className="table-td text-right text-zinc-100">{fmtH(report.totalSoll)}</td>
                      <td className="table-td text-right text-zinc-100">{fmtH(report.totalHours)}</td>
                      <td className={`table-td text-right font-medium ${report.totalHours - report.totalSoll > 0 ? 'text-yellow-400' : 'text-zinc-400'}`}>
                        {report.totalHours - report.totalSoll > 0 ? '+' : ''}{fmtH(report.totalHours - report.totalSoll)}
                      </td>
                      <td className="table-td text-right">
                        <span className={`text-xs font-bold ${report.pctUtilization >= 85 ? 'text-green-400' : report.pctUtilization >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{report.pctUtilization}%</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {Math.abs(report.totalHours - report.totalSoll) > 50 && (
              <div className="mt-4 bg-zinc-800/30 rounded-lg p-4 border border-zinc-700/50">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  <span className="text-zinc-300 font-medium">Regarding the deviation:</span>{' '}
                  {report.totalHours < report.totalSoll
                    ? 'Actual effort was below planned capacity. This may be attributed to availability differences, public holidays, or lower coordination overhead than initially forecasted.'
                    : 'Actual effort exceeded planned capacity. This may be attributed to additional alignment rounds, unforeseen technical requirements, or more extensive QA measures.'
                  }
                </p>
              </div>
            )}
          </div>

          {/* 6. TRANSPARENCY NOTES */}
          <div className="card card-hover border-l-4 border-l-emerald-500">
            <SectionHeader number="5" title="Transparency Notes" subtitle="Billing and governance context" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <TransparencyNote icon="📐" title="Effort-Based Billing"
                text="Billing is based on actual effort delivered (Time & Materials) as per the Statement of Work. Effort includes all activities necessary for project delivery, not only completed tickets." />
              <TransparencyNote icon="🔄" title="Sprint Governance"
                text="All work was organized within the agreed sprint framework, including Sprint Planning, Daily Stand-ups, Sprint Reviews, and Retrospectives." />
              <TransparencyNote icon="🔍" title="Traceability"
                text="All effort is fully documented through Jira and the time tracking system, and is available for review at any time." />
              <TransparencyNote icon="🏗️" title="Enabling Work"
                text="Effort invested in architecture, infrastructure, CI/CD, code reviews, and technical debt management is an integral part of delivery and is included in total effort figures." />
            </div>
          </div>

          {/* Footer */}
          <div className="text-center py-4">
            <p className="text-xs text-zinc-600">
              This report was automatically generated from project data.
              Reporting period: {monthLabelFull(selectedMonth)} | Generated: {data.meta.generated_date}
            </p>
          </div>
        </>
      )}
    </div>
  )
}

// Sub-components
function SectionHeader({ number, title, subtitle }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-sm font-bold text-blue-400 border border-zinc-700">{number}</div>
      <div>
        <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wide">{title}</h3>
        {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
      </div>
    </div>
  )
}

function MiniKpi({ label, value, color = 'text-zinc-100' }) {
  return (
    <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
      <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-extrabold mt-1 ${color}`}>{value}</p>
    </div>
  )
}

function StatusCard({ label, count, hours, color, icon }) {
  const colors = { green: 'border-green-500/30 bg-green-500/5', blue: 'border-blue-500/30 bg-blue-500/5', amber: 'border-yellow-500/30 bg-yellow-500/5' }
  return (
    <div className={`rounded-xl p-5 border ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-medium text-zinc-300">{label}</span>
      </div>
      <p className="text-3xl font-extrabold text-zinc-100">{count}</p>
      <p className="text-xs text-zinc-500 mt-1">Items · {fmtH(Math.round(hours))} effort</p>
    </div>
  )
}

function TransparencyNote({ icon, title, text }) {
  return (
    <div className="bg-zinc-800/30 rounded-lg p-4 border border-zinc-700/50">
      <div className="flex items-center gap-2 mb-2">
        <span>{icon}</span>
        <span className="text-sm font-bold text-zinc-200">{title}</span>
      </div>
      <p className="text-xs text-zinc-400 leading-relaxed">{text}</p>
    </div>
  )
}

function ReportIcon() {
  return (
    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  )
}
