import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TenantsPage() {
  return (
    <>
      <section>
        <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">Tenants</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage multi-tenant boundaries, service tiers, and environment-specific configuration.
        </p>
      </section>

      <Card className="mt-6 shadow-sm">
        <CardHeader>
          <CardTitle>Tenant Registry</CardTitle>
          <CardDescription>
            The grid view will allow entity drill-down, connection auditing, and compliance exports.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Data wiring pending: integrate with Prisma&apos;s `tenant` table once API endpoints are available.
        </CardContent>
      </Card>
    </>
  );
}
