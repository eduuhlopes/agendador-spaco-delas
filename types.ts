export type AppointmentStatus = 'scheduled' | 'completed';

export interface Appointment {
  id: number;
  clientName: string;
  clientPhone: string;
  service: string;
  datetime: Date;
  value: number;
  status: AppointmentStatus;
  observations?: string;
}

export interface ModalInfo {
  isOpen: boolean;
  title: string;
  message: string;
}

export interface Client {
  name: string;
  phone: string;
  totalSpent: number;
  daysSinceLastVisit: number | null;
}