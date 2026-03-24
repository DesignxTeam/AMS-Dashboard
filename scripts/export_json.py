#!/usr/bin/env python3
"""
AMS Dashboard – JSON Data Exporter
====================================
Liest die generierten Quelldateien und schreibt
  app/public/data/dashboard.json
für die React Web App.

Aufruf:
  python3 scripts/export_json.py

Das Skript verwendet dieselben Quelldaten wie update_dashboard.py,
berechnet alle nötigen Aggregationen und exportiert sie als sauberes JSON.
"""

import os, sys, re, csv, json, datetime, configparser
import openpyxl
from collections import defaultdict

BASE      = os.path.dirname(os.path.abspath(__file__))
PARENT    = os.path.dirname(BASE)
PBI_FILE  = os.path.join(PARENT, 'powerbi_bookings.xlsx')
JIRA_FILE = os.path.join(PARENT, 'jira_export.csv')
OUT_DIR   = os.path.join(PARENT, 'app', 'public', 'data')
OUT_FILE  = os.path.join(OUT_DIR, 'dashboard.json')

os.makedirs(OUT_DIR, exist_ok=True)

# ── Sprint schedule ────────────────────────────────────────────────
SPRINT_SCHEDULE = [
    ('S0','Sprint 0','20.01–03.02', datetime.date(2026,1,20),  datetime.date(2026,2,3)),
    ('S1','Sprint 1','03.02–17.02', datetime.date(2026,2,3),   datetime.date(2026,2,17)),
    ('S2','Sprint 2','17.02–03.03', datetime.date(2026,2,17),  datetime.date(2026,3,3)),
    ('S3','Sprint 3','03.03–17.03', datetime.date(2026,3,3),   datetime.date(2026,3,17)),
    ('S4','Sprint 4','17.03–31.03', datetime.date(2026,3,17),  datetime.date(2026,3,31)),
    ('S5','Sprint 5','31.03–14.04', datetime.date(2026,3,31),  datetime.date(2026,4,14)),
    ('S6','Sprint 6','14.04–28.04', datetime.date(2026,4,14),  datetime.date(2026,4,28)),
]

# ── Forecast Soll config ───────────────────────────────────────────
FORECAST_SOLL = {
    'Robert Grillitsch':  {'role':'Product Owner',    'rate': 90, '2026-02': 70,  '2026-03': 70,  '2026-04': 70},
    'Rene Schantl':       {'role':'Software Engineer','rate':100, '2026-02':140,  '2026-03':140,  '2026-04':140},
    'Niamh Akerman':      {'role':'Software Engineer','rate':100, '2026-02': 84,  '2026-03':112,  '2026-04':112},
    'Andreas Maureder':   {'role':'Software Engineer','rate':100, '2026-02':112,  '2026-03':112,  '2026-04':112},
    'Vasil Krumov':       {'role':'Software Engineer','rate': 80, '2026-02':154,  '2026-03':154,  '2026-04':154},
    'Georgi Tsvetkov':    {'role':'Software Engineer','rate': 80, '2026-02':154,  '2026-03':154,  '2026-04':154},
    'Elias Martinek':     {'role':'Software Engineer','rate':100, '2026-02':154,  '2026-03':154,  '2026-04':154},
    'Alexander Toch':     {'role':'Software Engineer','rate':100, '2026-02':140,  '2026-03':140,  '2026-04':140},
    'Clemens Posch':      {'role':'UX/UI Designer',   'rate':100, '2026-02': 70,  '2026-03': 70,  '2026-04': 70},
    'Katharina Schober':  {'role':'UX/UI Designer',   'rate':100, '2026-02':  0,  '2026-03':  0,  '2026-04':  0},
    'Mariia Razno':       {'role':'Data Scientist',   'rate':100, '2026-02': 70,  '2026-03':140,  '2026-04':  0},
    'Jelena Zdravkovic':  {'role':'QA Engineer',      'rate': 80, '2026-02': 70,  '2026-03': 70,  '2026-04': 70},
    'Kalina Marinova':    {'role':'QA Engineer',      'rate': 80, '2026-02': 77,  '2026-03': 77,  '2026-04': 77},
    'Thomas Fink':        {'role':'Product Owner',    'rate':100, '2026-02': 28,  '2026-03': 28,  '2026-04': 28},
    'Claudia Perus':      {'role':'Product Owner',    'rate':100, '2026-02': 70,  '2026-03': 70,  '2026-04': 70},
    'Rene Lechelt':       {'role':'Software Engineer','rate':100, '2026-02':154,  '2026-03':154,  '2026-04':154},
    'Ondrej Hanel':       {'role':'Software Engineer','rate':100, '2026-02':  0,  '2026-03':112,  '2026-04':112},
    'Ilma Lušija':        {'role':'Software Engineer','rate':100, '2026-02':  0,  '2026-03':140,  '2026-04':140},
}

