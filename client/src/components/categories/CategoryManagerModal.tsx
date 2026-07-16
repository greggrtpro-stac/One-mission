import { AUTO_CATEGORY_COLORS, DEFAULT_CATEGORY_ICON } from '@one-mission/shared'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Reorder, useDragControls } from 'framer-motion'
import { ArrowRightLeft, ChevronDown, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { EmojiPicker } from '@/components/emoji/EmojiPicker'
import { Badge, Button, Input, Modal, Select, Spinner } from '@/components/ui'
import { cn } from '@/lib/cn'

/** Forme commune aux catégories personnalisées (Planning, Quêtes). */
export interface ManagedCategory {
  id: string
  name: string
  color: string
  icon: string
  sortOrder: number
  isDefault: boolean
  /** Nombre d'éléments (événements, quêtes…) encore rattachés. */
  itemsCount: number
}

export interface CategoryPayload {
  name: string
  color: string
  icon: string
}

/**
 * Tout ce qui distingue un gestionnaire de catégories d'un autre : les appels
 * API, les invalidations à déclencher et le vocabulaire des éléments rattachés.
 */
export interface CategoryManagerAdapter {
  queryKey: string
  list: () => Promise<ManagedCategory[]>
  create: (payload: CategoryPayload) => Promise<unknown>
  update: (id: string, payload: CategoryPayload) => Promise<unknown>
  reorder: (ids: string[]) => Promise<unknown>
  removeReassign: (id: string, targetCategoryId: string) => Promise<unknown>
  removeWithItems: (id: string) => Promise<unknown>
  /** Invalidations react-query après tout changement. */
  onChanged: () => void
  /** Couleur présélectionnée à la création (jamais imposée en édition). */
  defaultColor: string
  labels: {
    /** Badge de la liste, ex. « 3 évén. ». */
    countBadge: (n: number) => string
    /** Avertissement quand la catégorie n'est pas vide. */
    containsWarning: (name: string, n: number) => string
    /** Titre du bloc de réaffectation, ex. « Déplacer ces événements vers ». */
    reassignTitle: string
    /** Titre du bloc de suppression des éléments. */
    deleteItemsTitle: string
    deleteItemsDescription: (n: number) => string
    deleteItemsButton: string
  }
}

interface CategoryManagerModalProps {
  open: boolean
  onClose: () => void
  adapter: CategoryManagerAdapter
}

type View =
  | { mode: 'list' }
  | { mode: 'create' }
  | { mode: 'edit'; category: ManagedCategory }
  | { mode: 'delete'; category: ManagedCategory }

/**
 * Fenêtre de gestion des catégories personnalisées : liste réordonnable par
 * glisser-déposer, création/édition (nom, couleur, icône) et suppression avec
 * choix explicite (jamais silencieuse) — tout dans une seule modale à
 * plusieurs vues plutôt que d'empiler des fenêtres. Le Planning et les Quêtes
 * partagent ce composant via leur adaptateur.
 */
export function CategoryManagerModal({ open, onClose, adapter }: CategoryManagerModalProps) {
  const query = useQuery({
    queryKey: [adapter.queryKey],
    queryFn: adapter.list,
    enabled: open,
  })
  const [categories, setCategories] = useState<ManagedCategory[]>([])
  const [view, setView] = useState<View>({ mode: 'list' })
  const reorderTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (open) setView({ mode: 'list' })
  }, [open])

  useEffect(() => {
    if (query.data) setCategories(query.data)
  }, [query.data])

  function handleReorder(next: ManagedCategory[]) {
    setCategories(next)
    clearTimeout(reorderTimer.current)
    reorderTimer.current = setTimeout(() => {
      void adapter.reorder(next.map((c) => c.id)).then(adapter.onChanged)
    }, 600)
  }

  function handleDone() {
    adapter.onChanged()
    setView({ mode: 'list' })
  }

  const title =
    view.mode === 'create'
      ? 'Nouvelle catégorie'
      : view.mode === 'edit'
        ? 'Modifier la catégorie'
        : view.mode === 'delete'
          ? 'Supprimer la catégorie'
          : 'Gérer les catégories'

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {view.mode === 'list' && (
        <CategoryList
          categories={categories}
          loading={query.isLoading}
          countBadge={adapter.labels.countBadge}
          onReorder={handleReorder}
          onAdd={() => setView({ mode: 'create' })}
          onEdit={(category) => setView({ mode: 'edit', category })}
          onDelete={(category) => setView({ mode: 'delete', category })}
        />
      )}

      {(view.mode === 'create' || view.mode === 'edit') && (
        <CategoryForm
          category={view.mode === 'edit' ? view.category : undefined}
          adapter={adapter}
          onDone={handleDone}
          onCancel={() => setView({ mode: 'list' })}
        />
      )}

      {view.mode === 'delete' && (
        <CategoryDeleteChoice
          category={view.category}
          otherCategories={categories.filter((c) => c.id !== view.category.id)}
          adapter={adapter}
          onDone={handleDone}
          onCancel={() => setView({ mode: 'list' })}
        />
      )}
    </Modal>
  )
}

