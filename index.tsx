import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';

// --- TYPES ---
enum AttendanceStatus {
  Hadir = 'Hadir',
  Ijin = 'Ijin',
  Alpa = 'Alpa',
}

interface OfficerAttendance {
  name: string;
  status: AttendanceStatus;
}

interface AttendanceRecord {
  id: string;
  date: string;
  day: string;
  officers: OfficerAttendance[];
  notes: string;
  collection: number;
}

interface Schedule {
  [key: number]: string[];
}

interface GithubSettings {
  user: string;
  repo: string;
  token: string;
}

// --- CONSTANTS ---
const NAMA_HARI: { [key: number]: string } = {
  0: 'Minggu', 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu',
};

const DEFAULT_JADWAL_RONDA: Schedule = {
  1: ['Bp Aris H01', 'Bp Asep H03', 'Bp Iyeng H04', 'Bp Yayan', 'Bp Erik'],
  2: ["Bp Ma'ruf", 'Bp Sunara', 'Bp Eka'],
  3: ['Bp Ujang Nur', 'Bp Lili', 'Bp Kosim', 'Bp Asep Sarboah'],
  4: ['Bp Didin', 'Bp Hamzah', 'Bp Amrin', 'Bp Aden', 'Bp Nanda'],
  5: ['Bp Ujang Guru', 'Bp Wawan', 'Bp Riyan', 'Bp Asep H62', 'Bp Irwan', 'Bp Carkaya', 'Bp Andre'],
  6: ['Bp Imam Kurtubi', 'Bp Ayo', 'Bp Ajo', 'Bp Rizki'],
  0: ['Bp Haji Udin', 'Bp Imam H47', 'Bp Ikhsan', 'Bp Rastam'],
};

// --- GITHUB API HELPERS ---
const GITHUB_API_BASE = 'https://api.github.com';

const getFile = async (settings: GithubSettings, path: string) => {
  const { user, repo, token } = settings;
  const response = await fetch(`${GITHUB_API_BASE}/repos/${user}/${repo}/contents/${path}`, {
    headers: { Authorization: `token ${token}` },
  });
  if (response.status === 404) return null; // File not found
  if (!response.ok) throw new Error(`Gagal mengambil file ${path}: ${response.statusText}`);
  const data = await response.json();
  
  // Guard against undefined content (e.g., for large files) and empty content
  const decodedContent = atob(data.content || '');
  if (!decodedContent) {
    const defaultContent = path.endsWith('data.json') ? [] : DEFAULT_JADWAL_RONDA;
    return { content: defaultContent, sha: data.sha };
  }
  
  return { content: JSON.parse(decodedContent), sha: data.sha };
};

const updateFile = async (settings: GithubSettings, path: string, content: any, sha?: string) => {
  const { user, repo, token } = settings;
  const contentBase64 = btoa(JSON.stringify(content, null, 2));
  const body = {
    message: `[WebApp] Update ${path}`,
    content: contentBase64,
    ...(sha && { sha }),
  };
  const response = await fetch(`${GITHUB_API_BASE}/repos/${user}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Gagal menyimpan file ${path}: ${response.statusText}`);
  return await response.json();
};

const showSpinner = (show: boolean) => {
    const spinner = document.getElementById('spinner');
    if (spinner) spinner.style.display = show ? 'block' : 'none';
};

// --- COMPONENTS ---

