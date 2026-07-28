# Sistem Logo KITMOTION

Komponen `Logo` menyediakan tiga komposisi dan dua tone tanpa background bawaan.

| Variant | Penggunaan |
|---|---|
| `mark` | Ikon, avatar brand, ruang sempit |
| `wordmark` | Footer atau area yang sudah memiliki simbol visual lain |
| `lockup` | Navbar, halaman autentikasi, header utama |

| Tone | Penggunaan | Warna |
|---|---|---|
| `dark` | Background putih/terang | Figur lime + K dan teks hitam |
| `light` | Background hitam/gelap | Figur lime + K dan teks putih |

```tsx
<Logo variant="mark" tone="light" />
<Logo variant="wordmark" tone="dark" />
<Logo variant="lockup" tone="light" />
```

Aset mark transparan:

- `/brand/kitmotion-mark-dark.png`
- `/brand/kitmotion-mark-light.png`

`kitmotion-icon-512.png` adalah app icon PWA, sehingga tetap memiliki container agar aman ketika dipasang pada home screen berbagai sistem operasi.
