"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"

type RankingItem = {
  id: string
  position: number
  bathroomId: string
  bathroom: {
    id: string
    name: string
    address: string
    type: string
    reviews: Array<{ overall: number; cleanliness: number; smell: number; supplies: number; privacy: number }>
  }
}

function SortableRow({ item, index }: { item: RankingItem; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.bathroomId,
  })

  const review = item.bathroom.reviews[0]
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 bg-white rounded-xl border p-3 transition-shadow ${
        isDragging ? "shadow-lg border-emerald-300 z-50" : "border-gray-200 shadow-sm"
      }`}
    >
      <button
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
          index === 0
            ? "bg-yellow-400 text-yellow-900"
            : index === 1
            ? "bg-gray-300 text-gray-700"
            : index === 2
            ? "bg-amber-600 text-white"
            : "bg-gray-100 text-gray-500"
        }`}
      >
        #{index + 1}
      </div>

      <div className="flex-1 min-w-0">
        <Link href={`/bathroom/${item.bathroomId}`} className="font-semibold hover:text-emerald-600 truncate block">
          {item.bathroom.name}
        </Link>
        <p className="text-xs text-gray-400 truncate">{item.bathroom.address}</p>
        {review && (
          <div className="flex gap-2 text-xs text-gray-400 mt-0.5">
            <span>🧹 {review.cleanliness}</span>
            <span>🧴 {review.supplies}</span>
            <span>🌸 {review.smell}</span>
            <span>🔒 {review.privacy}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        {review && (
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500" />
            <span className="text-sm font-bold text-emerald-600">{review.overall}/10</span>
          </div>
        )}
        <Badge variant="secondary" className="text-xs capitalize">{item.bathroom.type}</Badge>
      </div>
    </div>
  )
}

export default function RankingsPage() {
  const [items, setItems] = useState<RankingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const fetchRankings = useCallback(async () => {
    const res = await fetch("/api/rankings")
    const data = await res.json()
    setItems(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchRankings() }, [fetchRankings])

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIdx = items.findIndex((i) => i.bathroomId === active.id)
    const newIdx = items.findIndex((i) => i.bathroomId === over.id)
    const reordered = arrayMove(items, oldIdx, newIdx)
    setItems(reordered)

    setSaving(true)
    await fetch("/api/rankings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: reordered.map((i) => i.bathroomId) }),
    })
    setSaving(false)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Rankings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Drag to reorder your list</p>
        </div>
        {saving && <span className="text-xs text-gray-400 animate-pulse">Saving…</span>}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🚽</div>
          <p className="text-gray-500 font-medium mb-1">No bathrooms ranked yet</p>
          <p className="text-sm text-gray-400 mb-4">Rate a bathroom to start building your list</p>
          <Link
            href="/rate"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
          >
            Rate a Bathroom
          </Link>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.bathroomId)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item, index) => (
                <SortableRow key={item.bathroomId} item={item} index={index} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
