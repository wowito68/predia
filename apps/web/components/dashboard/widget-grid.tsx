"use client";

import { useState, useEffect } from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { StatsWidget } from "./widgets/stats-widget";
import { QuickActionsWidget } from "./widgets/quick-actions-widget";
import { RecentAlertsWidget } from "./widgets/recent-alerts-widget";
import { VoiceDictationWidget } from "./widgets/voice-dictation-widget";
import { UpcomingAppointmentsWidget } from "./widgets/upcoming-appointments-widget";

interface WidgetGridProps {
    stats: any;
}

export function WidgetGrid({ stats }: WidgetGridProps) {
    const [items, setItems] = useState(["stats", "actions", "appointments", "alerts", "voice"]);

    useEffect(() => {
        const savedOrder = localStorage.getItem("dashboard-widget-order");
        if (savedOrder) {
            try {
                const saved = JSON.parse(savedOrder) as string[];
                // Merge new items if missing
                const defaults = ["stats", "actions", "appointments", "alerts", "voice"];
                const merged = [...saved];
                defaults.forEach(d => {
                    if (!merged.includes(d)) merged.push(d);
                });
                setItems(merged);
            } catch (e) {
                console.error("Error parsing widget order", e);
            }
        }
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setItems((items) => {
                const oldIndex = items.indexOf(active.id.toString());
                const newIndex = items.indexOf(over.id.toString());
                const newOrder = arrayMove(items, oldIndex, newIndex);
                localStorage.setItem("dashboard-widget-order", JSON.stringify(newOrder));
                return newOrder;
            });
        }
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={items} strategy={verticalListSortingStrategy}>
                <div className="space-y-6">
                    {items.map((id) => (
                        <SortableWidget key={id} id={id}>
                            {id === "stats" && <StatsWidget stats={stats} />}
                            {id === "actions" && <QuickActionsWidget />}
                            {id === "appointments" && <UpcomingAppointmentsWidget />}
                            {id === "alerts" && (
                                <RecentAlertsWidget alertas={stats?.alertas || []} />
                            )}
                            {id === "voice" && <VoiceDictationWidget />}
                        </SortableWidget>
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}

function SortableWidget({ id, children }: { id: string; children: React.ReactNode }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : "auto",
        position: "relative" as "relative",
    };

    return (
        <div ref={setNodeRef} style={style} className="group relative">
            <div
                {...attributes}
                {...listeners}
                className="absolute -left-8 top-1/2 -translate-y-1/2 p-2 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hidden md:block"
                title="Arrastrar para reordenar"
            >
                <GripVertical className="w-6 h-6" />
            </div>
            {children}
        </div>
    );
}
