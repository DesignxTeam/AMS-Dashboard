#!/usr/bin/env python3
"""
AMS Dashboard – Jira API Fetch
================================
Führe dieses Script lokal aus (nicht in Cowork).
Es liest config.ini, holt alle AMS Issues per API
und speichert jira_export.csv im AMS Dashboard Ordner.

Voraussetzung: pip install requests
Ausführen:     python3 scripts/fetch_jira.py
"""

import os, sys, csv, json, configparser

# ── Config lesen ──────────────────────────────────────────────────
BASE   = os.path.dirname(os.path.abspath(__file__))
PARENT = os.path.dirname(BASE)
CONFIG = os.path.join(PARENT, 'config.ini')
OUT    = os.path.join(PARENT, 'jira_export.csv')

cfg = configparser.ConfigParser()
cfg.read(CONFIG, encoding='utf-8')

email     = cfg.get('jira', 'email', fallback='').strip()
api_token = cfg.get('jira', 'api_token', fallback='').strip().strip('"')
domain    = cfg.get('jira', 'domain', fallback='').strip().rstrip('/')
project   = cfg.get('jira', 'project_key', fallback='AMS').strip()

if not all([email, api_token, domain]):
    print("❌ config.ini unvollständig – bitte email, api_token und domain ausfüllen.")
    sys.exit(1)

try:
    import requests
except ImportError:
    print("❌ 'requests' nicht installiert. Bitte ausführen: pip install requests")
    sys.exit(1)

auth    = (email, api_token)
base    = f"{domain}/rest/api/3"
headers = {"Accept": "application/json"}

# ── Auth test ─────────────────────────────────────────────────────
print(f"🔗 Verbinde mit {domain} …")
r = requests.get(f"{base}/myself", auth=auth, headers=headers, timeout=15)
if r.status_code != 200:
    print(f"❌ Auth fehlgeschlagen ({r.status_code}): {r.text[:200]}")
    sys.exit(1)
me = r.json()
print(f"✅ Angemeldet als: {me.get('displayName')} ({me.get('emailAddress')})")

# ── Fields we want ────────────────────────────────────────────────
FIELDS = [
    'summary', 'issuetype', 'status', 'priority', 'assignee', 'reporter',
    'created', 'updated', 'resolution', 'parent',
    'customfield_10014',  # Sprint (classic) / Epic Link
    'customfield_10002',  # Story Points (this Jira instance: ascentsoftware.atlassian.net)
    'customfield_10016',  # Story Points (next-gen fallback)
    'customfield_10028',  # Sprint (next-gen)
    'customfield_10008',  # Epic Link (classic)
    'customfield_10004',  # Story Points (classic fallback)
    'customfield_10018',  # Parent Link
    'timeoriginalestimate',
    'aggregatetimeoriginalestimate',
    'timespent',
    'aggregatetimespent',
    'labels',
]

# ── Paginated fetch ───────────────────────────────────────────────
JQL      = f'project = {project} ORDER BY issuekey ASC'
all_issues = []
start    = 0
page_size = 100

print(f"📥 Lade Issues (JQL: {JQL}) …")
while True:
    params = {
        'jql':        JQL,
        'startAt':    start,
        'maxResults': page_size,
        'fields':     ','.join(FIELDS),
    }
    r = requests.get(f"{base}/search/jql", auth=auth, headers=headers, params=params, timeout=30)
    if r.status_code != 200:
        print(f"❌ API Fehler ({r.status_code}): {r.text[:300]}")
        sys.exit(1)
    data  = r.json()
    batch = data.get('issues', [])
    all_issues.extend(batch)
    total = data.get('total', 0)
    start += len(batch)
    print(f"  {start}/{total} Issues geladen …")
    if start >= total or not batch:
        break

print(f"✅ {len(all_issues)} Issues geladen")

