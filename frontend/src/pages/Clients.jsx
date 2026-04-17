import React, { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { clientsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6"];

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", email: "", color: COLORS[0] });

  const load = async () => setClients(await clientsApi.list());
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name required");
    await clientsApi.create(form);
    setForm({ name: "", company: "", email: "", color: COLORS[0] });
    setOpen(false);
    toast.success("Client added");
    load();
  };
  const remove = async (id) => { await clientsApi.remove(id); toast.success("Removed"); load(); };

  return (
    <AppShell>
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="label-xs mb-2">Freelancer</div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">Clients</h1>
        </div>
        <Button onClick={() => setOpen(true)} data-testid="client-new" className="gap-2"><Plus className="size-4" /> New client</Button>
      </div>

      {clients.length === 0 ? (
        <div className="text-sm text-muted-foreground py-16 text-center border border-dashed border-border rounded-md">No clients yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {clients.map((c) => (
            <div key={c.client_id} className="group border border-border rounded-lg p-5 bg-card" data-testid={`client-${c.client_id}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="size-3 rounded-full" style={{ background: c.color }} />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{c.company || c.email || ""}</div>
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => remove(c.client_id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New client</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus data-testid="client-name" /></div>
            <div className="grid gap-2"><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button type="button" key={c} onClick={() => setForm({ ...form, color: c })} className={`size-7 rounded-full border-2 ${form.color === c ? "border-foreground" : "border-transparent"}`} style={{ background: c }} />
                ))}
              </div>
            </div>
            <DialogFooter><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" data-testid="client-submit">Add</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
