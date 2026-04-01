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
import EmailCertificateManager from './components/EmailCertificateManager';
import { compressImage } from './lib/imageUtils';
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
  XCircle,
  UserPlus,
  CheckCircle2,
  Printer,
  Search,
  ChevronRight,
  Sparkles,
  Plus,
  LogOut,
  Ticket,
  Zap,
  Globe,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { auth, db } from './firebase';
import { 
  onSnapshot, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  getDocFromServer,
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  writeBatch,
  getFirestore
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  getAuth,
  User as FirebaseUser
} from 'firebase/auth';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { cn, formatDate } from './lib/utils';
import { sendRegistrationEmail } from './lib/email';


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

const DEFAULT_CERTIFICATE_BACK_TEMPLATE: Template = {
  backgroundUrl: '', // User should upload the image provided
  elements: [
    { id: 'back_header', type: 'text', content: 'CONTENIDO', x: 0, y: 50, fontSize: 20, fill: '#ffffff', align: 'center', width: 800, fontFamily: 'Inter', fontStyle: 'bold' } as any,
    { id: 'back_unit', type: 'text', content: 'Unidad I: ¿Cuáles son los principios esenciales del pensamiento lógico?', x: 100, y: 110, fontSize: 16, fill: '#475569', align: 'center', width: 600, fontFamily: 'Inter' } as any,
    { id: 'back_date', type: 'text', content: 'Fecha: {event_date}', x: 0, y: 140, fontSize: 14, fill: '#475569', align: 'center', width: 800, fontFamily: 'Inter', fontStyle: 'bold' } as any,
    { id: 'back_qr', type: 'qr_code', content: 'verification_url', x: 680, y: 380, width: 80, height: 80, fill: '#1e293b' } as any,
    { id: 'back_dept', type: 'text', content: 'Gerencia de Formación\nTecnológica', x: 0, y: 450, fontSize: 16, fill: '#1e293b', align: 'center', width: 800, fontFamily: 'Inter', fontStyle: 'bold' } as any,
    { id: 'back_footer_left', type: 'text', content: 'Dictado en el:\nCentro Nacional de\nTecnologías de Información', x: 30, y: 510, fontSize: 12, fill: '#ffffff', align: 'left', width: 300, fontFamily: 'Inter' } as any,
    { id: 'back_footer_right', type: 'text', content: 'Modalidad: Autogestionado\nDuración: 24 horas', x: 470, y: 510, fontSize: 12, fill: '#ffffff', align: 'right', width: 300, fontFamily: 'Inter' } as any,
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

const INITIAL_EVENTS: Event[] = [];

const INITIAL_PARTICIPANTS: Participant[] = [];

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
  const isEditor = user?.role === 'admin' || user?.role === 'editor';
  const isAdmin = user?.role === 'admin';
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isPublicRegistration, setIsPublicRegistration] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [showCredentialPreview, setShowCredentialPreview] = useState(false);
  const [registeredParticipant, setRegisteredParticipant] = useState<Participant | null>(null);
  const [registeredEvent, setRegisteredEvent] = useState<Event | null>(null);
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
  const [emailSendingParticipant, setEmailSendingParticipant] = useState<Participant | null>(null);
  const [designType, setDesignType] = useState<'certificate' | 'credential'>('certificate');
  const [certificateSide, setCertificateSide] = useState<'front' | 'back'>('front');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [verificationParticipant, setVerificationParticipant] = useState<Participant | null>(null);
  const [verificationEvent, setVerificationEvent] = useState<Event | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [tempSignatureUrl, setTempSignatureUrl] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
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
        // Check if there's a pending pre-registration for this email
        const tempUid = `pending_${firebaseUser.email!.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const pendingRef = doc(db, 'users', tempUid);
        const pendingDoc = await getDoc(pendingRef);
        
        let initialRole: UserRole = firebaseUser.email === 'sahejoan@gmail.com' ? 'admin' : 'viewer';
        let initialName = firebaseUser.displayName || undefined;

        if (pendingDoc.exists()) {
          const pendingData = pendingDoc.data() as User;
          initialRole = pendingData.role;
          if (pendingData.displayName) initialName = pendingData.displayName;
          // Delete the pending document
          await deleteDoc(pendingRef);
        }

        const newUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: initialName,
          photoURL: firebaseUser.photoURL || undefined,
          role: initialRole,
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
      const auths = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Authority));
      
      // Cleanup: Ensure authorities without signatureUrl are not active
      auths.forEach(async (a) => {
        if (!a.signatureUrl && a.isSignatureActive) {
          try {
            await updateDoc(doc(db, 'authorities', a.id), { isSignatureActive: false });
          } catch (error) {
            console.error('Error cleaning up authority:', error);
          }
        }
      });
      
      setAuthorities(auths);
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
    const register = params.get('register');
    
    if (verify) {
      setVerificationId(verify);
    }
    if (register === 'true') {
      setIsPublicRegistration(true);
    }
  }, []);

  useEffect(() => {
    if (verificationId && !user) {
      const fetchVerificationData = async () => {
        setIsVerifying(true);
        try {
          const pDoc = await getDoc(doc(db, 'participants', verificationId));
          if (pDoc.exists()) {
            const pData = { ...pDoc.data(), id: pDoc.id } as Participant;
            setVerificationParticipant(pData);
            const eDoc = await getDoc(doc(db, 'events', pData.eventId));
            if (eDoc.exists()) {
              setVerificationEvent({ ...eDoc.data(), id: eDoc.id } as Event);
            }
          }
        } catch (error) {
          console.error('Error fetching verification data:', error);
        } finally {
          setIsVerifying(false);
        }
      };
      fetchVerificationData();
    }
  }, [verificationId, user]);

  const verifiedParticipant = verificationId 
    ? (user ? participants.find(p => p.id === verificationId) : verificationParticipant) 
    : null;
  const verifiedEvent = verifiedParticipant 
    ? (user ? events.find(e => e.id === verifiedParticipant.eventId) : verificationEvent) 
    : null;

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

  if (verificationId) {
    if (isVerifying) {
      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-zinc-400 font-medium">Verificando documento...</p>
          </div>
        </div>
      );
    }
    return (
      <VerificationPage 
        participant={verifiedParticipant || null}
        event={verifiedEvent || null}
        onClose={() => {
          window.history.replaceState({}, '', window.location.pathname);
          setVerificationId(null);
          setVerificationParticipant(null);
          setVerificationEvent(null);
        }}
      />
    );
  }

  if (!user) {
    if (isPublicRegistration) {
      if (registrationSuccess && registeredParticipant && registeredEvent) {
        return (
          <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-8 relative overflow-hidden">
            {/* Background Atmosphere */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
              <motion.div 
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.1, 0.2, 0.1],
                  rotate: [0, 90, 0]
                }}
                transition={{ duration: 20, repeat: Infinity }}
                className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] bg-indigo-600/10 blur-[160px] rounded-full"
              ></motion.div>
              <motion.div 
                animate={{ 
                  scale: [1.2, 1, 1.2],
                  opacity: [0.1, 0.2, 0.1],
                  rotate: [0, -90, 0]
                }}
                transition={{ duration: 25, repeat: Infinity }}
                className="absolute bottom-[-10%] left-[-10%] w-[80%] h-[80%] bg-purple-600/10 blur-[160px] rounded-full"
              ></motion.div>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-2xl bg-zinc-900/40 backdrop-blur-3xl border border-white/10 rounded-[60px] p-12 md:p-16 text-center relative z-10 shadow-[0_0_100px_rgba(0,0,0,0.5)]"
            >
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 15 }}
                className="w-24 h-24 bg-emerald-500 rounded-[32px] flex items-center justify-center text-white mx-auto mb-10 shadow-2xl shadow-emerald-500/40"
              >
                <CheckCircle2 className="w-12 h-12" />
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter leading-tight font-display"
              >
                ¡ESTÁS <span className="text-emerald-400">DENTRO!</span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-zinc-400 text-xl mb-12 max-w-md mx-auto leading-relaxed"
              >
                Hola <span className="text-white font-bold">{registeredParticipant.name}</span>, tu registro para <span className="text-white font-bold">{registeredEvent.name}</span> ha sido procesado con éxito.
              </motion.p>
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 }}
                className="bg-zinc-950/60 border border-white/10 rounded-[48px] p-12 mb-12 relative group overflow-hidden"
              >
                {/* Decorative elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>
                
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-6 py-1.5 bg-indigo-600 text-[11px] font-black uppercase tracking-[0.4em] rounded-full text-white shadow-xl shadow-indigo-500/40 z-20">
                  Credencial Digital
                </div>
                
                <div className="flex justify-center mb-10 relative">
                  <motion.button
                    whileHover={{ scale: 1.05, rotateY: 10 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCredentialPreview(true)}
                    className="group relative w-64 h-96 bg-zinc-900 border border-white/10 rounded-[40px] overflow-hidden hover:border-indigo-500/50 transition-all duration-700 shadow-[0_30px_60px_rgba(0,0,0,0.6)] perspective-1000"
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-indigo-600/90 opacity-0 group-hover:opacity-100 transition-all duration-500 z-20 backdrop-blur-md">
                      <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-indigo-600 shadow-2xl transform group-hover:scale-110 transition-transform duration-500">
                        <Ticket className="w-10 h-10" />
                      </div>
                      <span className="text-sm font-black text-white uppercase tracking-[0.3em]">Ver Credencial</span>
                    </div>
                    
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-10 bg-gradient-to-b from-zinc-800/40 to-zinc-950/80">
                      <div className="w-28 h-28 bg-white/5 rounded-[40px] flex items-center justify-center text-zinc-700 mb-10 group-hover:scale-90 transition-transform duration-700">
                        <Award className="w-14 h-14" />
                      </div>
                      <div className="w-44 h-4 bg-white/5 rounded-full mb-5"></div>
                      <div className="w-28 h-4 bg-white/5 rounded-full"></div>
                    </div>

                    {/* Holographic effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none"></div>
                  </motion.button>
                </div>
                
                <AnimatePresence>
                  {showCredentialPreview && registeredParticipant && registeredEvent && (
                    <CredentialPreview 
                      participant={registeredParticipant} 
                      event={registeredEvent}
                      authorities={authorities}
                      onClose={() => setShowCredentialPreview(false)}
                    />
                  )}
                </AnimatePresence>
                
                <p className="text-sm text-zinc-500 leading-relaxed max-w-xs mx-auto font-medium">
                  Hemos enviado los detalles a <span className="text-zinc-300 font-bold">{registeredParticipant.email}</span>.<br />
                  Haz clic en la tarjeta para gestionar tu acceso.
                </p>
              </motion.div>

              <div className="flex flex-col sm:flex-row gap-6">
                <motion.button
                  whileHover={{ scale: 1.02, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setRegistrationSuccess(false);
                    setRegisteredParticipant(null);
                    setRegisteredEvent(null);
                    setIsPublicRegistration(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-4 bg-zinc-800 text-white py-7 rounded-[32px] font-black text-xl hover:bg-zinc-700 transition-all duration-300 border border-white/5"
                >
                  Finalizar
                </motion.button>
              </div>
            </motion.div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-zinc-950 flex flex-col lg:flex-row relative overflow-hidden font-sans">
          {/* Background Atmosphere */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
            <motion.div 
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.05, 0.1, 0.05],
                x: [0, 30, 0]
              }}
              transition={{ duration: 12, repeat: Infinity }}
              className="absolute top-1/4 right-1/4 w-[70%] h-[70%] bg-indigo-600/10 blur-[140px] rounded-full"
            ></motion.div>
            <motion.div 
              animate={{ 
                scale: [1.1, 1, 1.1],
                opacity: [0.05, 0.1, 0.05],
                x: [0, -30, 0]
              }}
              transition={{ duration: 15, repeat: Infinity }}
              className="absolute bottom-1/4 left-1/4 w-[70%] h-[70%] bg-purple-600/10 blur-[140px] rounded-full"
            ></motion.div>
          </div>

          {/* Left Side: Hero Info */}
          <div className="lg:w-1/2 flex flex-col justify-center p-12 lg:p-24 relative z-10">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-xl"
            >
              <div className="flex items-center gap-4 mb-12">
                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-indigo-500/30">
                  <UserPlus className="w-8 h-8" />
                </div>
                <div className="h-px w-12 bg-white/20"></div>
                <span className="text-xs font-black text-zinc-500 uppercase tracking-[0.4em]">Registro Público</span>
              </div>

              <h1 className="text-7xl lg:text-8xl font-black text-white mb-8 tracking-tighter leading-[0.9] font-display">
                TU ACCESO <br />
                <span className="text-indigo-500">EXCLUSIVO</span>
              </h1>
              
              <p className="text-zinc-400 text-xl lg:text-2xl mb-12 leading-relaxed max-w-md">
                Únete a los mejores eventos y obtén tu credencial digital al instante. 
              </p>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <div className="text-3xl font-black text-white tracking-tighter">100%</div>
                  <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Digital</div>
                </div>
                <div className="space-y-2">
                  <div className="text-3xl font-black text-white tracking-tighter">Instant</div>
                  <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Credential</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Side: Form */}
          <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-12 relative z-10">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              className="w-full max-w-xl bg-zinc-900/40 backdrop-blur-3xl border border-white/10 rounded-[60px] p-10 md:p-14 shadow-2xl relative"
            >
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const eventId = formData.get('eventId') as string;
                if (!eventId) {
                  toast.error('Por favor selecciona un evento');
                  return;
                }
                setIsLoading(true);
                try {
                  const participantId = Math.random().toString(36).substr(2, 9);
                  const event = events.find(ev => ev.id === eventId);
                  if (!event) throw new Error('Evento no encontrado');

                  const newParticipant: Participant = {
                    id: participantId,
                    eventId,
                    name: formData.get('name') as string,
                    email: formData.get('email') as string,
                    idNumber: formData.get('idNumber') as string,
                    role: formData.get('role') as Role,
                    registrationDate: Date.now(),
                    attended: false,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                  };

                  await setDoc(doc(db, 'participants', participantId), newParticipant);
                  
                  // Send simulated email
                  await sendRegistrationEmail(newParticipant, event);
                  
                  setRegisteredParticipant(newParticipant);
                  setRegisteredEvent(event);
                  setRegistrationSuccess(true);
                  
                  // Surprise confetti effect
                  confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#4f46e5', '#8b5cf6', '#10b981', '#ffffff']
                  });

                  toast.success('¡Registro exitoso! Te esperamos en el evento.');
                } catch (error) {
                  toast.error('Error al registrarse. Por favor intenta de nuevo.');
                } finally {
                  setIsLoading(false);
                }
              }} className="space-y-6">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] ml-4">Selecciona Actividad</label>
                  <div className="relative group">
                    <select 
                      name="eventId" 
                      required 
                      defaultValue=""
                      className="w-full bg-zinc-950/50 border border-white/10 rounded-[28px] py-5 px-7 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none cursor-pointer text-lg font-medium"
                    >
                      <option value="" disabled>¿A qué evento asistirás?</option>
                      {events.map(e => (
                        <option key={e.id} value={e.id}>{e.name} — {formatDate(e.date)}</option>
                      ))}
                    </select>
                    <div className="absolute right-7 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600 group-focus-within:text-indigo-500 transition-colors">
                      <ChevronRight className="w-5 h-5 rotate-90" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] ml-4">Nombre Completo</label>
                    <input 
                      name="name" 
                      required 
                      placeholder="Tu nombre"
                      className="w-full bg-zinc-950/50 border border-white/10 rounded-[28px] py-5 px-7 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-lg font-medium" 
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] ml-4">Cédula</label>
                    <input 
                      name="idNumber" 
                      required 
                      placeholder="V-00.000.000"
                      className="w-full bg-zinc-950/50 border border-white/10 rounded-[28px] py-5 px-7 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-lg font-medium" 
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] ml-4">Correo Electrónico</label>
                  <input 
                    name="email" 
                    type="email" 
                    required 
                    placeholder="ejemplo@correo.com"
                    className="w-full bg-zinc-950/50 border border-white/10 rounded-[28px] py-5 px-7 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-lg font-medium" 
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] ml-4">Rol de Participación</label>
                  <div className="relative group">
                    <select 
                      name="role" 
                      required 
                      className="w-full bg-zinc-950/50 border border-white/10 rounded-[28px] py-5 px-7 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none cursor-pointer text-lg font-medium"
                    >
                      <option value="asistente">Asistente</option>
                      <option value="logistica">Logística</option>
                      <option value="ponente">Ponente</option>
                      <option value="protocolo">Protocolo</option>
                      <option value="tecnico_informatico">Técnico Informática</option>
                    </select>
                    <div className="absolute right-7 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600 group-focus-within:text-indigo-500 transition-colors">
                      <ChevronRight className="w-5 h-5 rotate-90" />
                    </div>
                  </div>
                </div>
                
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-4 bg-indigo-600 text-white py-6 rounded-[28px] font-black text-xl hover:bg-indigo-700 transition-all duration-300 active:scale-[0.98] disabled:opacity-50 shadow-[0_20px_40px_rgba(79,70,229,0.3)] mt-6"
                >
                  {isLoading ? (
                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      Completar Registro
                      <Sparkles className="w-6 h-6" />
                    </>
                  )}
                </motion.button>
                
                <button
                  type="button"
                  onClick={() => setIsPublicRegistration(false)}
                  className="w-full text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors py-4 font-black uppercase tracking-[0.4em]"
                >
                  &larr; Volver al Inicio
                </button>
              </form>
            </motion.div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen md:h-screen bg-zinc-950 flex flex-col md:flex-row relative md:overflow-hidden font-sans">
        {/* Background Atmosphere */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.05, 0.1, 0.05],
              x: [0, 50, 0],
              y: [0, 30, 0]
            }}
            transition={{ duration: 15, repeat: Infinity }}
            className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-indigo-600/20 blur-[160px] rounded-full"
          ></motion.div>
          <motion.div 
            animate={{ 
              scale: [1.1, 1, 1.1],
              opacity: [0.05, 0.1, 0.05],
              x: [0, -50, 0],
              y: [0, -30, 0]
            }}
            transition={{ duration: 18, repeat: Infinity }}
            className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-purple-600/20 blur-[160px] rounded-full"
          ></motion.div>
        </div>

        {/* Marquee Section */}
        <div className="absolute top-0 left-0 w-full h-16 bg-white/5 backdrop-blur-md border-b border-white/5 z-20 overflow-hidden flex items-center">
          <div className="flex animate-marquee whitespace-nowrap">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center gap-8 px-8">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.5em] flex items-center gap-2">
                  <Zap className="w-3 h-3 text-indigo-400" />
                  Certificación Digital Automática
                </span>
                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.5em] flex items-center gap-2">
                  <Globe className="w-3 h-3 text-purple-400" />
                  Acceso Global 24/7
                </span>
                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.5em] flex items-center gap-2">
                  <Star className="w-3 h-3 text-yellow-400" />
                  Eventos de Alto Nivel
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Left Side: Hero / Branding */}
        <div className="flex-1 flex flex-col justify-center p-10 md:p-24 pt-32 md:pt-24 relative z-10 md:overflow-y-auto no-scrollbar">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl"
          >
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-5 mb-8"
            >
              <div className="w-16 h-16 bg-indigo-600 rounded-[24px] flex items-center justify-center text-white shadow-[0_15px_30px_rgba(79,70,229,0.4)] transform -rotate-12 hover:rotate-0 transition-transform duration-500">
                <Award className="w-10 h-10" />
              </div>
              <span className="text-3xl font-black text-white tracking-tighter uppercase italic font-display">CertiEvent</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-8 font-display uppercase"
            >
              CREA <span className="text-indigo-500">IMPACTO.</span> <span className="text-white/10">CERTIFICA.</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-xl text-zinc-500 mb-10 max-w-2xl leading-relaxed font-medium"
            >
              La plataforma de gestión de certificados y credenciales de eventos académicos del Doctorado en Educación UPEL-IMPM aplicación Calabozo
            </motion.p>

            <div className="flex flex-col sm:flex-row gap-6">
              <motion.button
                whileHover={{ scale: 1.05, x: 10 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsPublicRegistration(true)}
                className="group flex items-center justify-center gap-6 bg-white text-zinc-950 px-12 py-8 rounded-[32px] font-black text-xl hover:bg-indigo-50 transition-all duration-500 shadow-[0_20px_40px_rgba(255,255,255,0.1)]"
              >
                <UserPlus className="w-6 h-6" />
                REGISTRARSE AHORA
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-500" />
              </motion.button>
            </div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-16 flex flex-wrap items-center gap-12 text-zinc-700"
            >
              <div className="flex flex-col gap-1">
                <span className="text-4xl font-black text-white tracking-tighter">100%</span>
                <span className="text-[10px] uppercase tracking-[0.4em] font-black text-zinc-500">Digital</span>
              </div>
              <div className="w-px h-12 bg-white/10 hidden sm:block"></div>
              <div className="flex flex-col gap-1">
                <span className="text-4xl font-black text-white tracking-tighter">QR</span>
                <span className="text-[10px] uppercase tracking-[0.4em] font-black text-zinc-500">Seguro</span>
              </div>
              <div className="w-px h-12 bg-white/10 hidden sm:block"></div>
              <div className="flex flex-col gap-1">
                <span className="text-4xl font-black text-white tracking-tighter">PDF</span>
                <span className="text-[10px] uppercase tracking-[0.4em] font-black text-zinc-500">Premium</span>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Right Side: Login Panel */}
        <div className="w-full md:w-[650px] bg-zinc-950/50 backdrop-blur-3xl border-l border-white/5 flex flex-col justify-center p-10 md:p-24 relative z-10 md:overflow-y-auto no-scrollbar">
          {/* Floating decorative elements for login panel */}
          <div className="absolute top-20 right-20 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full"></div>
          <div className="absolute bottom-20 left-20 w-32 h-32 bg-purple-500/5 blur-3xl rounded-full"></div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            className="w-full max-w-md mx-auto"
          >
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600/10 text-indigo-400 text-[11px] font-black uppercase tracking-[0.4em] rounded-full mb-4 border border-indigo-500/20">
                <Shield className="w-3 h-3" />
                Portal de Gestión
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tighter font-display uppercase">Acceso Admin</h2>
              <p className="text-zinc-500 text-lg leading-relaxed">Control total sobre tus eventos y certificaciones.</p>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-10">
              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.5em] ml-6">E-mail Corporativo</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-8 flex items-center pointer-events-none">
                      <Mail className="w-6 h-6 text-zinc-600 group-focus-within:text-indigo-500 transition-colors duration-300" />
                    </div>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@certievent.com"
                      className="w-full bg-zinc-900/40 border border-white/5 rounded-[32px] py-8 pl-20 pr-8 text-white focus:ring-2 focus:ring-indigo-500/50 focus:bg-zinc-900/60 outline-none transition-all text-lg font-medium placeholder:text-zinc-700"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.5em] ml-6">Contraseña</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-8 flex items-center pointer-events-none">
                      <Lock className="w-6 h-6 text-zinc-600 group-focus-within:text-indigo-500 transition-colors duration-300" />
                    </div>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-zinc-900/40 border border-white/5 rounded-[32px] py-8 pl-20 pr-8 text-white focus:ring-2 focus:ring-indigo-500/50 focus:bg-zinc-900/60 outline-none transition-all text-lg font-medium placeholder:text-zinc-700"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Google Login for Admin only */}
              {email === 'sahejoan@gmail.com' && !isRegistering && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-white/5"></div>
                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">O continuar con</span>
                    <div className="h-px flex-1 bg-white/5"></div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handleLogin}
                    className="w-full flex items-center justify-center gap-6 bg-white text-zinc-950 py-6 rounded-[28px] font-black text-lg hover:bg-indigo-50 transition-all duration-500 shadow-[0_20px_40px_rgba(255,255,255,0.1)] relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    <svg className="w-7 h-7" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span>Google</span>
                  </motion.button>
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 text-white py-8 rounded-[32px] font-black text-xl hover:bg-indigo-500 transition-all duration-500 shadow-[0_20px_40px_rgba(79,70,229,0.3)] flex items-center justify-center gap-4 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    {isRegistering ? 'CREAR CUENTA' : 'ENTRAR'}
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
                  </>
                )}
              </motion.button>

              <div className="flex items-center justify-center gap-4">
                <div className="h-px flex-1 bg-white/5"></div>
                <button 
                  type="button"
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="text-sm font-bold text-zinc-500 hover:text-indigo-400 transition-colors duration-300 px-4"
                >
                  {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
                </button>
                <div className="h-px flex-1 bg-white/5"></div>
              </div>
            </form>

            <div className="mt-16 pt-10 border-t border-white/5 flex flex-col items-center gap-6">
              <div className="flex justify-center gap-8 text-zinc-700">
                <Shield className="w-5 h-5 hover:text-zinc-500 cursor-help transition-colors" />
                <Lock className="w-5 h-5 hover:text-zinc-500 cursor-help transition-colors" />
                <Award className="w-5 h-5 hover:text-zinc-500 cursor-help transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-2">
                  © {new Date().getFullYear()} CertiEvent
                </p>
                <p className="text-[11px] font-bold text-indigo-400/60 uppercase tracking-[0.2em]">
                  Desarrollado por: Comité de informática
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
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
          certificateBackTemplate: DEFAULT_CERTIFICATE_BACK_TEMPLATE,
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
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    const participantId = editingParticipant?.id || Math.random().toString(36).substr(2, 9);
    const participantRef = doc(db, 'participants', participantId);
    const eventId = formData.get('eventId') as string;

    if (!eventId) {
      toast.error('Por favor selecciona un evento');
      return;
    }

    try {
      if (editingParticipant) {
        await updateDoc(participantRef, {
          eventId,
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
          eventId,
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
      const updateData: any = {
        name: (formData.get('name') as string) || "",
        role: (formData.get('role') as string) || "",
        organization: (formData.get('organization') as string) || "",
      };

      // Only update signature fields if they were present in the form
      if (tempSignatureUrl !== undefined) {
        updateData.signatureUrl = tempSignatureUrl || "";
      }
      
      const isSignatureActiveField = formData.get('isSignatureActive');
      if (isSignatureActiveField !== null) {
        // Only allow active if there is a signature URL
        updateData.isSignatureActive = (isSignatureActiveField === 'on') && !!(updateData.signatureUrl || editingAuthority?.signatureUrl);
      }

      if (editingAuthority) {
        await updateDoc(authorityRef, updateData);
        toast.success('Autoridad actualizada');
      } else {
        const newAuth: Authority = {
          id: authorityId,
          name: updateData.name,
          role: updateData.role,
          organization: updateData.organization,
          signatureUrl: updateData.signatureUrl || "",
          isSignatureActive: (updateData.isSignatureActive ?? false) && !!updateData.signatureUrl,
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
    if (!isEditor) return;
    const authority = authorities.find(a => a.id === id);
    if (active && !authority?.signatureUrl) {
      toast.error('No se puede activar una firma sin imagen registrada');
      return;
    }
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
    if (!isAdmin) return;
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
        <div className="space-y-6">
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
        </div>
      )}

      {activeTab === 'participants' && (
        <ParticipantList 
          participants={participants}
          events={events}
          selectedEventId={selectedEventId || 'all'}
          onSelectEventId={(id) => setSelectedEventId(id === 'all' ? null : id)}
          user={user}
          onAddParticipant={() => setIsParticipantModalOpen(true)}
          onGenerateCertificate={(p) => setPreviewParticipant(p)}
          onGenerateCredential={(p) => setPreviewCredentialParticipant(p)}
          onToggleAttendance={handleToggleAttendance}
          onResetAttendance={handleResetAttendance}
          onDeleteParticipant={handleDeleteParticipant}
          onEditParticipant={(p) => { setEditingParticipant(p); setIsParticipantModalOpen(true); }}
          onSendEmail={(p) => setEmailSendingParticipant(p)}
          onBulkPrintCertificates={() => {
            const isEditor = user?.role === 'admin' || user?.role === 'editor';
            const toPrint = participants.filter(p => p.eventId === selectedEventId && (isEditor || p.attended));
            if (toPrint.length === 0) {
              toast.error(isEditor ? 'No hay participantes registrados para generar certificados.' : 'No hay participantes con asistencia confirmada para generar certificados.');
              return;
            }
            setBulkPrintType('certificates');
            setIsBulkPrinting(true);
          }}
          onBulkPrintCredentials={() => {
            const isEditor = user?.role === 'admin' || user?.role === 'editor';
            const toPrint = participants.filter(p => p.eventId === selectedEventId && (isEditor || p.attended));
            if (toPrint.length === 0) {
              toast.error(isEditor ? 'No hay participantes registrados para generar credenciales.' : 'No hay participantes con asistencia confirmada para generar credenciales.');
              return;
            }
            setBulkPrintType('credentials');
            setIsBulkPrinting(true);
          }}
        />
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

      {activeTab === 'users' && isAdmin && (
        <UserManagement currentUser={user} />
      )}

      {activeTab === 'design' && (
        selectedEvent ? (
          <div className="flex flex-col h-full gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-lg border border-white/5">
                <button
                  onClick={() => setDesignType('certificate')}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-bold transition-all",
                    designType === 'certificate' ? "bg-indigo-600 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  Certificado
                </button>
                <button
                  onClick={() => setDesignType('credential')}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-bold transition-all",
                    designType === 'credential' ? "bg-indigo-600 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  Credencial
                </button>
              </div>

              {designType === 'certificate' && (
                <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-lg border border-white/5">
                  <button
                    onClick={() => setCertificateSide('front')}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-bold transition-all",
                      certificateSide === 'front' ? "bg-indigo-600 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    Frente
                  </button>
                  <button
                    onClick={() => setCertificateSide('back')}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-bold transition-all",
                      certificateSide === 'back' ? "bg-indigo-600 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    Reverso
                  </button>
                </div>
              )}
            </div>
            
            <DesignEditor 
              key={`${selectedEvent.id}-${designType}-${certificateSide}`}
              template={
                designType === 'certificate' 
                  ? (certificateSide === 'front' ? selectedEvent.certificateTemplate : (selectedEvent.certificateBackTemplate || DEFAULT_CERTIFICATE_BACK_TEMPLATE))
                  : selectedEvent.credentialTemplate
              }
              defaultTemplate={
                designType === 'certificate'
                  ? (certificateSide === 'front' ? DEFAULT_CERTIFICATE_TEMPLATE : DEFAULT_CERTIFICATE_BACK_TEMPLATE)
                  : DEFAULT_CREDENTIAL_TEMPLATE
              }
              user={user}
              authorityCount={selectedEvent.authorities?.length || 0}
              onSave={async (template) => {
                if (!selectedEvent) return;
                try {
                  let field = '';
                  if (designType === 'certificate') {
                    field = certificateSide === 'front' ? 'certificateTemplate' : 'certificateBackTemplate';
                  } else {
                    field = 'credentialTemplate';
                  }
                  
                  // Sanitize template to remove undefined values which Firestore doesn't support
                  const sanitizedTemplate = JSON.parse(JSON.stringify(template));
                  await updateDoc(doc(db, 'events', selectedEvent.id), { [field]: sanitizedTemplate });
                  toast.success('Diseño guardado');
                } catch (error) {
                  handleFirestoreError(error, OperationType.UPDATE, `events/${selectedEvent.id}`);
                }
              }}
              title={`${designType === 'certificate' ? (certificateSide === 'front' ? 'Certificado (Frente)' : 'Certificado (Reverso)') : 'Credencial'}: ${selectedEvent.name}`}
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
                    : "bg-zinc-900 border-white/5 hover:border-white/10",
                  !auth.isSignatureActive && "opacity-60"
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
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">{auth.name}</p>
                    {!auth.isSignatureActive && (
                      <span className="text-[9px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20 font-bold uppercase tracking-tight">
                        Sin Firma
                      </span>
                    )}
                  </div>
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
            <label className="block text-sm font-medium text-zinc-400 mb-1">Evento</label>
            <select 
              name="eventId" 
              required 
              defaultValue={editingParticipant?.eventId || selectedEventId || ''}
              className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="" disabled>Selecciona un evento</option>
              {events.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
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
              <option value="logistica">Logística</option>
              <option value="ponente">Ponente</option>
              <option value="protocolo">Protocolo</option>
              <option value="tecnico_informatico">Técnico Informática</option>
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
          {isEditor && (
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
                    disabled={isCompressing}
                    className="flex items-center justify-center gap-2 p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors border border-white/5 disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold uppercase">{isCompressing ? '...' : 'Archivo'}</span>
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
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setIsCompressing(true);
                      try {
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                          const base64 = reader.result as string;
                          const compressed = await compressImage(base64, 800, 0.7);
                          setTempSignatureUrl(compressed);
                        };
                        reader.readAsDataURL(file);
                      } catch (error) {
                        console.error('Error compressing signature:', error);
                      } finally {
                        setIsCompressing(false);
                      }
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
          onSendEmail={(p) => {
            setPreviewParticipant(null);
            setEmailSendingParticipant(p);
          }}
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

      {emailSendingParticipant && selectedEvent && (
        <EmailCertificateManager
          event={selectedEvent}
          participant={emailSendingParticipant}
          authorities={authorities}
          onComplete={() => setEmailSendingParticipant(null)}
        />
      )}
    </Layout>
    </ErrorBoundary>
  );
}
