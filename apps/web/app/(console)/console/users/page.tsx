import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function UsersPage() {
  return (
    <>
      <section>
        <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">User Directory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Administer tenant staff, platform admins, and automation operators with RBAC controls.
        </p>
      </section>

      <Card className="mt-6 shadow-sm">
        <CardHeader>
          <CardTitle>User Table</CardTitle>
          <CardDescription>Interactive grid with status indicators and last-login metadata will appear here.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Placeholder content; connect to `/api/users` once the backend exposes the admin endpoints.
        </CardContent>
      </Card>
    </>
  );
}