# ── Helper: find sprint name ──────────────────────────────────────
def get_sprint(fields):
    """Try multiple Sprint field IDs, return sprint name or ''."""
    for fid in ['customfield_10014', 'customfield_10028']:
        val = fields.get(fid)
        if not val:
            continue
        # Next-gen: list of sprint objects
        if isinstance(val, list) and val:
            sp = val[-1]  # last (most recent) sprint
            if isinstance(sp, dict):
                return sp.get('name', '')
            # Classic: string like "com.pyxis.greenhopper...name=Sprint 2,..."
            if isinstance(sp, str) and 'name=' in sp:
                part = sp.split('name=')[-1].split(',')[0].rstrip(']')
                return part
        if isinstance(val, str) and 'name=' in val:
            return val.split('name=')[-1].split(',')[0].rstrip(']')
    return ''

def get_sp(fields):
    # customfield_10002 = Story Points on ascentsoftware.atlassian.net
    for fid in ['customfield_10002', 'customfield_10016', 'customfield_10004', 'story_points']:
        v = fields.get(fid)
        if v is not None:
            return str(v)
    return ''

def get_epic_key(fields):
    parent = fields.get('parent', {}) or {}
    if parent:
        ptype = (parent.get('fields', {}) or {}).get('issuetype', {}).get('name', '')
        if ptype == 'Epic':
            return parent.get('key', '')
    # Classic epic link
    return fields.get('customfield_10008', '') or fields.get('customfield_10018', '') or ''

def get_epic_name(fields):
    parent = fields.get('parent', {}) or {}
    if parent:
        pfields = parent.get('fields', {}) or {}
        ptype   = pfields.get('issuetype', {}) or {}
        if ptype.get('name') == 'Epic':
            return pfields.get('summary', '')
    return ''

def get_parent_key(fields):
    parent = fields.get('parent', {}) or {}
    return parent.get('key', '') if parent else ''

# ── Write CSV ─────────────────────────────────────────────────────
COLUMNS = [
    'Issue key', 'Summary', 'Issue Type', 'Status', 'Status Category',
    'Priority', 'Assignee', 'Reporter', 'Created', 'Updated',
    'Resolution', 'Sprint', 'Story Points',
    'Original estimate', 'Σ Original Estimate', 'Time Spent',
    'Epic Link', 'Epic Name', 'Parent key', 'Parent summary', 'Labels',
]

rows = []
for issue in all_issues:
    f  = issue.get('fields', {}) or {}
    st = f.get('status', {}) or {}

    rows.append({
        'Issue key':          issue.get('key', ''),
        'Summary':            f.get('summary', '') or '',
        'Issue Type':         (f.get('issuetype', {}) or {}).get('name', ''),
        'Status':             st.get('name', ''),
        'Status Category':    (st.get('statusCategory', {}) or {}).get('name', ''),
        'Priority':           (f.get('priority', {}) or {}).get('name', ''),
        'Assignee':           (f.get('assignee', {}) or {}).get('displayName', '') if f.get('assignee') else '',
        'Reporter':           (f.get('reporter', {}) or {}).get('displayName', '') if f.get('reporter') else '',
        'Created':            (f.get('created', '') or '')[:10],
        'Updated':            (f.get('updated', '') or '')[:10],
        'Resolution':         (f.get('resolution', {}) or {}).get('name', '') if f.get('resolution') else '',
        'Sprint':             get_sprint(f),
        'Story Points':       get_sp(f),
        'Original estimate':  str(f.get('timeoriginalestimate', '') or ''),
        'Σ Original Estimate': str(f.get('aggregatetimeoriginalestimate', '') or ''),
        'Time Spent':         str(f.get('timespent', '') or ''),
        'Epic Link':          get_epic_key(f),
        'Epic Name':          get_epic_name(f),
        'Parent key':         get_parent_key(f),
        'Parent summary':     ((f.get('parent', {}) or {}).get('fields', {}) or {}).get('summary', ''),
        'Labels':             ', '.join(f.get('labels', []) or []),
    })

with open(OUT, 'w', newline='', encoding='utf-8') as fh:
    writer = csv.DictWriter(fh, fieldnames=COLUMNS)
    writer.writeheader()
    writer.writerows(rows)

print(f"\n✅ Gespeichert: {OUT}")
print(f"   {len(rows)} Issues · {sum(1 for r in rows if r['Issue Type']=='Story')} Stories")
print(f"\n▶ Nächster Schritt: python3 scripts/update_dashboard.py")
