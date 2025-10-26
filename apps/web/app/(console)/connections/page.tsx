import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plug } from 'lucide-react';

export default function ConnectionsPage() {
  return (
    <>
      <section className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">Platform Connections</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage OAuth authorisations across TikTok, Instagram, YouTube, and Twitter with tenant-level isolation.
          </p>
        </div>
        <Button className="gap-2">
          <Plug className="h-4 w-4" />
          Add Connection
        </Button>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>TikTok Sources</CardTitle>
            <CardDescription>Accounts monitored for new video content.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>• 54 active authorisations with refresh token coverage.</p>
            <p>• 3 tokens expiring within 24h – schedule proactive refresh.</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Destination Platforms</CardTitle>
            <CardDescription>Connected accounts ready for cross-posting.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>• Instagram: 68 reels endpoints</p>
            <p>• YouTube: 51 Shorts channels</p>
            <p>• Twitter: 23 high-throughput handles</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
