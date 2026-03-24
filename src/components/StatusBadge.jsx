const STATUS_CFG = {
  'Done':                    { icon: CheckIcon,   bg: 'bg-success/20',    text: 'text-success',        border: 'border-success/30' },
  'In Progress':             { icon: PlayIcon,    bg: 'bg-primary/20',    text: 'text-primary',        border: 'border-primary/30' },
  'Selected for Development':{ icon: ListIcon,    bg: 'bg-accent-cyan/20',text: 'text-accent-cyan',    border: 'border-accent-cyan/30' },
  'Backlog':                 { icon: CircleIcon,  bg: 'bg-muted',         text: 'text-muted-foreground',border: 'border-border' },
  'Design Todo':             { icon: PencilIcon,  bg: 'bg-accent-orange/20',text: 'text-accent-orange', border: 'border-accent-orange/30' },
  'DESIGN APPROVAL':         { icon: PaletteIcon, bg: 'bg-accent-cyan/20',text: 'text-accent-cyan',    border: 'border-accent-cyan/30' },
  'Acuity QA':               { icon: SearchIcon,  bg: 'bg-warning/20',    text: 'text-warning',        border: 'border-warning/30' },
  'Acuity Approval':         { icon: CheckCircle, bg: 'bg-accent-pink/20',text: 'text-accent-pink',    border: 'border-accent-pink/30' },
  'Closed':                  { icon: XIcon,       bg: 'bg-muted',         text: 'text-muted-foreground',border: 'border-border' },
  'Post MVP':                { icon: FastForward, bg: 'bg-muted',         text: 'text-muted-foreground',border: 'border-border' },
}

export default function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || { icon: CircleIcon, bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' }
  const Icon = cfg.icon
  
  return (
    <span className={`status-badge ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
      <Icon className="w-3 h-3" />
      <span>{status}</span>
    </span>
  )
}

// Mini icon components
function CheckIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function PlayIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}

function ListIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="8" x2="21" y1="6" y2="6" />
      <line x1="8" x2="21" y1="12" y2="12" />
      <line x1="8" x2="21" y1="18" y2="18" />
      <line x1="3" x2="3.01" y1="6" y2="6" />
      <line x1="3" x2="3.01" y1="12" y2="12" />
      <line x1="3" x2="3.01" y1="18" y2="18" />
    </svg>
  )
}

function CircleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
    </svg>
  )
}

function PencilIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  )
}

function PaletteIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
    </svg>
  )
}

function SearchIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function CheckCircle({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function XIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

function FastForward({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="13 19 22 12 13 5 13 19" />
      <polygon points="2 19 11 12 2 5 2 19" />
    </svg>
  )
}