function CategoryList({
  categories,
  loading,
  countBadge,
  onReorder,
  onAdd,
  onEdit,
  onDelete,
}: {
  categories: ManagedCategory[]
  loading: boolean
  countBadge: (n: number) => string
  onReorder: (categories: ManagedCategory[]) => void
  onAdd: () => void
  onEdit: (category: ManagedCategory) => void
  onDelete: (category: ManagedCategory) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner className="text-accent" />
        </div>
      ) : categories.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Aucune catégorie pour l'instant.</p>
      ) : (
        <Reorder.Group
          axis="y"
          values={categories}
          onReorder={onReorder}
          className="flex flex-col gap-2"
        >
          {categories.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              countBadge={countBadge}
              canDelete={categories.length > 1}
              onEdit={() => onEdit(category)}
              onDelete={() => onDelete(category)}
            />
          ))}
        </Reorder.Group>
      )}
      <button
        type="button"
        onClick={onAdd}
        className="flex items-center gap-1.5 rounded-xl px-2 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-accent"
      >
        <Plus size={15} /> Ajouter une catégorie
      </button>
    </div>
  )
}

function CategoryRow({
  category,
  countBadge,
  canDelete,
  onEdit,
  onDelete,
}: {
  category: ManagedCategory
  countBadge: (n: number) => string
  canDelete: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const controls = useDragControls()

  return (
    <Reorder.Item
      value={category}
      dragListener={false}
      dragControls={controls}
      className="group flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 transition-colors hover:border-line-strong"
    >
      <button
        type="button"
        onPointerDown={(e) => controls.start(e)}
        aria-label="Réorganiser"
        className="cursor-grab touch-none rounded-lg p-1 text-faint transition-colors hover:bg-surface-2 hover:text-muted active:cursor-grabbing"
      >
        <GripVertical size={15} />
      </button>
      <span
        className="size-3.5 shrink-0 rounded-full"
        style={{ background: category.color }}
        aria-hidden
      />
      <span className="text-base leading-none">{category.icon}</span>
      <p className="min-w-0 flex-1 truncate text-sm font-medium">{category.name}</p>
      <Badge variant="neutral">{countBadge(category.itemsCount)}</Badge>
      <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 max-lg:opacity-100">
        <button
          type="button"
          onClick={onEdit}
          aria-label="Modifier la catégorie"
          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={!canDelete}
          title={canDelete ? undefined : 'Vous devez garder au moins une catégorie'}
          aria-label="Supprimer la catégorie"
          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-30"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </Reorder.Item>
  )
}

function CategoryForm({
  category,
  adapter,
  onDone,
  onCancel,
}: {
  category?: ManagedCategory
  adapter: CategoryManagerAdapter
  onDone: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState(category?.name ?? '')
  // Couleur présélectionnée à la création (violette pour les Quêtes, bleue
  // pour le Planning) ; en édition, celle déjà choisie n'est jamais écrasée.
  const [color, setColor] = useState(category?.color ?? adapter.defaultColor)
  const [hexInput, setHexInput] = useState(category?.color ?? adapter.defaultColor)
  const [icon, setIcon] = useState(category?.icon ?? DEFAULT_CATEGORY_ICON)
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)

  const mutation = useMutation({
    mutationFn: () => {
      const payload: CategoryPayload = { name: name.trim(), color, icon }
      return category ? adapter.update(category.id, payload) : adapter.create(payload)
    },
    onSuccess: onDone,
  })

  function applyHex(value: string) {
    setHexInput(value)
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) setColor(value)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Nom"
        required
        maxLength={40}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ex. : Sport"
        autoFocus
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Couleur</span>
        <div className="flex flex-wrap items-center gap-2">
          {AUTO_CATEGORY_COLORS.map((c) => (
            <button
              key={c.hex}
              type="button"
              title={c.name}
              aria-label={`Couleur ${c.name}`}
              onClick={() => {
                setColor(c.hex)
                setHexInput(c.hex)
              }}
              className={cn(
                'size-7 rounded-full transition-transform hover:scale-110',
                color === c.hex && 'ring-2 ring-accent ring-offset-2 ring-offset-surface',
              )}
              style={{ background: c.hex }}
            />
          ))}
          <label
            title="Couleur personnalisée"
            className="relative size-7 cursor-pointer overflow-hidden rounded-full border border-line-strong"
          >
            <input
              type="color"
              value={color}
              onChange={(e) => {
                setColor(e.target.value)
                setHexInput(e.target.value)
              }}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
              aria-label="Choisir une couleur personnalisée"
            />
            <span className="pointer-events-none absolute inset-0" style={{ background: color }} />
          </label>
        </div>
        <Input
          value={hexInput}
          onChange={(e) => applyHex(e.target.value)}
          placeholder="#8B5CF6"
          maxLength={7}
          className="font-mono uppercase"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Icône</span>
        <button
          type="button"
          onClick={() => setEmojiPickerOpen((v) => !v)}
          aria-expanded={emojiPickerOpen}
          className="flex h-10 w-fit items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 text-sm transition-colors hover:border-line-strong"
        >
          <span className="text-lg leading-none">{icon}</span>
          <span className="text-muted">
            {emojiPickerOpen ? 'Fermer le sélecteur' : "Changer d'emoji"}
          </span>
          <ChevronDown
            size={14}
            className={cn('text-muted transition-transform', emojiPickerOpen && 'rotate-180')}
          />
        </button>
        {emojiPickerOpen && <EmojiPicker value={icon} onSelect={setIcon} />}
      </div>

      {mutation.error && (
        <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          {mutation.error instanceof Error ? mutation.error.message : 'Erreur'}
        </p>
      )}

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          {category ? 'Enregistrer' : 'Créer'}
        </Button>
      </div>
    </form>
  )
}

