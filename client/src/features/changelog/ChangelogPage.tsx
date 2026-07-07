import { Bug, Sparkles, Wrench } from 'lucide-react'
import { Badge, Card } from '@/components/ui'
import { CHANGELOG, type ChangeType } from '@/config/changelog'

const TYPE_META: Record<ChangeType, { label: string; icon: typeof Sparkles; badge: 'accent' | 'success' | 'warning' }> = {
  new: { label: 'Nouveau', icon: Sparkles, badge: 'accent' },
  improvement: { label: 'Amélioration', icon: Wrench, badge: 'success' },
  fix: { label: 'Correctif', icon: Bug, badge: 'warning' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Nouveautés (changelog) — le contenu vit dans src/config/changelog.ts. */
export function ChangelogPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Nouveautés</h1>
      <p className="mt-1 text-sm text-muted">
        Ce qui a changé dans One Mission, version après version. Un avis, un bug ? Utilise le
        bouton « Signaler un bug » en haut de l'écran.
      </p>

      <div className="mt-8 flex flex-col gap-6">
        {CHANGELOG.map((v) => (
          <Card key={v.version} className="p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">
                <span className="text-accent">v{v.version}</span> — {v.title}
              </h2>
              <p className="text-xs text-faint">{formatDate(v.date)}</p>
            </div>
            <ul className="mt-4 flex flex-col gap-2.5">
              {v.changes.map((c, i) => {
                const meta = TYPE_META[c.type]
                return (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <Badge variant={meta.badge} className="mt-0.5 shrink-0">
                      <meta.icon size={11} /> {meta.label}
                    </Badge>
                    <span className="text-muted">{c.text}</span>
                  </li>
                )
              })}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  )
}
