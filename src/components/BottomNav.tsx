import Link from "next/link";

export function BottomNav({ active }: { active: "presets" | "history" }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0c1412]/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg">
        <Link
          href="/"
          className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium tracking-wide ${
            active === "presets" ? "text-amber-300" : "text-teal-100/50"
          }`}
        >
          <span className="text-base">◎</span>
          Presets
        </Link>
        <Link
          href="/history"
          className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium tracking-wide ${
            active === "history" ? "text-amber-300" : "text-teal-100/50"
          }`}
        >
          <span className="text-base">◷</span>
          History
        </Link>
      </div>
    </nav>
  );
}
