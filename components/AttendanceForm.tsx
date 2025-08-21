
import React, { useState, useMemo, useCallback } from 'react';
import { AttendanceRecord, AttendanceStatus, OfficerAttendance } from '../types';
import { JADWAL_RONDA, NAMA_HARI } from '../constants';

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

  const formatCurrency = (value: string) => {
    if (!value) return '';
    const numberValue = parseInt(value.replace(/[^0-9]/g, ''), 10);
    if (isNaN(numberValue)) return '';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(numberValue);
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
                  {(Object.keys(AttendanceStatus) as Array<keyof typeof AttendanceStatus>).map(statusKey => (
                    <label key={statusKey} className="flex items-center space-x-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name={`status-${name}`}
                        value={AttendanceStatus[statusKey]}
                        checked={statuses[name] === AttendanceStatus[statusKey]}
                        onChange={() => handleStatusChange(name, AttendanceStatus[statusKey])}
                        className="form-radio h-4 w-4 text-teal-500 bg-gray-700 border-gray-600 focus:ring-teal-500"
                      />
                      <span>{AttendanceStatus[statusKey]}</span>
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

export default AttendanceForm;
