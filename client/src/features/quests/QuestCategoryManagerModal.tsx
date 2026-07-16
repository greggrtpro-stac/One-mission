import { DEFAULT_QUEST_CATEGORY_COLOR, type QuestCategoryDto } from '@one-mission/shared'
import { useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { questCategoriesApi } from '@/api/quests'
import {
  CategoryManagerModal,
  type CategoryManagerAdapter,
  type ManagedCategory,
} from '@/components/categories/CategoryManagerModal'
import { applyXpResult } from '@/stores/xpFx'

interface QuestCategoryManagerModalProps {
  open: boolean
  onClose: () => void
}

function toManaged(category: QuestCategoryDto): ManagedCategory {
  const { questsCount, ...rest } = category
  return { ...rest, itemsCount: questsCount }
}

/** Gestion des catégories de Quêtes : adaptateur du gestionnaire générique. */
export function QuestCategoryManagerModal({ open, onClose }: QuestCategoryManagerModalProps) {
  const queryClient = useQueryClient()

  const adapter = useMemo<CategoryManagerAdapter>(
    () => ({
      // Clé distincte de ['quest-categories'] (page/formulaire) : la forme
      // mise en cache ici est ManagedCategory, pas QuestCategoryDto.
      queryKey: 'quest-categories-manager',
      list: () => questCategoriesApi.list().then((r) => r.categories.map(toManaged)),
      create: (payload) => questCategoriesApi.create(payload),
      update: (id, payload) => questCategoriesApi.update(id, payload),
      reorder: (ids) => questCategoriesApi.reorder(ids),
      removeReassign: (id, targetCategoryId) =>
        questCategoriesApi.remove(id, { strategy: 'reassign', targetCategoryId }),
      removeWithItems: async (id) => {
        // Supprimer des quêtes terminées reprend leur XP (même règle que la
        // suppression individuelle) : refléter le delta immédiatement.
        const result = await questCategoriesApi.remove(id, { strategy: 'deleteQuests' })
        applyXpResult(result.xp)
        return result
      },
      onChanged: () => {
        void queryClient.invalidateQueries({ queryKey: ['quest-categories-manager'] })
        void queryClient.invalidateQueries({ queryKey: ['quest-categories'] })
        void queryClient.invalidateQueries({ queryKey: ['quests'] })
        void queryClient.invalidateQueries({ queryKey: ['profile-stats'] })
      },
      defaultColor: DEFAULT_QUEST_CATEGORY_COLOR,
      labels: {
        countBadge: (n) => `${n} quête${n > 1 ? 's' : ''}`,
        containsWarning: (name, n) =>
          `La catégorie « ${name} » contient encore ${n} quête${n > 1 ? 's' : ''}.`,
        reassignTitle: 'Déplacer ces quêtes vers',
        deleteItemsTitle: 'Ou supprimer aussi les quêtes',
        deleteItemsDescription: (n) =>
          `${n > 1 ? `Les ${n} quêtes seront définitivement supprimées` : 'La quête sera définitivement supprimée'} avec la catégorie ; l'XP des quêtes terminées sera reprise.`,
        deleteItemsButton: 'Supprimer aussi les quêtes',
      },
    }),
    [queryClient],
  )

  return <CategoryManagerModal open={open} onClose={onClose} adapter={adapter} />
}
