import { Container } from "@/components/ui/container";

export default function Loading() {
  return (
    <Container className="animate-pulse py-section" aria-busy="true" aria-label="Memuat halaman">
      <div className="h-3 w-28 rounded-full bg-hairline-soft" />
      <div className="mt-lg h-14 w-3/4 max-w-xl rounded-sm bg-hairline-soft" />
      <div className="mt-section grid gap-md tablet-narrow:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="h-48 rounded-sm bg-hairline-soft" />)}
      </div>
      <span className="sr-only">Sedang memuat…</span>
    </Container>
  );
}
