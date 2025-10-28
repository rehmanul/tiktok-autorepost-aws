import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-background/60 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-lg font-semibold text-primary">
              AR
            </span>
            <div>
              <Link href="/" className="text-base font-semibold leading-tight text-foreground">
                Autorepost
              </Link>
              <p className="text-xs text-muted-foreground">Cross-platform content automation</p>
            </div>
          </div>
          <nav className="ml-auto hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <Link href="#features" className="transition-colors hover:text-foreground">
              Features
            </Link>
            <Link href="#workflow" className="transition-colors hover:text-foreground">
              Workflow
            </Link>
            <Link href="#governance" className="transition-colors hover:text-foreground">
              Governance
            </Link>
            <Link href="#faq" className="transition-colors hover:text-foreground">
              FAQ
            </Link>
          </nav>
          <div className="ml-4 hidden md:block">
            <Button asChild>
              <Link href="/console">Launch Console</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-muted/40">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <div className="text-base font-semibold text-foreground">Autorepost</div>
            <p className="mt-1 max-w-md text-sm">
              Operational infrastructure for teams automating TikTok to YouTube republishing at scale.
            </p>
          </div>
          <div className="flex gap-6">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-foreground/70">Product</div>
              <ul className="space-y-1">
                <li>
                  <Link href="#features" className="transition-colors hover:text-foreground">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#workflow" className="transition-colors hover:text-foreground">
                    Integrations
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-foreground/70">Platform</div>
              <ul className="space-y-1">
                <li>
                  <Link href="/console" className="transition-colors hover:text-foreground">
                    Console
                  </Link>
                </li>
                <li>
                  <Link href="mailto:hello@autorepost.dev" className="transition-colors hover:text-foreground">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
