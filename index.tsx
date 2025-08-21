import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';

// --- From types.ts ---
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
  id: string; // Unique ID for each record
  date: string; // ISO date string (YYYY-MM-DD)
  day: string; // Indonesian day name
  officers: OfficerAttendance[];
  notes: string;
  collection: number;
}


// --- From constants.ts ---
const JADWAL_RONDA: { [key: number]: string[] } = {
  1: ['Bp Aris H01', 'Bp Asep H03', 'Bp Iyeng H04', 'Bp Yayan', 'Bp Erik'], // Senin Malam Selasa
  2: ["Bp Ma'ruf", 'Bp Sunara', 'Bp Eka'], // Selasa Malam Rabu
  3: ['Bp Ujang Nur', 'Bp Lili', 'Bp Kosim', 'Bp Asep Sarboah'], // Rabu Malam Kamis
  4: ['Bp Didin', 'Bp Hamzah', 'Bp Amrin', 'Bp Aden', 'Bp Nanda'], // Kamis Malam Jumat
  5: ['Bp Ujang Guru', 'Bp Wawan', 'Bp Riyan', 'Bp Asep H62', 'Bp Irwan', 'Bp Carkaya', 'Bp Andre'], // Jumat Malam Sabtu
  6: ['Bp Imam Kurtubi', 'Bp Ayo', 'Bp Ajo', 'Bp Rizki'], // Sabtu Malam Minggu
  0: ['Bp Haji Udin', 'Bp Imam H47', 'Bp Ikhsan', 'Bp Rastam'], // Minggu Malam Senin
};

const NAMA_HARI: { [key: number]: string } = {
  0: 'Minggu',
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
};


// --- From components/AttendanceForm.tsx ---
interface AttendanceFormProps {
  addRecord: (record: AttendanceRecord) => void;
  existingRecords: AttendanceRecord[];
}

const AttendanceForm: React.FC<AttendanceFormProps> = ({ addRecord, existingRecords }) => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const todayDateString = today.toISOString().split('T')[0];

  const officersOnDuty = useMemo(() => JADWAL_RONDA[dayOfWeek] || [], [dayOfWeek]);
  
  const initialStatuses = useMemo(() => {
    return officersOnDuty.reduce((acc, name) => {
      acc[name] = AttendanceStatus.Hadir;
      return acc;
    }, {} as { [key: string]: AttendanceStatus });
  }, [officersOnDuty]);

  const [statuses, setStatuses] = useState<{ [key: string]: AttendanceStatus }>(initialStatuses);
  const [notes, setNotes] = useState('');
  const [collection, setCollection] = useState('');

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
  
  const handleSubmit = useCallback((e: React.FormEvent) => {
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

    addRecord(newRecord);

    setStatuses(initialStatuses);
    setNotes('');
    setCollection('');
    alert('Data absensi berhasil disimpan!');
  }, [addRecord, collection, initialStatuses, isAlreadySubmitted, notes, officersOnDuty, statuses, dayOfWeek, todayDateString]);

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
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-3 focus:ring-teal-500 focus:border-teal-500 transition"
              placeholder="Contoh: Bp Yayan digantikan oleh Bp Budi"
            />
          </div>
          <div>
            <label htmlFor="collection" className="block text-sm font-medium text-gray-300 mb-2">Hasil Prelek</label>
            <div className="relative">
               <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">Rp</span>
               <input
                type="text"
                id="collection"
                value={collection ? parseInt(collection, 10).toLocaleString('id-ID') : ''}
                onChange={handleCollectionChange}
                className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-3 pl-10 focus:ring-teal-500 focus:border-teal-500 transition"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:shadow-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-teal-500">
            Simpan Absensi
          </button>
        </div>
      </form>
    </div>
  );
};


// --- From components/AttendanceRecap.tsx ---
interface AttendanceRecapProps {
  records: AttendanceRecord[];
  setRecords: (records: AttendanceRecord[]) => void;
}

