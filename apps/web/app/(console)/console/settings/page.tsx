import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <>
      <section>
        <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">Platform Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure branding, security policies, notification channels, and exporter defaults.
        </p>
      </section>

      <Card className="mt-6 shadow-sm">
        <CardHeader>
          <CardTitle>Configuration Panels</CardTitle>
          <CardDescription>
            Upcoming work will add forms for SMTP, webhook listener endpoints, and platform API credentials.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Replace this placeholder once the settings service exposes structured metadata.
        </CardContent>
      </Card>
    </>
  );
}
