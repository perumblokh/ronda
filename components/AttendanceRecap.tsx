
import React, { useState, useMemo, useRef } from 'react';
import { AttendanceRecord, AttendanceStatus } from '../types';

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

export default AttendanceRecap;
