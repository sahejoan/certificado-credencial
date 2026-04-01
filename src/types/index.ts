export type UserRole = 'admin' | 'editor' | 'viewer';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  createdAt: number;
}

export type Role = 
  | 'asistente' 
  | 'logistica' 
  | 'ponente' 
  | 'protocolo' 
  | 'tecnico_informatico';

export interface Authority {
  id: string;
  name: string;
  role: string;
  organization?: string;
  signatureUrl?: string;
  isSignatureActive?: boolean;
}

export interface Event {
  id: string;
  name: string;
  date: string;
  location: string;
  description: string;
  certificateTemplate: Template;
  certificateBackTemplate?: Template;
  credentialTemplate: Template;
  createdAt: number;
  createdBy: string;
  authorities?: string[]; // IDs of authorities assigned to this event
}

export interface Participant {
  id: string;
  eventId: string;
  name: string;
  email: string;
  idNumber: string;
  role: Role;
  registrationDate: number;
  attended: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface Template {
  backgroundUrl?: string;
  elements: TemplateElement[];
}

export interface TemplateElement {
  id: string;
  type: 'text' | 'image' | 'variable' | 'qr_code';
  content: string; // For variable: 'participant_name', 'participant_role', 'event_name', 'event_date', 'auth1_name', 'auth1_role', 'auth2_name', 'auth2_role', 'auth3_name', 'auth3_role'
  x: number;
  y: number;
  fontSize?: number;
  fontFamily?: string;
  fill?: string;
  width?: number;
  height?: number;
  align?: 'left' | 'center' | 'right';
  fontStyle?: 'normal' | 'bold' | 'italic';
}