SERVICE_ITEM_ROLE = {
    'Product Owner - NS':    'Product Owner',
    'Software Engineer - NS':'Software Engineer',
    'UX/UI Designer - NS':   'UX/UI Designer',
    'QA Engineer - NS':      'QA Engineer',
    'Data Scientist':        'Data Scientist',
}
TICKET_HOURS_EXCLUDE_ROLES = {'QA Engineer'}
AVG_RATE = 92

now        = datetime.datetime.now()
curr_month = now.strftime('%Y-%m')
prev_month = (now.replace(day=1) - datetime.timedelta(days=1)).strftime('%Y-%m')

# ── Auto-detect current sprint ─────────────────────────────────────
today_date = now.date()
CURRENT_SP_KEY = SPRINT_SCHEDULE[-1][0]
for _sk, _sn, _sd, _ss, _se in SPRINT_SCHEDULE:
    if _ss <= today_date < _se:
        CURRENT_SP_KEY = _sk
        break

# ─────────────────────────────────────────────────────────────────────────────
# 1. LOAD JIRA
# ─────────────────────────────────────────────────────────────────────────────
issue_info = {}
with open(JIRA_FILE, newline='', encoding='utf-8-sig') as f:
    raw_reader = csv.reader(f)
    raw_header = next(raw_reader)
    raw_rows   = list(raw_reader)

sprint_col_indices = [i for i, h in enumerate(raw_header) if h.strip().lower() == 'sprint']
_col = {h.strip(): i for i, h in enumerate(raw_header)}

def _get(raw_row, *names, default=''):
    for n in names:
        i = _col.get(n)
        if i is not None and i < len(raw_row) and raw_row[i].strip():
            return raw_row[i].strip()
    return default

def _get_sprint_raw(raw_row):
    for i in sprint_col_indices:
        if i < len(raw_row) and raw_row[i].strip():
            return raw_row[i].strip()
    return ''

for raw_row in raw_rows:
    key = _get(raw_row, 'Issue key')
    if not key: continue
    sp = None
    try:
        raw_sp = _get(raw_row, 'Story Points', 'Custom field (Story Points)')
        sp = float(raw_sp) if raw_sp else None
    except: pass
    sprint_val   = _get_sprint_raw(raw_row)
    parent_key   = _get(raw_row, 'Parent key', 'Parent')
    parent_summ  = _get(raw_row, 'Parent summary')
    issue_info[key] = {
        'status':         _get(raw_row, 'Status'),
        'type':           _get(raw_row, 'Issue Type'),
        'parent_key':     parent_key,
        'parent_summary': parent_summ,
        'summary':        _get(raw_row, 'Summary'),
        'sp':             sp,
        'sprint':         sprint_val,
        'assignee':       _get(raw_row, 'Assignee'),
        'updated':        _get(raw_row, 'Updated'),
        'resolved':       _get(raw_row, 'Resolved'),
        'priority':       _get(raw_row, 'Priority'),
        'epic_key':       _get(raw_row, 'Epic Link'),
    }

