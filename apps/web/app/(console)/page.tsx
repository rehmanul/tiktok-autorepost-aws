import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, FlameKindling, Plug, Repeat, Users } from 'lucide-react';

const stats = [
  {
    title: 'Active Tenants',
    description: 'Organisations currently provisioned',
    value: '18',
    delta: '+12.5%'
  },
  {
    title: 'Platform Connections',
    description: 'Authorised TikTok, Instagram, YouTube & Twitter accounts',
    value: '142',
    delta: '+6.3%'
  },
  {
    title: 'Automation Rules',
    description: 'Live repost workflows managed by customers',
    value: '321',
    delta: '+18.9%'
  },
  {
    title: 'Successful Reposts (24h)',
    description: 'TikTok → destination posts that completed without retry',
    value: '2,147',
    delta: '+22.4%'
  }
];

export default function HomePage() {
  return (
    <>
      <section className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">Operations Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor cross-platform automation health, onboarding velocity, and tenant activity.
          </p>
        </div>
        <Button className="gap-2">
          Launch Runbook
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-sm">
            <CardHeader className="gap-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <CardDescription className="text-xs">{stat.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold tracking-tight">{stat.value}</span>
                <span className="text-xs font-semibold text-emerald-500">{stat.delta}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Plug className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Connection Health</CardTitle>
                <CardDescription>Real-time snapshot of OAuth authorisations and refresh cadence.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <StatusRow label="TikTok Sources" healthy={96} warning={3} critical={1} />
            <StatusRow label="Instagram Destinations" healthy={87} warning={9} critical={4} />
            <StatusRow label="YouTube Destinations" healthy={65} warning={4} critical={0} />
            <StatusRow label="Twitter Destinations" healthy={78} warning={11} critical={2} />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Repeat className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Automation Throughput</CardTitle>
                <CardDescription>
                  Rule execution breakdown with retry and failure distribution across destinations.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProgressRow label="Completed" percentage={72} tone="success" />
            <ProgressRow label="Retrying" percentage={18} tone="warning" />
            <ProgressRow label="Failed" percentage={10} tone="danger" />
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Onboarding Velocity</CardTitle>
                <CardDescription>Recent tenant invitations and user adoption metrics.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ListRow label="New tenants this week" value="5" />
            <ListRow label="Invited users (last 7d)" value="38" />
            <ListRow label="Provisioning SLA compliance" value="99.1%" highlight />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <FlameKindling className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Incident Feed</CardTitle>
                <CardDescription>Actionable alerts surfaced to operations engineers.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <AlertRow status="investigating" message="YouTube quota reaching 80% for tenant Apex Media." />
            <AlertRow status="mitigated" message="Instagram token refresh delay resolved for tenant Orbit Studio." />
            <AlertRow status="new" message="TikTok webhook latency exceeding 5m for APAC shard." />
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function StatusRow({
  label,
  healthy,
  warning,
  critical
}: {
  label: string;
  healthy: number;
  warning: number;
  critical: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm font-medium">
        <span>{label}</span>
        <span className="text-xs text-muted-foreground">
          {healthy} healthy • {warning} warning • {critical} critical
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="flex h-full w-full">
          <span className="h-full bg-emerald-500" style={{ width: `${healthy}%` }} />
          <span className="h-full bg-amber-400" style={{ width: `${warning}%` }} />
          <span className="h-full bg-rose-500" style={{ width: `${critical}%` }} />
        </div>
      </div>
    </div>
  );
}

function ProgressRow({ label, percentage, tone }: { label: string; percentage: number; tone: 'success' | 'warning' | 'danger' }) {
  const color =
    tone === 'success' ? 'bg-emerald-500' : tone === 'warning' ? 'bg-amber-400' : 'bg-rose-500';

  return (
    <div>
      <div className="flex items-center justify-between text-sm font-medium">
        <span>{label}</span>
        <span className="text-xs text-muted-foreground">{percentage}%</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <span className={`block h-full ${color}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function ListRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={highlight ? 'text-sm font-semibold text-emerald-500' : 'text-sm font-medium'}>{value}</span>
    </div>
  );
}

function AlertRow({ status, message }: { status: 'new' | 'investigating' | 'mitigated'; message: string }) {
  const badge =
    status === 'new'
      ? 'bg-blue-500/10 text-blue-500'
      : status === 'investigating'
        ? 'bg-amber-500/10 text-amber-500'
        : 'bg-emerald-500/10 text-emerald-500';

  return (
    <div className="flex items-start gap-3 rounded-lg border border-dashed border-border/60 p-3">
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${badge}`}>{status}</span>
      <p className="flex-1 text-sm leading-5 text-foreground">{message}</p>
    </div>
  );
}
