import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Gauge,
  Globe,
  Layers,
  LineChart,
  Lock,
  ShieldCheck,
  Sparkles,
  Workflow
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const stats = [
  { label: 'Creator channels orchestrated', value: '480+' },
  { label: 'Automated reposts per day', value: '12k' },
  { label: 'Average latency to publish', value: '4m 12s' }
];

const featureCards: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    title: 'Native TikTok ingestion',
    description:
      'Capture new TikTok uploads instantly via first-party webhooks with resilient retry and dead-letter queues.',
    icon: Globe
  },
  {
    title: 'Smart destination routing',
    description:
      'Map clips to multi-channel YouTube, Instagram, or Shorts destinations with rules aware of quotas and embargoes.',
    icon: Workflow
  },
  {
    title: 'Governance baked-in',
    description:
      'Per-tenant isolation, approval flows, and audit logging so operations teams keep full control over automation.',
    icon: ShieldCheck
  }
];

const workflowSteps: Array<{ title: string; description: string; icon: LucideIcon }> = [
  {
    title: 'Listen',
    description:
      'TikTok creators authenticate once; Autorepost listens for uploads and normalises metadata, captions, and rights.',
    icon: Sparkles
  },
  {
    title: 'Transform',
    description:
      'Apply presets for trimming, burned-in captions, audio leveling, and brand compliance before routing downstream.',
    icon: Layers
  },
  {
    title: 'Publish',
    description:
      'Deliver to YouTube, Instagram, or custom S3 buckets with SLA-backed retry logic and observability hooks.',
    icon: ArrowRight
  }
];

const controls: Array<{
  title: string;
  description: string;
  bullets: string[];
  icon: LucideIcon;
}> = [
  {
    title: 'Operational SLA Monitoring',
    description: 'Dashboards and alerts tuned for media operations teams, not generic cloud metrics.',
    bullets: ['Per-platform latency and success tracking', 'Auto-suppression when quotas degrade', 'Annotated incident feed'],
    icon: Gauge
  },
  {
    title: 'Rights & Compliance Guardrails',
    description: 'Enforce rule-based approvals across territories and campaign calendars with confidence.',
    bullets: [
      'Multi-step approval pipelines',
      'Copy, music, and embargo policy checks',
      'Tenant-scoped change history'
    ],
    icon: Lock
  },
  {
    title: 'Lifecycle Automation',
    description: 'Reinforce every autopost with predictable handoffs into your existing editorial workflow.',
    bullets: ['Jira / Linear webhooks', 'Slack + Teams notifications', 'Custom webhooks for downstream edits'],
    icon: Globe
  }
];

const faqs = [
  {
    question: 'Does Autorepost replace my video storage or editing suite?',
    answer:
      'No. Autorepost connects to the tools you already use. We ingest final encoded clips and orchestrate distribution with the governance and telemetry you are missing today.'
  },
  {
    question: 'How are quotas and API limits handled for YouTube and Instagram?',
    answer:
      'Each tenant provides their own platform credentials. We spread calls across time windows, observe platform health, and automatically alert (or pause) when limits approach thresholds you define.'
  },
  {
    question: 'Can I self-host the automation stack?',
    answer:
      'Yes. The Render blueprint includes API, worker, and dashboard services. Deploy with the provided Docker images or adapt the infrastructure code to your own compute platform.'
  }
];

