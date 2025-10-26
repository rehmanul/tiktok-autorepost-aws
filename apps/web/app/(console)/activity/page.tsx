import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ActivityPage() {
  return (
    <>
      <section>
        <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">Recent Activity</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chronological ledger of repost attempts, failures, retried batches, and operator overrides.
        </p>
      </section>

      <Card className="mt-6 shadow-sm">
        <CardHeader>
          <CardTitle>Activity Feed</CardTitle>
          <CardDescription>
            Future iterations will stream from the background worker via Server-Sent Events or WebSockets.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Placeholder entries can be replaced with live data once the API endpoints are exposed.</p>
        </CardContent>
      </Card>
    </>
  );
}
