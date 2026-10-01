'use client'

import { DragEvent, ReactNode, useState } from 'react'

interface SortableListProps<T> {
  items: T[]
  getItemId: (item: T) => string
  onReorder: (items: T[]) => void
  renderItem: (item: T, index: number) => ReactNode
  disabled?: boolean
  label?: string
}

export function SortableList<T>({
  items,
  getItemId,
  onReorder,
  renderItem,
  disabled = false,
  label = 'Sortierbare Liste',
}: SortableListProps<T>) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  function move(targetId: string) {
    if (disabled || draggedId == null || draggedId === targetId) return
    const from = items.findIndex((item) => getItemId(item) === draggedId)
    const to = items.findIndex((item) => getItemId(item) === targetId)
    if (from < 0 || to < 0) return
    const next = [...items]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onReorder(next)
  }

  function dragStart(event: DragEvent<HTMLDivElement>, id: string) {
    if (disabled) return
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', id)
    setDraggedId(id)
  }

  return (
    <div role="list" aria-label={label}>
      {items.map((item, index) => {
        const id = getItemId(item)
        return (
          <div
            key={id}
            role="listitem"
            draggable={!disabled}
            data-drop-target={overId === id ? 'true' : undefined}
            onDragStart={(event) => dragStart(event, id)}
            onDragOver={(event) => {
              if (disabled) return
              event.preventDefault()
              setOverId(id)
            }}
            onDrop={(event) => {
              event.preventDefault()
              move(id)
              setDraggedId(null)
              setOverId(null)
            }}
            onDragEnd={() => {
              setDraggedId(null)
              setOverId(null)
            }}
          >
            {renderItem(item, index)}
          </div>
        )
      })}
    </div>
  )
}
