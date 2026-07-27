import { redirect } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Icon } from "@/components/ui/icons";
import { ProfileForm } from "@/features/profile/profile-form";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { getCurrentProfile, listSchools } from "@/features/profile/queries";

export default async function ProfilePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/profile");
  const schools = await listSchools();
  const avatarClass: Record<string, string> = { "preset:blue": "bg-[#9bd7ff]", "preset:orange": "bg-[#ffad7a]", "preset:violet": "bg-[#d4c5ff]", "preset:lime": "bg-sport-lime" };
  const avatarColor = avatarClass[profile.avatar_path ?? ""] ?? "bg-sport-lime";
  return <Container className="py-xl tablet-narrow:py-section">
    <header><p className="eyebrow text-mute">Account settings</p><h1 className="mt-md font-display text-6xl uppercase leading-none tablet-narrow:text-8xl">Profil</h1></header>
    <div className="mt-section grid gap-lg desktop-small:grid-cols-[340px_1fr]">
      <aside className="h-fit rounded-sm bg-sport-black p-xl text-white"><div className={`grid h-20 w-20 place-items-center rounded-full ${avatarColor} font-display text-4xl text-black`}>{profile.full_name.slice(0, 1).toUpperCase()}</div><h2 className="mt-lg font-display text-3xl uppercase">{profile.full_name}</h2><p className="mt-xs text-sm text-white/50">{profile.class_name || "Kelas belum diisi"}</p><div className="mt-xl border-t border-white/10 pt-lg"><p className="flex items-center gap-sm text-xs text-white/50"><Icon name="shield" className="h-4 w-4 text-sport-lime" /> Data akun dilindungi</p></div><div className="mt-xl"><SignOutButton /></div></aside>
      <section className="rounded-sm bg-white p-xl tablet-narrow:p-section"><div className="max-w-xl"><h2 className="font-display text-3xl uppercase">Informasi personal</h2><p className="mt-sm text-sm text-mute">Lengkapi profil agar progres latihan tercatat dengan benar.</p><div className="mt-xl"><ProfileForm defaultValues={{ full_name: profile.full_name, class_name: profile.class_name, school_id: profile.school_id, avatar_path: profile.avatar_path }} schools={schools} /></div></div></section>
    </div>
  </Container>;
}