function CategoryDeleteChoice({
  category,
  otherCategories,
  adapter,
  onDone,
  onCancel,
}: {
  category: ManagedCategory
  otherCategories: ManagedCategory[]
  adapter: CategoryManagerAdapter
  onDone: () => void
  onCancel: () => void
}) {
  const [targetId, setTargetId] = useState(otherCategories[0]?.id ?? '')

  const reassign = useMutation({
    mutationFn: () => adapter.removeReassign(category.id, targetId),
    onSuccess: onDone,
  })
  const deleteItems = useMutation({
    mutationFn: () => adapter.removeWithItems(category.id),
    onSuccess: onDone,
  })

  const error = reassign.error ?? deleteItems.error
  const errorNode = error && (
    <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
      {error instanceof Error ? error.message : 'Erreur'}
    </p>
  )

  if (category.itemsCount === 0) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Supprimer définitivement la catégorie « {category.name} » ?
        </p>
        {errorNode}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Annuler
          </Button>
          <Button
            variant="danger"
            loading={deleteItems.isPending}
            onClick={() => deleteItems.mutate()}
          >
            <Trash2 size={15} /> Supprimer
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-xl bg-warning-soft px-3.5 py-2.5 text-sm text-warning">
        {adapter.labels.containsWarning(category.name, category.itemsCount)}
      </p>

      {otherCategories.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-line p-3.5">
          <p className="text-sm font-medium">{adapter.labels.reassignTitle}</p>
          <Select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
            {otherCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </Select>
          <Button
            type="button"
            loading={reassign.isPending}
            disabled={!targetId}
            onClick={() => reassign.mutate()}
          >
            <ArrowRightLeft size={15} /> Réaffecter et supprimer la catégorie
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-xl border border-line p-3.5">
        <p className="text-sm font-medium">{adapter.labels.deleteItemsTitle}</p>
        <p className="text-xs text-muted">
          {adapter.labels.deleteItemsDescription(category.itemsCount)}
        </p>
        <Button
          type="button"
          variant="danger"
          loading={deleteItems.isPending}
          onClick={() => deleteItems.mutate()}
        >
          <Trash2 size={15} /> {adapter.labels.deleteItemsButton}
        </Button>
      </div>

      {errorNode}

      <div className="flex justify-end">
        <Button variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </div>
  )
}
