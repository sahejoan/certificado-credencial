import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Layout from './components/Layout';
import EventList from './components/EventList';
import ParticipantList from './components/ParticipantList';
import DesignEditor from './components/DesignEditor';
import AuthorityList from './components/AuthorityList';
import UserManagement from './components/UserManagement';
import Modal from './components/Modal';
import CertificatePreview from './components/CertificatePreview';
import CredentialPreview from './components/CredentialPreview';
import VerificationPage from './components/VerificationPage';
import BulkPrintManager from './components/BulkPrintManager';
import { Event, Participant, Role, Template, Authority, User, UserRole } from './types';
import { 
  Shield, 
  Award, 
  Mail, 
  Lock, 
  User as UserIcon, 
  ArrowRight, 
  Users, 
  Layout as LayoutIcon,
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  X,
  XCircle
} from 'lucide-react';
import { auth, db } from './firebase';
import { 
  onSnapshot, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocFromServer,
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  User as FirebaseUser
} from 'firebase/auth';
import { cn } from './lib/utils';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  toast.error('Error de base de datos: ' + (error instanceof Error ? error.message : 'Error desconocido'));
  throw new Error(JSON.stringify(errInfo));
}

const INITIAL_AUTHORITIES: Authority[] = [
  { id: '1', name: 'Dr. Carlos Mendoza', role: 'Director IMPM', signatureUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Jon_Kirsch%27s_Signature.png' },
  { id: '2', name: 'Dra. María Silva', role: 'Coordinadora Académica', signatureUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Signature_of_John_Hancock.svg/1200px-Signature_of_John_Hancock.svg.png' },
  { id: '3', name: 'Ing. Roberto García', role: 'Rector' },
  { id: '4', name: 'Dra. Ana López', role: 'Decana' },
  { id: '5', name: 'Prof. Luis Torres', role: 'Jefe de Departamento' },
];

const DEFAULT_CERTIFICATE_TEMPLATE: Template = {
  backgroundUrl: 'https://picsum.photos/seed/academic_border/1920/1080',
  elements: [
    { id: 'header1', type: 'text', content: 'REPÚBLICA BOLIVARIANA DE VENEZUELA', x: 0, y: 40, fontSize: 14, fill: '#1e293b', align: 'center', width: 800, fontFamily: 'Inter' } as any,
    { id: 'header2', type: 'text', content: 'UNIVERSIDAD PEDAGÓGICA EXPERIMENTAL LIBERTADOR', x: 0, y: 60, fontSize: 16, fill: '#1e293b', align: 'center', width: 800, fontFamily: 'Inter', fontStyle: 'bold' } as any,
    { id: 'header3', type: 'text', content: 'INSTITUTO DE MEJORAMIENTO PROFESIONAL DEL MAGISTERIO', x: 0, y: 80, fontSize: 14, fill: '#1e293b', align: 'center', width: 800, fontFamily: 'Inter' } as any,
    { id: 'title', type: 'text', content: 'CERTIFICADO', x: 0, y: 140, fontSize: 48, fill: '#1e1b4b', align: 'center', width: 800, fontFamily: 'Inter', fontStyle: 'bold' } as any,
    { id: 'text1', type: 'text', content: 'Se otorga el presente a:', x: 0, y: 210, fontSize: 18, fill: '#475569', align: 'center', width: 800, fontFamily: 'Inter' } as any,
    { id: 'name', type: 'variable', content: 'participant_name', x: 0, y: 250, fontSize: 36, fill: '#1d4ed8', align: 'center', width: 800, fontFamily: 'Inter', fontStyle: 'bold' } as any,
    { id: 'id_number', type: 'variable', content: 'participant_id_number', x: 0, y: 290, fontSize: 18, fill: '#475569', align: 'center', width: 800, fontFamily: 'Inter' } as any,
    { id: 'text2', type: 'text', content: 'Por su valiosa participación en el evento académico:', x: 0, y: 310, fontSize: 16, fill: '#475569', align: 'center', width: 800, fontFamily: 'Inter' } as any,
    { id: 'event', type: 'variable', content: 'event_name', x: 50, y: 340, fontSize: 22, fill: '#1e293b', align: 'center', width: 700, fontFamily: 'Inter', fontStyle: 'bold' } as any,
    { id: 'date_text', type: 'text', content: 'Realizado en la fecha:', x: 0, y: 390, fontSize: 14, fill: '#64748b', align: 'center', width: 800, fontFamily: 'Inter' } as any,
    { id: 'date', type: 'variable', content: 'event_date', x: 0, y: 410, fontSize: 16, fill: '#1e293b', align: 'center', width: 800, fontFamily: 'Inter' } as any,
    { id: 'qr', type: 'qr_code', content: 'verification_url', x: 680, y: 380, width: 80, height: 80, fill: '#1e293b' } as any,
    { id: 'sig1', type: 'text', content: '__________________________', x: 50, y: 480, fontSize: 14, fill: '#94a3b8', align: 'center', width: 220 } as any,
    { id: 'sig1_name', type: 'variable', content: 'auth1_name', x: 50, y: 500, fontSize: 12, fill: '#1e293b', align: 'center', width: 220, fontFamily: 'Inter', fontStyle: 'bold' } as any,
    { id: 'sig1_role', type: 'variable', content: 'auth1_role', x: 50, y: 515, fontSize: 10, fill: '#475569', align: 'center', width: 220, fontFamily: 'Inter' } as any,
    { id: 'sig2', type: 'text', content: '__________________________', x: 290, y: 480, fontSize: 14, fill: '#94a3b8', align: 'center', width: 220 } as any,
    { id: 'sig2_name', type: 'variable', content: 'auth2_name', x: 290, y: 500, fontSize: 12, fill: '#1e293b', align: 'center', width: 220, fontFamily: 'Inter', fontStyle: 'bold' } as any,
    { id: 'sig2_role', type: 'variable', content: 'auth2_role', x: 290, y: 515, fontSize: 10, fill: '#475569', align: 'center', width: 220, fontFamily: 'Inter' } as any,
    { id: 'sig3', type: 'text', content: '__________________________', x: 530, y: 480, fontSize: 14, fill: '#94a3b8', align: 'center', width: 220 } as any,
    { id: 'sig3_name', type: 'variable', content: 'auth3_name', x: 530, y: 500, fontSize: 12, fill: '#1e293b', align: 'center', width: 220, fontFamily: 'Inter', fontStyle: 'bold' } as any,
    { id: 'sig3_role', type: 'variable', content: 'auth3_role', x: 530, y: 515, fontSize: 10, fill: '#475569', align: 'center', width: 220, fontFamily: 'Inter' } as any,
  ]
};

const DEFAULT_CREDENTIAL_TEMPLATE: Template = {
  backgroundUrl: 'https://picsum.photos/seed/id_card/400/600',
  elements: [
    { id: 'c1', type: 'text', content: 'CREDENCIAL', x: 0, y: 40, fontSize: 24, fill: '#ffffff', align: 'center', width: 400, fontFamily: 'Inter', fontStyle: 'bold' } as any,
    { id: 'c2', type: 'variable', content: 'participant_name', x: 20, y: 300, fontSize: 28, fill: '#1e293b', align: 'center', width: 360, fontFamily: 'Inter', fontStyle: 'bold' } as any,
    { id: 'c3', type: 'variable', content: 'participant_role', x: 20, y: 340, fontSize: 18, fill: '#4f46e5', align: 'center', width: 360, fontFamily: 'Inter', fontStyle: 'bold' } as any,
    { id: 'c_qr', type: 'qr_code', content: 'verification_url', x: 150, y: 380, width: 100, height: 100, fill: '#1e293b' } as any,
    { id: 'c4', type: 'variable', content: 'event_name', x: 20, y: 500, fontSize: 14, fill: '#64748b', align: 'center', width: 360, fontFamily: 'Inter' } as any,
  ]
};

const INITIAL_EVENTS: Event[] = [
  {
    id: '1',
    name: 'Congreso Internacional de Tecnología 2026',
    date: '2026-05-15',
    location: 'Centro de Convenciones, Ciudad de México',
    description: 'Un evento enfocado en las últimas tendencias de IA y desarrollo web.',
    authorities: ['1', '2'],
    certificateTemplate: DEFAULT_CERTIFICATE_TEMPLATE,
    credentialTemplate: DEFAULT_CREDENTIAL_TEMPLATE,
    createdAt: Date.now(),
    createdBy: 'system',
  }
];

const INITIAL_PARTICIPANTS: Participant[] = [
  {
    id: '1',
    eventId: '1',
    name: 'Juan Pérez',
    email: 'juan@example.com',
    idNumber: 'V-12.345.678',
    role: 'asistente',
    registrationDate: Date.now(),
    attended: false,
  },
  {
    id: '2',
    eventId: '1',
    name: 'Dra. Elena Gómez',
    email: 'elena@tech.edu',
    idNumber: 'V-8.765.432',
    role: 'ponente',
    registrationDate: Date.now(),
    attended: false,
  }
];

const STORAGE_KEY_EVENTS = 'certievent_events';
const STORAGE_KEY_PARTICIPANTS = 'certievent_participants';
const STORAGE_KEY_AUTHORITIES = 'certievent_authorities';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-8 text-center">
          <Shield className="w-16 h-16 text-red-500 mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">Algo salió mal</h2>
          <p className="text-zinc-400 max-w-md mb-8">
            Se ha producido un error inesperado. Por favor, intenta recargar la página.
          </p>
          <pre className="bg-zinc-900 p-4 rounded-xl text-left text-xs text-red-400 overflow-auto max-w-2xl mb-8">
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-colors"
          >
            Recargar Aplicación
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'events' | 'participants' | 'design' | 'authorities' | 'users'>('events');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'google' | 'email'>('google');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const selectedEvent = events.find(e => e.id === selectedEventId) || null;
  
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
  const [isAuthorityModalOpen, setIsAuthorityModalOpen] = useState(false);
  const [isManageAuthoritiesModalOpen, setIsManageAuthoritiesModalOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingAuthority, setEditingAuthority] = useState<Authority | null>(null);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [previewParticipant, setPreviewParticipant] = useState<Participant | null>(null);
  const [previewCredentialParticipant, setPreviewCredentialParticipant] = useState<Participant | null>(null);
  const [isBulkPrinting, setIsBulkPrinting] = useState(false);
  const [bulkPrintType, setBulkPrintType] = useState<'certificates' | 'credentials'>('certificates');
  const [designType, setDesignType] = useState<'certificate' | 'credential'>('certificate');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [tempSignatureUrl, setTempSignatureUrl] = useState('');
  const authorityFileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    };
    testConnection();

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        setUser(null);
        setIsAuthReady(true);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;

    const userRef = doc(db, 'users', firebaseUser.uid);
    const unsubscribeUser = onSnapshot(userRef, async (userDoc) => {
      if (!userDoc.exists() && firebaseUser) {
        const newUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: firebaseUser.displayName || undefined,
          photoURL: firebaseUser.photoURL || undefined,
          role: firebaseUser.email === 'sahejoan@gmail.com' ? 'admin' : 'viewer',
          createdAt: Date.now()
        };
        await setDoc(userRef, newUser);
        setUser(newUser);
      } else if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        // Force admin role for the specific email if not already set
        if (firebaseUser.email === 'sahejoan@gmail.com' && userData.role !== 'admin') {
          await updateDoc(userRef, { role: 'admin' });
          userData.role = 'admin';
        }
        setUser(userData);
      }
      setIsAuthReady(true);
    }, (error) => {
      console.error("Error listening to user doc:", error);
      setIsAuthReady(true);
    });

    return () => unsubscribeUser();
  }, [firebaseUser]);

  useEffect(() => {
    if (!isAuthReady || !user) return;

    const unsubAuthorities = onSnapshot(collection(db, 'authorities'), (snapshot) => {
      setAuthorities(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Authority)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'authorities'));

    const unsubEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Event)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'events'));

    const unsubParticipants = onSnapshot(collection(db, 'participants'), (snapshot) => {
      setParticipants(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Participant)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'participants'));

    return () => {
      unsubAuthorities();
      unsubEvents();
      unsubParticipants();
    };
  }, [isAuthReady, user]);

  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      toast.error('Error al iniciar sesión con Google');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Por favor complete todos los campos');
      return;
    }
    
    setIsLoading(true);
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success('Cuenta creada con éxito');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Sesión iniciada');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        toast.error('Credenciales inválidas');
      } else if (error.code === 'auth/email-already-in-use') {
        toast.error('El correo ya está en uso');
      } else if (error.code === 'auth/weak-password') {
        toast.error('La contraseña es muy débil');
      } else {
        toast.error('Error en la autenticación');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      toast.error('Error al cerrar sesión');
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verify = params.get('verify');
    if (verify) {
      setVerificationId(verify);
    }
  }, []);

  const verifiedParticipant = verificationId ? participants.find(p => p.id === verificationId) : null;
  const verifiedEvent = verifiedParticipant ? events.find(e => e.id === verifiedParticipant.eventId) : null;

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-400 font-medium">Cargando CertiEvent...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-zinc-900 border border-white/5 rounded-3xl p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 mb-6">
              <Award className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">CertiEvent</h1>
            <p className="text-zinc-400">Sistema de Gestión de Certificados y Credenciales</p>
          </div>
          
          <div className="flex bg-zinc-800 p-1 rounded-xl mb-6 border border-white/5">
            <button 
              onClick={() => setLoginMethod('google')}
              className={cn(
                "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                loginMethod === 'google' ? "bg-zinc-700 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Google
            </button>
            <button 
              onClick={() => setLoginMethod('email')}
              className={cn(
                "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                loginMethod === 'email' ? "bg-zinc-700 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Email
            </button>
          </div>

          {loginMethod === 'google' ? (
            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white text-zinc-950 py-4 rounded-2xl font-bold hover:bg-zinc-200 transition-all duration-200 active:scale-[0.98]"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
              Continuar con Google
            </button>
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="w-full bg-zinc-800 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-800 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    {isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="w-full text-sm text-zinc-500 hover:text-zinc-300 transition-colors py-2"
              >
                {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
              </button>
            </form>
          )}
          
          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Acceso Restringido</p>
          </div>
        </div>
      </div>
    );
  }

  if (verificationId) {
    return (
      <VerificationPage 
        participant={verifiedParticipant || null}
        event={verifiedEvent || null}
        onClose={() => {
          window.history.replaceState({}, '', window.location.pathname);
          setVerificationId(null);
        }}
      />
    );
  }

  // Event Handlers
  const handleSaveEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    const eventId = editingEvent?.id || Math.random().toString(36).substr(2, 9);
    const eventRef = doc(db, 'events', eventId);
    
    try {
      if (editingEvent) {
        await updateDoc(eventRef, {
          name: formData.get('name') as string,
          date: formData.get('date') as string,
          location: formData.get('location') as string,
          description: formData.get('description') as string,
        });
        toast.success('Evento actualizado con éxito');
      } else {
        const newEvent: Event = {
          id: eventId,
          name: formData.get('name') as string,
          date: formData.get('date') as string,
          location: formData.get('location') as string,
          description: formData.get('description') as string,
          authorities: [],
          certificateTemplate: DEFAULT_CERTIFICATE_TEMPLATE,
          credentialTemplate: DEFAULT_CREDENTIAL_TEMPLATE,
          createdAt: Date.now(),
          createdBy: user.uid,
        };
        await setDoc(eventRef, newEvent);
        toast.success('Evento creado con éxito');
      }
      setIsEventModalOpen(false);
      setEditingEvent(null);
    } catch (error) {
      handleFirestoreError(error, editingEvent ? OperationType.UPDATE : OperationType.CREATE, `events/${eventId}`);
    }
  };

  const handleSaveParticipant = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEvent || !user) return;
    const formData = new FormData(e.currentTarget);
    const participantId = editingParticipant?.id || Math.random().toString(36).substr(2, 9);
    const participantRef = doc(db, 'participants', participantId);

    try {
      if (editingParticipant) {
        await updateDoc(participantRef, {
          name: formData.get('name') as string,
          email: formData.get('email') as string,
          idNumber: formData.get('idNumber') as string,
          role: formData.get('role') as Role,
          updatedAt: Date.now()
        });
        toast.success('Participante actualizado');
      } else {
        const newParticipant: Participant = {
          id: participantId,
          eventId: selectedEvent.id,
          name: formData.get('name') as string,
          email: formData.get('email') as string,
          idNumber: formData.get('idNumber') as string,
          role: formData.get('role') as Role,
          registrationDate: Date.now(),
          attended: false,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        await setDoc(participantRef, newParticipant);
        toast.success('Participante registrado');
      }
      setIsParticipantModalOpen(false);
      setEditingParticipant(null);
    } catch (error) {
      handleFirestoreError(error, editingParticipant ? OperationType.UPDATE : OperationType.CREATE, `participants/${participantId}`);
    }
  };

  const handleResetAttendance = () => {
    if (!selectedEvent || !user) return;
    setIsResetConfirmOpen(true);
  };

  const performResetAttendance = async () => {
    if (!selectedEvent || !user) return;
    
    setIsLoading(true);
    try {
      const batch = writeBatch(db);
      const eventParticipants = participants.filter(p => p.eventId === selectedEvent.id && p.attended);
      
      if (eventParticipants.length === 0) {
        toast.error('No hay participantes con asistencia para resetear');
        setIsResetConfirmOpen(false);
        return;
      }

      eventParticipants.forEach(p => {
        batch.update(doc(db, 'participants', p.id), { attended: false });
      });

      await batch.commit();
      toast.success('Asistencia reseteada para todos los participantes');
      setIsResetConfirmOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'participants/bulk_reset');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAuthority = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    const authorityId = editingAuthority?.id || Math.random().toString(36).substr(2, 9);
    const authorityRef = doc(db, 'authorities', authorityId);
    
    try {
      if (editingAuthority) {
        await updateDoc(authorityRef, {
          name: (formData.get('name') as string) || "",
          role: (formData.get('role') as string) || "",
          organization: (formData.get('organization') as string) || "",
          signatureUrl: tempSignatureUrl || "",
          isSignatureActive: formData.get('isSignatureActive') === 'on',
        });
        toast.success('Autoridad actualizada');
      } else {
        const newAuth: Authority = {
          id: authorityId,
          name: (formData.get('name') as string) || "",
          role: (formData.get('role') as string) || "",
          organization: (formData.get('organization') as string) || "",
          signatureUrl: tempSignatureUrl || "",
          isSignatureActive: formData.get('isSignatureActive') === 'on',
        };
        await setDoc(authorityRef, newAuth);
        toast.success('Autoridad registrada');
      }
      setIsAuthorityModalOpen(false);
      setEditingAuthority(null);
    } catch (error) {
      handleFirestoreError(error, editingAuthority ? OperationType.UPDATE : OperationType.CREATE, `authorities/${authorityId}`);
    }
  };

  const handleDeleteAuthority = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'authorities', id));
      toast.success('Autoridad eliminada');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `authorities/${id}`);
    }
  };

  const handleToggleSignature = async (id: string, active: boolean) => {
    if (!user || (user.role !== 'admin' && user.role !== 'editor')) return;
    const authorityRef = doc(db, 'authorities', id);
    try {
      await updateDoc(authorityRef, { isSignatureActive: active });
      toast.success(active ? 'Firma activada' : 'Firma desactivada');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `authorities/${id}`);
    }
  };

  const handleSaveAuthorityAssignment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingEvent || !user) return;
    const formData = new FormData(e.currentTarget);
    const selectedAuthIds = Array.from(formData.getAll('authorities')) as string[];
    
    try {
      await updateDoc(doc(db, 'events', editingEvent.id), {
        authorities: selectedAuthIds,
      });
      toast.success('Autoridades asignadas correctamente');
      setIsManageAuthoritiesModalOpen(false);
      setEditingEvent(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `events/${editingEvent.id}`);
    }
  };

  const handleToggleAttendance = async (id: string) => {
    const participant = participants.find(p => p.id === id);
    if (!participant) return;
    try {
      await updateDoc(doc(db, 'participants', id), {
        attended: !participant.attended
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `participants/${id}`);
    }
  };

  const handleDeleteParticipant = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'participants', id));
      toast.success('Participante eliminado');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `participants/${id}`);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'events', id));
      toast.success('Evento eliminado');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `events/${id}`);
    }
  };

  const handleSeedData = async () => {
    if (!user || user.role !== 'admin') return;
    setIsLoading(true);
    try {
      // Seed Authorities
      for (const authData of INITIAL_AUTHORITIES) {
        await setDoc(doc(db, 'authorities', authData.id), authData);
      }
      // Seed Events
      for (const eventData of INITIAL_EVENTS) {
        await setDoc(doc(db, 'events', eventData.id), {
          ...eventData,
          createdBy: user.uid,
          createdAt: Date.now()
        });
      }
      // Seed Participants
      for (const participantData of INITIAL_PARTICIPANTS) {
        await setDoc(doc(db, 'participants', participantData.id), participantData);
      }
      toast.success('Datos de ejemplo cargados con éxito');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'seed_data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ErrorBoundary>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={handleLogout}>
        <Toaster position="top-right" />
      
      {activeTab === 'events' && (
        <EventList 
          events={events}
          authorities={authorities}
          user={user}
          onAddEvent={() => { setEditingEvent(null); setIsEventModalOpen(true); }}
          onEditEvent={(event) => { setEditingEvent(event); setIsEventModalOpen(true); }}
          onDeleteEvent={handleDeleteEvent}
          onSeedData={handleSeedData}
          onSelectEvent={(event) => {
            setSelectedEventId(event.id);
            setActiveTab('participants');
          }}
          onManageAuthorities={(event) => {
            setEditingEvent(event);
            setIsManageAuthoritiesModalOpen(true);
          }}
        />
      )}

      {activeTab === 'participants' && (
        selectedEvent ? (
          <ParticipantList 
            participants={participants.filter(p => p.eventId === selectedEvent.id)}
            event={selectedEvent}
            user={user}
            onAddParticipant={() => setIsParticipantModalOpen(true)}
            onGenerateCertificate={(p) => setPreviewParticipant(p)}
            onGenerateCredential={(p) => setPreviewCredentialParticipant(p)}
            onToggleAttendance={handleToggleAttendance}
            onResetAttendance={handleResetAttendance}
            onDeleteParticipant={handleDeleteParticipant}
            onEditParticipant={(p) => { setEditingParticipant(p); setIsParticipantModalOpen(true); }}
            onBulkPrintCertificates={() => {
              const toPrint = participants.filter(p => p.eventId === selectedEvent?.id && p.attended);
              if (toPrint.length === 0) {
                toast.error('No hay participantes con asistencia confirmada para generar certificados.');
                return;
              }
              setBulkPrintType('certificates');
              setIsBulkPrinting(true);
            }}
            onBulkPrintCredentials={() => {
              const toPrint = participants.filter(p => p.eventId === selectedEvent?.id && p.attended);
              if (toPrint.length === 0) {
                toast.error('No hay participantes con asistencia confirmada para generar credenciales.');
                return;
              }
              setBulkPrintType('credentials');
              setIsBulkPrinting(true);
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center text-zinc-600 mb-6 border border-white/5">
              <Users className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Selecciona un Evento</h3>
            <p className="text-zinc-400 max-w-xs">Debes seleccionar un evento en la pestaña de Eventos para gestionar sus participantes.</p>
            <button 
              onClick={() => setActiveTab('events')}
              className="mt-6 text-indigo-400 font-bold hover:text-indigo-300 transition-colors"
            >
              Ir a Eventos &rarr;
            </button>
          </div>
        )
      )}

      {activeTab === 'authorities' && (
        <AuthorityList 
          authorities={authorities}
          user={user}
          onAddAuthority={() => { 
            setEditingAuthority(null); 
            setTempSignatureUrl('');
            setIsAuthorityModalOpen(true); 
          }}
          onEditAuthority={(auth) => { 
            setEditingAuthority(auth); 
            setTempSignatureUrl(auth.signatureUrl || '');
            setIsAuthorityModalOpen(true); 
          }}
          onDeleteAuthority={handleDeleteAuthority}
          onToggleSignature={handleToggleSignature}
        />
      )}

      {activeTab === 'users' && user?.role === 'admin' && (
        <UserManagement currentUser={user} />
      )}

      {activeTab === 'design' && (
        selectedEvent ? (
          <div className="flex flex-col h-full gap-4">
            <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-xl self-start border border-white/5">
              <button
                onClick={() => setDesignType('certificate')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
                  designType === 'certificate' ? "bg-indigo-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                Certificado
              </button>
              <button
                onClick={() => setDesignType('credential')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
                  designType === 'credential' ? "bg-indigo-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                Credencial
              </button>
            </div>
            <DesignEditor 
              template={designType === 'certificate' ? selectedEvent.certificateTemplate : selectedEvent.credentialTemplate}
              user={user}
              onSave={async (template) => {
                if (!selectedEvent) return;
                try {
                  const field = designType === 'certificate' ? 'certificateTemplate' : 'credentialTemplate';
                  // Sanitize template to remove undefined values which Firestore doesn't support
                  const sanitizedTemplate = JSON.parse(JSON.stringify(template));
                  await updateDoc(doc(db, 'events', selectedEvent.id), { [field]: sanitizedTemplate });
                  toast.success('Diseño guardado');
                } catch (error) {
                  handleFirestoreError(error, OperationType.UPDATE, `events/${selectedEvent.id}`);
                }
              }}
              title={`${designType === 'certificate' ? 'Certificado' : 'Credencial'}: ${selectedEvent.name}`}
              width={designType === 'certificate' ? 800 : 400}
              height={designType === 'certificate' ? 565 : 600}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center text-zinc-600 mb-6 border border-white/5">
              <LayoutIcon className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Selecciona un Evento</h3>
            <p className="text-zinc-400 max-w-xs">Debes seleccionar un evento en la pestaña de Eventos para editar sus diseños.</p>
            <button 
              onClick={() => setActiveTab('events')}
              className="mt-6 text-indigo-400 font-bold hover:text-indigo-300 transition-colors"
            >
              Ir a Eventos &rarr;
            </button>
          </div>
        )
      )}

      {/* Modals */}
      <Modal 
        isOpen={isEventModalOpen} 
        onClose={() => { setIsEventModalOpen(false); setEditingEvent(null); }}
        title={editingEvent ? 'Editar Evento' : 'Nuevo Evento'}
      >
        <form onSubmit={handleSaveEvent} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Nombre del Evento</label>
            <input 
              name="name" 
              required 
              defaultValue={editingEvent?.name || ''}
              className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Fecha</label>
              <input 
                name="date" 
                type="date" 
                required 
                defaultValue={editingEvent?.date || ''}
                className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Ubicación</label>
              <input 
                name="location" 
                required 
                defaultValue={editingEvent?.location || ''}
                className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500" 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Descripción</label>
            <textarea 
              name="description" 
              rows={3} 
              defaultValue={editingEvent?.description || ''}
              className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500" 
            />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors">
            {editingEvent ? 'Guardar Cambios' : 'Crear Evento'}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isManageAuthoritiesModalOpen}
        onClose={() => { setIsManageAuthoritiesModalOpen(false); setEditingEvent(null); }}
        title={`Gestionar Firmantes: ${editingEvent?.name}`}
      >
        <form onSubmit={handleSaveAuthorityAssignment} className="space-y-6">
          <div className="bg-indigo-500/5 border border-indigo-500/20 p-4 rounded-2xl">
            <p className="text-sm text-indigo-300">
              Selecciona hasta 3 autoridades que aparecerán como firmantes en los certificados de este evento.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {authorities.map(auth => (
              <label 
                key={auth.id} 
                className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer group",
                  editingEvent?.authorities?.includes(auth.id)
                    ? "bg-indigo-600/10 border-indigo-500/50"
                    : "bg-zinc-900 border-white/5 hover:border-white/10"
                )}
              >
                <div className="relative flex items-center justify-center">
                  <input 
                    type="checkbox" 
                    name="authorities" 
                    value={auth.id}
                    defaultChecked={editingEvent?.authorities?.includes(auth.id)}
                    className="peer w-6 h-6 rounded-lg border-zinc-700 text-indigo-600 focus:ring-indigo-500 bg-zinc-800 transition-all"
                    onChange={(e) => {
                      const checked = Array.from(document.querySelectorAll('input[name="authorities"]:checked'));
                      if (checked.length > 3) {
                        e.target.checked = false;
                        toast.error('Máximo 3 autoridades');
                      }
                    }}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">{auth.name}</p>
                  <p className="text-xs text-zinc-500">{auth.role}</p>
                  {auth.organization && (
                    <p className="text-[10px] text-zinc-600 mt-1">{auth.organization}</p>
                  )}
                </div>
                {editingEvent?.authorities?.includes(auth.id) && (
                  <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/50" />
                )}
              </label>
            ))}
          </div>
          <div className="flex gap-3">
            <button 
              type="button"
              onClick={() => setIsManageAuthoritiesModalOpen(false)}
              className="flex-1 px-4 py-3 bg-zinc-800 text-zinc-400 rounded-xl font-bold hover:bg-zinc-700 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-900/20"
            >
              Guardar Asignación
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        title="Confirmar Reseteo de Asistencia"
      >
        <div className="space-y-6">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center text-red-500 shrink-0">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">¿Estás seguro?</p>
              <p className="text-xs text-zinc-400">Esta acción marcará a todos los participantes de "{selectedEvent?.name}" como "Sin Asistencia".</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setIsResetConfirmOpen(false)}
              className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={performResetAttendance}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-900/20 disabled:opacity-50"
            >
              {isLoading ? 'Procesando...' : 'Confirmar Reseteo'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={isParticipantModalOpen} 
        onClose={() => { setIsParticipantModalOpen(false); setEditingParticipant(null); }}
        title={editingParticipant ? "Editar Participante" : "Registrar Participante"}
      >
        <form onSubmit={handleSaveParticipant} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Nombre Completo</label>
            <input 
              name="name" 
              required 
              defaultValue={editingParticipant?.name || ''}
              className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Cédula de Identidad</label>
            <input 
              name="idNumber" 
              required 
              placeholder="V-12.345.678" 
              defaultValue={editingParticipant?.idNumber || ''}
              className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
            <input 
              name="email" 
              type="email" 
              required 
              defaultValue={editingParticipant?.email || ''}
              className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Rol</label>
            <select 
              name="role" 
              required 
              defaultValue={editingParticipant?.role || 'asistente'}
              className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="asistente">Asistente</option>
              <option value="docente">Docente</option>
              <option value="estudiante">Estudiante</option>
              <option value="logistica">Logística</option>
              <option value="organizador">Organizador</option>
              <option value="ponente">Ponente</option>
              <option value="protocolo">Protocolo</option>
              <option value="tecnico_informatico">Técnico Informático</option>
            </select>
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors">
            {editingParticipant ? "Guardar Cambios" : "Registrar"}
          </button>
        </form>
      </Modal>

      <Modal 
        isOpen={isAuthorityModalOpen} 
        onClose={() => { setIsAuthorityModalOpen(false); setEditingAuthority(null); setTempSignatureUrl(''); }}
        title={editingAuthority ? 'Editar Autoridad' : 'Nueva Autoridad'}
      >
        <form onSubmit={handleSaveAuthority} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Nombre Completo</label>
            <input 
              name="name" 
              required 
              defaultValue={editingAuthority?.name || ''}
              className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Cargo (Rector, Director, etc.)</label>
            <input 
              name="role" 
              required 
              defaultValue={editingAuthority?.role || ''}
              className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Organización / Institución</label>
            <input 
              name="organization" 
              defaultValue={editingAuthority?.organization || ''}
              className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500" 
            />
          </div>
          {user?.role === 'admin' && (
            <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-indigo-400">
                <Award className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Configuración de Firma Digital</span>
              </div>
              
              <div className="space-y-3">
                <label className="block text-sm font-medium text-zinc-400">Imagen de Firma</label>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => authorityFileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors border border-white/5"
                  >
                    <Upload className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold uppercase">Archivo</span>
                  </button>
                  <div className="relative">
                    <input 
                      type="url"
                      placeholder="URL de imagen"
                      value={tempSignatureUrl.startsWith('data:') ? '' : tempSignatureUrl}
                      onChange={(e) => setTempSignatureUrl(e.target.value)}
                      className="w-full h-full px-4 py-2 bg-zinc-900 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500 text-xs" 
                    />
                    <LinkIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
                  </div>
                </div>

                <input
                  type="file"
                  ref={authorityFileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setTempSignatureUrl(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                  accept="image/*"
                  className="hidden"
                />

                {tempSignatureUrl && (
                  <div className="relative group aspect-[3/1] bg-white/5 rounded-xl overflow-hidden border border-white/10">
                    <img 
                      src={tempSignatureUrl} 
                      alt="Vista previa firma" 
                      className="w-full h-full object-contain p-2"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={() => setTempSignatureUrl('')}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      editingAuthority?.isSignatureActive ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-800 text-zinc-500"
                    )}>
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Activar Firma Digital</p>
                      <p className="text-[10px] text-zinc-500">Habilita el uso de la firma en certificados</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      name="isSignatureActive"
                      type="checkbox" 
                      defaultChecked={editingAuthority?.isSignatureActive ?? true}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}
          <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors">
            {editingAuthority ? 'Guardar Cambios' : 'Registrar Autoridad'}
          </button>
        </form>
      </Modal>

      {previewParticipant && selectedEvent && (
        <CertificatePreview 
          event={selectedEvent}
          participant={previewParticipant}
          authorities={authorities}
          onClose={() => setPreviewParticipant(null)}
        />
      )}

      {previewCredentialParticipant && selectedEvent && (
        <CredentialPreview 
          event={selectedEvent}
          participant={previewCredentialParticipant}
          authorities={authorities}
          onClose={() => setPreviewCredentialParticipant(null)}
        />
      )}

      {isBulkPrinting && selectedEvent && (
        <BulkPrintManager
          type={bulkPrintType}
          event={selectedEvent}
          participants={participants.filter(p => p.eventId === selectedEvent.id && p.attended)}
          authorities={authorities}
          onComplete={() => setIsBulkPrinting(false)}
        />
      )}
    </Layout>
    </ErrorBoundary>
  );
}
