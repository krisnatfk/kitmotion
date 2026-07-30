"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Input, Label } from "@/components/ui/field";
import { ProfileAvatar } from "@/features/profile/avatar";
import type { UserRole } from "@/types/database.types";
import type { AdminUserRow } from "./queries";
import {
  deleteManagedUserAction,
  setManagedUserBlockedAction,
  updateManagedUserAction,
  type AdminResult,
} from "./actions";

type RoleFilter = "all" | UserRole;
type StatusFilter = "all" | "active" | "blocked";

function formatDate(value: string | null) {
  if (!value) return "Belum pernah";
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function AdminUsersManager({
  initialUsers,
  currentAdminId,
}: {
  initialUsers: AdminUserRow[];
  currentAdminId: string;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<AdminUserRow | null>(null);
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<AdminResult | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  useEffect(() => setUsers(initialUsers), [initialUsers]);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesQuery = !normalized || `${user.fullName} ${user.email} ${user.schoolName ?? ""}`.toLowerCase().includes(normalized);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus = statusFilter === "all" || (statusFilter === "blocked" ? user.isBlocked : !user.isBlocked);
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [query, roleFilter, statusFilter, users]);

  function openUser(user: AdminUserRow) {
    setSelected(user);
    setFullName(user.fullName);
    setRole(user.role);
    setDeleteMode(false);
    setDeleteConfirmation("");
    setResult(null);
  }

  function closeDialog() {
    if (pending) return;
    setSelected(null);
    setResult(null);
    setDeleteMode(false);
  }

  async function saveUser() {
    if (!selected) return;
    setPending(true);
    setResult(null);
    const response = await updateManagedUserAction({ userId: selected.id, fullName, role });
    setPending(false);
    setResult(response);
    if (response.ok) {
      setUsers((current) => current.map((user) => user.id === selected.id ? { ...user, fullName, role } : user));
      setSelected((user) => user ? { ...user, fullName, role } : user);
      router.refresh();
    }
  }

  async function toggleBlocked() {
    if (!selected) return;
    setPending(true);
    setResult(null);
    const blocked = !selected.isBlocked;
    const response = await setManagedUserBlockedAction({ userId: selected.id, blocked });
    setPending(false);
    setResult(response);
    if (response.ok) {
      setUsers((current) => current.map((user) => user.id === selected.id ? { ...user, isBlocked: blocked } : user));
      setSelected((user) => user ? { ...user, isBlocked: blocked } : user);
      router.refresh();
    }
  }

  async function deleteUser() {
    if (!selected) return;
    setPending(true);
    setResult(null);
    const response = await deleteManagedUserAction({ userId: selected.id, confirmation: deleteConfirmation as "HAPUS" });
    setPending(false);
    setResult(response);
    if (response.ok) {
      setUsers((current) => current.filter((user) => user.id !== selected.id));
      setSelected(null);
      router.refresh();
    }
  }

  return (
    <>
      <section className="overflow-hidden rounded-sm border border-black/[0.08] bg-white">
        <div className="grid gap-md border-b border-black/[0.08] p-lg tablet-narrow:grid-cols-[minmax(0,1fr)_auto_auto] tablet-narrow:items-center">
          <label className="relative block">
            <span className="sr-only">Cari pengguna</span>
            <Icon name="search" className="pointer-events-none absolute left-md top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-11 bg-[#f7f8f5] pl-10" placeholder="Cari nama, email, atau sekolah..." />
          </label>
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as RoleFilter)} className="input-pill min-h-11 bg-[#f7f8f5] text-sm" aria-label="Filter role">
            <option value="all">Semua role</option>
            <option value="student">Siswa</option>
            <option value="teacher">Guru</option>
            <option value="admin">Admin</option>
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="input-pill min-h-11 bg-[#f7f8f5] text-sm" aria-label="Filter status">
            <option value="all">Semua status</option>
            <option value="active">Aktif</option>
            <option value="blocked">Diblokir</option>
          </select>
        </div>

        <div className="hidden overflow-x-auto tablet-narrow:block">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-[#f7f8f5] text-[9px] font-bold uppercase tracking-[0.16em] text-mute">
              <tr><th className="px-lg py-md">Pengguna</th><th className="px-lg py-md">Role</th><th className="px-lg py-md">Aktivitas</th><th className="px-lg py-md">Terakhir masuk</th><th className="px-lg py-md">Status</th><th className="px-lg py-md text-right">Aksi</th></tr>
            </thead>
            <tbody className="divide-y divide-black/[0.08]">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="transition-colors hover:bg-[#f7f8f5]">
                  <td className="px-lg py-md"><UserIdentity user={user} current={user.id === currentAdminId} /></td>
                  <td className="px-lg py-md"><RoleBadge role={user.role} /></td>
                  <td className="px-lg py-md"><p className="font-semibold">{user.totalSessions + user.runCount} total</p><p className="text-xs text-mute">{user.totalSessions} latihan · {user.runCount} lari</p></td>
                  <td className="px-lg py-md"><p>{formatDate(user.lastSignInAt)}</p><p className="text-xs text-mute">Bergabung {formatDate(user.createdAt)}</p></td>
                  <td className="px-lg py-md"><StatusBadge blocked={user.isBlocked} /></td>
                  <td className="px-lg py-md text-right"><button type="button" onClick={() => openUser(user)} className="inline-flex min-h-10 items-center gap-sm rounded-full border border-black/10 px-md text-xs font-semibold hover:bg-sport-black hover:text-white"><Icon name="edit" className="h-4 w-4" />Kelola</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-black/[0.08] tablet-narrow:hidden">
          {filteredUsers.map((user) => (
            <button key={user.id} type="button" onClick={() => openUser(user)} className="w-full p-lg text-left">
              <div className="flex items-start justify-between gap-md"><UserIdentity user={user} current={user.id === currentAdminId} /><Icon name="arrow" className="mt-sm h-4 w-4 text-mute" /></div>
              <div className="mt-md flex flex-wrap gap-sm"><RoleBadge role={user.role} /><StatusBadge blocked={user.isBlocked} /><span className="rounded-full bg-[#f1f3ef] px-md py-sm text-[10px] font-bold">{user.totalSessions + user.runCount} aktivitas</span></div>
            </button>
          ))}
        </div>

        {filteredUsers.length === 0 && <div className="grid min-h-52 place-items-center p-xl text-center"><div><Icon name="users" className="mx-auto h-8 w-8 text-mute" /><p className="mt-md font-semibold">Pengguna tidak ditemukan</p><p className="mt-xs text-xs text-mute">Coba ubah kata pencarian atau filter.</p></div></div>}

        <div className="flex items-center justify-between border-t border-black/[0.08] bg-[#f7f8f5] px-lg py-md text-xs text-mute"><span>Menampilkan {filteredUsers.length} dari {users.length} akun</span><span>Data Supabase Auth &amp; profil</span></div>
      </section>

      {selected && (
        <div className="fixed inset-0 z-[1400] grid place-items-end bg-black/55 p-0 backdrop-blur-sm tablet-narrow:place-items-center tablet-narrow:p-xl" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
          <section className="max-h-[92dvh] w-full overflow-y-auto rounded-t-md bg-white p-lg tablet-narrow:max-w-2xl tablet-narrow:rounded-sm tablet-narrow:p-xl" role="dialog" aria-modal="true" aria-labelledby="manage-user-title">
            <div className="flex items-start justify-between gap-lg border-b border-black/[0.08] pb-lg">
              <div className="flex min-w-0 items-center gap-md"><ProfileAvatar avatarPath={selected.avatarPath} displayName={selected.fullName} className="h-12 w-12 text-lg" /><div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-widest text-sport-lime-deep">Manajemen akun</p><h2 id="manage-user-title" className="truncate text-xl font-bold">{selected.fullName}</h2><p className="truncate text-xs text-mute">{selected.email}</p></div></div>
              <button type="button" onClick={closeDialog} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f1f3ef]" aria-label="Tutup"><Icon name="close" className="h-4 w-4" /></button>
            </div>

            {selected.id === currentAdminId ? (
              <div className="mt-lg rounded-sm border border-sport-lime-deep/30 bg-sport-lime/15 p-lg"><p className="font-semibold">Akun administrator aktif dilindungi</p><p className="mt-xs text-xs leading-relaxed text-mute">Gunakan halaman profil untuk mengubah data diri. Role, status, dan penghapusan akun yang sedang digunakan sengaja dikunci.</p></div>
            ) : (
              <>
                <div className="mt-lg grid gap-lg tablet-narrow:grid-cols-2">
                  <div><Label htmlFor="managed-full-name">Nama lengkap</Label><Input id="managed-full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} /></div>
                  <div><Label htmlFor="managed-role">Hak akses</Label><select id="managed-role" value={role} onChange={(event) => setRole(event.target.value as UserRole)} className="input-pill"><option value="student">Siswa</option><option value="teacher">Guru</option><option value="admin">Administrator</option></select></div>
                </div>
                <div className="mt-lg grid grid-cols-2 gap-sm rounded-sm bg-[#f4f6f2] p-md tablet-narrow:grid-cols-4">
                  <MiniStat label="Level" value={String(selected.level)} />
                  <MiniStat label="XP" value={String(selected.totalXp)} />
                  <MiniStat label="Sesi" value={String(selected.totalSessions)} />
                  <MiniStat label="Valid rep" value={String(selected.totalValidReps)} />
                </div>
                <Button onClick={saveUser} disabled={pending || fullName.trim().length < 2} className="mt-lg w-full bg-sport-black text-white">{pending ? "Menyimpan..." : "Simpan perubahan"}</Button>

                <div className="mt-xl border-t border-black/[0.08] pt-lg">
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-mute">Kontrol akses</p>
                  <div className="mt-md flex flex-col gap-md rounded-sm border border-black/[0.08] p-lg mobile-landscape:flex-row mobile-landscape:items-center mobile-landscape:justify-between"><div><p className="font-semibold">{selected.isBlocked ? "Akun sedang diblokir" : "Blokir akses pengguna"}</p><p className="mt-xs text-xs leading-relaxed text-mute">{selected.isBlocked ? "Pulihkan agar pengguna dapat masuk kembali." : "Sesi pengguna akan ditolak sampai akses dipulihkan admin."}</p></div><Button variant="secondary" onClick={toggleBlocked} disabled={pending} className="shrink-0"> <Icon name={selected.isBlocked ? "unlock" : "lock"} className="h-4 w-4" />{selected.isBlocked ? "Pulihkan akses" : "Blokir akun"}</Button></div>
                </div>

                <div className="mt-lg rounded-sm border border-red-200 bg-red-50 p-lg">
                  <div className="flex flex-col gap-md mobile-landscape:flex-row mobile-landscape:items-center mobile-landscape:justify-between"><div><p className="font-semibold text-danger">Hapus akun permanen</p><p className="mt-xs text-xs leading-relaxed text-red-800/65">Profil, riwayat latihan, rute lari, dan progres akan ikut terhapus.</p></div>{!deleteMode && <button type="button" onClick={() => setDeleteMode(true)} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-sm rounded-full border border-red-200 px-lg text-xs font-bold text-danger"><Icon name="trash" className="h-4 w-4" />Hapus akun</button>}</div>
                  {deleteMode && <div className="mt-md border-t border-red-200 pt-md"><Label htmlFor="delete-confirmation" className="text-red-900">Ketik HAPUS untuk konfirmasi</Label><div className="flex flex-col gap-sm mobile-landscape:flex-row"><Input id="delete-confirmation" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} className="border-red-200 bg-white" /><button type="button" onClick={deleteUser} disabled={pending || deleteConfirmation !== "HAPUS"} className="min-h-12 shrink-0 rounded-full bg-danger px-xl text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Hapus permanen</button></div></div>}
                </div>
              </>
            )}

            {result?.error && <p className="mt-lg rounded-sm bg-red-50 px-lg py-md text-sm text-danger" role="alert">{result.error}</p>}
            {result?.ok && <p className="mt-lg rounded-sm bg-green-50 px-lg py-md text-sm text-success" role="status">{result.message}</p>}
          </section>
        </div>
      )}
    </>
  );
}

