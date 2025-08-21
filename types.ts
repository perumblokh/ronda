
export enum AttendanceStatus {
  Hadir = 'Hadir',
  Ijin = 'Ijin',
  Alpa = 'Alpa',
}

export interface OfficerAttendance {
  name: string;
  status: AttendanceStatus;
}

export interface AttendanceRecord {
  id: string; // Unique ID for each record
  date: string; // ISO date string (YYYY-MM-DD)
  day: string; // Indonesian day name
  officers: OfficerAttendance[];
  notes: string;
  collection: number;
}
