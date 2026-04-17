import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const CATEGORY_BY_PT = {
  student: ["study", "revision", "assignment", "class"],
  freelancer: ["deadline", "meeting", "admin", "invoice"],
  creator: ["script", "filming", "editing", "posting"],
};

export default function TaskDialog({
  open,
  onOpenChange,
  onSubmit,
  initial,
  subjects = [],
  clients = [],
  exams = [],
  platforms = [],
}) {
  const { user } = useAuth();
  const pt = user?.profile_type;
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    duration_min: "",
    priority: "normal",
    recurring: "none",
    category: "",
    subject_id: "",
    client_id: "",
    platform: "",
    exam_id: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        title: initial?.title || "",
        description: initial?.description || "",
        date: initial?.date || new Date().toISOString().slice(0, 10),
        time: initial?.time || "",
        duration_min: initial?.duration_min ?? "",
        priority: initial?.priority || "normal",
        recurring: initial?.recurring || "none",
        category: initial?.category || "",
        subject_id: initial?.subject_id || "",
        client_id: initial?.client_id || "",
        platform: initial?.platform || "",
        exam_id: initial?.exam_id || "",
      });
    }
  }, [open, initial]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    const payload = {
      ...form,
      duration_min: form.duration_min ? Number(form.duration_min) : null,
      recurring: form.recurring === "none" ? null : form.recurring,
      subject_id: form.subject_id || null,
      client_id: form.client_id || null,
      platform: form.platform || null,
      exam_id: form.exam_id || null,
      category: form.category || null,
      time: form.time || null,
    };
    try {
      await onSubmit(payload);
      onOpenChange(false);
    } catch {
      toast.error("Failed to save task");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]" data-testid="task-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{initial?.task_id ? "Edit task" : "New task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label>Title</Label>
            <Input data-testid="task-title-input" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="What needs to be done?" autoFocus />
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea data-testid="task-desc-input" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Optional details" rows={3} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} data-testid="task-date-input" />
            </div>
            <div className="grid gap-2">
              <Label>Time</Label>
              <Input type="time" value={form.time} onChange={(e) => set("time", e.target.value)} data-testid="task-time-input" />
            </div>
            <div className="grid gap-2">
              <Label>Duration (min)</Label>
              <Input type="number" min="0" value={form.duration_min} onChange={(e) => set("duration_min", e.target.value)} data-testid="task-duration-input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                <SelectTrigger data-testid="task-priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Recurring</Label>
              <Select value={form.recurring} onValueChange={(v) => set("recurring", v)}>
                <SelectTrigger data-testid="task-recurring"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={form.category || "none"} onValueChange={(v) => set("category", v === "none" ? "" : v)}>
                <SelectTrigger data-testid="task-category"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(CATEGORY_BY_PT[pt] || []).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {pt === "student" && (
              <div className="grid gap-2">
                <Label>Subject</Label>
                <Select value={form.subject_id || "none"} onValueChange={(v) => set("subject_id", v === "none" ? "" : v)}>
                  <SelectTrigger data-testid="task-subject"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {subjects.map((s) => (<SelectItem key={s.subject_id} value={s.subject_id}>{s.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {pt === "freelancer" && (
              <div className="grid gap-2">
                <Label>Client</Label>
                <Select value={form.client_id || "none"} onValueChange={(v) => set("client_id", v === "none" ? "" : v)}>
                  <SelectTrigger data-testid="task-client"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {clients.map((c) => (<SelectItem key={c.client_id} value={c.client_id}>{c.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {pt === "creator" && (
              <div className="grid gap-2">
                <Label>Platform</Label>
                <Select value={form.platform || "none"} onValueChange={(v) => set("platform", v === "none" ? "" : v)}>
                  <SelectTrigger data-testid="task-platform"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {platforms.length === 0 ? (
                      <SelectItem value="__empty" disabled>Add platforms first</SelectItem>
                    ) : platforms.map((p) => (
                      <SelectItem key={p.platform_id} value={p.name}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {pt === "student" && (
            <div className="grid gap-2">
              <Label>Link to exam <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Select value={form.exam_id || "none"} onValueChange={(v) => set("exam_id", v === "none" ? "" : v)}>
                <SelectTrigger data-testid="task-exam"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {exams.length === 0 ? (
                    <SelectItem value="__empty" disabled>No exams yet</SelectItem>
                  ) : exams.map((ex) => (
                    <SelectItem key={ex.exam_id} value={ex.exam_id}>
                      {ex.name} · {ex.date}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} data-testid="task-cancel">Cancel</Button>
            <Button type="submit" data-testid="task-submit">Save task</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
