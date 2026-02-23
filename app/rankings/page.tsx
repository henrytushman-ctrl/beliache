"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

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

const medalStyles = [
  "bg-amber-400 text-amber-900",   // #1 gold
  "bg-zinc-300 text-zinc-700",     // #2 silver
  "bg-orange-700 text-orange-100", // #3 bronze
]

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
      className={`flex items-center gap-3 bg-card rounded-2xl border p-3.5 transition-all duration-150 ${
        isDragging
          ? "shadow-warm-lg border-primary/30 z-50 scale-[1.02]"
          : "border-border shadow-warm hover:shadow-warm-md"
      }`}
    >
      <button
        className="text-border hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
          index < 3 ? medalStyles[index] : "bg-secondary text-muted-foreground"
        }`}
      >
        #{index + 1}
      </div>

      <div className="flex-1 min-w-0">
        <Link href={`/bathroom/${item.bathroomId}`} className="font-semibold hover:text-primary transition-colors truncate block">
          {item.bathroom.name}
        </Link>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{item.bathroom.address}</p>
        {review && (
          <div className="flex gap-2 text-xs text-muted-foreground mt-1">
            <span>🧹 {review.cleanliness}</span>
            <span>🧴 {review.supplies}</span>
            <span>🌸 {review.smell}</span>
            <span>🔒 {review.privacy}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        {review && (
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-primary fill-primary" />
            <span className="text-sm font-bold text-primary">{review.overall}/10</span>
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
          <p className="text-sm text-muted-foreground mt-0.5">Drag to reorder your list</p>
        </div>
        {saving && <span className="text-xs text-muted-foreground animate-pulse">Saving…</span>}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-secondary rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🚽</div>
          <p className="text-foreground font-semibold mb-1">No bathrooms ranked yet</p>
          <p className="text-sm text-muted-foreground mb-5">Rate a bathroom to start building your list</p>
          <Link href="/rate">
            <Button>Rate a Bathroom</Button>
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
