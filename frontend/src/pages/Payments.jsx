import React, { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { paymentsApi, clientsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { daysUntil, formatDate, todayISO } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [clients, setClients] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", amount: "", currency: "USD", due_date: todayISO(), client_id: "", notes: "" });

  const load = async () => {
    setPayments(await paymentsApi.list());
    setClients(await clientsApi.list());
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.amount) return toast.error("Title and amount required");
    await paymentsApi.create({ ...form, amount: Number(form.amount), client_id: form.client_id || null });
    setForm({ title: "", amount: "", currency: "USD", due_date: todayISO(), client_id: "", notes: "" });
    setOpen(false);
    toast.success("Payment added");
    load();
  };
  const markPaid = async (id) => { await paymentsApi.update(id, { status: "received" }); toast.success("Marked received"); load(); };
  const remove = async (id) => { await paymentsApi.remove(id); toast.success("Removed"); load(); };

  const clientName = (id) => clients.find((c) => c.client_id === id)?.name || "—";

  const pending = payments.filter((p) => p.status === "pending");
  const received = payments.filter((p) => p.status === "received");
  const pendingTotal = pending.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <AppShell>
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="label-xs mb-2">Freelancer</div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">Payments</h1>
        </div>
        <Button onClick={() => setOpen(true)} data-testid="payment-new" className="gap-2"><Plus className="size-4" /> New payment</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-border border border-border rounded-lg overflow-hidden mb-10">
        <Stat label="Pending total" value={`$${pendingTotal.toFixed(2)}`} />
        <Stat label="Pending count" value={pending.length} />
        <Stat label="Received" value={received.length} />
      </div>

      <h2 className="font-display text-xl font-semibold mb-3">Pending</h2>
      {pending.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-md mb-10">No pending payments.</div>
      ) : (
        <div className="flex flex-col gap-2 mb-10">
          {pending.map((p) => {
            const d = daysUntil(p.due_date);
            const overdue = d !== null && d < 0;
            return (
              <div key={p.payment_id} className={cn("group flex items-center justify-between px-5 py-4 rounded-md border border-border bg-card border-l-2", overdue ? "border-l-rose-500" : "border-l-blue-500")} data-testid={`payment-${p.payment_id}`}>
                <div className="min-w-0">
                  <div className="font-medium truncate">{p.title}</div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">
                    {clientName(p.client_id)} · due {formatDate(p.due_date)} {overdue ? `· ${Math.abs(d)}d overdue` : d >= 0 ? `· ${d}d left` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-mono text-sm whitespace-nowrap">{p.currency} {p.amount.toFixed(2)}</div>
                  <Button size="sm" variant="outline" onClick={() => markPaid(p.payment_id)} className="gap-1" data-testid={`payment-paid-${p.payment_id}`}>
                    <Check className="size-3.5" /> Mark paid
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(p.payment_id)} className="opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="size-4" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <h2 className="font-display text-xl font-semibold mb-3">Received</h2>
      {received.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-md">None yet.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {received.map((p) => (
            <div key={p.payment_id} className="flex items-center justify-between px-5 py-3 rounded-md border border-border bg-card opacity-70">
              <div>
                <div className="text-sm font-medium line-through">{p.title}</div>
                <div className="text-xs text-muted-foreground font-mono">{clientName(p.client_id)} · {formatDate(p.due_date)}</div>
              </div>
              <div className="font-mono text-sm">{p.currency} {p.amount.toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New payment</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus data-testid="payment-title" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label>Amount</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} data-testid="payment-amount" /></div>
              <div className="grid gap-2"><Label>Currency</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
            </div>
            <div className="grid gap-2"><Label>Due date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            <div className="grid gap-2">
              <Label>Client</Label>
              <Select value={form.client_id || "none"} onValueChange={(v) => setForm({ ...form, client_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {clients.map((c) => (<SelectItem key={c.client_id} value={c.client_id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" data-testid="payment-submit">Add</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-card p-5">
      <div className="label-xs">{label}</div>
      <div className="font-display text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
