import { createPreset } from "@/app/actions/presets";
import { AppHeader, PageShell } from "@/components/AppChrome";
import { BottomNav } from "@/components/BottomNav";
import { PresetListItem } from "@/components/PresetListItem";
import { db } from "@/db";
import { presets } from "@/db/schema";
import { desc } from "drizzle-orm";

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
            <PresetListItem
              key={preset.id}
              id={preset.id}
              name={preset.name}
              bordered={i > 0}
            />
          ))
        )}
      </section>

      <BottomNav active="presets" />
    </PageShell>
  );
}
