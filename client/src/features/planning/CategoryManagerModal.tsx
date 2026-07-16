import { DEFAULT_CATEGORY_COLOR, type PlanningCategoryDto } from '@one-mission/shared'
import { useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { planningCategoriesApi } from '@/api/planning'
import {
  CategoryManagerModal as GenericCategoryManagerModal,
  type CategoryManagerAdapter,
  type ManagedCategory,
} from '@/components/categories/CategoryManagerModal'

interface CategoryManagerModalProps {
  open: boolean
  onClose: () => void
}

function toManaged(category: PlanningCategoryDto): ManagedCategory {
  const { eventsCount, ...rest } = category
  return { ...rest, itemsCount: eventsCount }
}

/** Gestion des catégories de Planning : adaptateur du gestionnaire générique. */
export function CategoryManagerModal({ open, onClose }: CategoryManagerModalProps) {
  const queryClient = useQueryClient()

  const adapter = useMemo<CategoryManagerAdapter>(
    () => ({
      // Clé distincte de ['planning-categories'] (page/formulaire d'événement) :
      // la forme mise en cache ici est ManagedCategory, pas PlanningCategoryDto.
      queryKey: 'planning-categories-manager',
      list: () => planningCategoriesApi.list().then((r) => r.categories.map(toManaged)),
      create: (payload) => planningCategoriesApi.create(payload),
      update: (id, payload) => planningCategoriesApi.update(id, payload),
      reorder: (ids) => planningCategoriesApi.reorder(ids),
      removeReassign: (id, targetCategoryId) =>
        planningCategoriesApi.remove(id, { strategy: 'reassign', targetCategoryId }),
      removeWithItems: (id) => planningCategoriesApi.remove(id, { strategy: 'deleteEvents' }),
      onChanged: () => {
        void queryClient.invalidateQueries({ queryKey: ['planning-categories-manager'] })
        void queryClient.invalidateQueries({ queryKey: ['planning-categories'] })
        void queryClient.invalidateQueries({ queryKey: ['planning'] })
        void queryClient.invalidateQueries({ queryKey: ['planning-stats'] })
      },
      defaultColor: DEFAULT_CATEGORY_COLOR,
      labels: {
        countBadge: (n) => `${n} évén.`,
        containsWarning: (name, n) =>
          `La catégorie « ${name} » contient encore ${n} événement${n > 1 ? 's' : ''}.`,
        reassignTitle: 'Déplacer ces événements vers',
        deleteItemsTitle: 'Ou supprimer aussi les événements',
        deleteItemsDescription: (n) =>
          `Les ${n} événement${n > 1 ? 's' : ''} seront définitivement supprimés avec la catégorie.`,
        deleteItemsButton: 'Supprimer aussi les événements',
      },
    }),
    [queryClient],
  )

  return <GenericCategoryManagerModal open={open} onClose={onClose} adapter={adapter} />
}
