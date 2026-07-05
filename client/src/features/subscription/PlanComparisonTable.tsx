import { FEATURES, PLAN_LIST, planIncludes, type PlanTier } from '@one-mission/shared'
import { Check, X } from 'lucide-react'
import { Card } from '@/components/ui'
import { cn } from '@/lib/cn'
import { PlanBadge } from './PlanBadge'

interface PlanComparisonTableProps {
  /** Met en évidence la colonne de l'offre actuelle (page Level Up). */
  currentPlan?: PlanTier | null
}

/**
 * Comparatif complet Starter / Pro / Max — utilisé sur la landing et sur
 * Level Up. Ajouter une offre revient à éditer FEATURES côté shared.
 */
export function PlanComparisonTable({ currentPlan }: PlanComparisonTableProps) {
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line">
            <th className="px-5 py-4 text-left font-medium text-muted">Fonctionnalité</th>
            {PLAN_LIST.map((p) => (
              <th
                key={p.tier}
                className={cn(
                  'px-5 py-4 text-center',
                  currentPlan === p.tier && 'bg-accent-soft/40',
                )}
              >
                <div className="flex flex-col items-center gap-1.5">
                  <PlanBadge plan={p.tier} />
                  {currentPlan === p.tier && (
                    <span className="text-[11px] font-medium text-accent">Ton offre</span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FEATURES.map((f, i) => (
            <tr
              key={f.key}
              className={cn(i !== FEATURES.length - 1 && 'border-b border-line')}
            >
              <td className="px-5 py-3.5">
                <p className="font-medium">{f.label}</p>
                <p className="text-xs text-faint">{f.description}</p>
              </td>
              {PLAN_LIST.map((p) => (
                <td
                  key={p.tier}
                  className={cn(
                    'px-5 py-3.5 text-center',
                    currentPlan === p.tier && 'bg-accent-soft/40',
                  )}
                >
                  {planIncludes(p.tier, f.key) ? (
                    <Check size={17} className="mx-auto text-success" />
                  ) : (
                    <X size={17} className="mx-auto text-faint" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
