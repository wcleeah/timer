import { createPreset } from "@/app/actions/presets";
import { AppHeader, PageShell } from "@/components/AppChrome";
import { BottomNav } from "@/components/BottomNav";
import { db } from "@/db";
import { presets } from "@/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const list = await db.select().from(presets).orderBy(desc(presets.updatedAt));

  return (
    <PageShell withNav>
      <AppHeader />

      <div className="mb-4">
        <h1 className="text-lg font-semibold tracking-tight">Presets</h1>
        <p className="mt-0.5 text-sm text-muted">
          Choose a preset to edit or start a run.
        </p>
      </div>

      <form action={createPreset} className="mb-3 flex gap-2">
        <input
          name="name"
          placeholder="New preset…"
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-fg"
        >
          Create
        </button>
      </form>

      <section className="overflow-hidden rounded-md border border-border">
        {list.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted">
            No presets yet.
          </p>
        ) : (
          list.map((preset, i) => (
            <Link
              key={preset.id}
              href={`/presets/${preset.id}`}
              className={`flex items-baseline justify-between gap-3 px-3 py-2.5 hover:bg-surface ${
                i > 0 ? "border-t border-border" : ""
              }`}
            >
              <span className="truncate text-sm font-medium">{preset.name}</span>
              <span className="shrink-0 font-mono text-xs text-muted">
                {preset.updatedAt.toLocaleDateString()}
              </span>
            </Link>
          ))
        )}
      </section>

      <BottomNav active="presets" />
    </PageShell>
  );
}
