import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  collection,
  doc,
  getDocs,
  setDoc,
  writeBatch,
  query,
  where,
  limit,
  serverTimestamp
} from 'firebase/firestore';

// Read from config file
import firebaseConfig from '../firebase-applet-config.json';

// Initialize App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with robust local caching
let db: any;
const dbId = (firebaseConfig as any).firestoreDatabaseId;

try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, dbId);
  console.log("Firestore initialized with persistent offline cache and database ID:", dbId);
} catch (err) {
  console.warn("Failed to initialize offline persistence, falling back to default memory cache:", err);
  db = getFirestore(app, dbId);
}

// No need to call enableIndexedDbPersistence since we already initialized with persistentLocalCache above.
// This prevents SDK warnings/errors about cache configuration redundancy.

const auth = getAuth(app);

export { auth, db };

// Seeding function to create default collections & documents if they are empty
export async function seedDatabaseIfEmpty() {
  try {
    const studiosRef = collection(db, 'studios');
    const snap = await getDocs(query(studiosRef, limit(1)));
    
    if (!snap.empty) {
      console.log("Database already contains data. Skipping seeding.");
      return;
    }
    
    console.log("Database is empty. Seeding default studios, editors, and projects...");
    const batch = writeBatch(db);

    // 1. Seed Default Studios
    const defaultStudios = [
      { id: 'studio-kk', name: 'Wedding By KK', ownerName: 'Satish Tiwari', phone: '+91 98765 43210', email: 'kk@weddingbykk.com', address: 'Civil Lines, Raipur, Chhattisgarh - 492001', notes: 'Premium studio, prefers gold cinema color tone.', createdAt: new Date() }
    ];

    defaultStudios.forEach(studio => {
      const docRef = doc(db, 'studios', studio.id);
      batch.set(docRef, studio);
    });

    // 2. Seed Default Editors in Firestore
    const defaultEditors = [
      { id: 'editor-vansh', name: 'Vansh Tiwari', email: 'vansh@framecut.com', phone: '+91 98333 44455', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', rating: 4.9, joinedDate: '2025-01-15', notes: 'Expert in narrative storytelling, multi-cam sync, and speed ramping.', totalEarnings: 154000, pendingPayments: 24000 },
      { id: 'editor-sid', name: 'Siddharth Roy', email: 'sid@framecut.com', phone: '+91 97777 66655', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200', rating: 4.7, joinedDate: '2025-03-10', notes: 'Strong color grading skills. Works mostly on premium teasers.', totalEarnings: 85000, pendingPayments: 15000 }
    ];

    defaultEditors.forEach(editor => {
      const docRef = doc(db, 'editors', editor.id);
      batch.set(docRef, editor);
    });

    // 3. Seed Default Users (Admin + Editor profiles)
    const defaultUsers = [
      { uid: 'admin-satish', email: 'satish@framecut.com', name: 'Satish Tiwari', role: 'admin', createdAt: new Date() },
      { uid: 'admin-satish-alt', email: 'sateeshtiwari3@gmail.com', name: 'Satish Tiwari', role: 'admin', createdAt: new Date() },
      { uid: 'editor-vansh-auth', email: 'vansh@framecut.com', name: 'Vansh Tiwari', role: 'editor', editorId: 'editor-vansh', createdAt: new Date() },
      { uid: 'studio-kk-auth', email: 'kk@weddingbykk.com', name: 'Wedding By KK', role: 'studio', studioId: 'studio-kk', createdAt: new Date() }
    ];

    defaultUsers.forEach(user => {
      const docRef = doc(db, 'users', user.uid);
      batch.set(docRef, user);
    });

    // 4. Seed Default Projects
    const defaultProjects = [
      {
        id: 'PRJ-2026-001',
        coupleName: 'Aarav & Meera',
        brideName: 'Meera',
        groomName: 'Aarav',
        couplePhoto: 'https://images.unsplash.com/photo-1607190074257-dd4b7af0309f?auto=format&fit=crop&q=80&w=600',
        studioId: 'studio-kk',
        studioName: 'Wedding By KK',
        eventType: 'Wedding + Teaser',
        shootDate: '2026-05-12',
        deliveryDate: '2026-07-05',
        assignedEditorId: 'editor-vansh',
        assignedEditorName: 'Vansh Tiwari',
        status: 'review',
        priority: 'high',
        projectAmount: 241000,
        editorPayment: 25000,
        otherExpenses: 0,
        advancePayment: 140000,
        remainingBalance: 101000,
        notes: 'Needs heavy cinematic warm tones. Deliver 4K Teaser and 30-min Highlights.',
        createdAt: new Date(),
        updatedAt: new Date(),
        // Data manager
        hardDiskName: 'WD Black Wedding-A',
        dataSize: '1.8 TB',
        backupStatus: 'backed_up',
        googleDriveLink: 'https://drive.google.com/drive/folders/aarav_meera',
        deliveryFolder: '/Deliveries/Aarav_Meera_Final',
        rawDataFolder: '/Raw/WD_A/Aarav_Meera',
        finalExportFolder: '/Exports/Aarav_Meera_v2',
        referencePhotos: [
          {
            id: 'ref-seed-01',
            url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800',
            name: 'Mandap_Decor_Lighting.jpg',
            caption: 'Mandap Warm Tungsten Ambient Lighting Reference',
            uploadedAt: '2026-05-12T10:30:00Z',
            storageProvider: 'supabase'
          },
          {
            id: 'ref-seed-02',
            url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&q=80&w=800',
            name: 'Bridal_Entry_Angle.jpg',
            caption: 'Bridal Entry Slow-Mo Gimbal Tracking Reference',
            uploadedAt: '2026-05-12T11:15:00Z',
            storageProvider: 'supabase'
          },
          {
            id: 'ref-seed-03',
            url: 'https://images.unsplash.com/photo-1607190074257-dd4b7af0309f?auto=format&fit=crop&q=80&w=800',
            name: 'Couple_Portrait_Grading.jpg',
            caption: 'Sunset Golden Hour Grade Preset',
            uploadedAt: '2026-05-12T17:45:00Z',
            storageProvider: 'supabase'
          }
        ]
      }
    ];

    defaultProjects.forEach(proj => {
      const docRef = doc(db, 'projects', proj.id);
      batch.set(docRef, proj);
    });

    // 5. Seed Default Expenses
    const defaultExpenses = [
      { id: 'exp-001', amount: 15000, category: 'hard_disk', date: '2026-06-05', description: 'Bought 2x 2TB WD Elements Portable HDDs', createdAt: new Date() },
      { id: 'exp-002', amount: 4500, category: 'internet', date: '2026-06-01', description: 'High-speed fiber internet subscription (1 Gbps)', createdAt: new Date() },
      { id: 'exp-003', amount: 35000, category: 'office_rent', date: '2026-06-01', description: 'June Rent for editing suite', createdAt: new Date() },
      { id: 'exp-004', amount: 8400, category: 'electricity', date: '2026-06-15', description: 'Electricity bill for editing machines & AC', createdAt: new Date() }
    ];

    defaultExpenses.forEach(exp => {
      const docRef = doc(db, 'expenses', exp.id);
      batch.set(docRef, exp);
    });

    // 6. Seed Calendar Events
    const defaultEvents = [
      { id: 'evt-today-1', title: 'Master Cut Export & QC Review', start: '2026-08-09', type: 'delivery', projectId: 'PRJ-2026-001', coupleName: 'Aarav & Meera', color: '#EF4444' },
      { id: 'evt-1', title: 'Deliver Aarav & Meera Teaser', start: '2026-07-05', type: 'delivery', projectId: 'PRJ-2026-001', coupleName: 'Aarav & Meera', color: '#EAB308' }
    ];

    defaultEvents.forEach(evt => {
      const docRef = doc(db, 'calendar', evt.id);
      batch.set(docRef, evt);
    });

    // 8. Seed Default Revisions & Audit Log Entries in 'revisionHistory'
    const defaultRevisions = [
      { 
        id: 'rev-001', 
        projectId: 'PRJ-2026-001', 
        projectCoupleName: 'Aarav & Meera',
        studioName: 'Wedding By KK',
        type: 'revision',
        category: 'revision',
        revisionNumber: 1, 
        notes: 'Studio asked to replace transition at 2:15 and add more groom close-up shots during vows.', 
        date: '2026-06-28', 
        status: 'resolved', 
        performedBy: 'Satish Tiwari',
        performedByRole: 'admin',
        createdAt: new Date('2026-06-28T14:30:00Z') 
      },
      { 
        id: 'rev-002', 
        projectId: 'PRJ-2026-001', 
        projectCoupleName: 'Aarav & Meera',
        studioName: 'Wedding By KK',
        type: 'revision',
        category: 'revision',
        revisionNumber: 2, 
        notes: 'Client requested to change song during sangeet sequence.', 
        date: '2026-06-30', 
        status: 'pending', 
        performedBy: 'Satish Tiwari',
        performedByRole: 'admin',
        createdAt: new Date('2026-06-30T10:15:00Z') 
      },
      {
        id: 'audit-001',
        projectId: 'PRJ-2026-001',
        projectCoupleName: 'Aarav & Meera',
        studioName: 'Wedding By KK',
        type: 'creation',
        category: 'general',
        notes: 'Project created with contract amount ₹2,41,000 and advance ₹1,40,000 for Wedding By KK.',
        date: '2026-05-15',
        status: 'logged',
        performedBy: 'Satish Tiwari',
        performedByRole: 'admin',
        createdAt: new Date('2026-05-15T09:00:00Z')
      },
      {
        id: 'audit-002',
        projectId: 'PRJ-2026-001',
        projectCoupleName: 'Aarav & Meera',
        studioName: 'Wedding By KK',
        type: 'assignment_change',
        category: 'assignment',
        changedField: 'assignedEditor',
        previousValue: 'Unassigned',
        newValue: 'Vansh Tiwari',
        notes: 'Lead Video Editor assigned to Vansh Tiwari (Wage: ₹45,000).',
        date: '2026-05-16',
        status: 'logged',
        performedBy: 'Satish Tiwari',
        performedByRole: 'admin',
        createdAt: new Date('2026-05-16T11:20:00Z')
      },
      {
        id: 'audit-003',
        projectId: 'PRJ-2026-001',
        projectCoupleName: 'Aarav & Meera',
        studioName: 'Wedding By KK',
        type: 'status_change',
        category: 'status',
        changedField: 'status',
        previousValue: 'data_received',
        newValue: 'editing',
        notes: 'Project workflow advanced from Data Received to Active Editing.',
        date: '2026-05-20',
        status: 'logged',
        performedBy: 'Vansh Tiwari',
        performedByRole: 'editor',
        createdAt: new Date('2026-05-20T16:45:00Z')
      },
      {
        id: 'audit-004',
        projectId: 'PRJ-2026-001',
        projectCoupleName: 'Aarav & Meera',
        studioName: 'Wedding By KK',
        type: 'amount_change',
        category: 'financial',
        changedField: 'advancePayment',
        previousValue: 0,
        newValue: 140000,
        notes: 'Advance receipt of ₹1,40,000 verified. Outstanding balance calculated at ₹1,01,000.',
        date: '2026-05-15',
        status: 'logged',
        performedBy: 'Satish Tiwari',
        performedByRole: 'admin',
        createdAt: new Date('2026-05-15T10:00:00Z')
      }
    ];

    defaultRevisions.forEach(rev => {
      const docRef = doc(db, 'revisionHistory', rev.id);
      batch.set(docRef, rev);
    });

    // 9. Seed Default Tasks
    const defaultTasks = [
      { id: 'tsk-001', projectId: 'PRJ-2026-001', projectCoupleName: 'Aarav & Meera', title: 'Draft multi-cam wedding sync', description: 'Align main 3 cameras and separate field recorder audio', assignedTo: 'editor-vansh', dueDate: '2026-06-15', status: 'completed', createdAt: new Date() },
      { id: 'tsk-002', projectId: 'PRJ-2026-001', projectCoupleName: 'Aarav & Meera', title: 'Color grading pass', description: 'Apply warm lut and balance shadows in vows scene', assignedTo: 'editor-vansh', dueDate: '2026-06-28', status: 'in_progress', createdAt: new Date() }
    ];

    defaultTasks.forEach(tsk => {
      const docRef = doc(db, 'tasks', tsk.id);
      batch.set(docRef, tsk);
    });

    // 10. Seed Notifications
    const defaultNotifications = [
      { id: 'notif-1', title: 'Revision Request', message: 'Wedding By KK submitted a revision for Aarav & Meera.', type: 'revision_request', projectId: 'PRJ-2026-001', read: false, createdAt: new Date(Date.now() - 3600000) },
      { id: 'notif-2', title: 'Delivery Pending Tomorrow', message: 'Aarav & Meera is due for delivery tomorrow!', type: 'delivery_tomorrow', projectId: 'PRJ-2026-001', read: false, createdAt: new Date(Date.now() - 7200000) }
    ];

    defaultNotifications.forEach(notif => {
      const docRef = doc(db, 'notifications', notif.id);
      batch.set(docRef, notif);
    });

    await batch.commit();
    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

