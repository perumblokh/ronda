
import React, { useState, useEffect, useCallback } from 'react';
import AttendanceForm from './components/AttendanceForm';
import AttendanceRecap from './components/AttendanceRecap';
import { AttendanceRecord } from './types';

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

export default App;
