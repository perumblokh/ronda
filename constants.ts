
// Day of the week index: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
export const JADWAL_RONDA: { [key: number]: string[] } = {
  1: ['Bp Aris H01', 'Bp Asep H03', 'Bp Iyeng H04', 'Bp Yayan', 'Bp Erik'], // Senin Malam Selasa
  2: ["Bp Ma'ruf", 'Bp Sunara', 'Bp Eka'], // Selasa Malam Rabu
  3: ['Bp Ujang Nur', 'Bp Lili', 'Bp Kosim', 'Bp Asep Sarboah'], // Rabu Malam Kamis
  4: ['Bp Didin', 'Bp Hamzah', 'Bp Amrin', 'Bp Aden', 'Bp Nanda'], // Kamis Malam Jumat
  5: ['Bp Ujang Guru', 'Bp Wawan', 'Bp Riyan', 'Bp Asep H62', 'Bp Irwan', 'Bp Carkaya', 'Bp Andre'], // Jumat Malam Sabtu
  6: ['Bp Imam Kurtubi', 'Bp Ayo', 'Bp Ajo', 'Bp Rizki'], // Sabtu Malam Minggu
  0: ['Bp Haji Udin', 'Bp Imam H47', 'Bp Ikhsan', 'Bp Rastam'], // Minggu Malam Senin
};

export const NAMA_HARI: { [key: number]: string } = {
  0: 'Minggu',
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
};
