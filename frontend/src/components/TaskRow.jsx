import React from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Clock, Pencil, Trash2, Repeat } from "lucide-react";

const priorityClass = {
  high: "border-l-rose-500",
  normal: "border-l-foreground/30",
  low: "border-l-muted-foreground/30",
};

export default function TaskRow({ task, onToggle, onEdit, onDelete, accent }) {
  const done = task.status === "done";
  return (
    <div
      data-testid={`task-row-${task.task_id}`}
      className={cn(
        "group flex items-center gap-3 px-4 py-3 rounded-md border border-border bg-card",
        "border-l-2", priorityClass[task.priority] || "border-l-foreground/30",
        "transition-all hover:-translate-y-[1px] hover:shadow-sm"
      )}
    >
      <Checkbox
        checked={done}
        onCheckedChange={() => onToggle(task)}
        data-testid={`task-check-${task.task_id}`}
      />
      <div className="flex-1 min-w-0">
        <div className={cn("text-sm font-medium truncate", done && "line-through text-muted-foreground")}>
          {task.title}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-[11px] font-mono text-muted-foreground">
          {task.time && (<span className="inline-flex items-center gap-1"><Clock className="size-3" strokeWidth={1.5} />{task.time}</span>)}
          {task.duration_min ? <span>{task.duration_min}m</span> : null}
          {task.recurring && <span className="inline-flex items-center gap-1"><Repeat className="size-3" strokeWidth={1.5} />{task.recurring}</span>}
          {task.category && <span className="uppercase tracking-wider">{task.category}</span>}
          {accent && <span className={cn("inline-block size-1.5 rounded-full", accent)} />}
        </div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        <Button size="icon" variant="ghost" onClick={() => onEdit(task)} data-testid={`task-edit-${task.task_id}`}>
          <Pencil className="size-4" strokeWidth={1.5} />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => onDelete(task)} data-testid={`task-delete-${task.task_id}`}>
          <Trash2 className="size-4" strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
}
