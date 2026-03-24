#!/usr/bin/env python3
"""
AMS Dashboard Auto-Update Script
=================================
Ablegen im Ordner: AMS Dashboard/scripts/
Benötigte Dateien im übergeordneten Ordner (AMS Dashboard/):
  powerbi_bookings.xlsx  – Power BI Export
  jira_export.csv        – Jira CSV Export ODER wird per API geholt (config.ini)

Aktualisiert ALLE Tabs:
  ✅ Forecast    – Ist-Stunden pro Person (Jan/Feb) + GESAMT + KPI-Cards
  ✅ Ticketbuchungen – Story-Tabelle mit aktuellen Buchungen und Status
  ✅ Roadmap     – Sprint-Matrix mit Story-Status aus Jira
  ✅ Sprint Health – Velocity, Prognose, Epic-Risk
  ✅ Timesheet   – Rohdaten-Array mit Jira-Anreicherung

Optionaler Flag: python3 update_dashboard.py --fetch-jira
  → Ruft fetch_jira.py auf, bevor das Dashboard aktualisiert wird
"""

import os, sys, re, csv, json, datetime, configparser, subprocess
import openpyxl
from collections import defaultdict

# ── Optional: auto-fetch Jira via API ────────────────────────────
if '--fetch-jira' in sys.argv:
    fetch_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fetch_jira.py')
    print("🔄 Hole aktuelle Jira-Daten via API …")
    result = subprocess.run([sys.executable, fetch_script], capture_output=False)
    if result.returncode != 0:
        print("❌ fetch_jira.py fehlgeschlagen – update wird mit vorhandenem CSV fortgesetzt.")
    else:
        print("✅ Jira-Daten aktualisiert\n")

# ── Dateipfade ────────────────────────────────────────────────────────────────
# Alle Eingabedateien liegen im Dashboard-Ordner (Cowork_AMS-Dashboard/), NICHT
# in Downloads oder einem anderen Ordner. Neue Jira-Exporte immer direkt als
# jira_export.csv in Cowork_AMS-Dashboard/ ablegen.
# ─────────────────────────────────────────────────────────────────────────────
BASE = os.path.dirname(os.path.abspath(__file__))   # = Cowork_AMS-Dashboard/scripts/
PARENT = os.path.dirname(BASE)                       # = Cowork_AMS-Dashboard/

PBI_FILE  = os.path.join(PARENT, 'powerbi_bookings.xlsx')
JIRA_FILE = os.path.join(PARENT, 'jira_export.csv')
DASH_FILE = os.path.join(PARENT, 'ams_dashboard.html')

# Name mapping: dashboard name → PBI name
NAME_MAP = {
    # Namen stimmen jetzt mit PBI überein – keine Mappings mehr nötig
}

# Average billing rate used for total-cost calculations.
# !! Update this if the blended rate changes !!
AVG_RATE = 92

# Sprint schedule – update dates here when a new sprint starts.
# Each entry: (key, display_name, date_range_label, start_date, end_date)
SPRINT_SCHEDULE = [
    ('S0','Sprint 0','20.01–03.02', datetime.date(2026,1,20),  datetime.date(2026,2,3)),
    ('S1','Sprint 1','03.02–17.02', datetime.date(2026,2,3),   datetime.date(2026,2,17)),
    ('S2','Sprint 2','17.02–03.03', datetime.date(2026,2,17),  datetime.date(2026,3,3)),
    ('S3','Sprint 3','03.03–17.03', datetime.date(2026,3,3),   datetime.date(2026,3,17)),
    ('S4','Sprint 4','17.03–31.03', datetime.date(2026,3,17),  datetime.date(2026,3,31)),
    ('S5','Sprint 5','31.03–14.04', datetime.date(2026,3,31),  datetime.date(2026,4,14)),
    ('S6','Sprint 6','14.04–28.04', datetime.date(2026,4,14),  datetime.date(2026,4,28)),
]

