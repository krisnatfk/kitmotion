import { MarketingNav } from "@/components/layout/marketing-nav";
import { SiteFooter } from "@/components/layout/site-footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col pt-[72px]">
      <MarketingNav />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
