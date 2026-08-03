import { ThemeToggle } from "@/components/ThemeProvider";
import Link from "next/link";

export function AppHeader({
  title,
  backHref,
  backLabel,
  action,
}: {
  title?: string;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 -mx-4 mb-4 border-b border-border bg-background/90 px-4 backdrop-blur-sm">
      <div className="flex h-12 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {backHref ? (
            <Link
              href={backHref}
              className="shrink-0 text-sm text-muted hover:text-foreground"
            >
              {backLabel ?? "← Back"}
            </Link>
          ) : (
            <Link href="/" className="shrink-0 font-mono text-sm font-semibold tracking-tight text-foreground">
              timer
            </Link>
          )}
          {title ? (
            <span className="truncate text-sm text-muted">{title}</span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export function PageShell({
  children,
  withNav = false,
}: {
  children: React.ReactNode;
  withNav?: boolean;
}) {
  return (
    <main
      className={`mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pt-0 ${
        withNav ? "pb-20" : "pb-8"
      }`}
    >
      {children}
    </main>
  );
}
