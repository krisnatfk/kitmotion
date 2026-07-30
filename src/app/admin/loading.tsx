export default function AdminLoading() {
  return (
    <main
      className="min-h-dvh bg-sport-black px-lg py-xl text-white tablet-narrow:px-section"
      aria-busy="true"
      aria-label="Membuka panel admin"
    >
      <div className="mx-auto max-w-[1440px] animate-pulse">
        <div className="flex items-center justify-between border-b border-white/10 pb-lg">
          <div className="h-8 w-40 rounded-sm bg-white/10" />
          <div className="h-10 w-28 rounded-full bg-sport-lime/40" />
        </div>

        <div className="py-section">
          <div className="h-3 w-32 rounded-sm bg-sport-lime/50" />
          <div className="mt-lg h-14 max-w-xl rounded-sm bg-white/15 tablet-narrow:h-20" />
          <p className="mt-lg text-sm font-semibold text-white/60">Membuka panel admin...</p>

          <div className="mt-section grid grid-cols-2 gap-md desktop:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-36 rounded-sm border border-white/10 bg-white/[0.06]" />
            ))}
          </div>

          <div className="mt-md grid gap-md desktop:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.75fr)]">
            <div className="h-72 rounded-sm border border-white/10 bg-white/[0.06]" />
            <div className="h-72 rounded-sm border border-white/10 bg-white/[0.06]" />
          </div>
        </div>
      </div>
    </main>
  );
}
