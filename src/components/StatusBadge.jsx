const STATUS_CFG = {
  'Done':                    { icon: '✓',  fg: '#16a34a', bg: '#dcfce7' },
  'In Progress':             { icon: '▶',  fg: '#2563eb', bg: '#dbeafe' },
  'Selected for Development':{ icon: '📋', fg: '#475569', bg: '#f1f5f9' },
  'Backlog':                 { icon: '○',  fg: '#94a3b8', bg: '#f8fafc' },
  'Design Todo':             { icon: '✏️', fg: '#ea580c', bg: '#fed7aa' },
  'DESIGN APPROVAL':         { icon: '🎨', fg: '#0891b2', bg: '#e0f2fe' },
  'Acuity QA':               { icon: '🔍', fg: '#d97706', bg: '#fef3c7' },
  'Acuity Approval':         { icon: '✅', fg: '#7c3aed', bg: '#ede9fe' },
  'Closed':                  { icon: '✕',  fg: '#6b7280', bg: '#f3f4f6' },
  'Post MVP':                { icon: '⏭', fg: '#374151', bg: '#e5e7eb' },
}

export default function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || { icon: '?', fg: '#94a3b8', bg: '#f8fafc' }
  return (
    <span
      className="status-badge"
      style={{ color: cfg.fg, background: cfg.bg }}
    >
      {cfg.icon} {status}
    </span>
  )
}
