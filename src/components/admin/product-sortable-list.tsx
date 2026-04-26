"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Package, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice, cn } from "@/lib/utils";

export interface SortableProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  priceInCents: number;
  stock: number;
  isActive: boolean;
  sortOrder: number;
  imageUrl: string | null;
  categoryName: string;
}

interface Props {
  products: SortableProduct[];
}

/**
 * Drag-and-Drop Liste für die manuelle Produkt-Sortierung im Admin.
 *
 * Funktionsweise:
 *  - User packt eine Row am GripVertical-Handle
 *  - @dnd-kit bewegt die Row visuell
 *  - onDragEnd → arrayMove + sofort optimistic update der lokalen
 *    Liste (kein Flicker), parallel POST an /api/admin/products/reorder
 *  - Bei API-Fehler: Toast + Reload für sauberen Server-State
 *  - Bei Erfolg: leiser Toast + router.refresh, damit beim nächsten
 *    Request der frische Cache-State gezogen wird
 *
 * Position wird als `index + 1` als sortOrder geschrieben — das hält
 * die Werte dicht und vorhersagbar (1, 2, 3, …) statt mit großen
 * Sprüngen, die nach mehrfachem Reorder unschön werden.
 */
export function ProductSortableList({ products: initial }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Activation distance damit ein normaler Click auf die Edit-
      // Buttons nicht versehentlich einen Drag triggert.
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((p) => p.id === active.id);
    const newIndex = items.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);

    // Optimistic update — UI bewegt sich sofort, kein Wait auf Network.
    setItems(reordered);
    setSaving(true);

    const updates = reordered.map((p, idx) => ({
      id: p.id,
      sortOrder: idx + 1,
    }));

    try {
      const res = await fetch("/api/admin/products/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Reorder fehlgeschlagen");
      }
      toast.success("Reihenfolge gespeichert");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reorder fehlgeschlagen");
      // Rollback durch Reload — Server ist die Quelle der Wahrheit.
      router.refresh();
      setItems(initial);
    } finally {
      setSaving(false);
    }
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Keine Produkte zum Sortieren.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b bg-muted/30 px-4 py-3 text-xs text-muted-foreground flex items-center gap-2">
          <GripVertical className="h-3.5 w-3.5" />
          Ziehen Sie Produkte am Griff, um die Reihenfolge zu ändern.
          {saving && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-primary">
              <Loader2 className="h-3 w-3 animate-spin" />
              Speichern …
            </span>
          )}
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="divide-y">
              {items.map((p, idx) => (
                <SortableRow key={p.id} product={p} position={idx + 1} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </CardContent>
    </Card>
  );
}

function SortableRow({
  product,
  position,
}: {
  product: SortableProduct;
  position: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: product.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : "auto",
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 px-4 py-3 bg-background",
        isDragging && "shadow-lg ring-1 ring-primary/40",
      )}
    >
      <button
        type="button"
        className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
        aria-label={`${product.name} verschieben`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <span className="w-10 text-right font-mono text-xs text-muted-foreground">
        {position}
      </span>

      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="40px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{product.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          <code className="rounded bg-muted px-1 py-0.5">{product.sku}</code>
          <span className="mx-2">·</span>
          {product.categoryName}
        </p>
      </div>

      <div className="hidden text-right text-sm font-medium tabular-nums sm:block">
        {formatPrice(product.priceInCents)}
      </div>

      <Badge
        variant={product.isActive ? "default" : "secondary"}
        className="hidden text-xs sm:inline-flex"
      >
        {product.isActive ? "Aktiv" : "Inaktiv"}
      </Badge>

      <Button asChild size="icon" variant="ghost" className="shrink-0">
        <Link href={`/admin/products/${product.slug}`}>
          <Pencil className="h-4 w-4" />
        </Link>
      </Button>
    </li>
  );
}