def get_epic(key, depth=0):
    """Returns (epic_key, epic_summary) for any issue.
    Since epics are not in the CSV export, we use parent_key + parent_summary."""
    if depth > 6 or not key or key not in issue_info: return None, None
    info = issue_info[key]
    # Direct Epic Link field (from API exports)
    direct = info.get('epic_key', '')
    if direct and direct in issue_info and issue_info[direct]['type'] == 'Epic':
        return direct, issue_info[direct]['summary']
    # Parent key with its summary (parent not in CSV = it's an Epic level)
    pk = info.get('parent_key', '')
    ps = info.get('parent_summary', '')
    if pk and pk not in issue_info and ps:
        # Parent is not exported → treat as pseudo-epic
        return pk, ps
    if pk and pk in issue_info:
        return get_epic(pk, depth + 1)
    return None, None

def norm_sprint(s):
    if not s: return None
    for i in range(7):
        if f'Sprint {i}' in s: return f'S{i}'
    return None

def sprint_by_resolved(date_str):
    if not date_str: return None
    for fmt in ('%d/%b/%y %I:%M %p', '%d/%b/%y', '%d/%m/%Y %I:%M %p', '%d/%m/%Y'):
        try:
            d = datetime.datetime.strptime(date_str.strip(), fmt).date()
            for sid, _, _, ss, se in SPRINT_SCHEDULE:
                if ss <= d < se: return sid
            return None
        except: continue
    return None

def is_subtask(issue_type):
    t = (issue_type or '').strip().lower()
    return t in ('sub-task', 'subtask')

# ─────────────────────────────────────────────────────────────────────────────
# 2. LOAD PBI
# ─────────────────────────────────────────────────────────────────────────────
wb = openpyxl.load_workbook(PBI_FILE)
ws = wb.active
pbi_rows = list(ws.iter_rows(values_only=True))

hours_person_month  = defaultdict(lambda: defaultdict(float))
hours_person_sprint = defaultdict(lambda: defaultdict(float))
hours_by_story      = defaultdict(float)
hours_by_issue      = defaultdict(float)
assignees_by_story  = defaultdict(set)
timesheet_rows      = []
ticket_hours_source_all = 0.0
ticket_hours_source_included = 0.0
unmapped_ticket_hours = defaultdict(float)

for r in pbi_rows[1:]:
    d = r[0]
    if not isinstance(d, datetime.datetime): continue
    month  = d.strftime('%Y-%m')
    user   = str(r[4]) if r[4] else ''
    si     = str(r[5]) if r[5] else ''
    memo   = str(r[6]) if r[6] else ''
    t_raw  = str(r[7]) if r[7] else ''
    try: h = float(r[8])
    except: h = 0.0

    matches = re.findall(r'AMS-\d+', t_raw)
    ticket = matches[0] if matches else ''

    # If the first key is unknown but additional keys exist, try the first key known in Jira.
    # This catches booking texts like "AMS-69, AMS-68" where the second key is the real parent ticket.
    jira_ticket = ticket
    if matches and (not jira_ticket or jira_ticket not in issue_info):
        for candidate in matches[1:]:
            if candidate in issue_info:
                jira_ticket = candidate
                break

    story_key = jira_ticket
    # Map sub-task bookings to their parent task/story for all downstream exports.
    if jira_ticket and jira_ticket in issue_info and is_subtask(issue_info[jira_ticket]['type']):
        story_key = issue_info[jira_ticket]['parent_key'] or jira_ticket

    jira_status, epic_key, epic_name = '', '', ''
    jira_lookup_key = story_key if story_key in issue_info else jira_ticket
    if jira_lookup_key and jira_lookup_key in issue_info:
        jira_status = issue_info[jira_lookup_key]['status']
        ek, en = get_epic(jira_lookup_key)
        epic_key, epic_name = (ek or ''), (en or '')

    if user:
        hours_person_month[user][month] += h
        for _sid, _, _, _sp_start, _sp_end in SPRINT_SCHEDULE:
            if _sp_start <= d.date() < _sp_end:
                hours_person_sprint[user][_sid] += h
                break
    booking_role = SERVICE_ITEM_ROLE.get(si)
    if story_key and booking_role not in TICKET_HOURS_EXCLUDE_ROLES:
        hours_by_story[story_key]  += h
        if jira_ticket:
            hours_by_issue[jira_ticket] += h
        ticket_hours_source_included += h
        if user: assignees_by_story[story_key].add(user)
    elif booking_role not in TICKET_HOURS_EXCLUDE_ROLES and ticket:
        unmapped_ticket_hours[ticket] += h
    if story_key:
        ticket_hours_source_all += h

    timesheet_rows.append({
        'date': d.strftime('%Y-%m-%d'), 'month': month,
        'user': user, 'ticket': story_key, 'memo': memo,
        'service_item': si, 'hours': h,
        'jira_status': jira_status, 'epic_key': epic_key, 'epic_name': epic_name,
    })

