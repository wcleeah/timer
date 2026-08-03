import { createPreset } from "@/app/actions/presets";
import { BottomNav } from "@/components/BottomNav";
import { db } from "@/db";
import { presets } from "@/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const list = await db.select().from(presets).orderBy(desc(presets.updatedAt));

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-28 pt-6">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-teal-200/50">
          Solo timers
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-teal-50">
          Timer
        </h1>
        <p className="mt-2 text-sm text-teal-100/55">
          Build presets, then run timers in parallel.
        </p>
      </header>

      <form action={createPreset} className="mb-5 flex gap-2">
        <input
          name="name"
          placeholder="New preset name"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-teal-50 outline-none placeholder:text-teal-100/35 focus:border-amber-300/40"
        />
        <button
          type="submit"
          className="rounded-xl bg-amber-400 px-4 py-3 text-sm font-semibold text-[#13201b]"
        >
          Create
        </button>
      </form>

      <section className="space-y-3">
        {list.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 px-4 py-10 text-center text-sm text-teal-100/50">
            No presets yet. Create one to get started.
          </p>
        ) : (
          list.map((preset) => (
            <Link
              key={preset.id}
              href={`/presets/${preset.id}`}
              className="block rounded-2xl border border-white/10 bg-[#14201c]/90 px-4 py-4 transition active:scale-[0.99]"
            >
              <div className="text-base font-semibold text-teal-50">
                {preset.name}
              </div>
              <div className="mt-1 text-xs text-teal-100/45">
                Updated {preset.updatedAt.toLocaleString()}
              </div>
            </Link>
          ))
        )}
      </section>

      <BottomNav active="presets" />
    </main>
  );
}