const AttendanceRecap: React.FC<AttendanceRecapProps> = ({ records, setRecords }) => {
  const [filterDate, setFilterDate] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredRecords = useMemo(() => {
    if (!filterDate) {
      return [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return records.filter(record => record.date === filterDate)
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, filterDate]);

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.Hadir:
        return 'bg-green-500 text-green-900';
      case AttendanceStatus.Ijin:
        return 'bg-yellow-500 text-yellow-900';
      case AttendanceStatus.Alpa:
        return 'bg-red-500 text-red-900';
      default:
        return 'bg-gray-500 text-gray-900';
    }
  };
  
  const handleDownload = () => {
    const dataStr = JSON.stringify(records, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'data_ronda.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };
  
  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result;
          if (typeof text === 'string') {
            const parsedData = JSON.parse(text);
            if(Array.isArray(parsedData)) {
              // Basic validation can be added here
              setRecords(parsedData);
              alert('Data berhasil diimpor!');
            } else {
              alert('Format file JSON tidak valid.');
            }
          }
        } catch (error) {
          console.error("Error parsing JSON file", error);
          alert('Gagal membaca file JSON. Pastikan formatnya benar.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto mt-12">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-teal-400">Rekap Absensi</h2>
        <div className="flex items-center gap-2">
            <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"
            />
            {filterDate && (
                <button onClick={() => setFilterDate('')} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-3 rounded-md">
                    Reset
                </button>
            )}
        </div>
      </div>
      
      <div className="flex justify-center sm:justify-end gap-4 mb-6">
        <input type="file" accept=".json" onChange={handleUpload} className="hidden" ref={fileInputRef} />
        <button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition">
            Impor data.json
        </button>
        <button onClick={handleDownload} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition">
            Unduh data.json
        </button>
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
                    <p className="text-lg font-bold text-teal-400">{record.collection.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}</p>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-400">Petugas:</p>
                <div className="flex flex-wrap gap-2 mt-2">
                    {record.officers.map(officer => (
                        <span key={officer.name} className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(officer.status)}`}>
                            {officer.name}
                        </span>
                    ))}
                </div>
              </div>

              {record.notes && (
                <div className="bg-gray-800 p-3 rounded">
                  <p className="text-sm font-medium text-gray-400">Keterangan:</p>
                  <p className="text-gray-300 text-sm mt-1 whitespace-pre-wrap">{record.notes}</p>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-400">Tidak ada data untuk tanggal yang dipilih.</p>
          </div>
        )}
      </div>
    </div>
  );
};


// --- From App.tsx ---
const App: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>(() => {
    try {
      const savedRecords = localStorage.getItem('attendanceRecords');
      return savedRecords ? JSON.parse(savedRecords) : [];
    } catch (error) {
      console.error('Error reading records from localStorage', error);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('attendanceRecords', JSON.stringify(records));
    } catch (error) {
      console.error('Error saving records to localStorage', error);
    }
  }, [records]);

  const addRecord = useCallback((newRecord: AttendanceRecord) => {
    setRecords(prevRecords => [...prevRecords, newRecord]);
  }, []);

  const handleSetRecords = useCallback((newRecords: AttendanceRecord[]) => {
      setRecords(newRecords);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans p-4 sm:p-8">
      <main className="container mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-teal-400">JADWAL RONDA</h1>
          <p className="text-lg sm:text-xl text-gray-300 mt-2">BLOK H PERUM TANJUNG RESIDENCE</p>
        </header>

        <AttendanceForm addRecord={addRecord} existingRecords={records} />

        <AttendanceRecap records={records} setRecords={handleSetRecords} />
        
        <footer className="text-center mt-12 text-gray-500 text-sm">
          <p>Dibuat untuk mempermudah pencatatan ronda Blok H.</p>
        </footer>
      </main>
    </div>
  );
};

// --- Original index.tsx content ---
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