function UserIdentity({ user, current }: { user: AdminUserRow; current: boolean }) {
  return <div className="flex min-w-0 items-center gap-md"><ProfileAvatar avatarPath={user.avatarPath} displayName={user.fullName} className="h-10 w-10 text-base" /><div className="min-w-0"><div className="flex items-center gap-sm"><p className="truncate font-semibold">{user.fullName}</p>{current && <span className="rounded-full bg-sport-lime px-sm py-xxs text-[8px] font-bold uppercase">Anda</span>}</div><p className="truncate text-xs text-mute">{user.email}</p></div></div>;
}

function RoleBadge({ role }: { role: UserRole }) {
  return <span className={`inline-flex rounded-full px-md py-sm text-[9px] font-bold uppercase tracking-wider ${role === "admin" ? "bg-sport-black text-sport-lime" : role === "teacher" ? "bg-[#e8f0ff] text-[#2356a8]" : "bg-[#eef1eb] text-charcoal"}`}>{role === "admin" ? "Admin" : role === "teacher" ? "Guru" : "Siswa"}</span>;
}

function StatusBadge({ blocked }: { blocked: boolean }) {
  return <span className={`inline-flex items-center gap-xs rounded-full px-md py-sm text-[9px] font-bold uppercase tracking-wider ${blocked ? "bg-red-50 text-danger" : "bg-green-50 text-success"}`}><span className={`h-1.5 w-1.5 rounded-full ${blocked ? "bg-danger" : "bg-success-bright"}`} />{blocked ? "Diblokir" : "Aktif"}</span>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-sm bg-white p-md"><p className="text-[8px] font-bold uppercase tracking-widest text-mute">{label}</p><p className="mt-xs font-display text-2xl">{value}</p></div>;
}