export default function MarketingPage() {
  return (
    <div className="bg-background">
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" aria-hidden />
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-24 sm:px-6 md:py-28">
          <div className="max-w-2xl space-y-6">
            <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
              TikTok → YouTube automation blueprint
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Publish viral TikTok moments to every channel in minutes, not hours.
            </h1>
            <p className="text-lg text-muted-foreground">
              Autorepost gives creator-ops teams the ingestion, governance, and observability required to syndicate
              short-form content safely across YouTube, Instagram, and beyond — all from a single command center.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button className="gap-2" size="lg" asChild>
                <Link href="mailto:hello@autorepost.dev">
                  Book a strategy session
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/console">Launch operator console</Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-6 rounded-2xl border bg-background/70 p-6 shadow-sm backdrop-blur sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="space-y-1">
                <div className="text-3xl font-semibold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Purpose-built for platform operations
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Retire spreadsheet checklists. Autorepost orchestrates ingest, routing, compliance, and telemetry so your
            creators can stay focused on storytelling.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {featureCards.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="h-full border border-border/70 bg-muted/40 shadow-sm">
                <CardHeader className="space-y-3">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription className="text-sm leading-6 text-muted-foreground">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      <section id="workflow" className="border-y bg-muted/30 py-20">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[3fr,2fr] lg:items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Automation that mirrors your editorial pipeline
            </h2>
            <p className="text-base text-muted-foreground">
              Streamline every phase from capture to publish. Each step exposes hooks for review, enrichment, or custom
              downstream automation.
            </p>
            <div className="space-y-4">
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="rounded-xl border bg-background p-5 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Icon className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          Step {index + 1}
                        </div>
                        <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
                        <p className="text-sm leading-6 text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <Card className="h-full border border-border/70 bg-background shadow-sm">
            <CardHeader>
              <CardTitle>Visibility for every stakeholder</CardTitle>
              <CardDescription>
                Operators, editors, and executives share one source of truth with tailored dashboards and alerts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-primary">
                <LineChart className="h-4 w-4" />
                Native insights for latency, retries, and success rates
              </div>
              <p>
                Every autopost produces a structured event. Pipe it into your warehouse, connect Looker or Mode, or keep
                it simple with the built-in console dashboards.
              </p>
              <p>
                Centralised auditing keeps compliance teams and legal partners confident that rights, campaigns, and
                embargoes remain in sync with creator activity.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="governance" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr,2fr]">
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">Designed for governance from day one</h2>
            <p className="text-base text-muted-foreground">
              Autorepost is not another sidecar script. It&apos;s a platform blueprint ready for SOC2-bound teams with
              complex brand, territory, and rights requirements.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Audit-ready trails
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Multi-tenant isolation
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Least-privilege access
              </span>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {controls.map((control) => {
              const Icon = control.icon;
              return (
                <Card key={control.title} className="border border-border/70 bg-muted/30 shadow-sm">
                  <CardHeader className="space-y-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <CardTitle className="text-lg">{control.title}</CardTitle>
                    <CardDescription>{control.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    {control.bullets.map((item) => (
                      <div key={item} className="flex items-start gap-2">
                        <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                        <span>{item}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y bg-background py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[2fr,1fr] lg:items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                Hit publish confidently — even on your biggest campaigns
              </h2>
              <p className="text-base text-muted-foreground">
                Launch campaigns in hours instead of weeks. When creators drop new TikToks, Autorepost routes them through
                your brand-approved flow and monitors each downstream platform until the job is done.
              </p>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Clock3 className="mt-1 h-4 w-4 text-primary" />
                  <span>Publisher-defined SLAs with automatic escalations when thresholds slip.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Gauge className="mt-1 h-4 w-4 text-primary" />
                  <span>Real-time dashboards expose retries, failures, and quota drift across every tenant.</span>
                </li>
                <li className="flex items-start gap-2">
                  <LineChart className="mt-1 h-4 w-4 text-primary" />
                  <span>Feed structured events straight into Snowflake, BigQuery, or your SIEM.</span>
                </li>
              </ul>
            </div>
            <Card className="h-full border border-primary/30 bg-primary/5 shadow-md backdrop-blur">
              <CardContent className="space-y-4 p-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                  Reference architecture
                </div>
                <p className="text-lg font-semibold text-primary">
                  “Autorepost gave us the building blocks to ship a compliant automation console the business actually
                  trusts. Ops resolved incidents 4× faster because the telemetry was already plumbed in.”
                </p>
                <div>
                  <div className="text-sm font-semibold text-foreground">Lena Ortiz</div>
                  <div className="text-xs text-muted-foreground">Head of Creator Operations, Northwind Media</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto w-full max-w-4xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">Questions, answered.</h2>
          <p className="mt-3 text-base text-muted-foreground">
            We built Autorepost alongside leading media operators. Here are the answers they cared about most.
          </p>
        </div>
        <div className="mt-12 space-y-6">
          {faqs.map((item) => (
            <Card key={item.question} className="border border-border/70 bg-background shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">{item.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">{item.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t bg-muted/40 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            Ready to orchestrate your short-form distribution without duct tape?
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Start with the Render deployment blueprint or talk with our team about tailoring Autorepost to your stack.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href="mailto:hello@autorepost.dev">
                Schedule a discovery call
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/console">Explore the console</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
