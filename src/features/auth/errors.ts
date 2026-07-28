/** Map stable Supabase Auth codes (with message fallback) to Indonesian text. */
export function translateAuthError(message: string, code?: string, status?: number): string {
  const lower = message.toLowerCase();
  if (code === "over_email_send_rate_limit") {
    return "Kuota email verifikasi sedang penuh. Coba lagi setelah 1 jam atau hubungi admin.";
  }
  if (code === "over_request_rate_limit" || code === "request_timeout" || status === 429) {
    return "Terlalu banyak permintaan dari jaringan ini. Tunggu beberapa menit lalu coba lagi.";
  }
  if (code === "email_address_not_authorized" || lower.includes("email address not authorized")) {
    return "Layanan email belum mengizinkan alamat ini. Hubungi admin aplikasi.";
  }
  if (code === "signup_disabled" || lower.includes("signups not allowed")) {
    return "Pendaftaran akun sedang dinonaktifkan.";
  }
  if (lower.includes("invalid login credentials")) {
    return "Email atau kata sandi salah.";
  }
  if (lower.includes("user already registered") || lower.includes("already been registered")) {
    return "Email sudah terdaftar. Coba masuk.";
  }
  if (lower.includes("password should be at least")) {
    return "Kata sandi minimal 8 karakter.";
  }
  if (lower.includes("unable to validate email address") || lower.includes("invalid email")) {
    return "Format email tidak valid.";
  }
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Layanan autentikasi sedang mencapai batas permintaan. Coba lagi beberapa saat nanti.";
  }
  if (lower.includes("expired")) {
    return "Tautan kedaluwarsa. Minta reset ulang.";
  }
  return "Terjadi kesalahan. Coba lagi.";
}
