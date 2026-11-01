# Werewolf Pass-and-Play

Dokumentasi proyek Werewolf lokal untuk dimainkan bergiliran menggunakan satu perangkat. Pemain tidak memerlukan akun atau koneksi ke server game: aplikasi menyimpan sesi di browser perangkat tersebut.

## Fitur

- Mendukung 4–16 pemain, nama pemain, pengisian cepat, dan konfigurasi role otomatis atau manual.
- Alur permainan mencakup pembagian role privat, aksi malam, laporan fajar, diskusi dan eliminasi siang, tembakan Hunter, serta pemeriksaan pemenang.
- Pada malam hari, suara Werewolf dan Hunter dihitung per target. Pemain berikutnya pada tim yang sama melihat badge jumlah suara di pilihan target, bukan identitas pemilih.
- Seer dapat memeriksa pihak pemain; Doctor dan Guardian dapat melindungi pemain. Doctor dapat melindungi diri satu kali jika pengaturannya aktif.
- Hunter yang gugur dapat menembak pemain lain. Pengaturan menentukan apakah tembakan wajib atau boleh dilewati.
- Pengaturan permainan mencakup informasi rekan Werewolf/Hunter, pengungkapan role saat gugur, durasi minimum aksi malam, timer diskusi, perlindungan diri Doctor, dan text-to-speech.
- Antarmuka responsif dengan ikon SVG, animasi, dan dukungan reduced motion.

## Role

| Role | Tim | Aksi |
| --- | --- | --- |
| Werewolf | Serigala | Memilih target bersama pada malam hari. Rekan Werewolf dapat diketahui sesuai pengaturan. |
| Villager | Warga | Tidak memiliki aksi malam khusus; mengikuti diskusi dan pemungutan suara siang. |
| Seer | Warga | Memeriksa satu pemain setiap malam untuk mengetahui apakah pemain itu Werewolf. |
| Doctor | Warga | Melindungi satu pemain dari serangan malam. Target yang sama tidak dapat dipilih dua malam berturut-turut. Perlindungan diri, jika aktif, hanya dapat digunakan sekali per permainan. |
| Guardian | Warga | Melindungi satu pemain, termasuk dirinya sendiri, dari serangan malam. |
| Hunter | Warga | Menyiapkan target bidikan pada malam hari. Jika gugur, dapat menembak pemain lain; pengaturan dapat mewajibkan tembakan. |

Role opsional dapat diatur sebagai wajib, acak, atau nonaktif. Jumlah Werewolf dan Hunter dapat memakai preset atau nilai tetap. Pembagian role menjaga setidaknya satu Villager biasa dan membatasi jumlah Werewolf sesuai jumlah pemain.

## Aturan permainan

1. **Persiapan:** masukkan 4–16 pemain, pilih jumlah atau mode role, lalu sesuaikan pengaturan.
2. **Pembagian role:** setiap pemain melihat role secara privat saat gilirannya, lalu menyerahkan perangkat ke pemain berikutnya.
3. **Malam:** pemain menjalankan aksi sesuai role. Target Werewolf dan Hunter yang telah dipilih rekan ditandai dengan hitungan suara. Suara tidak mengungkap siapa yang memilih.
4. **Fajar:** suara Werewolf menentukan serangan; jika seri, target dipilih secara acak. Doctor atau Guardian dapat mencegah serangan jika melindungi target. Hunter yang gugur mendapat kesempatan menembak.
5. **Siang:** pemain berdiskusi, lalu memilih pemain untuk dieliminasi. Timer diskusi dapat dimatikan atau diatur.
6. **Kondisi menang:** Warga menang jika semua Werewolf gugur. Werewolf menang jika jumlah Werewolf yang masih hidup sama dengan atau lebih banyak dari pemain non-Werewolf yang masih hidup.

## Menjalankan proyek

Persyaratan: Node.js dan npm.

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`. Perintah pemeriksaan yang tersedia:

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm start
```

`npm start` menjalankan hasil build produksi; jalankan `npm run build` terlebih dahulu.

## Arsitektur

```text
src/
  app/                 Root layout, halaman utama, dan CSS global
  components/
    game/              Shell game, komponen UI, timer, dan router fase
    icons/             Ikon SVG buatan proyek
    phases/            Layar setup dan setiap fase permainan
  hooks/               Integrasi efek browser dan pergantian pemain
  lib/
    engine/            Reducer, aturan, role, timer, recovery, dan RNG
    platform/          TTS, wake lock, navigasi, privasi, haptics, narasi
    storage/           Penyimpanan browser dan migrasi state
  store/               Zustand store dan snapshot tampilan
  types/               Tipe state, role, fase, pengaturan, dan aksi
```

- `src/lib/engine/reducer.ts` mengatur transisi fase melalui reducer yang menerima waktu dan RNG sebagai dependensi agar dapat diuji deterministik.
- `src/lib/engine/night.ts` membentuk opsi aksi malam, menampilkan hitungan suara tim, dan menyimpan pilihan role.
- `src/lib/engine/dawn.ts` menyelesaikan serangan, perlindungan, suara seri, dan antrean Hunter.
- `src/lib/engine/win.ts` memeriksa kondisi kemenangan.
- `src/lib/storage/persist.ts` menyimpan game ke `localStorage` dengan debounce; `migrate.ts` memvalidasi dan memulihkan state tersimpan.
- Efek browser seperti narasi suara dan wake lock dipisahkan dari logika inti game.

## Penyimpanan dan privasi

Permainan disimpan di `localStorage` browser dengan kunci `werewolf_pass_and_play_v3_state`, lalu divalidasi dan dipulihkan saat aplikasi dibuka kembali. Data tidak disinkronkan antarperangkat. Karena ini pass-and-play satu perangkat, pemain perlu menjaga layar tetap privat saat berpindah giliran.

## Pengujian

Vitest menjalankan test aturan engine, migrasi penyimpanan, dan perilaku pemulihan. Jalankan `npm test` setelah perubahan aturan; jalankan juga lint, typecheck, dan build sebelum rilis.