const SettingsModal: React.FC<{
  onSave: (settings: GithubSettings) => void;
  onClose: () => void;
  currentSettings: GithubSettings | null;
}> = ({ onSave, onClose, currentSettings }) => {
  const [settings, setSettings] = useState<GithubSettings>(
    currentSettings || { user: '', repo: '', token: '' }
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    if (!settings.user || !settings.repo || !settings.token) {
      alert('Semua kolom harus diisi.');
      return;
    }
    onSave(settings);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-4 text-teal-400">Pengaturan GitHub</h2>
        <p className="text-gray-400 mb-6">
          Masukkan detail repositori GitHub Anda untuk menyimpan data absensi dan jadwal.
          <a href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens" target="_blank" rel="noopener noreferrer" className="text-teal-500 hover:underline ml-1">
            Cara membuat token (PAT).
          </a>
        </p>
        <div className="space-y-4">
          <input name="user" value={settings.user} onChange={handleChange} placeholder="Username GitHub" className="w-full bg-gray-700 p-3 rounded" />
          <input name="repo" value={settings.repo} onChange={handleChange} placeholder="Nama Repositori" className="w-full bg-gray-700 p-3 rounded" />
          <input name="token" type="password" value={settings.token} onChange={handleChange} placeholder="Personal Access Token" className="w-full bg-gray-700 p-3 rounded" />
        </div>
        <div className="flex justify-end gap-4 mt-8">
          <button onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded">Batal</button>
          <button onClick={handleSave} className="py-2 px-6 bg-teal-600 hover:bg-teal-700 rounded">Simpan</button>
        </div>
      </div>
    </div>
  );
};


