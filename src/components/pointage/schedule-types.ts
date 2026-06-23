import { PointageWorker } from '@/lib/types/daily-logs';
import { Worker } from '@/lib/types/projects';

export type ShiftStatus = PointageWorker['status'];

/** ثلاث حالات لونية موحّدة + فارغ */
export type ShiftVariant = 'present' | 'shift' | 'absent' | 'empty';

export interface DayShift {
  workerId: string;
  date: string;
  status?: ShiftStatus;
  checkIn?: string | null;
  checkOut?: string | null;
  hours: number;
  projectId?: string | null;
  projectName?: string;
  pointageId?: string;
  pointageWorkerId?: string;
}

export interface WorkerScheduleRow {
  worker: Worker;
  shifts: Record<string, DayShift | null>;
  weekTotalHours: number;
  presentDays: number;
}

export interface ShiftCellContext {
  worker: Worker;
  date: string;
  shift: DayShift | null;
}

export const STATUS_STYLES: Record<
  ShiftVariant,
  { bg: string; border: string; text: string; labelAr: string; labelFr: string }
> = {
  present: {
    bg: 'bg-emerald-100',
    border: 'border-emerald-400',
    text: 'text-emerald-800',
    labelAr: 'حاضر',
    labelFr: 'Présent',
  },
  shift: {
    bg: 'bg-yellow-100',
    border: 'border-yellow-400',
    text: 'text-yellow-900',
    labelAr: 'وردية',
    labelFr: 'Shift',
  },
  absent: {
    bg: 'bg-slate-200',
    border: 'border-slate-300',
    text: 'text-slate-600',
    labelAr: 'غائب',
    labelFr: 'Absent',
  },
  empty: {
    bg: 'bg-slate-50',
    border: 'border-dashed border-slate-200',
    text: 'text-slate-400',
    labelAr: '—',
    labelFr: '—',
  },
};

export function getShiftVariant(shift: DayShift | null, isToday: boolean): ShiftVariant {
  if (!shift?.status) return 'empty';
  if (shift.status === 'absent') return 'absent';
  if (shift.checkIn && !shift.checkOut && isToday) return 'shift';
  if (shift.status === 'half_day' && !shift.checkOut) return 'shift';
  return 'present';
}

export const WEEK_STARTS_ON = 6 as const; // Saturday
