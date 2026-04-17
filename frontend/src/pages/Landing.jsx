import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { ArrowRight, Sparkles, CalendarCheck, Timer, Lightbulb, GraduationCap, Users, Film } from "lucide-react";

export default function Landing() {
  const { user, login } = useAuth();

  const cta = () => (user ? (window.location.href = user.profile_type ? "/dashboard" : "/onboarding") : login());

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
      <header className="max-w-7xl mx-auto flex items-center justify-between px-6 md:px-10 py-6 relative">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-md bg-foreground text-background flex items-center justify-center font-bold text-xs tracking-wider">PL</div>
          <span className="font-display font-semibold text-lg">Plannr</span>
        </div>
        <nav className="flex items-center gap-3">
          <a href="#features" className="hidden md:inline text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#profiles" className="hidden md:inline text-sm text-muted-foreground hover:text-foreground transition-colors">Profiles</a>
          <Button variant="outline" size="sm" onClick={login} data-testid="landing-signin">Sign in</Button>
        </nav>
      </header>

      <section className="max-w-7xl mx-auto px-6 md:px-10 pt-14 pb-20 md:pt-24 md:pb-32 relative">
        <div className="stagger-in stagger-in-1 mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-xs font-mono uppercase tracking-wider text-muted-foreground">
          <Sparkles className="size-3.5" strokeWidth={1.5} /> A planner that adapts to you
        </div>
        <h1 className="stagger-in stagger-in-2 font-display text-5xl sm:text-6xl lg:text-7xl font-semibold leading-[1.02] tracking-tight max-w-4xl">
          Plan your week, the way you actually work.
        </h1>
        <p className="stagger-in stagger-in-3 mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
          A smart schedule planner tuned for <span className="text-foreground">students</span>, <span className="text-foreground">freelancers</span>, and <span className="text-foreground">content creators</span>. One clean interface — three workflows that feel like home.
        </p>
        <div className="stagger-in stagger-in-4 mt-10 flex items-center gap-3">
          <Button size="lg" onClick={cta} data-testid="landing-cta" className="gap-2">
            Get started <ArrowRight className="size-4" strokeWidth={1.5} />
          </Button>
          <Link to="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            See features →
          </Link>
        </div>

        <div className="stagger-in stagger-in-5 mt-20 grid grid-cols-1 md:grid-cols-3 border border-border rounded-lg overflow-hidden bg-card">
          <ProfilePreview title="Student" color="bg-emerald-500" icon={GraduationCap} items={["Study session planner", "Exam countdown", "Revision reminders"]} />
          <ProfilePreview title="Freelancer" color="bg-blue-500" icon={Users} items={["Deadline tracker", "Client kanban", "Work hour logger"]} border />
          <ProfilePreview title="Creator" color="bg-amber-500" icon={Film} items={["Content calendar", "Platform schedule", "Idea bank"]} />
        </div>
      </section>

      <section id="features" className="max-w-7xl mx-auto px-6 md:px-10 pb-24 relative">
        <div className="label-xs mb-3">What's inside</div>
        <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight max-w-2xl">Built for focus. Shared across everyone.</h2>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-px bg-border rounded-lg overflow-hidden border border-border">
          <Feature icon={CalendarCheck} title="Daily & weekly view" desc="Switch between a focused day and a zoomed-out week without losing context." />
          <Feature icon={Timer} title="Recurring tasks" desc="Daily, weekly, monthly cycles. Set once and let the planner handle the rest." />
          <Feature icon={Lightbulb} title="Smart reminders" desc="In-app toasts and browser notifications the moment something needs your attention." />
        </div>
      </section>

      <section id="profiles" className="max-w-7xl mx-auto px-6 md:px-10 pb-28 relative">
        <div className="label-xs mb-3">Three workflows, one app</div>
        <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight max-w-2xl">Pick a profile during onboarding. Switch anytime from settings.</h2>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <ProfileCard name="Student" color="text-emerald-500" bullets={["Study session planner", "Exam countdown widget", "Subject-wise task tracker", "Revision reminders"]} />
          <ProfileCard name="Freelancer" color="text-blue-500" bullets={["Deadline tracker", "Client-wise task management", "Work hour logger", "Payment due reminders"]} />
          <ProfileCard name="Content Creator" color="text-amber-500" bullets={["Content calendar", "Platform-wise posting schedule", "Idea bank", "Upload reminders"]} />
        </div>

        <div className="mt-16 flex items-center justify-between border-t border-border pt-8">
          <div className="text-sm text-muted-foreground font-mono">Free. No ads. Your data stays yours.</div>
          <Button onClick={cta} data-testid="landing-cta-bottom" className="gap-2">Start planning <ArrowRight className="size-4" strokeWidth={1.5} /></Button>
        </div>
      </section>
    </div>
  );
}

function ProfilePreview({ title, color, icon: Icon, items, border }) {
  return (
    <div className={`p-8 ${border ? "md:border-x border-border" : ""}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className={`size-1.5 rounded-full ${color}`} />
        <span className="label-xs">{title}</span>
      </div>
      <Icon className="size-8 mb-6" strokeWidth={1.25} />
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it} className="text-sm text-muted-foreground flex items-center gap-2">
            <span className="size-1 rounded-full bg-foreground/40" /> {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }) {
  return (
    <div className="p-8 bg-card">
      <Icon className="size-6 mb-6" strokeWidth={1.5} />
      <div className="font-display font-semibold text-lg">{title}</div>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

function ProfileCard({ name, color, bullets }) {
  return (
    <div className="p-8 border border-border rounded-lg bg-card">
      <div className={`label-xs ${color}`} style={{ color: undefined }}>{name}</div>
      <div className={`font-display font-semibold text-2xl mt-2 ${color}`}>{name}</div>
      <ul className="mt-6 space-y-2">
        {bullets.map((b) => (
          <li key={b} className="text-sm text-muted-foreground flex items-center gap-2">
            <span className="size-1 rounded-full bg-foreground/40" /> {b}
          </li>
        ))}
      </ul>
    </div>
  );
}