const ScheduleEditorModal: React.FC<{
  schedule: Schedule;
  onSave: (newSchedule: Schedule) => Promise<void>;
  onClose: () => void;
}> = ({ schedule: initialSchedule, onSave, onClose }) => {
    const [schedule, setSchedule] = useState<Schedule>(JSON.parse(JSON.stringify(initialSchedule)));
    const [newOfficerName, setNewOfficerName] = useState<{ [key: number]: string }>({});

    const addOfficer = (dayIndex: number) => {
        const name = newOfficerName[dayIndex]?.trim();
        if (name && !schedule[dayIndex].includes(name)) {
            const newSchedule = { ...schedule };
            newSchedule[dayIndex] = [...newSchedule[dayIndex], name];
            setSchedule(newSchedule);
            setNewOfficerName({ ...newOfficerName, [dayIndex]: '' });
        }
    };

    const removeOfficer = (dayIndex: number, name: string) => {
        const newSchedule = { ...schedule };
        newSchedule[dayIndex] = newSchedule[dayIndex].filter(n => n !== name);
        setSchedule(newSchedule);
    };

    const handleSave = async () => {
        await onSave(schedule);
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-40 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6 text-teal-400">Ubah Jadwal Ronda</h2>
                <div className="space-y-6">
                    {Object.keys(NAMA_HARI).map(dayKey => {
                        const dayIndex = parseInt(dayKey, 10);
                        return (
                            <div key={dayIndex}>
                                <h3 className="text-lg font-semibold text-gray-300 border-b border-gray-600 pb-2 mb-3">{`${NAMA_HARI[dayIndex]} malam ${NAMA_HARI[(dayIndex + 1) % 7]}`}</h3>
                                <ul className="space-y-2 mb-3">
                                    {schedule[dayIndex]?.map(name => (
                                        <li key={name} className="flex justify-between items-center bg-gray-700 p-2 rounded">
                                            <span>{name}</span>
                                            <button onClick={() => removeOfficer(dayIndex, name)} className="text-red-400 hover:text-red-300 font-bold">✕</button>
                                        </li>
                                    ))}
                                </ul>
                                <div className="flex gap-2">
                                    <input
                                        value={newOfficerName[dayIndex] || ''}
                                        onChange={(e) => setNewOfficerName({ ...newOfficerName, [dayIndex]: e.target.value })}
                                        placeholder="Nama Petugas Baru"
                                        className="flex-grow bg-gray-600 p-2 rounded"
                                    />
                                    <button onClick={() => addOfficer(dayIndex)} className="px-4 bg-blue-600 hover:bg-blue-500 rounded text-sm font-semibold">Tambah</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="flex justify-end gap-4 mt-8">
                    <button onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded">Batal</button>
                    <button onClick={handleSave} className="py-2 px-6 bg-teal-600 hover:bg-teal-700 rounded">Simpan Perubahan</button>
                </div>
            </div>
        </div>
    );
};


const AttendanceForm: React.FC<{
  addRecord: (record: AttendanceRecord) => Promise<void>;
  existingRecords: AttendanceRecord[];
  schedule: Schedule;
}> = ({ addRecord, existingRecords, schedule }) => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const todayDateString = today.toISOString().split('T')[0];

  const officersOnDuty = useMemo(() => schedule[dayOfWeek] || [], [schedule, dayOfWeek]);
  
  const initialStatuses = useMemo(() => {
    return officersOnDuty.reduce((acc, name) => {
      acc[name] = AttendanceStatus.Hadir;
      return acc;
    }, {} as { [key: string]: AttendanceStatus });
  }, [officersOnDuty]);

  const [statuses, setStatuses] = useState<{ [key: string]: AttendanceStatus }>(initialStatuses);
  const [notes, setNotes] = useState('');
  const [collection, setCollection] = useState('');

  useEffect(() => {
    setStatuses(initialStatuses);
  }, [initialStatuses]);

  const isAlreadySubmitted = useMemo(() => {
    return existingRecords.some(record => record.date === todayDateString);
  }, [existingRecords, todayDateString]);
  
  const handleStatusChange = (name: string, status: AttendanceStatus) => {
    setStatuses(prev => ({ ...prev, [name]: status }));
  };
  
  const handleCollectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    setCollection(rawValue);
  };
  
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAlreadySubmitted) {
      alert('Absensi untuk hari ini sudah diisi.');
      return;
    }

    const officerData: OfficerAttendance[] = officersOnDuty.map(name => ({
      name,
      status: statuses[name] || AttendanceStatus.Alpa,
    }));
    
    const newRecord: AttendanceRecord = {
      id: new Date().toISOString(),
      date: todayDateString,
      day: `${NAMA_HARI[dayOfWeek]} malam ${NAMA_HARI[(dayOfWeek + 1) % 7]}`,
      officers: officerData,
      notes,
      collection: parseInt(collection, 10) || 0,
    };

    await addRecord(newRecord);

    setStatuses(initialStatuses);
    setNotes('');
    setCollection('');
  }, [addRecord, collection, initialStatuses, isAlreadySubmitted, notes, officersOnDuty, statuses, dayOfWeek, todayDateString]);

  if (!officersOnDuty.length) {
    return (
       <div className="bg-gray-800 p-6 rounded-xl shadow-lg text-center">
        <h2 className="text-xl font-bold text-yellow-400 mb-2">Jadwal Belum Diatur</h2>
        <p className="text-gray-300">Jadwal ronda untuk hari ini belum diatur. Silakan ubah jadwal melalui tombol di atas.</p>
      </div>
    );
  }

  if (isAlreadySubmitted) {
    return (
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg text-center">
        <h2 className="text-2xl font-bold text-teal-400 mb-2">Terima Kasih!</h2>
        <p className="text-gray-300">Absensi untuk jadwal hari ini telah diisi.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-center mb-2 text-teal-400">Form Absensi Ronda</h2>
      <p className="text-center text-gray-400 mb-6">{`Jadwal: ${NAMA_HARI[dayOfWeek]} Malam ${NAMA_HARI[(dayOfWeek + 1) % 7]}`}</p>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold mb-4 border-b border-gray-600 pb-2">Daftar Petugas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {officersOnDuty.map(name => (
              <div key={name} className="bg-gray-700/50 p-4 rounded-lg">
                <p className="font-medium text-gray-200 mb-2">{name}</p>
                <div className="flex space-x-4">
                  {(Object.values(AttendanceStatus)).map(statusValue => (
                    <label key={statusValue} className="flex items-center space-x-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name={`status-${name}`}
                        value={statusValue}
                        checked={statuses[name] === statusValue}
                        onChange={() => handleStatusChange(name, statusValue)}
                        className="form-radio h-4 w-4 text-teal-500 bg-gray-700 border-gray-600 focus:ring-teal-500"
                      />
                      <span>{statusValue}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-2">Keterangan / Petugas Pengganti</label>
            <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 focus:ring-teal-500" placeholder="Contoh: Bp Yayan digantikan oleh Bp Budi" />
          </div>
          <div>
            <label htmlFor="collection" className="block text-sm font-medium text-gray-300 mb-2">Hasil Prelek</label>
            <div className="relative">
               <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">Rp</span>
               <input type="text" id="collection" value={collection ? parseInt(collection, 10).toLocaleString('id-ID') : ''} onChange={handleCollectionChange} className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 pl-10 focus:ring-teal-500" placeholder="0" />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-transform transform hover:scale-105">Simpan Absensi</button>
        </div>
      </form>
    </div>
  );
};


const AttendanceRecap: React.FC<{ records: AttendanceRecord[] }> = ({ records }) => {
  const [filterDate, setFilterDate] = useState('');

  const filteredRecords = useMemo(() => {
    const sortedRecords = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (!filterDate) return sortedRecords;
    return sortedRecords.filter(record => record.date === filterDate);
  }, [records, filterDate]);

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.Hadir: return 'bg-green-500 text-green-900';
      case AttendanceStatus.Ijin: return 'bg-yellow-500 text-yellow-900';
      case AttendanceStatus.Alpa: return 'bg-red-500 text-red-900';
      default: return 'bg-gray-500 text-gray-900';
    }
  };

  return (
    <div className="bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto mt-12">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-teal-400">Rekap Absensi</h2>
        <div className="flex items-center gap-2">
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-gray-700 border-gray-600 rounded-md p-2"/>
            {filterDate && <button onClick={() => setFilterDate('')} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-3 rounded-md">Reset</button>}
        </div>
      </div>

      <div className="space-y-6">
        {filteredRecords.length > 0 ? (
          filteredRecords.map(record => (
            <div key={record.id} className="bg-gray-700/50 p-6 rounded-lg">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-200">{record.day}</h3>
                  <p className="text-sm text-gray-400">{new Date(record.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-400">Hasil Prelek</p>
                    <p className="text-lg font-bold text-teal-400">{record.collection.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</p>
                </div>
              </div>
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-400">Petugas:</p>
                <div className="flex flex-wrap gap-2 mt-2">
                    {record.officers.map(officer => (<span key={officer.name} className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(officer.status)}`}>{officer.name}</span>))}
                </div>
              </div>
              {record.notes && (<div className="bg-gray-800 p-3 rounded"><p className="text-sm font-medium text-gray-400">Keterangan:</p><p className="text-gray-300 text-sm mt-1 whitespace-pre-wrap">{record.notes}</p></div>)}
            </div>
          ))
        ) : (
          <div className="text-center py-10"><p className="text-gray-400">Tidak ada data untuk tanggal yang dipilih.</p></div>
        )}
      </div>
    </div>
  );
};


// --- APP ---
const App: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [schedule, setSchedule] = useState<Schedule>(DEFAULT_JADWAL_RONDA);
  const [githubSettings, setGithubSettings] = useState<GithubSettings | null>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const recordsSha = useRef<string | undefined>();
  const scheduleSha = useRef<string | undefined>();

  useEffect(() => {
    const savedSettings = localStorage.getItem('githubSettings');
    if (savedSettings) {
      setGithubSettings(JSON.parse(savedSettings));
    } else {
      setShowSettings(true);
    }
  }, []);

  const loadDataFromGithub = useCallback(async (settings: GithubSettings) => {
    if (!settings.token) return;
    showSpinner(true);
    try {
      // Load schedule
      let scheduleData = await getFile(settings, 'schedule.json');
      if (!scheduleData) {
        // Create if not exists
        await updateFile(settings, 'schedule.json', DEFAULT_JADWAL_RONDA);
        scheduleData = { content: DEFAULT_JADWAL_RONDA, sha: undefined };
      }
      setSchedule(scheduleData.content);
      scheduleSha.current = scheduleData.sha;
      
      // Load records
      let recordsData = await getFile(settings, 'data.json');
      if (!recordsData) {
        await updateFile(settings, 'data.json', []);
        recordsData = { content: [], sha: undefined };
      }
      setRecords(recordsData.content);
      recordsSha.current = recordsData.sha;

    } catch (error) {
      alert(`Gagal memuat data dari GitHub: ${error instanceof Error ? error.message : String(error)}`);
      // Could be bad token, clear it to prompt user again
      localStorage.removeItem('githubSettings');
      setGithubSettings(null);
      setShowSettings(true);
    } finally {
      showSpinner(false);
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (githubSettings) {
      loadDataFromGithub(githubSettings);
    }
  }, [githubSettings, loadDataFromGithub]);

  const handleSaveSettings = (settings: GithubSettings) => {
    localStorage.setItem('githubSettings', JSON.stringify(settings));
    setGithubSettings(settings);
    setShowSettings(false);
    setIsInitialized(false); // Trigger re-initialization
  };
  
  const addRecord = async (newRecord: AttendanceRecord) => {
    if (!githubSettings) return;
    showSpinner(true);
    try {
      const updatedRecords = [...records, newRecord];
      const result = await updateFile(githubSettings, 'data.json', updatedRecords, recordsSha.current);
      recordsSha.current = result.content.sha;
      setRecords(updatedRecords);
      alert('Data absensi berhasil disimpan!');
    } catch (error) {
      alert(`Gagal menyimpan absensi: ${error instanceof Error ? error.message : String(error)}`);
      // Reload data to resolve potential sync conflicts
      await loadDataFromGithub(githubSettings);
    } finally {
      showSpinner(false);
    }
  };

  const handleSaveSchedule = async (newSchedule: Schedule) => {
     if (!githubSettings) return;
     showSpinner(true);
     try {
        const result = await updateFile(githubSettings, 'schedule.json', newSchedule, scheduleSha.current);
        scheduleSha.current = result.content.sha;
        setSchedule(newSchedule);
        setShowScheduleEditor(false);
        alert('Jadwal berhasil diperbarui!');
     } catch(error) {
        alert(`Gagal menyimpan jadwal: ${error instanceof Error ? error.message : String(error)}`);
        await loadDataFromGithub(githubSettings);
     } finally {
        showSpinner(false);
     }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans p-4 sm:p-8">
      {showSettings && <SettingsModal onSave={handleSaveSettings} onClose={() => githubSettings && setShowSettings(false)} currentSettings={githubSettings} />}
      {showScheduleEditor && <ScheduleEditorModal schedule={schedule} onSave={handleSaveSchedule} onClose={() => setShowScheduleEditor(false)} />}
      
      <main className="container mx-auto">
        <header className="text-center mb-10 relative">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-teal-400">JADWAL RONDA</h1>
          <p className="text-lg sm:text-xl text-gray-300 mt-2">BLOK H PERUM TANJUNG RESIDENCE</p>
          {isInitialized && (
            <div className="absolute top-0 right-0 flex gap-2">
                <button onClick={() => setShowScheduleEditor(true)} title="Ubah Jadwal" className="bg-gray-700 hover:bg-gray-600 p-2 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button onClick={() => setShowSettings(true)} title="Pengaturan GitHub" className="bg-gray-700 hover:bg-gray-600 p-2 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>
            </div>
          )}
        </header>

        {isInitialized ? (
            <>
                <AttendanceForm addRecord={addRecord} existingRecords={records} schedule={schedule}/>
                <AttendanceRecap records={records} />
            </>
        ) : (
            <div className="text-center text-gray-400 mt-20">
                <p>{githubSettings ? 'Memuat data dari GitHub...' : 'Harap konfigurasikan pengaturan GitHub untuk memulai.'}</p>
            </div>
        )}
        
        <footer className="text-center mt-12 text-gray-500 text-sm">
          <p>Dibuat untuk mempermudah pencatatan ronda Blok H.</p>
        </footer>
      </main>
    </div>
  );
};

// --- RENDER ---
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element to mount to");

const root = ReactDOM.createRoot(rootElement);
root.render(<React.StrictMode><App /></React.StrictMode>);
