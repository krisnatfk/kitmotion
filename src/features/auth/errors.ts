/** Map Supabase auth error messages to friendly Indonesian text. */
export function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
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
    return "Terlalu banyak percobaan. Coba lagi nanti.";
  }
  if (lower.includes("expired")) {
    return "Tautan kedaluwarsa. Minta reset ulang.";
  }
  return "Terjadi kesalahan. Coba lagi.";
}
