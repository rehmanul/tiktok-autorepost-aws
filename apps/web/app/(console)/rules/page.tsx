import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Repeat } from 'lucide-react';

export default function RulesPage() {
  return (
    <>
      <section className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">Automation Rules</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define mapping between TikTok sources and destination channels with preservation policies.
          </p>
        </div>
        <Button className="gap-2">
          <Repeat className="h-4 w-4" />
          Create Rule
        </Button>
      </section>

      <Card className="mt-6 shadow-sm">
        <CardHeader>
          <CardTitle>Rule Designer</CardTitle>
          <CardDescription>
            Drag-and-drop cells for îlot placement and corridor routing will surface here in upcoming iterations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The UI will support multi-destination fan-out, post-processing constraints, caption truncation logic, and
            approval workflows. Integration with the background orchestration engine is wired through the shared API.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