# Forecast config: Soll-Stunden pro Person und Monat.
# Keys are 'YYYY-MM' month strings + 'role' + 'rate'.
# !! Add new months here when the project extends beyond April !!
FORECAST_SOLL = {
    # ── Stand: AMS_Forecast_Updated.xlsx (FTE × Hours/Month) — Update 11.03.2026 ──
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

# Geplante Abwesenheiten pro Sprint (aus Confluence Team Availability)
# Format: sprint_key → person_name → vacation_hours (bereits in h umgerechnet)
VACATION_HOURS = {
    'S2': {
        'Vasil Krumov':      1 * 8,  # 02.03
        'Alexander Toch':    1 * 8,  # 20.02 (16.02 liegt vor S2)
        'Jelena Zdravkovic': 4 * 8,  # 17–20.02 (16.02 vor S2)
        'Niamh Akerman':     1 * 8,  # 02.03
    },
    'S3': {
        'Elias Martinek':    5 * 8,  # 09–13.03
        'Kalina Marinova':   1 * 8,  # 03.03 Liberation Day Bulgarien
    },
}

# PBI Service Item → Rolle (for Ist-side of role chart)
SERVICE_ITEM_ROLE = {
    'Product Owner - NS':    'Product Owner',
    'Software Engineer - NS':'Software Engineer',
    'UX/UI Designer - NS':   'UX/UI Designer',
    'QA Engineer - NS':      'QA Engineer',
    'Data Scientist':        'Data Scientist',
}

# Rollen, deren Buchungen NICHT in hours_by_story (Ticketbuchungen-Tab) einfließen.
# Grund: Die Schätzung (Story Points) ist reine Entwicklungszeit; QA-Stunden
# werden separat erfasst und sollen das Soll/Ist-Verhältnis nicht verfälschen.
# → Kalina Stoyanova & Jelena Zdravkoiv werden dadurch automatisch ausgeschlossen.
TICKET_HOURS_EXCLUDE_ROLES = {'QA Engineer'}

def fmt_h(h):
    """Format hours with German thousands separator"""
    return f'{h:,.0f}h'.replace(',', '.')

def fmt_eur(e):
    return f'€{e:,.0f}'.replace(',', '.')

def bar_color(pct):
    if pct <= 0: return '#cbd5e1'
    if pct < 60: return '#16a34a'
    if pct < 85: return '#d97706'
    return '#dc2626'

def status_badge_html(status):
    cfg = {
        'Done':                   ('✓',  '#16a34a', '#dcfce7'),
        'Acuity QA':              ('🔍', '#d97706', '#fef3c7'),
        'Acuity Approval':        ('✅', '#7c3aed', '#ede9fe'),
        'In Progress':            ('▶',  '#2563eb', '#dbeafe'),
        'Selected for Development':('📋','#475569', '#f1f5f9'),
        'Backlog':                ('○',  '#94a3b8', '#f8fafc'),
        'Design Todo':            ('✏️', '#ea580c', '#fed7aa'),
        'DESIGN APPROVAL':        ('🎨', '#0891b2', '#e0f2fe'),
        'Closed':                 ('✕',  '#6b7280', '#f3f4f6'),
        'Post MVP':               ('⏭', '#374151', '#e5e7eb'),
    }
    i, fg, bg = cfg.get(status, ('?', '#94a3b8', '#f8fafc'))
    return (f'<span style="display:inline-block;padding:1px 5px;border-radius:4px;'
            f'font-size:.68rem;font-weight:600;color:{fg};background:{bg};white-space:nowrap">'
            f'{i} {status}</span>')

# ─────────────────────────────────────────────────────────────────────────────
# 1. CHECK FILES
# ─────────────────────────────────────────────────────────────────────────────
missing = [f for f in [PBI_FILE, JIRA_FILE, DASH_FILE] if not os.path.exists(f)]
if missing:
    print("❌ Fehlende Dateien:")
    for f in missing:
        print(f"  → {os.path.basename(f)}")
    sys.exit(1)

now = datetime.datetime.now()
today = now.strftime('%d.%m.%Y')
print(f"✅ Alle Dateien gefunden – starte Update ({now.strftime('%d.%m.%Y %H:%M')})")

# ── Dynamic month detection ───────────────────────────────────────
today_date = now.date()
curr_month = now.strftime('%Y-%m')                                    # e.g. '2026-03'
prev_month = (now.replace(day=1) - datetime.timedelta(days=1)).strftime('%Y-%m')  # e.g. '2026-02'

DE_MONTHS_SHORT = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
DE_MONTHS_FULL  = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']

def month_label(ym):
    """'2026-03' → 'Mär'"""
    try: return DE_MONTHS_SHORT[int(ym.split('-')[1])-1]
    except: return ym

def month_label_full(ym):
    """'2026-03' → 'März'"""
    try: return DE_MONTHS_FULL[int(ym.split('-')[1])-1]
    except: return ym

# Future months: FORECAST_SOLL months after curr_month (sorted, up to 2)
_all_soll_months = sorted(set(
    m for s in FORECAST_SOLL.values()
    for m in s if m not in ('role', 'rate')
))
future_months = [m for m in _all_soll_months if m > curr_month][:2]

# ── Auto-detect current sprint from schedule ─────────────────────
CURRENT_SP_KEY   = SPRINT_SCHEDULE[-1][0]   # fallback: last sprint
CURRENT_SP_DATES = SPRINT_SCHEDULE[-1][2]
CURRENT_SPRINT   = 'AMS ' + SPRINT_SCHEDULE[-1][1]
for _sp_key, _sp_name, _sp_dates, _sp_start, _sp_end in SPRINT_SCHEDULE:
    if _sp_start <= today_date < _sp_end:
        CURRENT_SP_KEY   = _sp_key
        CURRENT_SP_DATES = _sp_dates
        CURRENT_SPRINT   = 'AMS ' + _sp_name
        break
print(f"  🏃 Sprint: {CURRENT_SPRINT} ({CURRENT_SP_DATES})")
print(f"  📅 Monate: Vormonat={prev_month}, Aktuell={curr_month}, Forecast={future_months}")

# ─────────────────────────────────────────────────────────────────────────────
# 2. LOAD JIRA
# ─────────────────────────────────────────────────────────────────────────────
# Jira CSV hat duplicate 'Sprint' Spalten (4x). DictReader nimmt die letzte (leer).
# Deshalb: raw reader für Sprint-Extraktion, DictReader für alle anderen Felder.
issue_info = {}  # key → {status, type, parent_key, summary, sp, sprint}
with open(JIRA_FILE, newline='', encoding='utf-8-sig') as f:
    raw_reader = csv.reader(f)
    raw_header = next(raw_reader)
    raw_rows   = list(raw_reader)

# Sprint: ersten nicht-leeren Wert aus allen 'Sprint'-Spalten nehmen
sprint_col_indices = [i for i, h in enumerate(raw_header) if h.strip().lower() == 'sprint']

def _get_sprint_raw(raw_row):
    """Ersten nicht-leeren Sprint-Wert aus der Zeile."""
    for i in sprint_col_indices:
        if i < len(raw_row) and raw_row[i].strip():
            return raw_row[i].strip()
    return ''

# Spalten-Index-Map für alle anderen Felder
_col = {h.strip(): i for i, h in enumerate(raw_header)}
def _get(raw_row, *names, default=''):
    for n in names:
        i = _col.get(n)
        if i is not None and i < len(raw_row) and raw_row[i].strip():
            return raw_row[i].strip()
    return default

for raw_row in raw_rows:
    key = _get(raw_row, 'Issue key')
    if not key: continue
    sp = None
    try:
        raw_sp = _get(raw_row, 'Story Points', 'Custom field (Story Points)')
        sp = float(raw_sp) if raw_sp else None
    except: pass
    sigma_raw = _get(raw_row, 'Σ Original Estimate')
    try: sigma_orig = int(sigma_raw) if sigma_raw else 0
    except: sigma_orig = 0
    sprint_val    = _get_sprint_raw(raw_row)
    epic_key_direct = _get(raw_row, 'Epic Link')
    issue_info[key] = {
        'status':          _get(raw_row, 'Status'),
        'type':            _get(raw_row, 'Issue Type'),
        'parent_key':      _get(raw_row, 'Parent key', 'Parent'),
        'epic_key_direct': epic_key_direct,
        'summary':         _get(raw_row, 'Summary'),
        'sp':         sp,
        'sprint':     sprint_val,
        'sigma_orig': sigma_orig,
        'assignee':   _get(raw_row, 'Assignee'),
        'updated':    _get(raw_row, 'Updated'),
        'resolved':   _get(raw_row, 'Resolved'),
    }
print(f"  📋 Jira: {len(issue_info)} Issues geladen")

def get_epic(key, depth=0):
    if depth > 6 or not key or key not in issue_info: return None, None
    info = issue_info[key]
    if info['type'] == 'Epic': return key, info['summary']
    # Direct epic link (from API CSV) takes priority
    direct = info.get('epic_key_direct', '')
    if direct and direct in issue_info:
        return direct, issue_info[direct]['summary']
    return get_epic(info['parent_key'], depth + 1)

def norm_sprint(s):
    if not s: return None
    for i in range(7):
        if f'Sprint {i}' in s: return f'S{i}'
    return None

def sprint_by_resolved_date(date_str):
    """Gibt den Sprint-Key zurück, in den das Resolved-Datum fällt."""
    if not date_str: return None
    try:
        d = datetime.datetime.strptime(date_str.strip()[:9], '%d/%b/%y').date()
    except Exception:
        return None
    for sid, _, _, sp_start, sp_end in SPRINT_SCHEDULE:
        if sp_start <= d < sp_end:
            return sid
    return None

def working_days_in_range(start, end):
    """Arbeitstage in [start, end) – Mo–Fr."""
    count, d = 0, start
    while d < end:
        if d.weekday() < 5: count += 1
        d += datetime.timedelta(days=1)
    return count

def soll_for_sprint(person, sp_key):
    """Soll-Stunden einer Person für einen Sprint (aus FORECAST_SOLL, anteilig pro Monat, minus Urlaub)."""
    if person not in FORECAST_SOLL: return 0.0
    entry = FORECAST_SOLL[person]
    sprint = next((s for s in SPRINT_SCHEDULE if s[0] == sp_key), None)
    if not sprint: return 0.0
    _, _, _, sp_start, sp_end = sprint
    total = 0.0
    d = sp_start
    while d < sp_end:
        year, month = d.year, d.month
        month_key = f'{year}-{month:02d}'
        monthly_h = entry.get(month_key, 0)
        if monthly_h > 0:
            next_month_start = datetime.date(year + (month // 12), (month % 12) + 1, 1)
            sprint_in_month_end = min(sp_end, next_month_start)
            wd_month  = working_days_in_range(datetime.date(year, month, 1), next_month_start)
            wd_sprint = working_days_in_range(d, sprint_in_month_end)
            if wd_month > 0:
                total += monthly_h * wd_sprint / wd_month
        # Advance to next month
        if month == 12: d = datetime.date(year + 1, 1, 1)
        else:           d = datetime.date(year, month + 1, 1)
    vac_h = VACATION_HOURS.get(sp_key, {}).get(person, 0)
    return round(total - vac_h, 1)

# ─────────────────────────────────────────────────────────────────────────────
# 3. LOAD PBI
# ─────────────────────────────────────────────────────────────────────────────
wb = openpyxl.load_workbook(PBI_FILE)
ws = wb.active
pbi_rows = list(ws.iter_rows(values_only=True))

hours_person_month  = defaultdict(lambda: defaultdict(float))  # person→month→h
hours_person_sprint = defaultdict(lambda: defaultdict(float))  # person→sprint_key→h
hours_role_month    = defaultdict(lambda: defaultdict(float))  # role→month→h
hours_by_story      = defaultdict(float)                        # story_key→h
assignees_by_story  = defaultdict(set)                          # story_key→persons
timesheet_rows      = []

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

    # Resolve ticket
    matches   = re.findall(r'AMS-\d+', t_raw)
    ticket    = matches[0] if matches else ''

    # Walk to parent story (sub-task → story)
    story_key = ticket
    if ticket and ticket in issue_info and issue_info[ticket]['type'] == 'Sub-task':
        story_key = issue_info[ticket]['parent_key'] or ticket

    jira_status, epic_key, epic_name = '', '', ''
    if ticket and ticket in issue_info:
        jira_status = issue_info[ticket]['status']
        ek, en = get_epic(ticket)
        epic_key, epic_name = (ek or ''), (en or '')

    if user:
        hours_person_month[user][month] += h
        for _sid, _, _, _sp_start, _sp_end in SPRINT_SCHEDULE:
            if _sp_start <= d.date() < _sp_end:
                hours_person_sprint[user][_sid] += h
                break
        role = SERVICE_ITEM_ROLE.get(si)
        if role:
            hours_role_month[role][month] += h
    # Nur Nicht-QA-Buchungen in Ticketbuchungen zählen (Schätzung = reine Entwicklungszeit)
    booking_role = SERVICE_ITEM_ROLE.get(si)
    if story_key and booking_role not in TICKET_HOURS_EXCLUDE_ROLES:
        hours_by_story[story_key]  += h
        if user: assignees_by_story[story_key].add(user)

    timesheet_rows.append({
        'date': d.strftime('%Y-%m-%d'), 'month': month,
        'user': user, 'ticket': ticket, 'memo': memo,
        'service_item': si, 'hours': h,
        'jira_status': jira_status, 'epic_key': epic_key, 'epic_name': epic_name,
    })

print(f"  📊 PBI: {len(timesheet_rows)} Buchungen, {sum(r['hours'] for r in timesheet_rows):.0f}h total")

# Reverse name map for lookup
pbi_name = {v: k for k, v in NAME_MAP.items()}  # dashboard→pbi
def get_pbi_hours(dash_name, month):
    pbi_n = NAME_MAP.get(dash_name, dash_name)
    return hours_person_month[pbi_n][month]

# ─────────────────────────────────────────────────────────────────────────────
# 4. READ DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────
with open(DASH_FILE, 'r', encoding='utf-8') as f:
    html = f.read()

# ─────────────────────────────────────────────────────────────────────────────
# 5. UPDATE TIMESHEET DATA
# ─────────────────────────────────────────────────────────────────────────────
new_json = json.dumps(timesheet_rows, ensure_ascii=False)

# Replace global DATA
data_start = html.find('window._AMS_DATA = [')
if data_start == -1:
    data_start = html.find('  var DATA = [')
data_end   = html.find('];', data_start) + 2

if 'window._AMS_DATA = [' in html:
    html = html[:data_start] + f'window._AMS_DATA = {new_json};' + html[data_end:]
else:
    html = html[:data_start] + f'  var DATA = {new_json};' + html[data_end:]

print(f"  ✅ Timesheet DATA: {len(timesheet_rows)} Zeilen")

# ─────────────────────────────────────────────────────────────────────────────
# 6. GENERATE FORECAST TAB (fully regenerated – no regex patching)
# ─────────────────────────────────────────────────────────────────────────────

# ── Detect ALL past months with PBI data ──────────────────────────
# Collect all months that appear in hours_person_month which are before curr_month
_all_recorded_months = set()
for _pbi_name in hours_person_month:
    for _m in hours_person_month[_pbi_name]:
        _all_recorded_months.add(_m)
# Also include any past months defined in FORECAST_SOLL (even if no hours booked yet)
for _soll in FORECAST_SOLL.values():
    for _k in _soll:
        if _k.startswith('20') and _k < curr_month:
            _all_recorded_months.add(_k)
past_months_all = sorted(m for m in _all_recorded_months if m < curr_month)

# ── Compute per-person data ───────────────────────────────────────
feb_total_ist = 0.0
past_total_ist = {m: 0.0 for m in past_months_all}   # sum per past month
person_data = []   # list of dicts for table rows

for dash_name, soll in FORECAST_SOLL.items():
    # All past months – Ist AND Soll
    past_h        = {m: round(get_pbi_hours(dash_name, m), 1) for m in past_months_all}
    past_soll_h   = {m: soll.get(m, 0)                        for m in past_months_all}
    past_eur      = {m: round(past_h[m]      * soll['rate'])   for m in past_months_all}
    past_soll_eur = {m: round(past_soll_h[m] * soll['rate'])   for m in past_months_all}
    past_pct      = {m: int(past_h[m] / past_soll_h[m] * 100) if past_soll_h[m] else 0
                     for m in past_months_all}

    feb_h    = round(get_pbi_hours(dash_name, curr_month), 1)
    rate     = soll['rate']
    role     = soll.get('role', '–')
    feb_soll = soll.get(curr_month, 0)
    mar_soll = soll.get(future_months[0], 0) if future_months else 0
    apr_soll = soll.get(future_months[1], 0) if len(future_months) > 1 else 0

    feb_eur      = round(feb_h * rate)
    feb_soll_eur = round(feb_soll * rate)
    mar_soll_eur = round(mar_soll * rate)
    apr_soll_eur = round(apr_soll * rate)
    feb_pct  = int(feb_h / feb_soll * 100) if feb_soll else 0
    bar_col  = bar_color(feb_pct)
    bar_w    = min(feb_pct, 100)

    past_h_total = sum(past_h.values())
    total_fc_h   = round(past_h_total + feb_soll + mar_soll + apr_soll, 0)
    total_fc_eur = round(sum(past_eur.values()) + feb_soll_eur + mar_soll_eur + apr_soll_eur)

    for m in past_months_all:
        past_total_ist[m] += past_h[m]
    feb_total_ist += feb_h

    person_data.append({
        'name': dash_name, 'role': role, 'rate': rate,
        'past_h': past_h, 'past_soll_h': past_soll_h,
        'past_eur': past_eur, 'past_soll_eur': past_soll_eur,
        'past_pct': past_pct,
        'feb_h': feb_h, 'feb_eur': feb_eur,
        'feb_soll': feb_soll, 'feb_soll_eur': feb_soll_eur,
        'feb_pct': feb_pct, 'bar_col': bar_col, 'bar_w': bar_w,
        'mar_soll': mar_soll, 'mar_soll_eur': mar_soll_eur,
        'apr_soll': apr_soll, 'apr_soll_eur': apr_soll_eur,
        'total_fc_h': total_fc_h, 'total_fc_eur': total_fc_eur,
    })

past_eur_totals      = {m: round(past_total_ist[m] * AVG_RATE) for m in past_months_all}
past_soll_totals     = {m: sum(s.get(m, 0) for s in FORECAST_SOLL.values()) for m in past_months_all}
past_soll_eur_totals = {m: round(past_soll_totals[m] * AVG_RATE) for m in past_months_all}
past_pct_totals      = {m: int(past_total_ist[m] / past_soll_totals[m] * 100) if past_soll_totals[m] else 0
                        for m in past_months_all}
past_color_totals    = {m: '#16a34a' if past_pct_totals[m] >= 85 else '#d97706' if past_pct_totals[m] >= 60 else '#ef4444'
                        for m in past_months_all}
feb_eur_total   = round(feb_total_ist * AVG_RATE)
feb_soll_total  = sum(s.get(curr_month, 0) for s in FORECAST_SOLL.values())
mar_soll_total  = sum(s.get(future_months[0], 0) for s in FORECAST_SOLL.values()) if future_months else 0
apr_soll_total  = sum(s.get(future_months[1], 0) for s in FORECAST_SOLL.values()) if len(future_months) > 1 else 0
feb_pct_total   = int(feb_total_ist / feb_soll_total * 100) if feb_soll_total else 0
feb_color_total = '#16a34a' if feb_pct_total >= 85 else '#d97706' if feb_pct_total >= 60 else '#ef4444'
total_past_ist  = sum(past_total_ist.values())
total_fc_h_all  = round(total_past_ist + feb_soll_total + mar_soll_total + apr_soll_total)
total_fc_eur_all = round(sum(past_eur_totals.values()) + feb_soll_total*AVG_RATE + mar_soll_total*AVG_RATE + apr_soll_total*AVG_RATE)

# Jira Sprint Plan stats (from issue_info)
sp_issues = [(k, v) for k, v in issue_info.items() if v.get('sp') is not None]
sp_total_h = sum(v['sp'] for _, v in sp_issues)
sp_count   = len(sp_issues)
all_count  = len([k for k, v in issue_info.items() if v['type'] in ('Story','Sub-task')])

# ── Compute role-level Soll and Ist ──────────────────────────────
role_soll = defaultdict(float)
role_ist  = defaultdict(float)
for soll in FORECAST_SOLL.values():
    role_soll[soll['role']] += soll.get(curr_month, 0)    # Soll for current month only
for role, mdata in hours_role_month.items():
    # Ist = all past months + current month
    for m in past_months_all:
        role_ist[role] += mdata.get(m, 0)
    role_ist[role] += mdata.get(curr_month, 0)

ROLE_ORDER = ['Product Owner', 'Software Engineer', 'UX/UI Designer', 'QA Engineer', 'Data Scientist']

# ── Chart data as JSON ────────────────────────────────────────────
chart_months    = past_months_all + [curr_month] + future_months
chart_labels_js = json.dumps([month_label(m) for m in chart_months])
team_soll_data  = [0]*len(past_months_all) + [round(feb_soll_total)] + [round(mar_soll_total), round(apr_soll_total)][:len(future_months)]
team_ist_data   = [round(past_total_ist[m]) for m in past_months_all] + [round(feb_total_ist)] + ['null']*len(future_months)

past_months_label = '+'.join(month_label(m) for m in past_months_all) if past_months_all else ''
all_ist_label = f'Ist ({past_months_label}+{month_label(curr_month)})' if past_months_all else f'Ist ({month_label(curr_month)})'

role_labels_js = json.dumps(ROLE_ORDER)
role_soll_js   = json.dumps([round(role_soll.get(r, 0)) for r in ROLE_ORDER])
role_ist_js    = json.dumps([round(role_ist.get(r, 0)) for r in ROLE_ORDER])

# ── SE chart: Software Engineer Soll vs. Ist per month ───────────
_SE = 'Software Engineer'
_se_months = past_months_all + [curr_month] + future_months
_se_soll = {m: sum(s.get(m, 0) for s in FORECAST_SOLL.values() if s['role'] == _SE)
            for m in _se_months}
_se_ist  = [round(hours_role_month[_SE].get(m, 0)) if m <= curr_month else None
            for m in _se_months]
se_chart_labels_js = json.dumps([month_label(m) for m in _se_months])
se_soll_data_js    = json.dumps([round(_se_soll.get(m, 0)) for m in _se_months])
se_ist_data_js     = json.dumps(_se_ist)

# ── Build table rows ──────────────────────────────────────────────
def past_month_cells_html(p):
    cells = ''
    for i, m in enumerate(past_months_all):
        left_border = 'border-left:1px solid #e9ecef;' if i == 0 else 'border-left:1px solid #f0f0f0;'
        pct   = p['past_pct'][m]
        bc    = bar_color(pct)
        bw    = min(pct, 100)
        cells += f'''<td style="padding:.4rem .35rem;text-align:right;{left_border}font-size:.8rem">{p["past_h"][m]}h</td>
  <td style="padding:.4rem .3rem;text-align:right;font-size:.75rem;color:#64748b">{p["past_soll_h"][m]}h</td>
  <td style="padding:.4rem .45rem;min-width:80px">
    <div style="display:flex;align-items:center;gap:3px">
      <div style="flex:1;height:5px;background:#f1f5f9;border-radius:3px;overflow:hidden">
        <div style="height:100%;width:{bw}%;background:{bc};border-radius:3px"></div>
      </div>
      <span style="font-size:.7rem;color:{bc};font-weight:600;min-width:26px;text-align:right">{pct}%</span>
    </div>
  </td>
  <td style="padding:.4rem .3rem;text-align:right;font-size:.76rem">{fmt_eur(p["past_eur"][m])}<br><span style="color:#94a3b8;font-size:.7rem">{fmt_eur(p["past_soll_eur"][m])}</span></td>'''
    return cells

def person_row_html(p):
    bc = p['bar_col']
    bw = p['bar_w']
    fp = p['feb_pct']
    return f'''<tr style="border-bottom:1px solid #f1f5f9">
  <td style="padding:.4rem .5rem;font-weight:600;font-size:.82rem;white-space:nowrap">{p['name']}</td>
  <td style="padding:.4rem .3rem;font-size:.75rem;color:#64748b;white-space:nowrap">{p['role']}</td>
  <td style="padding:.4rem .3rem;text-align:right;font-size:.78rem;color:#475569">€{p['rate']}</td>
  {past_month_cells_html(p)}
  <td style="padding:.4rem .3rem;text-align:right;font-size:.8rem;border-left:1px solid #e9ecef">{p['feb_h']}h</td>
  <td style="padding:.4rem .3rem;text-align:right;font-size:.75rem;color:#64748b">{p['feb_soll']}h</td>
  <td style="padding:.4rem .5rem;min-width:90px">
    <div style="display:flex;align-items:center;gap:4px">
      <div style="flex:1;height:6px;background:#f1f5f9;border-radius:3px;overflow:hidden">
        <div style="height:100%;width:{bw}%;background:{bc};border-radius:3px"></div>
      </div>
      <span style="font-size:.72rem;color:{bc};font-weight:600;min-width:28px;text-align:right">{fp}%</span>
    </div>
  </td>
  <td style="padding:.4rem .3rem;text-align:right;font-size:.78rem">{fmt_eur(p['feb_eur'])}<br><span style="color:#94a3b8;font-size:.72rem">{fmt_eur(p['feb_soll_eur'])}</span></td>
  <td style="padding:.4rem .3rem;text-align:right;font-size:.8rem;border-left:1px solid #e9ecef;color:#93c5fd">{p['mar_soll']}h<br><span style="font-size:.72rem">{fmt_eur(p['mar_soll_eur'])}</span></td>
  <td style="padding:.4rem .3rem;text-align:right;font-size:.8rem;color:#93c5fd">{p['apr_soll']}h<br><span style="font-size:.72rem">{fmt_eur(p['apr_soll_eur'])}</span></td>
  <td style="padding:.4rem .5rem;text-align:right;font-size:.8rem;font-weight:600;border-left:2px solid #e2e8f0">{p['total_fc_h']:.0f}h<br><span style="font-size:.72rem;font-weight:400">{fmt_eur(p['total_fc_eur'])}</span></td>
</tr>'''

table_rows_html = '\n'.join(person_row_html(p) for p in person_data)

# ── GESAMT row past month cells ───────────────────────────────────
def gesamt_past_cells():
    cells = ''
    for i, m in enumerate(past_months_all):
        left_border = 'border-left:1px solid #e9ecef;' if i == 0 else 'border-left:1px solid #f0f0f0;'
        pct   = past_pct_totals[m]
        col   = past_color_totals[m]
        bw    = min(pct, 100)
        cells += f'''<td style="padding:.5rem .35rem;text-align:right;{left_border}font-size:.82rem">{fmt_h(past_total_ist[m])}</td>
  <td style="padding:.5rem .3rem;text-align:right;font-size:.75rem;color:#64748b">{past_soll_totals[m]}h</td>
  <td style="padding:.5rem .5rem">
    <div style="display:flex;align-items:center;gap:3px">
      <div style="flex:1;height:6px;background:#f1f5f9;border-radius:3px;overflow:hidden">
        <div style="height:100%;width:{bw}%;background:{col};border-radius:3px"></div>
      </div>
      <span style="font-size:.73rem;color:{col};font-weight:700">{pct}%</span>
    </div>
  </td>
  <td style="padding:.5rem .3rem;text-align:right;font-size:.78rem">{fmt_eur(past_eur_totals[m])}<br><span style="color:#94a3b8;font-size:.72rem">{fmt_eur(past_soll_eur_totals[m])}</span></td>'''
    return cells

# ── Table header past month columns ──────────────────────────────
def header_past_months_row1():
    cols = ''
    for i, m in enumerate(past_months_all):
        border = 'border-left:1px solid rgba(255,255,255,.2);' if i == 0 else 'border-left:1px solid rgba(255,255,255,.1);'
        cols += f'<th colspan="4" style="text-align:center;padding:.35rem .3rem;{border}background:#374151">{month_label_full(m)}<br><span style="font-size:.62rem;opacity:.7;font-weight:400">abgeschlossen ✓</span></th>'
    return cols

def header_past_months_row2():
    cols = ''
    for i, m in enumerate(past_months_all):
        border = 'border-left:1px solid rgba(255,255,255,.15);' if i == 0 else 'border-left:1px solid rgba(255,255,255,.08);'
        cols += f'''<th style="text-align:right;padding:.28rem .3rem;{border}">Ist Std.</th>
        <th style="text-align:right;padding:.28rem .3rem">Soll Std.</th>
        <th style="padding:.28rem .4rem">% Soll</th>
        <th style="text-align:right;padding:.28rem .3rem">Ist€/Soll€</th>'''
    return cols

# ── KPI cards for past months ─────────────────────────────────────
def past_month_kpi_cards():
    cards = ''
    for m in past_months_all:
        tot_h   = past_total_ist[m]
        tot_eur = past_eur_totals[m]
        cards += f'''  <div style="background:var(--card);border-radius:12px;padding:14px 18px;box-shadow:0 1px 4px rgba(0,0,0,.07);min-width:130px;flex:1">
    <div style="font-size:.72rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.04em">{month_label_full(m)}</div>
    <div style="font-size:1.4rem;font-weight:800;color:#1e3a5f;line-height:1.1">{fmt_h(tot_h)}</div>
    <div style="font-size:.78rem;color:#64748b;margin-top:2px">Ist &nbsp;·&nbsp; <span style="color:#374151">{fmt_eur(tot_eur)}</span></div>
    <div style="font-size:.7rem;color:#94a3b8;margin-top:3px">abgeschlossen ✓</div>
  </div>
'''
    return cards

# ── Headline date range ───────────────────────────────────────────
_first_month = past_months_all[0] if past_months_all else curr_month
_last_month  = future_months[-1] if future_months else curr_month
_past_ist_months_label = '+'.join(month_label(m) for m in past_months_all) if past_months_all else ''
_gesamt_label = f'{"+".join(month_label(m) for m in past_months_all)} Ist + {month_label(curr_month)}–{month_label(_last_month)} Soll' if past_months_all else f'{month_label(curr_month)}–{month_label(_last_month)} Soll'

# ── GESAMT row ────────────────────────────────────────────────────
gesamt_row = f'''<tr style="background:#f8fafc;font-weight:700;border-top:2px solid #1e3a5f">
  <td colspan="3" style="padding:.5rem .5rem;font-size:.82rem;color:#1e3a5f">GESAMT</td>
  {gesamt_past_cells()}
  <td style="padding:.5rem .3rem;text-align:right;font-size:.82rem;border-left:1px solid #e9ecef">{fmt_h(feb_total_ist)}</td>
  <td style="padding:.5rem .3rem;text-align:right;font-size:.75rem;color:#64748b">{feb_soll_total}h</td>
  <td style="padding:.5rem .5rem">
    <div style="display:flex;align-items:center;gap:4px">
      <div style="flex:1;height:7px;background:#f1f5f9;border-radius:3px;overflow:hidden">
        <div style="height:100%;width:{min(feb_pct_total,100)}%;background:{feb_color_total};border-radius:3px"></div>
      </div>
      <span style="font-size:.75rem;color:{feb_color_total};font-weight:700">{feb_pct_total}%</span>
    </div>
  </td>
  <td style="padding:.5rem .3rem;text-align:right;font-size:.78rem">{fmt_eur(feb_eur_total)}<br><span style="color:#94a3b8;font-size:.72rem">{fmt_eur(round(feb_soll_total*AVG_RATE))}</span></td>
  <td style="padding:.5rem .3rem;text-align:right;font-size:.8rem;border-left:1px solid #e9ecef;color:#93c5fd">{mar_soll_total}h</td>
  <td style="padding:.5rem .3rem;text-align:right;font-size:.8rem;color:#93c5fd">{apr_soll_total}h</td>
  <td style="padding:.5rem .5rem;text-align:right;font-size:.82rem;border-left:2px solid #e2e8f0">{total_fc_h_all}h<br><span style="font-size:.75rem;font-weight:400">{fmt_eur(total_fc_eur_all)}</span></td>
</tr>'''

# ── Full Forecast Tab HTML ────────────────────────────────────────
forecast_tab = f'''<!-- ══════════ TAB: FORECAST ══════════ -->
    <div id="tab-forecast" class="tab-content">
<h2 style="font-size:1.1rem;color:#1e3a5f;margin:0 0 1rem">👥 Forecast vs. Ist — Personen &amp; Rollen ({month_label_full(_first_month)}–{month_label_full(_last_month)})</h2>

<!-- KPI cards -->
<div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1.2rem">
{past_month_kpi_cards()}  <div style="background:var(--card);border-radius:12px;padding:14px 18px;box-shadow:0 1px 4px rgba(0,0,0,.07);min-width:140px;flex:1">
    <div style="font-size:.72rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.04em">{month_label_full(curr_month)} ⚡</div>
    <div style="font-size:1.4rem;font-weight:800;color:#1e3a5f;line-height:1.1">{round(feb_total_ist)}<span style="font-size:.9rem;color:#94a3b8">/{feb_soll_total}h</span></div>
    <div style="font-size:.78rem;margin-top:2px"><span style="font-weight:700;color:{feb_color_total}">{feb_pct_total}%</span> &nbsp;·&nbsp; Ist {fmt_eur(feb_eur_total)} / Soll {fmt_eur(round(feb_soll_total*AVG_RATE))}</div>
    <div style="font-size:.7rem;color:#94a3b8;margin-top:3px">Stand {today}</div>
  </div>
  <div style="background:var(--card);border-radius:12px;padding:14px 18px;box-shadow:0 1px 4px rgba(0,0,0,.07);min-width:140px;flex:1">
    <div style="font-size:.72rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.04em">{month_label_full(future_months[0]) if future_months else '–'} 🔮 Forecast</div>
    <div style="font-size:1.4rem;font-weight:800;color:#93c5fd;line-height:1.1">{mar_soll_total}h</div>
    <div style="font-size:.78rem;color:#64748b;margin-top:2px">Soll &nbsp;·&nbsp; <span style="color:#374151">{fmt_eur(round(mar_soll_total*AVG_RATE))}</span></div>
    <div style="font-size:.7rem;color:#94a3b8;margin-top:3px">nur Forecast</div>
  </div>
  <div style="background:var(--card);border-radius:12px;padding:14px 18px;box-shadow:0 1px 4px rgba(0,0,0,.07);min-width:140px;flex:1">
    <div style="font-size:.72rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.04em">{month_label_full(future_months[1]) if len(future_months)>1 else '–'} 🔮 Forecast</div>
    <div style="font-size:1.4rem;font-weight:800;color:#93c5fd;line-height:1.1">{apr_soll_total}h</div>
    <div style="font-size:.78rem;color:#64748b;margin-top:2px">Soll &nbsp;·&nbsp; <span style="color:#374151">{fmt_eur(round(apr_soll_total*AVG_RATE))}</span></div>
    <div style="font-size:.7rem;color:#94a3b8;margin-top:3px">nur Forecast</div>
  </div>
  <div style="background:var(--card);border-radius:12px;padding:14px 18px;box-shadow:0 1px 4px rgba(0,0,0,.07);min-width:140px;flex:1;border:2px solid #1e3a5f">
    <div style="font-size:.72rem;color:#1e3a5f;font-weight:700;text-transform:uppercase;letter-spacing:.04em">Gesamt Forecast</div>
    <div style="font-size:1.4rem;font-weight:800;color:#1e3a5f;line-height:1.1">{total_fc_h_all}h</div>
    <div style="font-size:.78rem;color:#64748b;margin-top:2px">{fmt_eur(total_fc_eur_all)}</div>
    <div style="font-size:.7rem;color:#94a3b8;margin-top:3px">{_gesamt_label}</div>
  </div>
  <div style="background:var(--card);border-radius:12px;padding:14px 18px;box-shadow:0 1px 4px rgba(0,0,0,.07);min-width:140px;flex:1;border:2px solid #7c3aed">
    <div style="font-size:.72rem;color:#7c3aed;font-weight:700;text-transform:uppercase;letter-spacing:.04em">🎯 Jira Sprint Plan</div>
    <div style="font-size:1.4rem;font-weight:800;color:#7c3aed;line-height:1.1">{round(sp_total_h)}h</div>
    <div style="font-size:.78rem;color:#64748b;margin-top:2px">Story Points = Stunden</div>
    <div style="font-size:.7rem;color:#94a3b8;margin-top:3px">{sp_count}/{all_count} Tasks mit SP-Schätzungen</div>
  </div>
</div>

<!-- Charts row -->
<div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1.2rem">
  <div style="flex:1;min-width:280px;background:var(--card);border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.07)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <h3 style="margin:0;font-size:.88rem;color:#1e3a5f">Team: Stunden pro Monat</h3>
      <div style="display:flex;gap:8px;font-size:.7rem;color:#64748b">
        <span><span style="display:inline-block;width:9px;height:9px;background:rgba(100,116,139,.45);border-radius:2px;margin-right:2px"></span>Soll</span>
        <span><span style="display:inline-block;width:9px;height:9px;background:rgba(37,99,235,.75);border-radius:2px;margin-right:2px"></span>Ist</span>
      </div>
    </div>
    <canvas id="fcTeamChart" height="90"></canvas>
  </div>
  <div style="flex:2;min-width:300px;background:var(--card);border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.07)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <h3 style="margin:0;font-size:.88rem;color:#1e3a5f">Software Engineers — Soll vs. Ist pro Monat</h3>
      <div style="display:flex;gap:8px;font-size:.7rem;color:#64748b">
        <span><span style="display:inline-block;width:9px;height:9px;background:rgba(100,116,139,.45);border-radius:2px;margin-right:2px"></span>Soll</span>
        <span><span style="display:inline-block;width:9px;height:9px;background:rgba(37,99,235,.75);border-radius:2px;margin-right:2px"></span>Ist</span>
      </div>
    </div>
    <canvas id="fcRoleChart" height="95"></canvas>
  </div>
</div>

<!-- Chart init -->
<script>
(function(){{
  // ── Team chart ─────────────────────────────────────
  var tcCtx = document.getElementById('fcTeamChart');
  if(tcCtx && typeof Chart !== 'undefined') {{
    new Chart(tcCtx, {{
      type: 'bar',
      data: {{
        labels: {chart_labels_js},
        datasets: [
          {{
            label: 'Soll',
            data: {json.dumps(team_soll_data)},
            backgroundColor: 'rgba(100,116,139,.45)',
            borderRadius: 4
          }},
          {{
            label: 'Ist',
            data: {json.dumps(team_ist_data)},
            backgroundColor: 'rgba(37,99,235,.75)',
            borderRadius: 4
          }}
        ]
      }},
      options: {{
        responsive: true,
        plugins: {{ legend: {{ display: false }}, tooltip: {{ callbacks: {{ label: function(c){{ return c.dataset.label+': '+c.raw+'h'; }} }} }} }},
        scales: {{
          x: {{ grid: {{ display: false }}, ticks: {{ font: {{ size: 11 }} }} }},
          y: {{ beginAtZero: true, ticks: {{ font: {{ size: 11 }}, callback: function(v){{ return v+'h'; }} }}, grid: {{ color: 'rgba(0,0,0,.05)' }} }}
        }}
      }}
    }});
  }}

  // ── SE by-month chart ──────────────────────────────
  var rcCtx = document.getElementById('fcRoleChart');
  if(rcCtx && typeof Chart !== 'undefined') {{
    new Chart(rcCtx, {{
      type: 'bar',
      data: {{
        labels: {se_chart_labels_js},
        datasets: [
          {{
            label: 'Soll',
            data: {se_soll_data_js},
            backgroundColor: 'rgba(100,116,139,.45)',
            borderRadius: 4
          }},
          {{
            label: 'Ist',
            data: {se_ist_data_js},
            backgroundColor: 'rgba(37,99,235,.75)',
            borderRadius: 4
          }}
        ]
      }},
      options: {{
        responsive: true,
        plugins: {{ legend: {{ display: false }}, tooltip: {{ callbacks: {{ label: function(c){{ return c.dataset.label+': '+(c.raw===null?'–':c.raw+'h'); }} }} }} }},
        scales: {{
          x: {{ grid: {{ display: false }}, ticks: {{ font: {{ size: 11 }} }} }},
          y: {{ beginAtZero: true, ticks: {{ font: {{ size: 11 }}, callback: function(v){{ return v+'h'; }} }}, grid: {{ color: 'rgba(0,0,0,.05)' }} }}
        }}
      }}
    }});
  }}
}})();
</script>

<!-- Info banner -->
<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:9px 14px;font-size:.77rem;color:#92400e;margin-bottom:1.1rem;line-height:1.6">
  ⚠️ <strong>Vergangene Monate ({" / ".join(month_label_full(m) for m in past_months_all)}):</strong> abgeschlossen — nur Ist. &nbsp;·&nbsp;
  <strong>{month_label_full(curr_month)}:</strong> Ist bis {today}. &nbsp;·&nbsp;
  <strong>{" / ".join(month_label_full(m) for m in future_months)}:</strong> nur Soll-Forecast. &nbsp;·&nbsp;
  <strong>Gesamt Forecast</strong> = {_gesamt_label}.
  &nbsp;·&nbsp; <strong style="color:#7c3aed">🎯 Jira Sprint Plan:</strong> Story Points = Stunden; nur Tasks mit gesetzten Schätzungen ({sp_count} von {all_count} Tasks).
</div>

<!-- Detail table -->
<div style="background:var(--card);border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.07);overflow:hidden">
  <div style="padding:12px 16px 0;display:flex;justify-content:space-between;align-items:center">
    <h3 style="margin:0;font-size:.88rem;color:#1e3a5f">Monatliche Aufschlüsselung — Stunden &amp; Kosten</h3>
    <span style="font-size:.71rem;color:#94a3b8">Rate × Stunden = Kosten</span>
  </div>
  <div style="overflow-x:auto;margin-top:8px">
  <table style="width:100%;border-collapse:collapse;font-size:.8rem;white-space:nowrap">
    <thead>
      <tr style="background:#1e3a5f;color:#fff;font-size:.75rem;line-height:1.3">
        <th rowspan="2" style="text-align:left;padding:.45rem .5rem;vertical-align:bottom">Person</th>
        <th rowspan="2" style="text-align:left;padding:.45rem .3rem;vertical-align:bottom">Rolle</th>
        <th rowspan="2" style="text-align:right;padding:.45rem .3rem;vertical-align:bottom">Rate</th>
        {header_past_months_row1()}
        <th colspan="4" style="text-align:center;padding:.35rem .3rem;border-left:1px solid rgba(255,255,255,.2);background:#1a4a7a">
          {month_label_full(curr_month)} ⚡ (Ist / Soll)</th>
        <th colspan="2" style="text-align:center;padding:.35rem .3rem;border-left:1px solid rgba(255,255,255,.2);background:#1e3d60;color:#93c5fd">
          {month_label_full(future_months[0]) if future_months else '–'} 🔮</th>
        <th colspan="2" style="text-align:center;padding:.35rem .3rem;border-left:1px solid rgba(255,255,255,.2);background:#1e3d60;color:#93c5fd">
          {month_label_full(future_months[1]) if len(future_months)>1 else '–'} 🔮</th>
        <th style="text-align:center;padding:.35rem .5rem;border-left:2px solid rgba(255,255,255,.4);background:#0a1e3a">
          Gesamt Forecast</th>
      </tr>
      <tr style="background:#2d4a6e;color:#b8cde0;font-size:.7rem">
        {header_past_months_row2()}
        <th style="text-align:right;padding:.28rem .3rem;border-left:1px solid rgba(255,255,255,.15)">Ist Std.</th>
        <th style="text-align:right;padding:.28rem .3rem">Soll Std.</th>
        <th style="padding:.28rem .5rem">% Soll</th>
        <th style="text-align:right;padding:.28rem .3rem">Ist € / Soll €</th>
        <th style="text-align:right;padding:.28rem .3rem;border-left:1px solid rgba(255,255,255,.15)">Std.</th>
        <th style="text-align:right;padding:.28rem .3rem">€</th>
        <th style="text-align:right;padding:.28rem .3rem;border-left:1px solid rgba(255,255,255,.15)">Std.</th>
        <th style="text-align:right;padding:.28rem .3rem">€</th>
        <th style="text-align:right;padding:.28rem .5rem;border-left:2px solid rgba(255,255,255,.4)">Std. / €</th>
      </tr>
    </thead>
    <tbody>
{table_rows_html}
{gesamt_row}
    </tbody>
  </table>
  </div>
</div>
    </div>'''

# ── Replace TAB: FORECAST in HTML ────────────────────────────────
fc_start = html.find('<!-- ══════════ TAB: FORECAST ══════════ -->')
fc_end   = html.find('<!-- ══════════ TAB: TICKET', fc_start)
if fc_start >= 0 and fc_end > fc_start:
    html = html[:fc_start] + forecast_tab + '\n\n    ' + html[fc_end:]
    past_summary = ' | '.join(f'{month_label(m)} {round(past_total_ist[m])}h' for m in past_months_all)
    print(f"  ✅ Forecast: {len(person_data)} Personen | {past_summary} | {month_label(curr_month)} {round(feb_total_ist)}/{feb_soll_total}h ({feb_pct_total}%)")
else:
    print("  ⚠️  Forecast Tab-Marker nicht gefunden")

# ─────────────────────────────────────────────────────────────────────────────
# 7. REGENERATE TICKETBUCHUNGEN TAB
# ─────────────────────────────────────────────────────────────────────────────
# Build story list: all stories with hours booked
stories = []
total_sp_est = 0
total_h_booked = 0

for skey, h in sorted(hours_by_story.items(), key=lambda x: -x[1]):
    info = issue_info.get(skey, {})
    if info.get('type') == 'Sub-task': continue
    sp   = info.get('sp')
    pct  = int(h / sp * 100) if sp else None
    if sp: total_sp_est += sp
    total_h_booked += h
    stories.append({
        'key': skey, 'summary': info.get('summary', skey),
        'status': info.get('status', '?'),
        'sp': sp, 'hours': round(h, 2),
        'assignees': sorted(assignees_by_story[skey]),
        'pct': pct,
    })

# Also add Jira stories not yet booked (with SP)
booked_keys = set(hours_by_story.keys())
for k, info in issue_info.items():
    if info['type'] == 'Story' and k not in booked_keys and info.get('sp'):
        stories.append({
            'key': k, 'summary': info.get('summary', k),
            'status': info.get('status', '?'),
            'sp': info['sp'], 'hours': 0,
            'assignees': [], 'pct': 0,
        })

stories.sort(key=lambda s: -s['hours'])

n_with_sp   = sum(1 for s in stories if s['sp'])
sp_total_est = sum(s['sp'] for s in stories if s['sp'])
pct_total    = int(total_h_booked / sp_total_est * 100) if sp_total_est else 0
pct_color    = '#16a34a' if pct_total <= 80 else '#d97706' if pct_total <= 110 else '#dc2626'

# Build JSON for JS-driven table (filter + sort)
import json as _json
stories_json = _json.dumps([{
    'key':       s['key'],
    'summary':   s['summary'],
    'status':    s['status'],
    'sp':        s['sp'],
    'hours':     s['hours'],
    'pct':       s['pct'],
    'assignees': s['assignees'][:2],
} for s in stories])

ticket_tab = f'''<!-- ══════════ TAB: TICKETBUCHUNGEN ══════════ -->
<div id="tab-schaetzungen" class="tab-content" style="display:none">
<h2 style="font-size:1.1rem;color:#1e3a5f;margin:0 0 1rem">📋 Ticketbuchungen – <span id="tb-count">{len(stories)}</span> Stories</h2>

<!-- KPI Cards -->
<div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1rem">
  <div style="background:#fff;border-radius:12px;padding:14px 18px;box-shadow:0 1px 4px rgba(0,0,0,.07);min-width:140px;flex:1">
    <div style="font-size:.72rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.04em">Gebuchte Stunden</div>
    <div style="font-size:1.4rem;font-weight:800;color:#1e3a5f;line-height:1.1" id="tb-kpi-booked">{round(total_h_booked)}h</div>
    <div style="font-size:.78rem;color:#64748b;margin-top:2px" id="tb-kpi-booked-sub">nur Stories mit Schätzung</div>
  </div>
  <div style="background:#fff;border-radius:12px;padding:14px 18px;box-shadow:0 1px 4px rgba(0,0,0,.07);min-width:140px;flex:1">
    <div style="font-size:.72rem;color:#7c3aed;font-weight:700;text-transform:uppercase;letter-spacing:.04em">🎯 Jira Schätzung</div>
    <div style="font-size:1.4rem;font-weight:800;color:#7c3aed;line-height:1.1" id="tb-kpi-est">{round(sp_total_est)}h</div>
    <div style="font-size:.78rem;color:#64748b;margin-top:2px">Story Points = Std. · {n_with_sp}/{len(stories)} Stories</div>
  </div>
  <div style="background:#fff;border-radius:12px;padding:14px 18px;box-shadow:0 1px 4px rgba(0,0,0,.07);min-width:140px;flex:1">
    <div style="font-size:.72rem;color:#d97706;font-weight:700;text-transform:uppercase;letter-spacing:.04em">Budgetverbrauch</div>
    <div style="font-size:1.4rem;font-weight:800;line-height:1.1" id="tb-kpi-avg">{pct_total}%</div>
    <div style="font-size:.78rem;margin-top:2px" id="tb-kpi-avg-sub">Ø über gefilterte Stories mit SP · Stand {today}</div>
  </div>
</div>

<!-- Status Filter Buttons -->
<div id="tb-filter-bar" style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.8rem;align-items:center">
  <span style="font-size:.72rem;color:#64748b;font-weight:600;margin-right:.2rem">Filter:</span>
  <button onclick="tbFilter('__all__')" id="tbf-__all__"
    style="padding:3px 10px;border-radius:20px;border:1.5px solid #1e3a5f;background:#1e3a5f;color:#fff;font-size:.72rem;font-weight:600;cursor:pointer">
    Alle ({len(stories)})
  </button>
</div>

<!-- Table -->
<div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.07);overflow:hidden">
  <table style="width:100%;border-collapse:collapse;font-size:.82rem" id="tb-table">
    <thead>
      <tr style="background:#1e3a5f;color:#e2e8f0">
        <th onclick="tbSort('key')" style="text-align:left;padding:.5rem .5rem;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;cursor:pointer;user-select:none">Ticket <span id="th-key"></span></th>
        <th style="text-align:left;padding:.5rem .5rem;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em">Story</th>
        <th onclick="tbSort('status')" style="text-align:left;padding:.5rem .5rem;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;cursor:pointer;user-select:none">Status <span id="th-status"></span></th>
        <th onclick="tbSort('sp')" style="text-align:right;padding:.5rem .5rem;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;cursor:pointer;user-select:none">Schätzung <span id="th-sp"></span></th>
        <th onclick="tbSort('hours')" style="text-align:right;padding:.5rem .5rem;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;cursor:pointer;user-select:none">Gebucht <span id="th-hours"></span></th>
        <th onclick="tbSort('pct')" style="text-align:left;padding:.5rem .5rem;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;cursor:pointer;user-select:none">% Schätzung <span id="th-pct"></span></th>
        <th style="text-align:left;padding:.5rem .5rem;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em">Personen</th>
      </tr>
    </thead>
    <tbody id="tb-tbody"></tbody>
  </table>
</div>
<p style="font-size:.72rem;color:#94a3b8;margin-top:1rem;text-align:center">
  Zuletzt aktualisiert: {today} · Story Points = Stunden · Sub-Task-Buchungen auf Parent Story aggregiert · QA-Buchungen ausgeblendet
</p>
</div>

<script>
(function(){{
  var TB_DATA = {stories_json};

  // Status badge colours (mirror Python status_badge_html)
  var STATUS_COLORS = {{
    'Done':                  {{bg:'#dcfce7',fg:'#166534',icon:'✓'}},
    'In Progress':           {{bg:'#dbeafe',fg:'#1d4ed8',icon:'▶'}},
    'Selected for Development': {{bg:'#e0e7ff',fg:'#4338ca',icon:'◆'}},
    'Backlog':               {{bg:'#f1f5f9',fg:'#475569',icon:'○'}},
    'AIP Approval':          {{bg:'#fef9c3',fg:'#854d0e',icon:'⏳'}},
    'AIP Acceptance':        {{bg:'#fef9c3',fg:'#854d0e',icon:'⏳'}},
    'Acuity Approval':       {{bg:'#fef9c3',fg:'#854d0e',icon:'⏳'}},
    'Acuity QA':             {{bg:'#fce7f3',fg:'#9d174d',icon:'🔍'}},
    'DESIGN APPROVAL':       {{bg:'#fce7f3',fg:'#9d174d',icon:'🎨'}},
  }};
  function badge(status){{
    var c = STATUS_COLORS[status] || {{bg:'#f1f5f9',fg:'#475569',icon:'•'}};
    return '<span style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:.68rem;font-weight:600;background:'+c.bg+';color:'+c.fg+';white-space:nowrap">'+c.icon+' '+status+'</span>';
  }}

  // Collect unique statuses for filter buttons
  var statusCounts = {{}};
  TB_DATA.forEach(function(s){{ statusCounts[s.status] = (statusCounts[s.status]||0)+1; }});

  // Build filter buttons – append per-status buttons after the "Alle" button
  var filterContainer = document.getElementById('tb-filter-bar');
  Object.keys(statusCounts).sort().forEach(function(st){{
    var btn = document.createElement('button');
    btn.id = 'tbf-'+st.replace(/[^a-z0-9]/gi,'_');
    btn.textContent = st + ' (' + statusCounts[st] + ')';
    btn.setAttribute('onclick', 'tbFilter("'+st.replace(/"/g,'\\"')+'")');
    btn.style.cssText = 'padding:3px 10px;border-radius:20px;border:1.5px solid #94a3b8;background:#fff;color:#475569;font-size:.72rem;font-weight:600;cursor:pointer';
    filterContainer.appendChild(btn);
  }});

  var currentFilter = '__all__';
  var sortCol = 'hours';
  var sortAsc  = false;

  window.tbFilter = function(status){{
    currentFilter = status;
    // Update button styles
    document.querySelectorAll('#tab-schaetzungen button[id^="tbf-"]').forEach(function(b){{
      b.style.background = '#fff'; b.style.color = '#475569'; b.style.borderColor = '#94a3b8';
    }});
    var activeId = 'tbf-'+(status==='__all__' ? '__all__' : status.replace(/[^a-z0-9]/gi,'_'));
    var ab = document.getElementById(activeId);
    if(ab){{ ab.style.background='#1e3a5f'; ab.style.color='#fff'; ab.style.borderColor='#1e3a5f'; }}
    renderTable();
  }};

  window.tbSort = function(col){{
    if(sortCol === col){{ sortAsc = !sortAsc; }} else {{ sortCol = col; sortAsc = col==='status'||col==='key'; }}
    renderTable();
  }};

  function renderTable(){{
    var data = TB_DATA.filter(function(s){{
      return currentFilter === '__all__' || s.status === currentFilter;
    }});

    // Sort
    data.sort(function(a,b){{
      var va = a[sortCol], vb = b[sortCol];
      if(va===null||va===undefined) va = sortAsc ? '\uFFFF' : -Infinity;
      if(vb===null||vb===undefined) vb = sortAsc ? '\uFFFF' : -Infinity;
      if(typeof va==='string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? va-vb : vb-va;
    }});

    // Update sort indicators
    ['key','status','sp','hours','pct'].forEach(function(c){{
      var el = document.getElementById('th-'+c);
      if(!el) return;
      if(c===sortCol) el.textContent = sortAsc ? ' ▲' : ' ▼';
      else el.textContent = '';
    }});

    // Compute KPIs for filtered set – only stories WITH estimate count towards booked hours
    var filtBooked=0, filtBookedAll=0, filtEst=0, withSpCount=0;
    data.forEach(function(s){{
      filtBookedAll += s.hours||0;
      if(s.sp){{
        filtBooked += s.hours||0;
        filtEst    += s.sp;
        withSpCount++;
      }}
    }});
    // Budget consumption = total booked / total estimated (not avg of per-story %)
    var avgPct = filtEst>0 ? Math.round(filtBooked/filtEst*100) : null;
    var avgColor = avgPct===null ? '#64748b' : (avgPct>110 ? '#dc2626' : avgPct>90 ? '#d97706' : '#16a34a');

    document.getElementById('tb-count').textContent = data.length;
    document.getElementById('tb-kpi-booked').textContent = Math.round(filtBooked)+'h';
    document.getElementById('tb-kpi-booked-sub').textContent = withSpCount+' von '+data.length+' Stories mit Schätzung · '+Math.round(filtBookedAll)+'h gesamt';
    document.getElementById('tb-kpi-est').textContent = Math.round(filtEst)+'h';
    document.getElementById('tb-kpi-avg').textContent = avgPct!==null ? avgPct+'%' : '—';
    document.getElementById('tb-kpi-avg').style.color = avgColor;
    document.getElementById('tb-kpi-avg-sub').textContent = 'Gebucht / Geschätzt · '+withSpCount+' Stories mit SP';

    // Render rows
    var html = '';
    data.forEach(function(s){{
      var pct   = s.pct;
      var pctStr = pct!==null ? pct+'%' : '—';
      var barW   = Math.min(pct||0, 100);
      var bc     = (pct||0)>110 ? '#dc2626' : (pct||0)>90 ? '#d97706' : '#94a3b8';
      var bg     = (pct||0)>110 ? '#fef2f2' : (pct||0)>90 ? '#fefce8' : 'transparent';
      var spStr  = s.sp ? Math.round(s.sp)+'h' : '—';
      var hStr   = (s.hours||0)>0 ? s.hours+'h' : '0h';
      html += '<tr style="border-bottom:1px solid #f1f5f9;background:'+bg+'">'
        +'<td style="padding:.4rem .5rem;font-weight:600;font-size:.78rem;white-space:nowrap;color:#1e3a5f">'+s.key+'</td>'
        +'<td style="padding:.4rem .5rem;font-size:.78rem;color:#374151;max-width:220px">'+s.summary.substring(0,55)+'</td>'
        +'<td style="padding:.4rem .5rem">'+badge(s.status)+'</td>'
        +'<td style="text-align:right;padding:.4rem .5rem;font-weight:700;color:#7c3aed;font-size:.82rem">'+spStr+'</td>'
        +'<td style="text-align:right;padding:.4rem .5rem;font-weight:600;font-size:.82rem">'+hStr+'</td>'
        +'<td style="padding:.4rem .5rem"><div style="display:flex;align-items:center;gap:5px">'
        +'<div style="width:52px;background:#f1f5f9;border-radius:3px;height:6px;flex-shrink:0">'
        +'<div style="width:'+barW+'%;height:100%;background:'+bc+';border-radius:3px"></div></div>'
        +'<span style="color:'+bc+';font-weight:700;font-size:.72rem;white-space:nowrap">'+pctStr+'</span>'
        +'</div></td>'
        +'<td style="padding:.4rem .5rem;font-size:.72rem;color:#64748b">'+s.assignees.join(', ')+'</td>'
        +'</tr>';
    }});
    document.getElementById('tb-tbody').innerHTML = html || '<tr><td colspan="7" style="padding:2rem;text-align:center;color:#94a3b8">Keine Stories für diesen Filter</td></tr>';
  }}

  // Initial render
  renderTable();
}})();
</script>'''

# Replace Ticketbuchungen tab
t_start = html.find('<!-- ══════════ TAB: TICKETBUCHUNGEN ══════════ -->')
t_end   = html.find('<!-- ══════════ TAB: ROADMAP ══════════ -->')
if t_start != -1 and t_end != -1:
    html = html[:t_start] + ticket_tab + '\n' + html[t_end:]
    print(f"  ✅ Ticketbuchungen: {len(stories)} Stories, {round(total_h_booked)}h gebucht")

# ─────────────────────────────────────────────────────────────────────────────
# 8. REGENERATE ROADMAP TAB
# ─────────────────────────────────────────────────────────────────────────────
DONE_STATUSES = {'Done'}  # 'Closed' = abgebrochen/nicht benötigt, zählt NICHT als Done
COMBINED_INTO = {'AMS-11': 'AMS-15'}
epics_order   = ['AMS-5','AMS-6','AMS-7','AMS-4','AMS-8','AMS-10','AMS-15','AMS-16','AMS-13','AMS-9','AMS-12','AMS-14']
display_order = [e for e in epics_order if e not in COMBINED_INTO]
epic_names    = {
    'AMS-4':'IP Owner Mgmt','AMS-5':'Setup & Architecture','AMS-6':'Auth / Authorisation',
    'AMS-7':'User & Agency Mgmt','AMS-8':'Settings (Admin)','AMS-9':'My Workspace',
    'AMS-10':'Portfolio Management','AMS-11':'Jurisdiction Mgmt','AMS-12':'Notifications',
    'AMS-13':'Ask AMS','AMS-14':'Audit','AMS-15':'Jurisdiction & Prosecution','AMS-16':'Task Management',
}
epic_colors   = {
    'AMS-5':'#6366f1','AMS-6':'#10b981','AMS-7':'#f59e0b','AMS-4':'#3b82f6',
    'AMS-8':'#8b5cf6','AMS-9':'#ec4899','AMS-10':'#14b8a6','AMS-11':'#f97316',
    'AMS-12':'#64748b','AMS-13':'#06b6d4','AMS-14':'#84cc16','AMS-15':'#ef4444','AMS-16':'#a855f7',
}

def effective_sprint(v):
    """Sprint-Zuweisung: Done nach Resolved-Datum, alle anderen (inkl. Closed) nach Jira-Feld."""
    if v['status'] == 'Done':
        return sprint_by_resolved_date(v.get('resolved', '')) or norm_sprint(v['sprint'])
    return norm_sprint(v['sprint'])

all_stories = [{'key': k, 'summary': v['summary'], 'status': v['status'],
                'epic': v['parent_key'], 'sprint': effective_sprint(v)}
               for k, v in issue_info.items() if v['type'] in ('Story', 'Task', 'Bug')]

matrix   = defaultdict(lambda: defaultdict(list))
for s in all_stories:
    epic, sprint = s['epic'], s['sprint'] or 'no-sprint'
    if epic in epic_names:
        matrix[epic][sprint].append(s)

inv_by_epic = defaultdict(float)
for skey, h in hours_by_story.items():
    epic = issue_info.get(skey, {}).get('parent_key', '')
    if epic: inv_by_epic[epic] += h

sprints = [(sk, sn, sd) for sk, sn, sd, _, _ in SPRINT_SCHEDULE]

def story_chip(s, color):
    closed = s['status'] in ('Closed', 'Post MVP')
    short  = s['summary'][:45] + ('…' if len(s['summary']) > 45 else '')
    strike = 'text-decoration:line-through;opacity:0.6;' if closed else ''
    return (f'<div style="border:1px solid {color}22;border-left:3px solid {color};border-radius:5px;'
            f'padding:5px 7px;margin-bottom:5px;background:{"#f8fafc" if closed else "#fff"}">'
            f'<div style="font-size:.72rem;font-weight:700;color:{color};margin-bottom:2px">{s["key"]}</div>'
            f'<div style="font-size:.75rem;color:#334155;margin-bottom:3px;{strike}">{short}</div>'
            f'{status_badge_html(s["status"])}</div>')

def prog_bar(done, total, color):
    pct = int(done / total * 100) if total else 0
    return (f'<div style="margin-bottom:6px"><span style="font-size:.7rem;font-weight:700;color:#334155">'
            f'{done}/{total}</span> <span style="font-size:.67rem;color:#94a3b8">erledigt</span>'
            f'<div style="height:5px;background:#e2e8f0;border-radius:3px;margin-top:3px">'
            f'<div style="height:5px;background:{color};border-radius:3px;width:{pct}%"></div></div></div>')

# Epic estimates from Jira (Σ Original Estimate in seconds → hours)
epic_estimates = {}
for k, v in issue_info.items():
    if v['type'] == 'Epic':
        sigma = v.get('sigma_orig', 0)
        if sigma:
            try: epic_estimates[k] = round(int(sigma) / 3600)
            except: pass

# Sprint totals for summary row
SPRINT_FULL_NAMES = ['AMS ' + sn for _, sn, _, _, _ in SPRINT_SCHEDULE]
# CURRENT_SPRINT, CURRENT_SP_KEY, CURRENT_SP_DATES are auto-detected earlier from SPRINT_SCHEDULE
sprint_totals = {s: {'done':0,'in_progress':0,'selected':0,'other':0,'total':0} for s in SPRINT_FULL_NAMES}
for s in all_stories:
    full_sp = 'AMS ' + s['sprint'].replace('S','Sprint ') if s.get('sprint') else None
    if full_sp and full_sp in sprint_totals:
        sprint_totals[full_sp]['total'] += 1
        if s['status'] == 'Done': sprint_totals[full_sp]['done'] += 1
        elif s['status'] == 'In Progress':   sprint_totals[full_sp]['in_progress'] += 1
        elif s['status'] in ('Selected for Development',): sprint_totals[full_sp]['selected'] += 1
        else: sprint_totals[full_sp]['other'] += 1

def sprint_summary_cell_rm(sprint_name):
    d = sprint_totals.get(sprint_name, {})
    total = d.get('total', 0)
    done  = d.get('done', 0)
    inp   = d.get('in_progress', 0)
    sel   = d.get('selected', 0)
    pct   = round(done/total*100) if total else 0
    bar_c = '#16a34a' if pct >= 70 else '#d97706' if pct >= 30 else '#3b82f6'
    bg    = '#fffbeb' if sprint_name == CURRENT_SPRINT else '#f8fafc'
    bord  = '2px solid #f59e0b' if sprint_name == CURRENT_SPRINT else '1px solid #e2e8f0'
    badge = '<span style="font-size:.58rem;background:#f59e0b;color:#fff;padding:1px 4px;border-radius:2px;margin-left:4px">JETZT</span>' if sprint_name == CURRENT_SPRINT else ''
    ip_txt = f'▶ {inp}' if inp else ''
    sel_txt = f'📋 {sel}' if sel else ''
    sub = ' · '.join(filter(None,[ip_txt, sel_txt]))
    return (f'<td style="border-right:1px solid #e2e8f0;border-bottom:2px solid #cbd5e1;background:{bg};'
            f'text-align:center;padding:6px 8px;border-top:{bord}">'
            f'<div style="font-size:.85rem;font-weight:800;color:#1e293b">{done}'
            f'<span style="color:#94a3b8;font-weight:400">/{total}</span>{badge}</div>'
            f'<div style="font-size:.65rem;color:#64748b;margin-top:1px">{sub}</div>'
            f'<div style="margin-top:3px;background:#e2e8f0;border-radius:3px;height:4px">'
            f'<div style="width:{pct}%;height:100%;background:{bar_c};border-radius:3px;min-width:2px"></div></div></td>')

summary_cells = '<td style="border-right:2px solid #cbd5e1;border-bottom:2px solid #cbd5e1;background:#f8fafc;padding:4px 8px;text-align:right;vertical-align:middle"><span style="font-size:.65rem;color:#94a3b8">Σ Schätzung</span></td>'
for sp_full in SPRINT_FULL_NAMES:
    summary_cells += sprint_summary_cell_rm(sp_full)
summary_row = (
    '<tr style="border-bottom:2px solid #cbd5e1">'
    '<td style="position:sticky;left:0;z-index:1;background:#f1f5f9;border-right:2px solid #cbd5e1;'
    'border-bottom:2px solid #cbd5e1;padding:8px 12px;border-top:2px solid #e2e8f0">'
    '<div style="font-size:.7rem;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.04em">Done / Total</div>'
    '<div style="font-size:.65rem;color:#94a3b8;margin-top:1px">Stories pro Sprint</div></td>'
    + summary_cells + '</tr>'
)

header = ('<th style="position:sticky;left:0;z-index:2;background:#1e3a5f;color:#fff;padding:10px 14px;'
          'font-size:.8rem;min-width:190px;border-right:2px solid #2d4f7c">Epic</th>'
          '<th style="background:#1e3a5f;color:#e0e7ff;text-align:right;padding:10px 8px;'
          'font-size:.72rem;min-width:80px;border-right:2px solid #2d4f7c;white-space:nowrap">Orig.<br>Schätzung</th>')
for sid, sname, sdates in sprints:
    ex = '<br><span style="font-size:.63rem;opacity:.7">Feature Freeze</span>' if sid == 'S5' else (
         '<br><span style="font-size:.63rem;opacity:.7">Stabilization</span>' if sid == 'S6' else '')
    header += (f'<th style="background:#1e3a5f;color:#fff;text-align:center;padding:10px 8px;'
               f'font-size:.78rem;min-width:190px;border-right:1px solid #2d4f7c">'
               f'<b>{sname}</b><br><span style="font-size:.68rem;opacity:.8">{sdates}</span>{ex}</th>')

body = ''
for ek in display_order:
    color, name = epic_colors[ek], epic_names[ek]
    merged_keys = [k for k, v in COMBINED_INTO.items() if v == ek]
    inv  = inv_by_epic.get(ek, 0) + sum(inv_by_epic.get(k, 0) for k in merged_keys)
    fin  = (f'<div style="margin-top:6px;font-size:.7rem;color:#475569">⏱ {inv:.0f}h investiert</div>'
            if inv > 0 else '')
    lk   = ek + ''.join(f'+{k}' for k in merged_keys)
    est_h = epic_estimates.get(ek, 0)
    est_txt = f'{est_h}h' if est_h else '—'
    est_color = '#1e293b' if est_h else '#cbd5e1'
    ec   = (f'<td style="position:sticky;left:0;z-index:1;background:#fff;border-right:2px solid {color}33;'
            f'border-bottom:1px solid #e2e8f0;padding:10px 12px;vertical-align:top;min-width:190px">'
            f'<div style="font-size:.68rem;font-weight:800;color:{color};letter-spacing:.04em;margin-bottom:2px">{lk}</div>'
            f'<div style="font-size:.78rem;font-weight:700;color:#1e293b;line-height:1.3">{name}</div>{fin}</td>'
            f'<td style="border-right:2px solid #e2e8f0;border-bottom:1px solid #e2e8f0;background:#f8fafc;'
            f'padding:8px 10px;text-align:right;vertical-align:middle;white-space:nowrap">'
            f'<span style="font-size:.78rem;font-weight:700;color:{est_color}">{est_txt}</span></td>')
    sc = ''
    for sid, _, _ in sprints:
        cell = list(matrix[ek].get(sid, []))
        for mk in merged_keys: cell.extend(matrix[mk].get(sid, []))
        cell.sort(key=lambda s: s['key'])
        if cell:
            done = sum(1 for s in cell if s['status'] in DONE_STATUSES)
            sc  += (f'<td style="padding:8px;vertical-align:top;border-right:1px solid #e2e8f0;'
                    f'border-bottom:1px solid #e2e8f0;background:#fafbfc">'
                    f'{prog_bar(done, len(cell), color)}{"".join(story_chip(s, color) for s in cell)}</td>')
        else:
            sc += f'<td style="border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;background:#f8fafc"></td>'
    body += f'<tr>{ec}{sc}</tr>\n'

total_s = len(all_stories)
done_s  = sum(1 for s in all_stories if s['status'] == 'Done')
legend  = ''.join(
    f'<span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;font-size:.73rem">'
    f'<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-weight:600;color:{fg};background:{bg}">'
    f'{i} {st}</span></span>'
    for st, (i, fg, bg) in {
        'Done':('✓','#16a34a','#dcfce7'),'In Progress':('▶','#2563eb','#dbeafe'),
        'Selected for Development':('📋','#475569','#f1f5f9'),'Backlog':('○','#94a3b8','#f8fafc'),
        'Acuity QA':('🔍','#d97706','#fef3c7'),'Acuity Approval':('✅','#7c3aed','#ede9fe'),
        'Closed':('✕','#6b7280','#f3f4f6'),'Post MVP':('⏭','#374151','#e5e7eb'),
    }.items()
)

roadmap_tab = f'''<!-- ══════════ TAB: ROADMAP ══════════ -->
<div id="tab-roadmap" class="tab-content" style="display:none">
<h2 style="font-size:1.25rem;font-weight:800;color:#1e3a5f;margin:0 0 .25rem">🗺️ Sprint Roadmap</h2>
<p style="color:#64748b;font-size:.85rem;margin:0 0 1rem">Zuletzt aktualisiert: <b>{today}</b> · Stories nach Epics · Progress: Done vs. Offen</p>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:1.2rem">
  <div style="background:#fff;border-radius:10px;padding:12px 16px;box-shadow:0 1px 4px rgba(0,0,0,.07);border-top:3px solid #16a34a">
    <div style="font-size:.72rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Stories Gesamt</div>
    <div style="font-size:1.6rem;font-weight:800;color:#1e293b">{total_s}</div>
    <div style="font-size:.73rem;color:#16a34a;font-weight:600">{done_s} Done</div>
  </div>
  <div style="background:#fff;border-radius:10px;padding:12px 16px;box-shadow:0 1px 4px rgba(0,0,0,.07);border-top:3px solid #2563eb">
    <div style="font-size:.72rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.05em">In Progress</div>
    <div style="font-size:1.6rem;font-weight:800;color:#1e293b">{sum(1 for s in all_stories if s['status']=='In Progress')}</div>
    <div style="font-size:.73rem;color:#2563eb;font-weight:600">aktiv im Sprint</div>
  </div>
  <div style="background:#fff;border-radius:10px;padding:12px 16px;box-shadow:0 1px 4px rgba(0,0,0,.07);border-top:3px solid #7c3aed">
    <div style="font-size:.72rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Epics</div>
    <div style="font-size:1.6rem;font-weight:800;color:#1e293b">{len(display_order)}</div>
    <div style="font-size:.73rem;color:#64748b">Bereiche</div>
  </div>
  <div style="background:#fff;border-radius:10px;padding:12px 16px;box-shadow:0 1px 4px rgba(0,0,0,.07);border-top:3px solid #d97706">
    <div style="font-size:.72rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Stand</div>
    <div style="font-size:1.2rem;font-weight:800;color:#1e293b">{today}</div>
    <div style="font-size:.73rem;color:#64748b">letzte Aktualisierung</div>
  </div>
</div>
<div style="background:#fff;border-radius:10px;padding:8px 14px;margin-bottom:1rem;box-shadow:0 1px 3px rgba(0,0,0,.06);display:flex;flex-wrap:wrap;align-items:center;gap:4px">
  <span style="font-size:.73rem;font-weight:700;color:#64748b;margin-right:6px">Status:</span>{legend}
</div>
<div style="overflow-x:auto;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.08)">
<table style="border-collapse:collapse;width:100%;min-width:1300px">
<thead><tr>{header}</tr></thead>
<tbody>{summary_row}
{body}</tbody>
</table></div>
</div>'''

rm_start = html.find('<!-- ══════════ TAB: ROADMAP ══════════ -->')
rm_end   = html.find('<!-- ══════════ TAB: HEALTH ══════════ -->')
if rm_start != -1 and rm_end != -1:
    html = html[:rm_start] + roadmap_tab + '\n' + html[rm_end:]
    print(f"  ✅ Roadmap: {total_s} Stories, {done_s} Done")

# ─────────────────────────────────────────────────────────────────────────────
# 9. REGENERATE SPRINT HEALTH TAB
# ─────────────────────────────────────────────────────────────────────────────
# Velocity per sprint – basierend auf Resolved-Datum (wann wurde das Ticket wirklich abgeschlossen)
# sprint_by_resolved_date ist oben nach norm_sprint definiert (wird auch von Roadmap genutzt)
done_per_sprint = defaultdict(int)
in_progress = []
selected    = []
for k, v in issue_info.items():
    if v['type'] not in ('Story', 'Task', 'Bug'): continue
    if v['status'] == 'Done':
        # Resolved-Datum bestimmt den Sprint (nicht das Jira-Sprint-Feld)
        resolved_sp = sprint_by_resolved_date(v.get('resolved', ''))
        if resolved_sp:
            done_per_sprint[resolved_sp] += 1
        # Closed = abgebrochen, zählt nicht zur Velocity
    elif v['status'] == 'In Progress':
        in_progress.append(v)
    elif v['status'] == 'Selected for Development':
        selected.append(v)

# Only sprints whose end_date is strictly before today count as "completed"
finished_sprint_keys = {sid for sid, _, _, sp_start, sp_end in SPRINT_SCHEDULE if sp_end <= today_date}
completed_sprints = {s: done_per_sprint.get(s, 0) for s in finished_sprint_keys if s != 'S0'}  # S0 = Warmup, ab S1
sprints_done_list = sorted(completed_sprints.keys())
avg_velocity = round(sum(completed_sprints.values()) / len(completed_sprints), 1) if completed_sprints else 0
remaining_sprints = sum(1 for _, _, _, sp_start, sp_end in SPRINT_SCHEDULE if sp_end > today_date)
stories_remaining = total_s - done_s
# Prognose = zusätzliche Stories in verbleibenden Sprints
projected_add_low  = int(avg_velocity * remaining_sprints * 0.8)
projected_add_high = int(avg_velocity * remaining_sprints * 1.1)
# Gesamtprognose = bereits Done + noch zu liefern
projected_total_low  = done_s + projected_add_low
projected_total_high = done_s + projected_add_high
scope_pct_low  = int(projected_total_low  / total_s * 100) if total_s else 0
scope_pct_high = int(projected_total_high / total_s * 100) if total_s else 0
# ── Sprint-Projektionstabelle + Benötigte Velocity ───────────────────────────
# Aktueller Sprint: Hochrechnung auf Basis der bisher geleisteten Arbeit
curr_sp_done_so_far = done_per_sprint.get(CURRENT_SP_KEY, 0)
curr_sp_start = next(sp_start for sid,_,_,sp_start,_ in SPRINT_SCHEDULE if sid == CURRENT_SP_KEY)
curr_sp_end   = next(sp_end   for sid,_,_,_,sp_end   in SPRINT_SCHEDULE if sid == CURRENT_SP_KEY)
days_total_curr   = (curr_sp_end - curr_sp_start).days
days_elapsed_curr = max(1, (today_date - curr_sp_start).days)
days_remaining_curr = max(0, (curr_sp_end - today_date).days)
curr_sp_projected = round(curr_sp_done_so_far / days_elapsed_curr * days_total_curr, 1)
curr_sp_still_expected = max(0, round(curr_sp_projected - curr_sp_done_so_far, 1))

# Benötigte Velocity: was müssen S4/5/6 leisten NACH Abschluss des aktuellen Sprints?
future_full_sprints = sum(1 for _,_,_,sp_start,_ in SPRINT_SCHEDULE if sp_start >= curr_sp_end)
stories_after_curr  = max(0, stories_remaining - curr_sp_still_expected)
needed_velocity = round(stories_after_curr / future_full_sprints, 1) if future_full_sprints else 0
current_sprint_done = done_per_sprint.get('S2', done_per_sprint.get(max(sprints_done_list) if sprints_done_list else 'S1', 0))

# Projektionstabelle: jeder verbleibende Sprint mit kumulativem Done
proj_rows_html = ''
cumulative = done_s
sprint_rows = []
for sid, sn, _, sp_start, sp_end in SPRINT_SCHEDULE:
    if sp_end <= today_date: continue   # abgeschlossene Sprints überspringen
    if sid == CURRENT_SP_KEY:
        label   = f'{sid} (läuft)'
        add     = curr_sp_still_expected
        note    = f'{curr_sp_done_so_far} Done · +{curr_sp_still_expected:.0f} erwartet ({days_remaining_curr} Tage)'
        bg      = '#fffbeb'
        border  = '#fde68a'
        fg      = '#92400e'
    else:
        label   = sid
        add     = avg_velocity
        note    = f'Ø {avg_velocity} (historische Velocity)'
        bg      = '#f8fafc'
        border  = '#e2e8f0'
        fg      = '#475569'
    cumulative += add
    pct = int(cumulative / total_s * 100) if total_s else 0
    sprint_rows.append((label, add, cumulative, pct, note, bg, border, fg))

for label, add, cum, pct, note, bg, border, fg in sprint_rows:
    bar_color = '#16a34a' if pct >= 90 else '#f59e0b' if pct >= 60 else '#ef4444'
    proj_rows_html += (
        f'<div style="display:grid;grid-template-columns:80px 40px 1fr 60px;gap:6px;'
        f'align-items:center;padding:7px 10px;background:{bg};border-left:3px solid {border};'
        f'border-radius:0 6px 6px 0;margin-bottom:4px">'
        f'<div style="font-size:.75rem;font-weight:700;color:{fg}">{label}</div>'
        f'<div style="font-size:.75rem;font-weight:800;color:#16a34a;text-align:center">+{add:.0f}</div>'
        f'<div style="font-size:.67rem;color:#94a3b8">{note}</div>'
        f'<div style="text-align:right">'
        f'<span style="font-size:.75rem;font-weight:800;color:#1e293b">{int(cum)}</span>'
        f'<span style="font-size:.65rem;color:#94a3b8"> ({pct}%)</span></div>'
        f'</div>'
    )

# Velocity cards
vel_cards = ''
for sp in sprints_done_list:
    n = done_per_sprint[sp]
    vel_cards += (f'<div style="background:#f0fdf4;border-radius:8px;padding:12px 14px;border:1px solid #bbf7d0">'
                  f'<div style="font-size:.68rem;color:#16a34a;font-weight:700;text-transform:uppercase">{sp} abgeschlossen</div>'
                  f'<div style="font-size:1.8rem;font-weight:800;color:#15803d;line-height:1.1">{n}</div>'
                  f'<div style="font-size:.72rem;color:#166534;font-weight:600">Stories Done</div></div>')

# Current sprint card – zeigt Done (nach Resolved-Datum) + In Progress
current_sp_done = done_per_sprint.get(CURRENT_SP_KEY, 0)
vel_cards += (f'<div style="background:#fffbeb;border-radius:8px;padding:12px 14px;border:1px solid #fde68a">'
              f'<div style="font-size:.68rem;color:#d97706;font-weight:700;text-transform:uppercase">Aktuell laufend ({CURRENT_SP_KEY})</div>'
              f'<div style="font-size:1.8rem;font-weight:800;color:#b45309;line-height:1.1">{len(in_progress)}</div>'
              f'<div style="font-size:.72rem;color:#92400e;font-weight:600">In Progress</div>'
              f'<div style="font-size:.67rem;color:#64748b;margin-top:4px">'
              f'{current_sp_done} Done · {len(selected)} Selected</div></div>')
# Needed card
vel_cards += (f'<div style="background:#fef2f2;border-radius:8px;padding:12px 14px;border:1px solid #fecaca">'
              f'<div style="font-size:.68rem;color:#dc2626;font-weight:700;text-transform:uppercase">Benötigt (S4–S6)</div>'
              f'<div style="font-size:1.8rem;font-weight:800;color:#dc2626;line-height:1.1">{needed_velocity}</div>'
              f'<div style="font-size:.72rem;color:#991b1b;font-weight:600">Stories / Sprint</div>'
              f'<div style="font-size:.67rem;color:#64748b;margin-top:4px">'
              f'{"–" if avg_velocity==0 else f"{round(needed_velocity/avg_velocity,1)}× aktuelle Velocity · {int(stories_after_curr)} Stories nach {CURRENT_SP_KEY}"}</div></div>')
# Prognose card
vel_cards += (f'<div style="background:#fff7ed;border-radius:8px;padding:12px 14px;border:1px solid #fed7aa">'
              f'<div style="font-size:.68rem;color:#ea580c;font-weight:700;text-transform:uppercase">Prognose bis Sprint 6</div>'
              f'<div style="font-size:1.8rem;font-weight:800;color:#c2410c;line-height:1.1">'
              f'{scope_pct_low}–{scope_pct_high}%</div>'
              f'<div style="font-size:.72rem;color:#9a3412;font-weight:600">'
              f'{projected_total_low}–{projected_total_high} von {total_s} Stories gesamt</div>'
              f'<div style="font-size:.67rem;color:#64748b;margin-top:4px">'
              f'{done_s} bereits Done + {projected_add_low}–{projected_add_high} weitere</div></div>')

done_pct_bar = int(done_s / total_s * 100) if total_s else 0
ip_pct_bar   = int(len(in_progress) / total_s * 100) if total_s else 0

# Top stories in progress
ip_html = ''.join(
    f'<div style="padding:8px 12px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center">'
    f'<div><div style="font-size:.75rem;font-weight:700;color:#1e3a5f">{s["summary"][:60]}</div>'
    f'<div style="font-size:.68rem;color:#64748b;margin-top:2px">In Progress</div></div>'
    f'{status_badge_html("In Progress")}</div>'
    for s in in_progress[:8]
)

# Velocity table per sprint (S0–S6) – derived from SPRINT_SCHEDULE
SPRINT_NAMES_VEL = [(sk, sn) for sk, sn, _, _, _ in SPRINT_SCHEDULE]
# CURRENT_SP_KEY and CURRENT_SP_DATES are auto-detected from SPRINT_SCHEDULE (see top of script)
sprint_detail = {}
for k, v in issue_info.items():
    if v['type'] not in ('Story', 'Task', 'Bug'): continue
    # Für Done: Sprint nach Resolved-Datum (wann wirklich abgeschlossen)
    # Für alle anderen (inkl. Closed): Sprint nach Jira-Feld
    if v['status'] == 'Done':
        sp = sprint_by_resolved_date(v.get('resolved', ''))
    else:
        sp = norm_sprint(v['sprint'])
    if not sp: continue
    if sp not in sprint_detail:
        sprint_detail[sp] = {'done':0,'in_progress':0,'selected':0,'other':0,'total':0,'issues':[]}
    sprint_detail[sp]['total'] += 1
    sprint_detail[sp]['issues'].append({'key':k,'summary':v['summary'],'status':v['status'],'assignee':v.get('assignee','')})
    if v['status'] == 'Done':                 sprint_detail[sp]['done'] += 1
    elif v['status'] == 'In Progress':        sprint_detail[sp]['in_progress'] += 1
    elif v['status'] == 'Selected for Development': sprint_detail[sp]['selected'] += 1
    else:                                     sprint_detail[sp]['other'] += 1  # inkl. Closed

vel_table_rows = ''
for row_key, row_label, row_color in [
    ('done','✓ Done','#16a34a'),('in_progress','▶ In Progress','#2563eb'),
    ('selected','📋 Selected','#0891b2'),('other','○ Backlog/etc','#94a3b8')
]:
    cells = f'<td style="padding:7px 10px;font-size:.74rem;font-weight:700;color:{row_color};background:#f8fafc;border-right:1px solid #e2e8f0">{row_label}</td>'
    for sp_key, _ in SPRINT_NAMES_VEL:
        d = sprint_detail.get(sp_key, {})
        v_val = d.get(row_key, 0)
        bg = '#fffbeb' if sp_key == CURRENT_SP_KEY else ('#f0fdf4' if row_key=='done' and v_val>0 else '#fff')
        cells += (f'<td style="padding:7px 10px;text-align:center;font-size:.8rem;font-weight:700;'
                  f'color:{row_color if v_val else "#e2e8f0"};background:{bg};border-right:1px solid #e2e8f0">'
                  f'{"—" if not v_val else v_val}</td>')
    vel_table_rows += f'<tr style="border-bottom:1px solid #f1f5f9">{cells}</tr>'

# Done% row
pct_cells = '<td style="padding:7px 10px;font-size:.72rem;font-weight:700;color:#374151;background:#f8fafc;border-right:1px solid #e2e8f0">Done %</td>'
for sp_key, _ in SPRINT_NAMES_VEL:
    d = sprint_detail.get(sp_key, {})
    tot = d.get('total', 0)
    dn  = d.get('done', 0)
    pct = round(dn/tot*100) if tot else 0
    bar_c = '#16a34a' if pct >= 70 else '#d97706' if pct >= 30 else '#94a3b8'
    bg = '#fffbeb' if sp_key == CURRENT_SP_KEY else '#fff'
    pct_cells += (f'<td style="padding:5px 10px;text-align:center;background:{bg};border-right:1px solid #e2e8f0">'
                  f'<div style="font-size:.76rem;font-weight:700;color:{bar_c}">{pct}%</div>'
                  f'<div style="margin-top:2px;background:#e2e8f0;border-radius:3px;height:4px">'
                  f'<div style="width:{pct}%;height:100%;background:{bar_c};border-radius:3px;min-width:2px"></div></div></td>')
vel_table_rows += f'<tr>{pct_cells}</tr>'

sprint_th_headers = '<th style="padding:7px 10px;font-size:.7rem;font-weight:700;color:#475569;text-align:left;border-right:1px solid #e2e8f0;background:#f8fafc">Status</th>'
for sp_key, sp_label in SPRINT_NAMES_VEL:
    is_curr = sp_key == CURRENT_SP_KEY
    bg = '#fef3c7' if is_curr else '#f8fafc'
    badge = ' <span style="font-size:.57rem;background:#f59e0b;color:#fff;padding:1px 3px;border-radius:2px">JETZT</span>' if is_curr else ''
    sprint_th_headers += (f'<th style="padding:7px 10px;font-size:.72rem;font-weight:700;color:#1e293b;'
                          f'text-align:center;border-right:1px solid #e2e8f0;background:{bg};white-space:nowrap">'
                          f'{sp_label}{badge}</th>')

velocity_table_html = f'''<div style="margin-bottom:1.5rem">
  <h3 style="font-size:.82rem;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.06em;margin:0 0 .75rem">📊 Velocity-Übersicht · Sprint 0–6</h3>
  <div style="overflow-x:auto;border-radius:10px;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,.05)">
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="border-bottom:2px solid #e2e8f0">{sprint_th_headers}</tr></thead>
      <tbody>{vel_table_rows}</tbody>
    </table>
  </div>
</div>'''

# Full ticket listing by status for current sprint
STATUS_ORDER = ['Done','Closed','Acuity QA','Acuity Approval','In Progress','Selected for Development','Design Todo','DESIGN APPROVAL','Backlog']
STATUS_CFG   = {
    'Done':                    ('✓','#16a34a','#dcfce7'),
    'Closed':                  ('✓','#16a34a','#dcfce7'),
    'Acuity QA':               ('🔍','#7c3aed','#ede9fe'),
    'Acuity Approval':         ('✅','#d97706','#fef3c7'),
    'In Progress':             ('▶','#2563eb','#dbeafe'),
    'Selected for Development':('📋','#475569','#f1f5f9'),
    'Design Todo':             ('✏','#ea580c','#ffedd5'),
    'DESIGN APPROVAL':         ('🎨','#0891b2','#e0f2fe'),
    'Backlog':                 ('○','#94a3b8','#f8fafc'),
}
by_status_curr = defaultdict(list)
for iss in sprint_detail.get(CURRENT_SP_KEY, {}).get('issues', []):
    by_status_curr[iss['status']].append(iss)

ticket_sections_html = ''
for st in STATUS_ORDER:
    issues_st = by_status_curr.get(st, [])
    if not issues_st: continue
    icon, fg, bg = STATUS_CFG.get(st, ('·','#64748b','#f8fafc'))
    badge_html = f'<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:.72rem;font-weight:700;color:{fg};background:{bg}">{icon} {st}</span>'
    rows_h = ''.join(
        f'<div style="padding:7px 12px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:10px">'
        f'<span style="font-size:.7rem;font-weight:800;color:#1e3a5f;white-space:nowrap;min-width:72px">{iss["key"]}</span>'
        f'<span style="font-size:.78rem;color:#334155;flex:1">{iss["summary"][:80]}</span>'
        f'<span style="font-size:.68rem;color:#94a3b8;white-space:nowrap">{iss["assignee"].split(",")[0] if iss["assignee"] else "—"}</span>'
        f'</div>'
        for iss in issues_st
    )
    ticket_sections_html += (
        f'<div style="margin-bottom:.6rem;border-radius:8px;border:1px solid #e2e8f0;overflow:hidden">'
        f'<div style="padding:6px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:8px">'
        f'{badge_html}<span style="font-size:.72rem;color:#64748b">({len(issues_st)})</span></div>'
        f'{rows_h}</div>'
    )

curr_sprint_detail = sprint_detail.get(CURRENT_SP_KEY, {})
curr_done_n = curr_sprint_detail.get('done', 0)
curr_ip_n   = curr_sprint_detail.get('in_progress', 0)
curr_sel_n  = curr_sprint_detail.get('selected', 0)
curr_tot_n  = curr_sprint_detail.get('total', 0)

curr_sprint_banner = (
    f'<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#fff;border-radius:10px;'
    f'padding:10px 18px;margin-bottom:1rem;display:flex;align-items:center;gap:16px;flex-wrap:wrap">'
    f'<div><span style="font-size:.63rem;opacity:.75;text-transform:uppercase;letter-spacing:.06em">Aktueller Sprint</span>'
    f'<div style="font-size:1.1rem;font-weight:800">{CURRENT_SPRINT}</div>'
    f'<div style="font-size:.72rem;opacity:.8">{CURRENT_SP_DATES}</div></div>'
    f'<div style="width:1px;height:40px;background:rgba(255,255,255,.2)"></div>'
    f'<div style="text-align:center"><div style="font-size:1.5rem;font-weight:800">{curr_done_n}</div><div style="font-size:.63rem;opacity:.75">Done</div></div>'
    f'<div style="text-align:center"><div style="font-size:1.5rem;font-weight:800;color:#93c5fd">{curr_ip_n}</div><div style="font-size:.63rem;opacity:.75">In Progress</div></div>'
    f'<div style="text-align:center"><div style="font-size:1.5rem;font-weight:800;color:#fcd34d">{curr_sel_n}</div><div style="font-size:.63rem;opacity:.75">Geplant</div></div>'
    f'<div style="text-align:center"><div style="font-size:1.5rem;font-weight:800;color:#6ee7b7">{curr_tot_n}</div><div style="font-size:.63rem;opacity:.75">Total</div></div>'
    f'</div>'
)

# ── Kapazitätsauslastung: Soll/Ist pro Person pro Sprint ──────────────────────
# Nur Sprints mit IST-Daten oder in/nach aktuellem Sprint anzeigen
_sprints_with_data = [sid for sid, *_ in SPRINT_SCHEDULE
                      if sum(hours_person_sprint[p][sid] for p in hours_person_sprint) > 0]

def _cap_color(pct):
    if pct >= 95:  return ('#16a34a', '#dcfce7')   # grün
    if pct >= 75:  return ('#d97706', '#fef3c7')   # orange
    return             ('#dc2626', '#fee2e2')        # rot

def _cap_bar(pct):
    capped = min(pct, 120)
    col, _ = _cap_color(pct)
    over = capped > 100
    bar_w = min(capped, 100)
    over_w = max(0, capped - 100)
    return (f'<div style="position:relative;height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden">'
            f'<div style="width:{bar_w}%;height:100%;background:{col};border-radius:4px"></div>'
            + (f'<div style="position:absolute;right:0;top:0;width:{over_w}%;height:100%;background:#7c3aed;border-radius:4px"></div>' if over else '')
            + '</div>')

capacity_tabs_html = {}
for _sid in _sprints_with_data:
    _sname = next(sn for s, sn, *_ in SPRINT_SCHEDULE if s == _sid)
    _people = sorted(p for p, v in FORECAST_SOLL.items() if v['role'] == 'Software Engineer')
    rows_html = ''
    tot_soll, tot_ist = 0.0, 0.0
    for _p in _people:
        _soll = soll_for_sprint(_p, _sid)
        _ist  = hours_person_sprint[_p][_sid]
        if _soll == 0 and _ist == 0: continue
        _role = FORECAST_SOLL[_p]['role']
        _diff = _ist - _soll
        _pct  = round(_ist / _soll * 100) if _soll > 0 else 0
        _col, _bg = _cap_color(_pct)
        _sign = '+' if _diff >= 0 else ''
        _vac  = VACATION_HOURS.get(_sid, {}).get(_p, 0)
        _vac_txt = f'<span style="font-size:.65rem;color:#94a3b8;margin-left:4px">({int(_vac/8)}d Urlaub)</span>' if _vac else ''
        rows_html += (
            f'<tr style="border-bottom:1px solid #f1f5f9">'
            f'<td style="padding:7px 10px;font-size:.78rem;font-weight:600;color:#1e293b;white-space:nowrap">{_p}</td>'
            f'<td style="padding:7px 8px;font-size:.72rem;color:#64748b">{_role}</td>'
            f'<td style="padding:7px 8px;font-size:.78rem;font-weight:600;text-align:right;color:#475569">{_soll:.0f}h{_vac_txt}</td>'
            f'<td style="padding:7px 8px;font-size:.78rem;font-weight:600;text-align:right;color:#1e293b">{_ist:.0f}h</td>'
            f'<td style="padding:7px 8px;font-size:.78rem;font-weight:600;text-align:right;color:{_col}">{_sign}{_diff:.0f}h</td>'
            f'<td style="padding:7px 12px;min-width:130px">'
            f'<div style="display:flex;align-items:center;gap:6px">'
            f'<div style="flex:1">{_cap_bar(_pct)}</div>'
            f'<span style="font-size:.75rem;font-weight:700;color:{_col};min-width:36px;text-align:right">{_pct}%</span>'
            f'</div></td>'
            f'</tr>'
        )
        tot_soll += _soll; tot_ist += _ist
    _tot_diff = tot_ist - tot_soll
    _tot_pct  = round(tot_ist / tot_soll * 100) if tot_soll > 0 else 0
    _tot_col, _ = _cap_color(_tot_pct)
    _tot_sign = '+' if _tot_diff >= 0 else ''
    rows_html += (
        f'<tr style="background:#f8fafc;border-top:2px solid #cbd5e1">'
        f'<td style="padding:8px 10px;font-size:.78rem;font-weight:800;color:#1e293b" colspan="2">GESAMT</td>'
        f'<td style="padding:8px;font-size:.78rem;font-weight:800;text-align:right;color:#475569">{tot_soll:.0f}h</td>'
        f'<td style="padding:8px;font-size:.78rem;font-weight:800;text-align:right">{tot_ist:.0f}h</td>'
        f'<td style="padding:8px;font-size:.78rem;font-weight:800;text-align:right;color:{_tot_col}">{_tot_sign}{_tot_diff:.0f}h</td>'
        f'<td style="padding:8px 12px"><div style="display:flex;align-items:center;gap:6px">'
        f'<div style="flex:1">{_cap_bar(_tot_pct)}</div>'
        f'<span style="font-size:.75rem;font-weight:800;color:{_tot_col};min-width:36px;text-align:right">{_tot_pct}%</span>'
        f'</div></td></tr>'
    )
    capacity_tabs_html[_sid] = (_sname, rows_html)

# Build selector buttons + tables
_btn_html = ''
_tbl_html = ''
for i, _sid in enumerate(_sprints_with_data):
    _sname, _rows = capacity_tabs_html[_sid]
    _active_btn = 'background:#1e3a5f;color:#fff' if i == len(_sprints_with_data)-1 else 'background:#f1f5f9;color:#475569'
    _display    = 'block' if i == len(_sprints_with_data)-1 else 'none'
    _btn_html += (f'<button onclick="showCapTab(\'{_sid}\')" id="capbtn-{_sid}" '
                  f'style="padding:5px 14px;border-radius:6px;border:none;cursor:pointer;font-size:.78rem;font-weight:600;{_active_btn}">'
                  f'{_sname}</button>')
    _tbl_html += (f'<div id="captab-{_sid}" style="display:{_display}">'
                  f'<table style="width:100%;border-collapse:collapse">'
                  f'<thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">'
                  f'<th style="padding:8px 10px;text-align:left;font-size:.72rem;color:#64748b;font-weight:700">Name</th>'
                  f'<th style="padding:8px;text-align:left;font-size:.72rem;color:#64748b;font-weight:700">Rolle</th>'
                  f'<th style="padding:8px;text-align:right;font-size:.72rem;color:#64748b;font-weight:700">Soll</th>'
                  f'<th style="padding:8px;text-align:right;font-size:.72rem;color:#64748b;font-weight:700">Ist</th>'
                  f'<th style="padding:8px;text-align:right;font-size:.72rem;color:#64748b;font-weight:700">Diff</th>'
                  f'<th style="padding:8px 12px;text-align:left;font-size:.72rem;color:#64748b;font-weight:700;min-width:150px">Auslastung</th>'
                  f'</tr></thead><tbody>{_rows}</tbody></table></div>')

capacity_section_html = f'''
<div style="background:#fff;border-radius:12px;padding:16px 20px;margin-top:1.5rem;box-shadow:0 2px 8px rgba(0,0,0,.07)">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:1rem">👥</span>
      <h3 style="font-size:.95rem;font-weight:800;color:#1e3a5f;margin:0">Kapazitätsauslastung</h3>
      <span style="font-size:.7rem;color:#64748b">Soll aus Forecast · Ist aus PBI · Urlaub aus Confluence</span>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">{_btn_html}</div>
  </div>
  <div style="display:flex;gap:14px;margin-bottom:10px;font-size:.7rem;flex-wrap:wrap">
    <span><span style="display:inline-block;width:10px;height:10px;background:#16a34a;border-radius:2px;margin-right:3px"></span>≥95% – auf Kurs</span>
    <span><span style="display:inline-block;width:10px;height:10px;background:#d97706;border-radius:2px;margin-right:3px"></span>75–95% – leicht unter Soll</span>
    <span><span style="display:inline-block;width:10px;height:10px;background:#dc2626;border-radius:2px;margin-right:3px"></span>&lt;75% – deutlich unter Soll</span>
    <span><span style="display:inline-block;width:10px;height:10px;background:#7c3aed;border-radius:2px;margin-right:3px"></span>&gt;100% – Überstunden</span>
  </div>
  {_tbl_html}
</div>
<script>
function showCapTab(sid) {{
  document.querySelectorAll('[id^="captab-"]').forEach(el => el.style.display='none');
  document.querySelectorAll('[id^="capbtn-"]').forEach(el => {{
    el.style.background='#f1f5f9'; el.style.color='#475569';
  }});
  document.getElementById('captab-'+sid).style.display='block';
  document.getElementById('capbtn-'+sid).style.background='#1e3a5f';
  document.getElementById('capbtn-'+sid).style.color='#fff';
}}
</script>
'''

health_tab = f'''<!-- ══════════ TAB: HEALTH ══════════ -->
<div id="tab-health" class="tab-content" style="display:none">
  <h2 style="font-size:1.25rem;font-weight:800;color:#1e3a5f;margin:0 0 .25rem">🏥 Sprint Health</h2>
  <p style="color:#64748b;font-size:.85rem;margin:0 0 1.2rem">Velocity pro Sprint · Prognose · Stand {today}</p>
  {curr_sprint_banner}
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:1.5rem">
    <div style="background:#fff;border-radius:10px;padding:12px 16px;box-shadow:0 1px 4px rgba(0,0,0,.07);border-top:3px solid #16a34a">
      <div style="font-size:.72rem;color:#64748b;font-weight:600;text-transform:uppercase">Stories Done</div>
      <div style="font-size:1.6rem;font-weight:800;color:#1e293b">{done_s}</div>
      <div style="font-size:.73rem;color:#16a34a;font-weight:600">von {total_s} gesamt</div>
    </div>
    <div style="background:#fff;border-radius:10px;padding:12px 16px;box-shadow:0 1px 4px rgba(0,0,0,.07);border-top:3px solid #2563eb">
      <div style="font-size:.72rem;color:#64748b;font-weight:600;text-transform:uppercase">Ø Velocity</div>
      <div style="font-size:1.6rem;font-weight:800;color:#1e293b">{avg_velocity}</div>
      <div style="font-size:.73rem;color:#2563eb;font-weight:600">Stories / Sprint</div>
    </div>
    <div style="background:#fff;border-radius:10px;padding:12px 16px;box-shadow:0 1px 4px rgba(0,0,0,.07);border-top:3px solid #d97706">
      <div style="font-size:.72rem;color:#64748b;font-weight:600;text-transform:uppercase">In Progress</div>
      <div style="font-size:1.6rem;font-weight:800;color:#1e293b">{len(in_progress)}</div>
      <div style="font-size:.73rem;color:#d97706;font-weight:600">+ {len(selected)} Selected</div>
    </div>
    <div style="background:#fff;border-radius:10px;padding:12px 16px;box-shadow:0 1px 4px rgba(0,0,0,.07);border-top:3px solid #dc2626">
      <div style="font-size:.72rem;color:#64748b;font-weight:600;text-transform:uppercase">Verbleibend</div>
      <div style="font-size:1.6rem;font-weight:800;color:#1e293b">{stories_remaining}</div>
      <div style="font-size:.73rem;color:#dc2626;font-weight:600">in {remaining_sprints} Sprints zu schaffen</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
    <div>
      <div style="background:#fff;border-radius:12px;padding:16px 20px;margin-bottom:1.2rem;box-shadow:0 2px 8px rgba(0,0,0,.07)">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
          <span style="font-size:1rem">⚡</span>
          <h3 style="font-size:.95rem;font-weight:800;color:#1e3a5f;margin:0">Velocity &amp; Prognose</h3>
          <span style="font-size:.7rem;color:#64748b">{remaining_sprints} Sprints verbleibend</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
          {vel_cards}
        </div>
        <div style="margin-top:14px;padding:12px 14px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
          <div style="font-size:.68rem;font-weight:700;color:#475569;text-transform:uppercase;margin-bottom:8px">
            📈 Projektion verbleibende Sprints
            <span style="font-weight:400;color:#94a3b8;margin-left:6px">Basis: {curr_sp_done_so_far} Done in {days_elapsed_curr} Tagen · Ø Velocity {avg_velocity}</span>
          </div>
          <div style="font-size:.65rem;color:#94a3b8;display:grid;grid-template-columns:80px 40px 1fr 60px;gap:6px;padding:0 10px;margin-bottom:4px">
            <span>Sprint</span><span style="text-align:center">+Done</span><span></span><span style="text-align:right">Gesamt</span>
          </div>
          {proj_rows_html}
        </div>
        <div style="margin-top:14px">
          <div style="display:flex;justify-content:space-between;font-size:.7rem;color:#64748b;margin-bottom:4px">
            <span>Scope-Prognose bis Sprint 6</span>
            <span style="font-weight:600;color:#dc2626">~{total_s - projected_total_high}–{total_s - projected_total_low} Stories nicht lieferbar bei aktuellem Tempo</span>
          </div>
          <div style="height:14px;background:#f1f5f9;border-radius:7px;overflow:hidden;display:flex">
            <div style="width:{done_pct_bar}%;background:#16a34a;display:flex;align-items:center;justify-content:center">
              <span style="font-size:.6rem;color:#fff;font-weight:700;white-space:nowrap">{done_s} Done</span>
            </div>
            <div style="width:{ip_pct_bar}%;background:#3b82f6"></div>
          </div>
          <div style="display:flex;gap:16px;margin-top:6px;font-size:.68rem;color:#64748b">
            <span><span style="display:inline-block;width:10px;height:10px;background:#16a34a;border-radius:2px;margin-right:3px"></span>Done ({done_s})</span>
            <span><span style="display:inline-block;width:10px;height:10px;background:#3b82f6;border-radius:2px;margin-right:3px"></span>In Progress ({len(in_progress)})</span>
            <span><span style="display:inline-block;width:10px;height:10px;background:#f1f5f9;border-radius:2px;margin-right:3px;border:1px solid #e2e8f0"></span>Offen ({stories_remaining - len(in_progress)})</span>
          </div>
        </div>
      </div>
    </div>
    <div>
      <div style="background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.07);overflow:hidden">
        <div style="padding:16px 20px;border-bottom:1px solid #f1f5f9">
          <h3 style="font-size:.95rem;font-weight:800;color:#1e3a5f;margin:0">▶ Aktuelle Stories In Progress</h3>
        </div>
        {ip_html if ip_html else '<div style="padding:20px;color:#94a3b8;font-size:.82rem">Keine Stories In Progress</div>'}
      </div>
    </div>
  </div>
  {velocity_table_html}
  <div style="margin-bottom:1.5rem">
    <h3 style="font-size:.82rem;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.06em;margin:0 0 .75rem">🎯 {CURRENT_SPRINT} · Tickets nach Status · {CURRENT_SP_DATES}</h3>
    {ticket_sections_html if ticket_sections_html else '<div style="color:#94a3b8;font-size:.82rem;padding:20px">Keine Tickets gefunden</div>'}
  </div>
  {capacity_section_html}
  <p style="font-size:.72rem;color:#94a3b8;margin-top:1rem;text-align:center">
    Zuletzt aktualisiert: {today} · Daten aus Jira CSV Export · Story Points = Stunden
  </p>
</div>'''

h_start = html.find('<!-- ══════════ TAB: HEALTH ══════════ -->')
# Use the TIMESHEET marker as end boundary – much safer than searching for <script>
h_end   = html.find('<!-- ══════════ TAB: TIMESHEET ══════════ -->', h_start)
if h_start != -1 and h_end != -1:
    html = html[:h_start] + health_tab + '\n' + html[h_end:]
    print(f"  ✅ Sprint Health: Velocity {avg_velocity}, {done_s} Done, {len(in_progress)} In Progress")
else:
    print(f"  ⚠️  Sprint Health: Marker nicht gefunden (h_start={h_start}, h_end={h_end})")

# ─────────────────────────────────────────────────────────────────────────────
# 10. WRITE OUTPUT
# ─────────────────────────────────────────────────────────────────────────────
with open(DASH_FILE, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"\n🎉 Dashboard vollständig aktualisiert: {DASH_FILE}")
print(f"   Stand: {today}")
