import { Icon } from '@/components/Icon'
import type { IconName } from '@/components/Icon'

const STATUS_META: Record<string, { label: string; icon: IconName; amber?: boolean }> = {
  draft: { label: 'Draft', icon: 'radio-unchecked' },
  requested: { label: 'Requested', icon: 'cloud-upload' },
  assigned: { label: 'Assigned', icon: 'person-add' },
  accepted: { label: 'Accepted', icon: 'play-arrow' },
  rejected: { label: 'Rejected', icon: 'warning', amber: true },
  in_progress: { label: 'In Progress', icon: 'sync' },
  on_hold: { label: 'On Hold', icon: 'schedule' },
  uat: { label: 'UAT', icon: 'fact-check' },
  completed: { label: 'Completed', icon: 'check-circle' },
}

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, icon: 'fact-check' as IconName }
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.06em] px-2 py-0.5 rounded font-semibold ${
        meta.amber ? 'bg-warning/10 text-warning' : 'bg-surface-container text-on-surface-variant'
      }`}
    >
      <Icon name={meta.icon} size={12} />
      {meta.label}
    </span>
  )
}