print(f"  PBI: {len(timesheet_rows)} Buchungen")

# ─────────────────────────────────────────────────────────────────────────────
# 3. FORECAST DATA
# ─────────────────────────────────────────────────────────────────────────────
_all_soll_months = sorted(set(
    m for s in FORECAST_SOLL.values()
    for m in s if m not in ('role', 'rate')
))
past_months = sorted(m for m in _all_soll_months if m < curr_month)
future_months = [m for m in _all_soll_months if m > curr_month][:2]

forecast_persons = []
for name, soll in FORECAST_SOLL.items():
    pbi_name = name
    ist_by_month = {m: round(hours_person_month[pbi_name][m], 1) for m in _all_soll_months}
    forecast_persons.append({
        'name': name,
        'role': soll.get('role', ''),
        'rate': soll.get('rate', 0),
        'soll': {m: soll.get(m, 0) for m in _all_soll_months},
        'ist':  ist_by_month,
    })

soll_totals = {m: sum(s.get(m, 0) for s in FORECAST_SOLL.values()) for m in _all_soll_months}
ist_totals  = {m: round(sum(hours_person_month[n][m] for n in FORECAST_SOLL), 1) for m in _all_soll_months}

# ─────────────────────────────────────────────────────────────────────────────
# 4. TICKET (STORY) DATA
# ─────────────────────────────────────────────────────────────────────────────
ticket_rows = []
for key, info in issue_info.items():
    if info['type'] not in ('Story', 'Task', 'Bug'): continue
    h     = round(hours_by_story.get(key, 0), 2)
    sp    = info.get('sp')
    # Estimation is shown as hours in the dashboard, so compare Actual(h) vs Estimation(h) directly.
    pct   = round(h / sp * 100) if sp and sp > 0 else None
    ek, en = get_epic(key)
    subtasks = []
    for sub_key, sub_info in issue_info.items():
        if not is_subtask(sub_info.get('type')):
            continue
        if (sub_info.get('parent_key') or '') != key:
            continue
        sub_h = round(hours_by_issue.get(sub_key, 0), 2)
        if sub_h <= 0:
            continue
        subtasks.append({
            'key': sub_key,
            'summary': sub_info.get('summary', ''),
            'status': sub_info.get('status', ''),
            'hours': sub_h,
            'assignee': sub_info.get('assignee', ''),
        })
    subtasks.sort(key=lambda s: -(s['hours'] or 0))
    ticket_rows.append({
        'key':       key,
        'summary':   info['summary'],
        'status':    info['status'],
        'assignee':  info['assignee'],
        'sp':        sp,
        'hours':     h,
        'pct':       pct,
        'epic_key':  ek or '',
        'epic_name': en or '',
        'sprint':    norm_sprint(info['sprint']),
        'done_sprint': sprint_by_resolved(info.get('resolved', '')) if info['status'] == 'Done' else None,
        'assignees': sorted(assignees_by_story.get(key, [])),
        'subtasks':  subtasks,
    })

