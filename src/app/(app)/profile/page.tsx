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
  return (
    <Container className="py-xl tablet-narrow:py-section">
      <div className="mx-auto max-w-4xl">
        <header>
          <p className="eyebrow text-mute">Account settings</p>
          <h1 className="mt-md font-display text-6xl uppercase leading-none tablet-narrow:text-8xl">Profil</h1>
        </header>

        <section className="mt-section overflow-hidden rounded-sm bg-white">
          <div className="p-xl tablet-narrow:p-section">
            <h2 className="font-display text-3xl uppercase tablet-narrow:text-4xl">Informasi personal</h2>
            <p className="mt-sm max-w-2xl text-sm leading-relaxed text-mute">
              Kelola identitas dan informasi latihanmu dalam satu tempat.
            </p>
            <div className="mt-xl">
              <ProfileForm
                defaultValues={{
                  full_name: profile.full_name,
                  class_name: profile.class_name,
                  school_id: profile.school_id,
                  avatar_path: profile.avatar_path,
                }}
                schools={schools}
              />
            </div>
          </div>

          <footer className="flex flex-col gap-lg border-t border-black/10 bg-soft-cloud px-xl py-lg tablet-narrow:flex-row tablet-narrow:items-center tablet-narrow:justify-between tablet-narrow:px-section">
            <div>
              <p className="flex items-center gap-sm text-sm font-semibold text-charcoal">
                <Icon name="shield" className="h-4 w-4 text-sport-lime-deep" /> Keamanan akun
              </p>
              <p className="mt-xs text-xs text-mute">Data profil dan aktivitas latihanmu dilindungi.</p>
            </div>
            <SignOutButton />
          </footer>
        </section>
      </div>
    </Container>
  );
}
