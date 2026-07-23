export default function EmptyState({
  icon, title, body,
}: {
  icon: string
  title: string
  body: string
}) {
  return (
    <div className="animate-[fadeInUp_0.35s_ease-out] flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-base-800/40 px-6 py-14 text-center backdrop-blur-md">
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-electric-500/25 bg-electric-500/10 text-lg">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 max-w-xs font-mono text-[12px] leading-relaxed text-white/40">{body}</p>
      </div>
    </div>
  )
}
