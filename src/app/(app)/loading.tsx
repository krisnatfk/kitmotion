import { Container } from "@/components/ui/container";

export default function AppLoading() {
  return (
    <Container className="animate-pulse py-xl tablet-narrow:py-section" aria-busy="true" aria-label="Memuat aplikasi">
      <div className="h-4 w-40 rounded-full bg-hairline-soft" />
      <div className="mt-md h-14 w-3/4 max-w-xl rounded-sm bg-hairline-soft" />
      <div className="mt-xl grid gap-lg lg:grid-cols-[1.55fr_0.9fr]">
        <div className="h-[420px] rounded-sm bg-hairline-soft" />
        <div className="h-[420px] rounded-sm bg-hairline-soft" />
      </div>
      <span className="sr-only">Sedang memuat dashboard...</span>
    </Container>
  );
}
