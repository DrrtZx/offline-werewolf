import type { QuizQuestion, RNG } from '@/types/game';
import { cryptoRandomInt } from './rng';

export const QUIZ_BANK: readonly QuizQuestion[] = [
  { q: 'Siapa pemain yang paling jago berakting bohong?', type: 'player' },
  { q: 'Siapa pemain yang paling gampang panik saat dituduh?', type: 'player' },
  { q: 'Siapa yang paling sering telat kalau ada janjian?', type: 'player' },
  { q: 'Siapa yang paling pendiam tapi mencurigakan?', type: 'player' },
  { q: 'Siapa yang bicaranya paling meyakinkan saat membela diri?', type: 'player' },
  { q: 'Siapa yang paling cocok dicurigai sebagai Serigala pertama?', type: 'player' },
  { q: 'Siapa yang tatapannya paling misterius malam ini?', type: 'player' },
  { q: 'Siapa yang biasanya paling cepat tereliminasi dalam permainan?', type: 'player' },
  { q: 'Siapa yang paling santai padahal situasinya lagi genting?', type: 'player' },
  { q: 'Siapa yang paling dermawan traktir teman-temannya?', type: 'player' },
  {
    q: 'Bumi ini sebenarnya berbentuk apa menurut instingmu?',
    type: 'custom',
    options: ['Bulat Pepat', 'Datar Sempurna', 'Donat Luar Angkasa', 'Tidak Peduli'],
  },
  {
    q: 'Kalau terjebak di pulau terpencil, pilih bawa apa?',
    type: 'custom',
    options: ['Pisau Lipat', 'Handphone Tanpa Sinyal', 'Selimut Hangat', 'Teman yang Cerewet'],
  },
  {
    q: 'Makanan apa yang paling nikmat saat cuaca dingin?',
    type: 'custom',
    options: ['Mie Kuah Pedas', 'Bakso Urat Panas', 'Soto Ayam Komplit', 'Gorengan Hangat'],
  },
  {
    q: 'Hewan apa yang paling menggambarkan sifat aslimu?',
    type: 'custom',
    options: ['Kucing Mageran', 'Serigala Misterius', 'Burung Elang Fokus', 'Lumba-lumba Ceria'],
  },
  {
    q: 'Kalau dapat kekuatan super, kamu pilih yang mana?',
    type: 'custom',
    options: ['Menghilang Tanpa Jejak', 'Membaca Pikiran Orang', 'Teleportasi Bebas', 'Bisa Terbang Tinggi'],
  },
  {
    q: 'Minuman favorit saat nongkrong santai bareng teman?',
    type: 'custom',
    options: ['Kopi Hitam Mantap', 'Es Teh Manis Segar', 'Matcha Latte Susu', 'Air Mineral Dingin'],
  },
  {
    q: 'Berapa lama kamu bisa bertahan tanpa internet sama sekali?',
    type: 'custom',
    options: ['Kurang dari 1 Jam', 'Satu Hari Penuh', 'Satu Minggu Santai', 'Selamanya Asal Kenyang'],
  },
  {
    q: 'Apa senjata paling ampuh saat sedang berdebat sengit?',
    type: 'custom',
    options: ['Data dan Fakta Logis', 'Nada Suara yang Tenang', 'Tatapan Mata Tajam', 'Tertawa Sinis'],
  },
  {
    q: 'Pilih waktu tidur yang paling ideal untukmu?',
    type: 'custom',
    options: ['Jam 9 Malam Rapih', 'Jam 11 Malam Wajar', 'Jam 2 Dini Hari', 'Subuh Menjelang Terang'],
  },
  {
    q: 'Apa hal pertama yang kamu lakukan saat bangun tidur?',
    type: 'custom',
    options: ['Cek Notifikasi HP', 'Minum Segelas Air', 'Tarik Selimut Lagi', 'Langsung ke Kamar Mandi'],
  },
  {
    q: 'Destinasi liburan mana yang paling kamu dambakan?',
    type: 'custom',
    options: ['Pantai Pasir Putih', 'Puncak Gunung Sejuk', 'Hutan Pinus Damai', 'Kota Metropolitan Ramai'],
  },
  {
    q: 'Warna aura malam ini menurut firasat batinmu?',
    type: 'custom',
    options: ['Merah Membara', 'Biru Kelam Misterius', 'Hitam Gulita Waspada', 'Ungu Magis'],
  },
  {
    q: 'Bagaimana gayamu saat menghadapi tuduhan warga?',
    type: 'custom',
    options: ['Bantah dengan Logika', 'Pura-pura Tertawa Santai', 'Tuduh Balik Penuduh', 'Diam Seribu Bahasa'],
  },
  {
    q: 'Taktik terbaik apa kalau berpapasan dengan Serigala?',
    type: 'custom',
    options: ['Lari Sekencang-kencangnya', 'Pura-pura Mati Kaku', 'Ajak Negosiasi Damai', 'Panjat Pohon Terdekat'],
  },
  {
    q: 'Status warga desa malam ini kira-kira seperti apa?',
    type: 'custom',
    options: ['Tidur Lelap Tanpa Beban', 'Waspada Suara Mencurigakan', 'Berdoa Semoga Aman', 'Pura-pura Tidur'],
  },
];

const FALLBACK_QUESTION: QuizQuestion = { q: 'Siapa pemain yang paling jago berakting bohong?', type: 'player' };

/** Seed pertanyaan: `(round*17 + turnIndex) % QUIZ_BANK.length` */
export function getQuizForTurn(round: number, turnIndex: number): QuizQuestion {
  const seed = (round * 17 + turnIndex) % QUIZ_BANK.length;
  return QUIZ_BANK[seed] ?? FALLBACK_QUESTION;
}

export const FAKE_STATS: readonly number[] = [74, 82, 69, 91, 78, 85];

export function pickFakeStat(rng: RNG = cryptoRandomInt): number {
  return FAKE_STATS[rng(0, FAKE_STATS.length - 1)] ?? 74;
}