ticket_rows.sort(key=lambda r: -(r['hours'] or 0))

# Consistency check: ticket hours from PBI vs hours shown in dashboard tickets tab.
dashboard_ticket_hours = sum((r.get('hours') or 0) for r in ticket_rows)
excluded_ticket_hours = ticket_hours_source_all - ticket_hours_source_included
ticket_hours_delta = ticket_hours_source_included - dashboard_ticket_hours
ticket_hours_check_ok = abs(ticket_hours_delta) < 0.01
missing_issue_hours = {
    k: v for k, v in hours_by_story.items() if k not in issue_info
}
missing_issue_hours_total = sum(missing_issue_hours.values())
top_missing_issue = sorted(missing_issue_hours.items(), key=lambda kv: -kv[1])[:10]

# ─────────────────────────────────────────────────────────────────────────────
# 5. ROADMAP DATA – issues grouped by parent/epic
# (Epics are not exported in the CSV; we group by Parent key + Parent summary)
# ─────────────────────────────────────────────────────────────────────────────
epics = {}  # epic_key → {key, summary, status, stories}

# First pass: collect all pseudo-epic keys from parent references
for key, info in issue_info.items():
    if info['type'] in ('Story', 'Task', 'Bug'):
        pk = info.get('parent_key', '')
        ps = info.get('parent_summary', '')
        if pk and pk not in issue_info and ps:
            if pk not in epics:
                epics[pk] = {'key': pk, 'summary': ps, 'status': 'Epic', 'stories': []}

# Second pass: add stories to their epics
for key, info in issue_info.items():
    if info['type'] in ('Story', 'Task', 'Bug'):
        ek, en = get_epic(key)
        sprint_key = norm_sprint(info['sprint'])
        # Done stories: always use the sprint in which they were resolved
        if info['status'] == 'Done':
            resolved_sprint = sprint_by_resolved(info.get('resolved', ''))
            if resolved_sprint:
                sprint_key = resolved_sprint
            elif not sprint_key:
                continue
        elif not sprint_key:
            sprint_key = sprint_by_resolved(info.get('resolved', ''))
        story = {
            'key': key, 'summary': info['summary'],
            'status': info['status'], 'assignee': info['assignee'],
            'sp': info['sp'], 'sprint': sprint_key,
            'hours': round(hours_by_story.get(key, 0), 1),
        }
        if ek and ek in epics:
            epics[ek]['stories'].append(story)
        else:
            if '__no_epic__' not in epics:
                epics['__no_epic__'] = {'key': '', 'summary': 'Kein Epic', 'status': '', 'stories': []}
            epics['__no_epic__']['stories'].append(story)

# Sort epics by key
roadmap_epics = sorted(epics.values(), key=lambda e: e['key'])

# ─────────────────────────────────────────────────────────────────────────────
# 6. SPRINT HEALTH
# ─────────────────────────────────────────────────────────────────────────────
sprint_stats = {}
for _sk, _sn, _sd, _ss, _se in SPRINT_SCHEDULE:
    sprint_stats[_sk] = {
        'key': _sk, 'name': _sn, 'dates': _sd,
        'start': str(_ss), 'end': str(_se),
        'done': 0, 'in_progress': 0, 'total': 0,
        'issues': [],
    }

