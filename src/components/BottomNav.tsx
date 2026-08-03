import Link from "next/link";

export function BottomNav({ active }: { active: "presets" | "history" }) {
  const item = (href: string, id: "presets" | "history", label: string) => (
    <Link
      href={href}
      className={`flex flex-1 items-center justify-center border-t-2 py-3 text-xs font-medium ${
        active === id
          ? "border-accent text-foreground"
          : "border-transparent text-muted hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-2xl">
        {item("/", "presets", "Presets")}
        {item("/history", "history", "History")}
      </div>
    </nav>
  );
}
