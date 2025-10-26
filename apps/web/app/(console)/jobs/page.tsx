import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function JobsPage() {
  return (
    <>
      <section>
        <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">Processing Jobs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Inspect the multi-stage pipeline that validates, normalises, classifies, and republishes content.
        </p>
      </section>

      <Card className="mt-6 shadow-sm">
        <CardHeader>
          <CardTitle>Queue Runtime</CardTitle>
          <CardDescription>Real-time view of BullMQ queues and Temporal workflows (coming soon).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Validation queue: placeholder metrics</p>
          <p>• Normalisation queue: placeholder metrics</p>
          <p>• Corridor generation queue: placeholder metrics</p>
        </CardContent>
      </Card>
    </>
  );
}
