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

// ─────────────────────────────────────────────────────────────────────────────
// MONTH CONTEXT — add a new entry here for each month when closing the report.
// Keys: YYYY-MM. Fields: executiveSummary, generalNarrative, epicNarratives, valueBridge
// ─────────────────────────────────────────────────────────────────────────────
const MONTH_CONTEXT = {
  '2026-01': {
    executiveSummary: 'January 2026 was the project kick-off month. Sprint 0 began on January 20th, focusing entirely on technical foundation work: environment setup, repository structure, CI/CD pipeline initialization, and early scaffolding of the frontend and backend codebases. Feature delivery had not yet begun; this month\'s effort established the technical baseline required for all subsequent sprints.',
    generalNarrative: 'Cross-cutting effort in January covered: (1) Project onboarding — team setup, tooling configuration, access provisioning; (2) Architecture decisions — technology stack confirmation, repository structure, API conventions; (3) Sprint 0 kickoff ceremonies — initial planning, backlog refinement, and alignment sessions with the client.',
    epicNarratives: {
      'Setup and Architecture': 'Sprint 0 technical setup: frontend scaffolding (FE Setup, Navigation & Routing), API initialization, and early database configuration. These foundational items were completed or moved to QA by end of January/early February.',
    },
    valueBridge: 'January established the technical preconditions for the entire project. Without a functioning development environment, CI/CD pipeline, and agreed architecture, no feature development would be possible. This investment was a one-time cost that accelerates all subsequent months.',
  },
  '2026-02': {
    executiveSummary: 'February 2026 was the project\'s first full delivery month, covering Sprints 1 and 2. The month\'s effort focused on establishing the platform foundation and advancing core feature modules into active development. Items formally completed in February include: authentication infrastructure (Login/Logout, SSO/IdP setup, role-based scopes), CI/CD pipeline, branding configuration, seed data, and IP Owner listing. In parallel, User Management, Agency Management, Jurisdiction Management, and the Task Scheduler were substantially progressed — implementation and QA were underway by end of February, with formal completion carried into early March as QA cycles concluded.',
    generalNarrative: 'Cross-cutting effort in February covered: (1) Platform architecture — backend entity models, database schema design, and API structure establishment; (2) Authentication & Authorization — SSO integration, role-based permission system, and scope management; (3) CI/CD & Infrastructure — build pipelines, deployment configuration, and QA environment setup; (4) Sprint ceremonies & coordination — refinements were particularly intensive this month (covering 2-sprint scope at once), along with planning, reviews, retrospectives, and daily standups; (5) Technical onboarding & knowledge transfer for new and existing team members.',
    epicNarratives: {
      'Setup and Architecture': 'Core platform setup was completed in February: backend framework, database configuration, seed data infrastructure, i18n scaffolding, and deployment pipeline. These items are formally resolved and provide the technical foundation for all feature modules.',
      'User & Agency Management': 'Internal user listing, user invitation flows, and agency management (list, create/invite, edit) were fully implemented and in active QA by end of February. Formal resolution carried into early March as acceptance testing concluded.',
      'IP Owner Mgmt': 'IP Owner listing was completed and resolved in February. The detail view was implemented and in QA, with formal resolution in early March. IP Owner management is a prerequisite for the Filing workflow (Scenario 1).',
      'Settings (Admin)': 'Branding configuration and seed data were completed in February. Categories management was implemented and in QA, with resolution in early March.',
      'Authentication/Authorisation': 'Login/Logout flow, IdP setup, and role-based scopes were completed and resolved in February. This represents the full authentication and authorization baseline for the platform.',
      'Ask AMS': 'RAG-based AI knowledge base indexing was completed and resolved in February. This establishes the data foundation for the intelligent Ask AMS chat feature.',
      'Jurisdiction Management': 'Jurisdiction listing was implemented and in active development by end of February, with completion in early March. Required for trademark filing across multiple jurisdictions.',
      'Task Management': 'Task Scheduler backend logic was implemented and progressed through Sprint 2. Implementation was ongoing at end of February, with formal completion in a subsequent sprint.',
    },
    valueBridge: 'February\'s effort established the shared technical foundation that underpins all three MVP scenarios. Items formally completed this month — authentication, CI/CD, branding, seed data, IP Owner listing — are direct enablers for Filing (Scenario 1, 20% of scope) and Agency Onboarding (Scenario 3, 60% of scope). The modules that progressed substantially but completed in early March (User Management, Agency Management, Jurisdictions) reflect the natural overlap between sprint cycles and calendar months in agile delivery: the effort was invested in February, QA confirmation followed shortly after. With these foundations in place and additional senior capacity joining from March, delivery velocity is expected to increase in the coming months.',
  },

  // ── HOW TO ADD A NEW MONTH ────────────────────────────────────────────────
  // 1. Run export_json.py with the new Jira CSV + timesheet XLSX
  // 2. Copy one of the blocks below, update the key (YYYY-MM) and all text fields
  // 3. Use the Done tickets table in the dashboard to verify which items were
  //    formally resolved in that month vs. which were progressed but resolved later
  // ─────────────────────────────────────────────────────────────────────────

  '2026-03': {
    executiveSummary: '[ TODO — fill in after March closes. Cover: which sprints ran, what was completed vs. progressed, any notable velocity changes or impediments. ]',
    generalNarrative: '[ TODO — break down cross-cutting effort: architecture work, ceremonies, coordination, onboarding, CI/CD changes. ]',
    epicNarratives: {
      // Add one entry per epic that had significant effort in March.
      // Key must match the epic_name in Jira exactly (check the epic table in the dashboard).
      // Example:
      // 'User & Agency Management': 'Agency invitation flow and user role management were completed and resolved in March. ...',
    },
    valueBridge: '[ TODO — connect March completions to MVP scenario progress. Reference Scenario 1 (Filing), Scenario 3 (Agency Onboarding), and overall MVP readiness. ]',
  },

  '2026-04': {
    executiveSummary: '[ TODO — fill in after April closes. ]',
    generalNarrative: '[ TODO ]',
    epicNarratives: {},
    valueBridge: '[ TODO ]',
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

// Generate Word document content as HTML for export — styled to match Acuity SOW template
function generateWordHtml(report, selectedMonth, logoDataUrl) {
  const ml = monthLabelFull(selectedMonth)
  const ctx = MONTH_CONTEXT[selectedMonth]

  // ── shared cell style helpers ────────────────────────────────────────────
  const TD  = 'padding:5pt 10pt;border:1pt solid #D6D2D0;font-size:10pt;font-family:Arial,sans-serif;'
  const TH  = 'padding:5pt 10pt;border:1pt solid #D6D2D0;font-size:10pt;font-family:Arial,sans-serif;font-weight:bold;background-color:#00959A;color:#FFFFFF;text-align:left;'
  const TDR = TD + 'text-align:right;'
  const THR = TH + 'text-align:right;'
  const TOT = TD + 'font-weight:bold;background-color:#F3F0EC;'
  const TOTR= TDR + 'font-weight:bold;background-color:#F3F0EC;'
  const odd = TD + 'background-color:#F3F0EC;'
  const oddR= TDR + 'background-color:#F3F0EC;'
  const even= TD + 'background-color:#FFFFFF;'
  const evenR=TDR + 'background-color:#FFFFFF;'
  const rowStyle = i => i % 2 === 0 ? odd : even
  const rowStyleR= i => i % 2 === 0 ? oddR : evenR

  const actRows = report.activityData.map((a, i) =>
    `<tr><td style="${rowStyle(i)}">${a.name}</td><td style="${rowStyleR(i)}">${fmtH(a.hours)}</td><td style="${rowStyleR(i)}">${a.pct}%</td></tr>`
  ).join('')
  const actDescs = report.activityData.map(a =>
    `<p style="margin:4pt 0 8pt;font-size:10pt"><strong>${a.name}:</strong> ${a.activityDescription}</p>`
  ).join('')
  const epicRows = report.epicData.map((e, i) =>
    `<tr><td style="${rowStyle(i)}">${e.name}</td><td style="${rowStyleR(i)}">${fmtH(e.hours)}</td><td style="${rowStyleR(i)}">${e.pct}%</td></tr>`
  ).join('')
  const epicNarratives = report.epicData.map(e => {
    const isGeneral = e.name === 'General / Cross-cutting'
    let narrative
    if (ctx?.epicNarratives?.[e.name]) {
      narrative = ctx.epicNarratives[e.name]
    } else if (isGeneral) {
      narrative = ctx?.generalNarrative || 'This category covers cross-cutting activities not linked to specific epics, including sprint ceremonies (planning, reviews, retrospectives), refinement sessions, technical onboarding, architecture discussions, code reviews, and general coordination.'
    } else {
      narrative = `${e.ticketCount > 0 ? `${e.ticketCount} tracked item${e.ticketCount > 1 ? 's were' : ' was'} actively worked on during this period across ${e.bookings} time bookings. ` : ''}${e.noTicketHours > 0 ? `Additionally, ${fmtH(e.noTicketHours)} were invested in supporting activities such as refinement, planning, and technical discussions related to this workstream.` : 'Effort included implementation, testing, and review activities contributing to this module\'s progress.'}`
    }
    return `<p style="margin:6pt 0;font-size:10pt"><strong style="color:#0E2841">${e.name}</strong> <span style="color:#595959">(${fmtH(e.hours)}, ${e.pct}% of total effort)</span><br>${narrative}</p>`
  }).join('')
  const roleRows = report.roleData.map((r, i) =>
    `<tr><td style="${rowStyle(i)}">${r.role}</td><td style="${rowStyleR(i)}">${r.count}</td><td style="${rowStyleR(i)}">${fmtH(r.soll)}</td><td style="${rowStyleR(i)}">${fmtH(r.ist)}</td><td style="${rowStyleR(i)}">${r.pct}%</td></tr>`
  ).join('')
  const doneTicketRows = report.doneTickets.map((t, i) => {
    const inMonth = t.resolved_date && t.resolved_date.startsWith(selectedMonth)
    const resolvedLabel = t.resolved_date
      ? new Date(t.resolved_date + 'T12:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
      : '—'
    const hoursCell = t.noBookingsThisMonth ? '<em style="color:#595959">prior month</em>' : fmtH(t.hours)
    const resolvedColor = inMonth ? 'color:#196B24;' : 'color:#E97132;'
    const base = i % 2 === 0 ? 'background-color:#F3F0EC;' : 'background-color:#FFFFFF;'
    const cell = `padding:5pt 10pt;border:1pt solid #D6D2D0;font-size:10pt;font-family:Arial,sans-serif;${base}`
    return `<tr>
      <td style="${cell}font-family:monospace;color:#156082;font-weight:bold">${t.key}</td>
      <td style="${cell}">${t.summary || '—'}</td>
      <td style="${cell}">${t.type || 'Task'}</td>
      <td style="${cell}color:#595959">${t.epic || '—'}</td>
      <td style="${cell}text-align:right">${hoursCell}</td>
      <td style="${cell}text-align:right;${resolvedColor}font-weight:bold">${resolvedLabel}</td>
    </tr>`
  }).join('')

  const logoHtml = logoDataUrl
    ? `<img src="${logoDataUrl}" style="height:40px;display:block" alt="Acuity Logo">`
    : '<span style="font-size:14pt;font-weight:bold;color:#00959A">Acuity</span>'

  return `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><style>
@page {
  size: letter;
  margin: 1in;
  mso-header-margin: .5in;
  mso-footer-margin: .5in;
  mso-header: h1;
  mso-footer: f1;
}
body {
  font-family: Arial, sans-serif;
  font-size: 10pt;
  color: #000000;
  line-height: 1.4;
}
h1 {
  font-family: Arial, sans-serif;
  font-size: 18pt;
  font-weight: bold;
  color: #000000;
  margin: 28pt 0 8pt;
  padding-bottom: 5pt;
  border-bottom: 2pt solid #00959A;
  mso-border-bottom-alt: solid #00959A 2.0pt;
}
h2 {
  font-family: Arial, sans-serif;
  font-size: 14pt;
  font-weight: bold;
  color: #000000;
  margin: 20pt 0 6pt;
  padding-bottom: 3pt;
  border-bottom: 1pt solid #D6D2D0;
}
h3 {
  font-family: Arial, sans-serif;
  font-size: 12pt;
  font-weight: bold;
  color: #0E2841;
  margin: 14pt 0 4pt;
}
p { font-size: 10pt; margin: 0 0 6pt; }
ul { margin: 4pt 0 8pt; padding-left: 20pt; }
li { font-size: 10pt; margin-bottom: 3pt; }
table { border-collapse: collapse; width: 100%; margin: 8pt 0 14pt; }
.note {
  background-color: #F3F0EC;
  border-left: 3pt solid #00959A;
  padding: 8pt 14pt;
  margin: 12pt 0;
  font-size: 9.5pt;
  mso-border-left-alt: solid #00959A 3.0pt;
}
</style></head>
<body>

<div style="mso-element:header" id="h1">
  <table style="width:100%;border:none;margin:0">
    <tr>
      <td style="border:none;padding:0">${logoHtml}</td>
      <td style="border:none;padding:0;text-align:right;font-size:8pt;color:#595959;font-family:Arial,sans-serif">Monthly Delivery &amp; Effort Report</td>
    </tr>
  </table>
  <hr style="border:none;border-top:1pt solid #00959A;margin:4pt 0 0">
</div>

<div style="mso-element:footer" id="f1">
  <hr style="border:none;border-top:1pt solid #D6D2D0;margin:0 0 4pt">
  <table style="width:100%;border:none;margin:0">
    <tr>
      <td style="border:none;padding:0;font-size:8pt;color:#595959;font-family:Arial,sans-serif">AMS Project — ${ml}</td>
      <td style="border:none;padding:0;text-align:right;font-size:8pt;color:#595959;font-family:Arial,sans-serif">Page <span style="mso-field-code:PAGE"></span> of <span style="mso-field-code:NUMPAGES"></span></td>
    </tr>
  </table>
</div>

<!-- COVER / TITLE BLOCK -->
<div style="margin-bottom:32pt;padding-bottom:16pt;border-bottom:2pt solid #00959A">
  ${logoHtml}
  <p style="font-size:22pt;font-weight:bold;color:#000000;margin:20pt 0 4pt">Monthly Delivery &amp; Effort Report</p>
  <p style="font-size:16pt;color:#0E2841;margin:0 0 12pt">${ml}</p>
  <table style="width:auto;border:none;margin:0">
    <tr>
      <td style="border:none;padding:2pt 24pt 2pt 0;font-size:10pt;color:#595959;font-family:Arial,sans-serif"><strong>Total Effort:</strong></td>
      <td style="border:none;padding:2pt 0;font-size:10pt;font-weight:bold;color:#00959A;font-family:Arial,sans-serif">${fmtH(report.totalHours)}</td>
    </tr>
    <tr>
      <td style="border:none;padding:2pt 24pt 2pt 0;font-size:10pt;color:#595959;font-family:Arial,sans-serif"><strong>Planned Capacity:</strong></td>
      <td style="border:none;padding:2pt 0;font-size:10pt;font-family:Arial,sans-serif">${fmtH(report.totalSoll)}</td>
    </tr>
    <tr>
      <td style="border:none;padding:2pt 24pt 2pt 0;font-size:10pt;color:#595959;font-family:Arial,sans-serif"><strong>Utilization:</strong></td>
      <td style="border:none;padding:2pt 0;font-size:10pt;font-family:Arial,sans-serif">${report.pctUtilization}%</td>
    </tr>
    <tr>
      <td style="border:none;padding:2pt 24pt 2pt 0;font-size:10pt;color:#595959;font-family:Arial,sans-serif"><strong>Items Completed:</strong></td>
      <td style="border:none;padding:2pt 0;font-size:10pt;font-family:Arial,sans-serif">${report.doneTickets.length}</td>
    </tr>
  </table>
</div>

<h1>1. Executive Summary</h1>
<p>During ${ml}, a total of <strong>${fmtH(report.totalHours)}</strong> of project effort was delivered against a planned capacity of <strong>${fmtH(report.totalSoll)}</strong>, resulting in a <strong>${report.pctUtilization}%</strong> utilization rate.</p>
${ctx?.executiveSummary ? `<p>${ctx.executiveSummary}</p>` : `<p>The primary focus areas were ${report.epicData.slice(0, 3).map(e => `<strong>${e.name}</strong>`).join(', ')}.</p>`}
<div class="note">
<strong>Note:</strong> Billed effort covers the full scope of project work — including architecture, infrastructure, technical design, sprint ceremonies, refinements, code reviews, QA preparation, and coordination. These activities do not always result in completed tickets but are essential for sustainable project delivery.
</div>

<h1>2. Effort Breakdown by Activity Type</h1>
<p>The following table shows how effort was distributed across the different disciplines involved in the project:</p>
<table>
<tr><th style="${TH}">Activity Type</th><th style="${THR}">Hours</th><th style="${THR}">Share</th></tr>
${actRows}
<tr><td style="${TOT}">Total</td><td style="${TOTR}">${fmtH(report.totalHours)}</td><td style="${TOTR}">100%</td></tr>
</table>
<h3>What Each Activity Type Includes</h3>
${actDescs}

<h1>3. Effort Mapping to Epics / Workstreams</h1>
<p>Effort was distributed across the following functional areas and modules:</p>
<table>
<tr><th style="${TH}">Epic / Workstream</th><th style="${THR}">Hours</th><th style="${THR}">Share</th></tr>
${epicRows}
<tr><td style="${TOT}">Total</td><td style="${TOTR}">${fmtH(report.totalHours)}</td><td style="${TOTR}">100%</td></tr>
</table>
<h3>Workstream Narratives</h3>
${epicNarratives}

<h1>4. Delivery Progress Overview</h1>
<p>During ${ml}, a total of <strong>${report.tickets.length}</strong> items were actively worked on:</p>
<ul>
<li><strong>${report.doneTickets.length}</strong> items completed &mdash; ${fmtH(report.doneTickets.reduce((s,t) => s+t.hours, 0))} effort</li>
<li><strong>${report.inProgressTickets.length}</strong> items in progress &mdash; ${fmtH(report.inProgressTickets.reduce((s,t) => s+t.hours, 0))} effort</li>
<li><strong>${report.otherTickets.length}</strong> items in review / QA &mdash; ${fmtH(report.otherTickets.reduce((s,t) => s+t.hours, 0))} effort</li>
</ul>

${report.doneTickets.length > 0 ? `
<h3>Items Completed in ${ml}</h3>
<table>
<tr>
  <th style="${TH}">Ticket</th>
  <th style="${TH}">Name</th>
  <th style="${TH}">Type</th>
  <th style="${TH}">Epic / Workstream</th>
  <th style="${THR}">Hours</th>
  <th style="${THR}">Resolved</th>
</tr>
${doneTicketRows}
</table>
<p style="font-size:9pt;color:#595959">&#9679; <span style="color:#196B24">Green</span> = resolved within ${ml} &nbsp; &#9679; <span style="color:#E97132">Amber</span> = resolved outside reporting month</p>
` : ''}

<div class="note">
<strong>Note on Enabling Work:</strong> A portion of effort is invested in cross-cutting activities such as architecture, infrastructure, CI/CD pipelines, sprint planning, refinements, and code reviews. These activities are included in the total effort but are not tracked as individual tickets.
</div>

<h1>5. Plan vs. Actual (by Role)</h1>
<p>Planned and actual effort by discipline, anonymised (no individual names):</p>
<table>
<tr><th style="${TH}">Role</th><th style="${THR}">Team Members</th><th style="${THR}">Planned</th><th style="${THR}">Actual</th><th style="${THR}">Utilization</th></tr>
${roleRows}
<tr><td style="${TOT}">Total</td><td style="${TOTR}">${report.roleData.reduce((s,r) => s+r.count, 0)}</td><td style="${TOTR}">${fmtH(report.totalSoll)}</td><td style="${TOTR}">${fmtH(report.totalHours)}</td><td style="${TOTR}">${report.pctUtilization}%</td></tr>
</table>
${Math.abs(report.totalHours - report.totalSoll) > 50 ? `<div class="note"><strong>Deviation note:</strong> ${report.totalHours < report.totalSoll ? 'Actual effort was below planned capacity. This may be attributed to availability differences, public holidays, or lower coordination overhead than initially forecasted.' : 'Actual effort exceeded planned capacity. This may be attributed to additional alignment rounds, unforeseen technical requirements, or more extensive QA cycles.'}</div>` : ''}

${ctx?.valueBridge ? `<h1>6. Value Contribution &amp; MVP Progress</h1>
<p>${ctx.valueBridge}</p>` : ''}

<h1>${ctx?.valueBridge ? '7' : '6'}. Transparency Notes</h1>
<p><strong>Effort-Based Billing:</strong> Billing is based on actual effort delivered (Time &amp; Materials) as per the Statement of Work. Effort includes all activities necessary for project delivery, not only completed tickets.</p>
<p><strong>Sprint Governance:</strong> All work was organised within the agreed sprint framework, including Sprint Planning, Daily Stand-ups, Sprint Reviews, and Retrospectives.</p>
<p><strong>Traceability:</strong> All effort is fully documented through Jira and the time tracking system, and is available for review at any time.</p>
<p><strong>Enabling Work:</strong> Effort invested in architecture, infrastructure, CI/CD, code reviews, and technical debt management is an integral part of delivery and is included in total effort figures.</p>

<hr style="margin-top:36pt;border:none;border-top:1pt solid #D6D2D0">
<p style="font-size:8pt;color:#595959;text-align:center">Confidential — ${ml} — Generated from project data</p>

</body></html>`
}

export default function MonthlyReportTab({ data }) {
  const { forecast, meta, timesheet } = data
  const { persons, soll_totals, ist_totals, months } = forecast
  const currM = meta.curr_month

  // All months with timesheet data — these are "reportable"
  const timesheetMonths = useMemo(() =>
    [...new Set(timesheet.map(e => e.month).filter(Boolean))].sort()
  , [timesheet])

  // Closed = has timesheet data AND is before current month
  const closedMonths = useMemo(() =>
    timesheetMonths.filter(m => m < currM)
  , [timesheetMonths, currM])

  // Full display range: from earliest known month to currM + 3 (upcoming, grayed out)
  const allDisplayMonths = useMemo(() => {
    const earliest = timesheetMonths[0] || currM
    const [ey, em] = earliest.split('-').map(Number)
    const [cy, cm] = currM.split('-').map(Number)
    const result = []
    // from earliest to currM + 3
    let y = ey, m = em
    const endM = cm + 3, endY = endM > 12 ? cy + 1 : cy
    const endMAdj = endM > 12 ? endM - 12 : endM
    while (y < endY || (y === endY && m <= endMAdj)) {
      result.push(`${y}-${String(m).padStart(2, '0')}`)
      m++; if (m > 12) { m = 1; y++ }
    }
    return result
  }, [timesheetMonths, currM])

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

    // Build lookup maps from tickets master list
    const resolvedDateByKey = {}
    const summaryByKey = {}
    ;(data.tickets || []).forEach(t => {
      if (t.resolved_date) resolvedDateByKey[t.key] = t.resolved_date
      if (t.summary) summaryByKey[t.key] = t.summary
    })

    // Tickets
    const ticketMap = {}
    entries.forEach(e => {
      if (!e.ticket) return
      if (!ticketMap[e.ticket]) {
        ticketMap[e.ticket] = {
          key: e.ticket,
          summary: summaryByKey[e.ticket] || null,
          type: e.issue_type,
          status: e.jira_status,
          epic: e.epic_name,
          hours: 0,
          resolved_date: resolvedDateByKey[e.ticket] || null,
        }
      }
      ticketMap[e.ticket].hours += e.hours || 0
    })
    // Add tickets resolved in this month but with no bookings in this month (e.g. work done in prior month)
    ;(data.tickets || []).forEach(t => {
      if (t.resolved_date && t.resolved_date.startsWith(sm) && !ticketMap[t.key]) {
        ticketMap[t.key] = {
          key: t.key,
          summary: t.summary || null,
          type: t.type || t.issue_type || 'Story',
          status: 'Done',
          epic: t.epic_name || '',
          hours: 0,
          resolved_date: t.resolved_date,
          noBookingsThisMonth: true,
        }
      }
    })

    const tickets = Object.values(ticketMap).sort((a, b) => b.hours - a.hours)
    // Done = resolved in this reporting month (or no resolved date but marked Done)
    const doneTickets = tickets.filter(t =>
      t.status === 'Done' && (!t.resolved_date || t.resolved_date.startsWith(sm))
    )
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

  // Word export — async to embed logo as base64
  const exportWord = useCallback(async () => {
    if (!report) return
    let logoDataUrl = ''
    try {
      const resp = await fetch('/images/acuity-logo.png')
      const imgBlob = await resp.blob()
      logoDataUrl = await new Promise(resolve => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.readAsDataURL(imgBlob)
      })
    } catch (e) {
      console.warn('Could not load Acuity logo for Word export', e)
    }
    const html = generateWordHtml(report, selectedMonth, logoDataUrl)
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
        <div className="flex gap-2 flex-wrap">
          {allDisplayMonths.map(m => {
            const isClosed = closedMonths.includes(m)
            const isCurrent = m === currM
            const isFuture = m > currM
            const isSelected = m === selectedMonth
            return (
              <button
                key={m}
                onClick={() => isClosed && setSelectedMonth(m)}
                disabled={!isClosed}
                title={isCurrent ? 'In progress' : isFuture ? 'Not yet available' : undefined}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                    : isClosed
                      ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 cursor-pointer'
                      : 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800'
                }`}
              >
                {monthLabel(m)}
                {isCurrent && <span className="ml-1 text-xs opacity-60">●</span>}
                {isFuture && <span className="ml-1 text-xs opacity-40">○</span>}
              </button>
            )
          })}
        </div>
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
                {(() => {
                  const monthCtx = MONTH_CONTEXT[selectedMonth]
                  return monthCtx?.executiveSummary ? (
                    <div className="text-zinc-400 text-sm leading-relaxed mb-4">
                      <p className="mb-2">
                        During {monthLabelFull(selectedMonth)}, a total of{' '}
                        <span className="text-zinc-100 font-semibold">{fmtH(report.totalHours)}</span> of
                        project effort was delivered against a planned capacity of{' '}
                        <span className="text-zinc-100 font-semibold">{fmtH(report.totalSoll)}</span>,
                        resulting in a <span className="text-zinc-100 font-semibold">{report.pctUtilization}%</span> utilization rate.
                      </p>
                      <p>{monthCtx.executiveSummary}</p>
                    </div>
                  ) : (
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
                  )
                })()}
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
                  </tr>
                </thead>
                <tbody>
                  {report.epicData.map(e => (
                    <tr key={e.name} className="hover:bg-zinc-800/30 transition-colors border-b border-zinc-800/50">
                      <td className="table-td font-medium text-zinc-100">{e.name}</td>
                      <td className="table-td text-right text-zinc-200">{fmtH(e.hours)}</td>
                      <td className="table-td text-right"><span className="text-xs font-bold text-blue-400">{e.pct}%</span></td>
                    </tr>
                  ))}
                  <tr className="bg-zinc-800/50 font-bold border-t-2 border-zinc-700">
                    <td className="table-td text-zinc-100">Total</td>
                    <td className="table-td text-right text-zinc-100">{fmtH(report.totalHours)}</td>
                    <td className="table-td text-right text-blue-400">100%</td>
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
                const monthCtx = MONTH_CONTEXT[selectedMonth]
                const epicNarrative = monthCtx?.epicNarratives?.[e.name]
                const generalNarrative = monthCtx?.generalNarrative
                return (
                  <div key={e.name} className="px-4 py-3 bg-zinc-800/20 rounded-lg border border-zinc-800/50">
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      <span className="font-semibold text-zinc-100">{e.name}</span>{' '}
                      <span className="text-zinc-500">({fmtH(e.hours)}, {e.pct}% of total effort)</span> —{' '}
                      {epicNarrative
                        ? epicNarrative
                        : isGeneral
                          ? (generalNarrative || 'This category covers cross-cutting activities not linked to specific epics, including sprint ceremonies (planning, reviews, retrospectives), refinement sessions, technical onboarding, architecture discussions, code reviews, and general coordination. These activities are foundational to delivery and ensure alignment across all workstreams.')
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
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-zinc-800/40">
                        <th className="table-th">Ticket</th>
                        <th className="table-th">Name</th>
                        <th className="table-th">Type</th>
                        <th className="table-th">Epic</th>
                        <th className="table-th text-right">Hours</th>
                        <th className="table-th text-right">Resolved</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.doneTickets.map(t => {
                        const inMonth = t.resolved_date && t.resolved_date.startsWith(selectedMonth)
                        const resolvedLabel = t.resolved_date
                          ? new Date(t.resolved_date + 'T12:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
                          : '—'
                        return (
                          <tr key={t.key} className="hover:bg-zinc-800/30 transition-colors border-b border-zinc-800/50">
                            <td className="table-td font-mono text-blue-400 text-xs whitespace-nowrap">
                              {t.key}
                              {t.noBookingsThisMonth && <span className="ml-1 text-zinc-600" title="Effort booked in prior month">*</span>}
                            </td>
                            <td className="table-td text-zinc-200 max-w-[220px]">
                              <span className="block truncate" title={t.summary || ''}>{t.summary || '—'}</span>
                            </td>
                            <td className="table-td">
                              <span className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ${t.type === 'Story' ? 'bg-green-500/20 text-green-400' : t.type === 'Bug' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                {t.type || 'Task'}
                              </span>
                            </td>
                            <td className="table-td text-zinc-400 max-w-[160px] truncate">{t.epic || '-'}</td>
                            <td className="table-td text-right font-semibold text-zinc-200">
                              {t.noBookingsThisMonth ? <span className="text-zinc-500 text-xs">prior month</span> : fmtH(t.hours)}
                            </td>
                            <td className="table-td text-right">
                              <span className={`text-xs font-mono px-2 py-0.5 rounded ${inMonth ? 'bg-green-500/15 text-green-400' : 'bg-amber-500/15 text-amber-400'}`}>
                                {resolvedLabel}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  <span className="inline-block w-2 h-2 rounded bg-green-500/40 mr-1" />resolved within {monthLabel(selectedMonth)} &nbsp;
                  <span className="inline-block w-2 h-2 rounded bg-amber-500/40 mr-1 ml-3" />resolved outside reporting month
                </p>
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

          {/* 6. VALUE BRIDGE (month-specific) */}
          {MONTH_CONTEXT[selectedMonth]?.valueBridge && (
            <div className="card card-hover border-l-4 border-l-purple-500">
              <SectionHeader number="5" title="Value Contribution & MVP Progress" subtitle="How this month's effort contributes to MVP delivery" />
              <div className="mt-4 bg-zinc-800/20 rounded-lg p-5 border border-zinc-800/50">
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {MONTH_CONTEXT[selectedMonth].valueBridge}
                </p>
              </div>
            </div>
          )}

          {/* 7. TRANSPARENCY NOTES */}
          <div className="card card-hover border-l-4 border-l-emerald-500">
            <SectionHeader number={MONTH_CONTEXT[selectedMonth]?.valueBridge ? "6" : "5"} title="Transparency Notes" subtitle="Billing and governance context" />

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