for key, info in issue_info.items():
    # Sprint health/velocity is based on stories planned vs done.
    if info['type'] != 'Story': continue
    st = info['status']
    sprint_key = norm_sprint(info['sprint'])

    # Done stories always count towards the sprint in which they were resolved,
    # regardless of which sprint they were originally planned in.
    if st == 'Done':
        resolved_sprint = sprint_by_resolved(info.get('resolved', ''))
        if resolved_sprint:
            sprint_key = resolved_sprint
        elif not sprint_key:
            continue
    else:
        if not sprint_key:
            sprint_key = sprint_by_resolved(info.get('resolved', ''))
        if not sprint_key:
            continue

    if sprint_key not in sprint_stats: continue
    sprint_stats[sprint_key]['total']       += 1
    sprint_stats[sprint_key]['issues'].append(key)
    if st == 'Done':
        sprint_stats[sprint_key]['done']    += 1
    elif st == 'In Progress':
        sprint_stats[sprint_key]['in_progress'] += 1

# Velocity = avg done stories per completed sprint
completed_sprints = [s for s in sprint_stats.values() if s['done'] > 0 and s['key'] != CURRENT_SP_KEY]
velocity = round(sum(s['done'] for s in completed_sprints) / len(completed_sprints), 1) if completed_sprints else 0

# ─────────────────────────────────────────────────────────────────────────────
# 7. ASSEMBLE & WRITE JSON
# ─────────────────────────────────────────────────────────────────────────────
output = {
    'meta': {
        'generated_at': now.isoformat(),
        'generated_date': now.strftime('%d.%m.%Y'),
        'curr_month': curr_month,
        'prev_month': prev_month,
        'past_months': past_months,
        'future_months': future_months,
        'current_sprint': CURRENT_SP_KEY,
        'avg_rate': AVG_RATE,
        'checks': {
            'ticket_hours': {
                'source_all_roles': round(ticket_hours_source_all, 2),
                'source_included_roles': round(ticket_hours_source_included, 2),
                'excluded_roles': sorted(TICKET_HOURS_EXCLUDE_ROLES),
                'excluded_hours': round(excluded_ticket_hours, 2),
                'dashboard_tickets_hours': round(dashboard_ticket_hours, 2),
                'delta_included_vs_dashboard': round(ticket_hours_delta, 4),
                'ok': ticket_hours_check_ok,
                'missing_in_jira_export_hours': round(missing_issue_hours_total, 2),
                'top_missing_in_jira_export': [
                    {'key': k, 'hours': round(v, 2)} for k, v in top_missing_issue
                ],
            }
        }
    },
    'sprint_schedule': [
        {'key': sk, 'name': sn, 'dates': sd, 'start': str(ss), 'end': str(se)}
        for sk, sn, sd, ss, se in SPRINT_SCHEDULE
    ],
    'timesheet': timesheet_rows,
    'forecast': {
        'persons': forecast_persons,
        'soll_totals': soll_totals,
        'ist_totals':  ist_totals,
        'months': _all_soll_months,
    },
    'tickets': ticket_rows,
    'roadmap': roadmap_epics,
    'sprint_health': {
        'sprints': list(sprint_stats.values()),
        'velocity': velocity,
        'total_done': sum(s['done'] for s in sprint_stats.values()),
        'total_in_progress': sum(s['in_progress'] for s in sprint_stats.values()),
    },
}

with open(OUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

size_kb = os.path.getsize(OUT_FILE) // 1024
print(f"  ✅ dashboard.json geschrieben ({size_kb} KB) → {OUT_FILE}")
print(f"  📊 Timesheet: {len(timesheet_rows)} | Tickets: {len(ticket_rows)} | Epics: {len(roadmap_epics)} | Velocity: {velocity}")
print(
    "  🔎 Ticket-Hours Check | "
    f"Source(all): {ticket_hours_source_all:.2f}h | "
    f"Source(included): {ticket_hours_source_included:.2f}h | "
    f"Dashboard: {dashboard_ticket_hours:.2f}h | "
    f"Delta: {ticket_hours_delta:.4f}h"
)
if not ticket_hours_check_ok:
    print("  ⚠️  WARNUNG: Ticket-Hours-Delta ungleich 0. Bitte Mapping/Filter prüfen.")
