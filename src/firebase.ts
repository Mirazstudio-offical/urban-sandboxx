import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInAnonymously, 
  signOut as firebaseSignOut, 
  onAuthStateChanged, 
  type User, 
  updateProfile 
} from "firebase/auth";
import { 
  getFirestore, 
  initializeFirestore,
  doc, 
  setDoc, 
  getDoc, 
  getDocFromServer,
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  Timestamp,
  orderBy,
  getDocs,
  limit,
  disableNetwork,
  enableNetwork
} from "firebase/firestore";
import firebaseConfigData from "../firebase-applet-config.json";

const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with forced long polling for maximum resilience in proxied/sandboxed iframe environments
const dbId = firebaseConfigData.firestoreDatabaseId || undefined;
export const db = (() => {
  try {
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true
    }, dbId);
  } catch {
    return dbId ? getFirestore(app, dbId) : getFirestore(app);
  }
})();

// Validate initial backend connectivity gracefully in background without blocking or prematurely disabling network
async function validateConnectivity() {
  if (typeof window === 'undefined') return;

  // React to online/offline network lifecycle
  window.addEventListener('online', async () => {
    try {
      await enableNetwork(db);
      console.log("[Firestore] Browser online: network enabled.");
    } catch {}
  });

  window.addEventListener('offline', async () => {
    try {
      await disableNetwork(db);
      console.log("[Firestore] Browser offline: local cache mode active.");
    } catch {}
  });

  if (!navigator.onLine) {
    console.log("[Firestore] Operating in local offline cache mode (browser offline).");
    return;
  }

  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("[Firestore] Successfully verified connection to Cloud Firestore backend.");
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
    // Firestore SDK handles its own background connection retry and offline cache gracefully.
    console.log("[Firestore] Background sync active; local cache ready.");
  }
}
validateConnectivity();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export { onAuthStateChanged, type User } from "firebase/auth";

const sanitizeForFirestore = (obj: any): any => {
  if (obj === undefined || obj === null) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item));
  }
  if (typeof obj === 'object') {
    if (obj instanceof Date) {
      return obj.toISOString();
    }
    const proto = Object.getPrototypeOf(obj);
    if (proto !== null && proto !== Object.prototype) {
      return obj;
    }
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        cleaned[key] = sanitizeForFirestore(val);
      }
    }
    return cleaned;
  }
  return obj;
};

export interface UserProfileData {
  uid: string;
  displayName: string;
  displayNameLower?: string;
  nickname: string;
  nicknameLower?: string;
  avatarUrl: string;
  bio: string;
  status?: 'online' | 'offline' | 'in_game';
  currentRoomCode?: string | null;
  lastSeen?: any;
  createdAt?: Timestamp | Date | number;
  updatedAt?: Timestamp | Date | number;
  stats: {
    gamesPlayed: number;
    distanceDriven: number;
    moneyEarned: number;
  };
}

export type AntiCheatLevel = 'none' | 'moderate' | 'strict';

export interface P2PServerRoom {
  id?: string;
  hostUid: string;
  hostName: string;
  name: string;
  peerId: string;
  maxPlayers: number;
  currentPlayers: number;
  mapName: string;
  gameMode: string;
  isPrivate: boolean;
  status: "active" | "in_game" | "closed";
  createdAt?: any;
  updatedAt?: any;
  trafficEnabled?: boolean;
  vehicleCount?: number;
  pedestrianCount?: number;
  hasPassword?: boolean;
  savePlayerData?: boolean;
  antiCheat?: AntiCheatLevel;
  metadata?: Record<string, any>;
}

export interface PlayerCloudSave {
  uid: string;
  money: number;
  health: number;
  position: { x: number; y: number };
  inventory: any[];
  needs?: any;
  equippedItems?: any;
  version?: string;
  updatedAt?: any;
}

const PUBLIC_PROFILES_COL = "public_profiles";
const P2P_SERVER_STALE_MS = 45_000;

const toLowerNormalized = (val: string | undefined | null, maxLen: number): string => {
  return (val || "").trim().slice(0, maxLen).toLowerCase();
};

const getTimestampMillis = (ts: any): number | null => {
  if (!ts) return null;
  if (typeof ts === "number") return ts;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  if (typeof ts.seconds === "number") return ts.seconds * 1000 + Math.floor((ts.nanoseconds || 0) / 1e6);
  if (ts instanceof Date) return ts.getTime();
  return null;
};

// Auth helpers
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await ensureUserProfileExists(result.user);
    return result.user;
  } catch (err: any) {
    if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain')) {
      const customErr = new Error(
        'Вход через Google временно недоступен на этом адресе. Вы можете продолжить игру с гостевым профилем.'
      );
      (customErr as any).code = 'auth/unauthorized-domain';
      console.warn('[Firebase Auth] Google Sign-In unavailable on current host.');
      throw customErr;
    }
    console.error("Google Auth error:", err);
    throw err;
  }
};

export const loginAnonymously = async (nickname?: string) => {
  try {
    const result = await signInAnonymously(auth);
    if (nickname && result.user) {
      await updateProfile(result.user, { displayName: nickname });
    }
    await ensureUserProfileExists(result.user, nickname);
    return result.user;
  } catch (err: any) {
    if (err?.code === 'auth/admin-restricted-operation' || err?.message?.includes('admin-restricted-operation')) {
      console.warn("Anonymous Authentication is disabled in Firebase console project settings.");
      throw new Error("Гостевой облачный вход сейчас отключен. Используйте вход через Google или играйте локально.");
    }
    console.error("Anonymous Auth error:", err);
    throw err;
  }
};

export const logoutUser = async () => {
  return await firebaseSignOut(auth);
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, shouldThrow = false) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const isOfflineOrUnavailable = errMsg.includes('unavailable') || errMsg.includes('offline') || errMsg.includes('Could not reach Cloud Firestore') || errMsg.includes('client is offline');

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  if (isOfflineOrUnavailable) {
    console.warn(`[Firestore Offline/Cache] Operation: ${operationType}, Path: ${path} —`, errMsg);
  } else {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  }

  if (shouldThrow && !isOfflineOrUnavailable) {
    throw new Error(JSON.stringify(errInfo));
  }
  return errInfo;
}

// User Profile Helpers (public non-PII profiles stored in `public_profiles/{uid}` without email)
export const ensureUserProfileExists = async (user: User, fallbackName?: string) => {
  if (!user) return;
  const pubRef = doc(db, PUBLIC_PROFILES_COL, user.uid);
  let pubSnap;
  try {
    pubSnap = await getDoc(pubRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `${PUBLIC_PROFILES_COL}/${user.uid}`);
    return;
  }

  if (!pubSnap.exists()) {
    // Check own legacy private user doc to migrate existing nickname/bio/stats without exposing email
    let legacy: any = null;
    try {
      const legacySnap = await getDoc(doc(db, "users", user.uid));
      if (legacySnap.exists()) legacy = legacySnap.data();
    } catch {
      // Ignore if legacy doc does not exist
    }

    const displayName = String(legacy?.displayName || user.displayName || fallbackName || `Racer #${user.uid.slice(0, 5)}`).trim().slice(0, 64);
    const nickname = String(legacy?.nickname || fallbackName || user.displayName || `Racer #${user.uid.slice(0, 5)}`).trim().slice(0, 32);
    const bioRaw = typeof legacy?.bio === 'string' && legacy.bio.trim() ? legacy.bio : "Пилот flatbody";
    const bio = bioRaw.replace(/Sandbox 2D/gi, "flatbody").slice(0, 300);

    const newProfile: UserProfileData = {
      uid: user.uid,
      displayName,
      displayNameLower: toLowerNormalized(displayName, 64),
      nickname,
      nicknameLower: toLowerNormalized(nickname, 32),
      avatarUrl: String(legacy?.avatarUrl || user.photoURL || "").slice(0, 512),
      bio,
      status: 'online',
      currentRoomCode: null,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
      lastSeen: serverTimestamp() as any,
      stats: legacy?.stats || {
        gamesPlayed: 0,
        distanceDriven: 0,
        moneyEarned: 0
      }
    };
    try {
      await setDoc(pubRef, newProfile);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${PUBLIC_PROFILES_COL}/${user.uid}`);
    }
  } else {
    // Ensure lowercase search fields are populated for older docs
    const data = pubSnap.data() as UserProfileData;
    const expectedDispLower = toLowerNormalized(data.displayName, 64);
    const expectedNickLower = toLowerNormalized(data.nickname, 32);
    if (data.displayNameLower !== expectedDispLower || data.nicknameLower !== expectedNickLower) {
      try {
        await setDoc(pubRef, {
          uid: user.uid,
          displayNameLower: expectedDispLower,
          nicknameLower: expectedNickLower,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `${PUBLIC_PROFILES_COL}/${user.uid}`);
      }
    }
  }
};

export const fetchUserProfile = async (uid: string): Promise<UserProfileData | null> => {
  try {
    const snap = await getDoc(doc(db, PUBLIC_PROFILES_COL, uid));
    if (snap.exists()) {
      return snap.data() as UserProfileData;
    }
    // Fallback to own legacy doc if current user hasn't migrated yet
    if (auth.currentUser?.uid === uid) {
      const legacySnap = await getDoc(doc(db, "users", uid));
      if (legacySnap.exists()) {
        const legacy = legacySnap.data() as any;
        const { email: _ignoredEmail, ...safeProfile } = legacy;
        return safeProfile as UserProfileData;
      }
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `${PUBLIC_PROFILES_COL}/${uid}`);
    return null;
  }
};

export const updateUserProfile = async (uid: string, updates: Partial<UserProfileData>) => {
  try {
    const sanitized = sanitizeForFirestore(updates);
    // Strictly strip any PII fields like email before writing to public_profiles
    delete sanitized.email;

    if (typeof sanitized.displayName === 'string') {
      sanitized.displayName = sanitized.displayName.trim().slice(0, 64);
      sanitized.displayNameLower = toLowerNormalized(sanitized.displayName, 64);
    }
    if (typeof sanitized.nickname === 'string') {
      sanitized.nickname = sanitized.nickname.trim().slice(0, 32);
      sanitized.nicknameLower = toLowerNormalized(sanitized.nickname, 32);
    }
    if (typeof sanitized.avatarUrl === 'string') {
      sanitized.avatarUrl = sanitized.avatarUrl.trim().slice(0, 512);
    }
    if (typeof sanitized.bio === 'string') {
      sanitized.bio = sanitized.bio.trim().slice(0, 300);
    }

    const pubRef = doc(db, PUBLIC_PROFILES_COL, uid);
    await setDoc(pubRef, {
      uid,
      ...sanitized,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${PUBLIC_PROFILES_COL}/${uid}`);
  }
};

// P2P Servers Firestore API
export const createP2PServerDoc = async (roomData: Omit<P2PServerRoom, "id">): Promise<string> => {
  try {
    const sanitized = sanitizeForFirestore(roomData);
    const colRef = collection(db, "p2p_servers");
    const docRef = await addDoc(colRef, {
      ...sanitized,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "p2p_servers");
    throw err;
  }
};

export const updateP2PServerHeartbeat = async (serverId: string, currentPlayers: number, status: P2PServerRoom["status"] = "active") => {
  try {
    const serverRef = doc(db, "p2p_servers", serverId);
    await updateDoc(serverRef, {
      currentPlayers,
      status,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `p2p_servers/${serverId}`);
  }
};

export const updateP2PServerSettings = async (serverId: string, settings: Partial<P2PServerRoom>) => {
  try {
    const serverRef = doc(db, "p2p_servers", serverId);
    const sanitized = sanitizeForFirestore(settings);
    await updateDoc(serverRef, {
      ...sanitized,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `p2p_servers/${serverId}`);
  }
};

export const removeP2PServerDoc = async (serverId: string) => {
  try {
    const serverRef = doc(db, "p2p_servers", serverId);
    await deleteDoc(serverRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `p2p_servers/${serverId}`);
  }
};

const filterLiveP2PServers = (rawServers: P2PServerRoom[]): P2PServerRoom[] => {
  const now = Date.now();
  const live = rawServers.filter((srv) => {
    if (srv.status !== "active" && srv.status !== "in_game") return false;
    const updatedMs = getTimestampMillis(srv.updatedAt) ?? getTimestampMillis(srv.createdAt);
    // Pending local serverTimestamp() resolves to null briefly right after creation — keep it visible
    if (updatedMs === null) return true;
    return now - updatedMs <= P2P_SERVER_STALE_MS;
  });
  live.sort((a, b) => (getTimestampMillis(b.updatedAt) ?? getTimestampMillis(b.createdAt) ?? 0) - (getTimestampMillis(a.updatedAt) ?? getTimestampMillis(a.createdAt) ?? 0));
  return live;
};

export const subscribeToP2PServers = (callback: (servers: P2PServerRoom[]) => void) => {
  const colRef = collection(db, "p2p_servers");
  const q = query(colRef, where("status", "in", ["active", "in_game"]));

  let latestRaw: P2PServerRoom[] = [];
  const emitLive = () => {
    callback(filterLiveP2PServers(latestRaw));
  };

  const unsubSnapshot = onSnapshot(q, (snapshot) => {
    const servers: P2PServerRoom[] = [];
    snapshot.forEach((docSnap) => {
      servers.push({
        id: docSnap.id,
        ...docSnap.data()
      } as P2PServerRoom);
    });
    latestRaw = servers;
    emitLive();
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, "p2p_servers");
  });

  // Periodically evict rooms whose hosts disconnected without closing cleanly
  const sweepTimer = typeof window !== 'undefined'
    ? window.setInterval(emitLive, 10_000)
    : undefined;

  return () => {
    unsubSnapshot();
    if (sweepTimer !== undefined) {
      window.clearInterval(sweepTimer);
    }
  };
};

// Cloud Save Helpers
export const savePlayerDataToCloud = async (uid: string, saveData: Omit<PlayerCloudSave, "uid">) => {
  try {
    const sanitized = sanitizeForFirestore(saveData);
    const saveRef = doc(db, "player_saves", uid);
    await setDoc(saveRef, {
      uid,
      ...sanitized,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `player_saves/${uid}`);
  }
};

export const loadPlayerDataFromCloud = async (uid: string): Promise<PlayerCloudSave | null> => {
  try {
    const saveRef = doc(db, "player_saves", uid);
    const snap = await getDoc(saveRef);
    if (snap.exists()) {
      return snap.data() as PlayerCloudSave;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `player_saves/${uid}`);
    return null;
  }
};

// ==================== FRIENDS & ONLINE SYSTEM API ====================

export interface FriendRequestData {
  id?: string;
  senderUid: string;
  senderName: string;
  receiverUid: string;
  receiverName: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt?: any;
  updatedAt?: any;
}

export interface FriendshipData {
  id?: string;
  users: [string, string];
  user1: { uid: string; name: string; nickname?: string; avatarUrl?: string };
  user2: { uid: string; name: string; nickname?: string; avatarUrl?: string };
  createdAt?: any;
}

export interface WorldInviteData {
  id?: string;
  senderUid: string;
  senderName: string;
  receiverUid: string;
  roomCode: string;
  serverName: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt?: any;
  updatedAt?: any;
}

// Update player's online status in Firestore (public_profiles only, no PII)
export const updateUserOnlineStatus = async (
  uid: string, 
  status: 'online' | 'offline' | 'in_game', 
  currentRoomCode: string | null = null
) => {
  try {
    const pubRef = doc(db, PUBLIC_PROFILES_COL, uid);
    await setDoc(pubRef, {
      uid,
      status,
      currentRoomCode: currentRoomCode ? currentRoomCode.slice(0, 64) : null,
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${PUBLIC_PROFILES_COL}/${uid}`);
  }
};

// Indexed prefix search across all players by nickname, displayName, or exact UID (scales beyond 50 users)
export const searchUsers = async (searchTerm: string): Promise<UserProfileData[]> => {
  const raw = searchTerm.trim();
  if (!raw) return [];
  const term = raw.toLowerCase();
  const termEnd = term + '\uf8ff';

  try {
    const colRef = collection(db, PUBLIC_PROFILES_COL);
    const byNicknameQ = query(
      colRef,
      where("nicknameLower", ">=", term),
      where("nicknameLower", "<=", termEnd),
      limit(20)
    );
    const byDisplayNameQ = query(
      colRef,
      where("displayNameLower", ">=", term),
      where("displayNameLower", "<=", termEnd),
      limit(20)
    );

    const tasks: Promise<UserProfileData[]>[] = [
      getDocs(byNicknameQ).then((snap) => snap.docs.map((d) => d.data() as UserProfileData)),
      getDocs(byDisplayNameQ).then((snap) => snap.docs.map((d) => d.data() as UserProfileData)),
    ];

    // Also allow exact UID lookup if the query looks like a valid document ID
    if (/^[a-zA-Z0-9_-]{6,128}$/.test(raw)) {
      tasks.push(
        getDoc(doc(db, PUBLIC_PROFILES_COL, raw))
          .then((snap) => (snap.exists() ? [snap.data() as UserProfileData] : []))
          .catch(() => [])
      );
    }

    const batches = await Promise.all(tasks);
    const dedup = new Map<string, UserProfileData>();
    for (const batch of batches) {
      for (const user of batch) {
        if (user?.uid && !dedup.has(user.uid)) {
          dedup.set(user.uid, user);
        }
      }
    }
    return Array.from(dedup.values()).slice(0, 25);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, PUBLIC_PROFILES_COL);
    return [];
  }
};

// Send a Friend Request
export const sendFriendRequest = async (
  senderUid: string, 
  senderName: string, 
  receiverUid: string, 
  receiverName: string
): Promise<string> => {
  try {
    const reqId = `${senderUid}_${receiverUid}`;
    const reqRef = doc(db, "friend_requests", reqId);
    await setDoc(reqRef, {
      senderUid,
      senderName,
      receiverUid,
      receiverName,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return reqId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "friend_requests");
    throw err;
  }
};

// Accept a Friend Request
export const acceptFriendRequest = async (request: FriendRequestData, currentUserProfile: UserProfileData | null) => {
  try {
    // 1. Update request status
    if (request.id) {
      await updateDoc(doc(db, "friend_requests", request.id), {
        status: 'accepted',
        updatedAt: serverTimestamp()
      });
    }

    // 2. Create friendship record
    const friendId = [request.senderUid, request.receiverUid].sort().join("_");
    const friendRef = doc(db, "friends", friendId);
    
    const senderInfo = {
      uid: request.senderUid,
      name: request.senderName,
      avatarUrl: ''
    };
    const receiverInfo = {
      uid: request.receiverUid,
      name: currentUserProfile?.displayName || currentUserProfile?.nickname || request.receiverName,
      avatarUrl: currentUserProfile?.avatarUrl || ''
    };

    await setDoc(friendRef, {
      users: [request.senderUid, request.receiverUid],
      user1: senderInfo,
      user2: receiverInfo,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "friends");
    throw err;
  }
};

// Reject or remove a Friend Request
export const rejectFriendRequest = async (requestId: string) => {
  try {
    await deleteDoc(doc(db, "friend_requests", requestId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `friend_requests/${requestId}`);
  }
};

// Remove a Friend
export const removeFriend = async (friendshipId: string) => {
  try {
    await deleteDoc(doc(db, "friends", friendshipId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `friends/${friendshipId}`);
  }
};

// Subscribe to Friends
export const subscribeToFriends = (uid: string, callback: (friends: FriendshipData[]) => void) => {
  const colRef = collection(db, "friends");
  const q = query(colRef, where("users", "array-contains", uid));

  return onSnapshot(q, (snap) => {
    const list: FriendshipData[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as FriendshipData);
    });
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, "friends");
  });
};

// Subscribe to Incoming Friend Requests
export const subscribeToIncomingRequests = (uid: string, callback: (reqs: FriendRequestData[]) => void) => {
  const colRef = collection(db, "friend_requests");
  const q = query(colRef, where("receiverUid", "==", uid), where("status", "==", "pending"));

  return onSnapshot(q, (snap) => {
    const list: FriendRequestData[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as FriendRequestData);
    });
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, "friend_requests");
  });
};

// Subscribe to Outgoing Friend Requests
export const subscribeToOutgoingRequests = (uid: string, callback: (reqs: FriendRequestData[]) => void) => {
  const colRef = collection(db, "friend_requests");
  const q = query(colRef, where("senderUid", "==", uid), where("status", "==", "pending"));

  return onSnapshot(q, (snap) => {
    const list: FriendRequestData[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as FriendRequestData);
    });
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, "friend_requests");
  });
};

// Send World Invite
export const sendWorldInvite = async (
  senderUid: string,
  senderName: string,
  receiverUid: string,
  roomCode: string,
  serverName: string
) => {
  try {
    const colRef = collection(db, "invites");
    await addDoc(colRef, {
      senderUid,
      senderName,
      receiverUid,
      roomCode,
      serverName,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "invites");
    throw err;
  }
};

// Subscribe to Incoming World Invites
export const subscribeToWorldInvites = (uid: string, callback: (invites: WorldInviteData[]) => void) => {
  const colRef = collection(db, "invites");
  const q = query(colRef, where("receiverUid", "==", uid), where("status", "==", "pending"));

  return onSnapshot(q, (snap) => {
    const list: WorldInviteData[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as WorldInviteData);
    });
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, "invites");
  });
};

// Respond to World Invite
export const respondToWorldInvite = async (inviteId: string, status: 'accepted' | 'declined') => {
  try {
    const inviteRef = doc(db, "invites", inviteId);
    await updateDoc(inviteRef, {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `invites/${inviteId}`);
  }
};

// ==================== HOSTED SERVER PERSISTENCE (DB + LOCAL FALLBACK) ====================

export interface HostedServerBackup {
  id?: string;
  hostUid: string;
  hostName?: string;
  roomCode: string;
  serverName: string;
  mapName: string;
  gameMode: string;
  access: 'all' | 'code';
  maxPlayers: number;
  trafficEnabled: boolean;
  vehicleCount: number;
  pedestrianCount: number;
  passwordRequired: boolean;
  savePlayerData: boolean;
  antiCheat: AntiCheatLevel;
  accounts?: Record<string, any>;
  bans?: Record<string, any>;
  mutes?: Record<string, any>;
  playerSaves?: Record<string, any>;
  hostWorldState?: Record<string, any> | null;
  accountsCount?: number;
  bansCount?: number;
  savedPlayersCount?: number;
  lastSavedAt?: number;
  createdAt?: any;
  updatedAt?: any;
  /** Client-only flag indicating whether this backup is synced in Firestore or local-only */
  storageSource?: 'cloud' | 'local';
}

const HOSTED_SERVERS_COL = "hosted_servers";
const LOCAL_HOSTED_SERVERS_KEY = "flatbody_hosted_servers_local_v1";
const localHostedListeners = new Set<() => void>();

const notifyLocalHostedListeners = () => {
  localHostedListeners.forEach((cb) => {
    try { cb(); } catch {}
  });
};

export const buildHostedServerDocId = (hostUid: string, roomCode: string): string => {
  const cleanUid = (hostUid || 'local').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60) || 'local';
  const cleanRoom = (roomCode || 'room').toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 60) || 'room';
  return `${cleanUid}_${cleanRoom}`.slice(0, 128);
};

export const loadLocalHostedServers = (): HostedServerBackup[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_HOSTED_SERVERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return [];
    return Object.values(parsed)
      .filter((v): v is HostedServerBackup => Boolean(v && typeof v === 'object' && (v as any).roomCode))
      .map((v) => ({ ...v, storageSource: v.storageSource || 'local' }))
      .sort((a, b) => (b.lastSavedAt || 0) - (a.lastSavedAt || 0));
  } catch {
    return [];
  }
};

const writeLocalHostedServer = (backup: HostedServerBackup) => {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LOCAL_HOSTED_SERVERS_KEY);
    const map: Record<string, HostedServerBackup> = raw ? JSON.parse(raw) : {};
    const key = backup.roomCode.toLowerCase();
    map[key] = backup;
    localStorage.setItem(LOCAL_HOSTED_SERVERS_KEY, JSON.stringify(map));
    notifyLocalHostedListeners();
  } catch (err) {
    console.warn('[HostedServers] Failed to write local backup:', err);
  }
};

const removeLocalHostedServer = (roomCode: string) => {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LOCAL_HOSTED_SERVERS_KEY);
    if (!raw) return;
    const map: Record<string, HostedServerBackup> = JSON.parse(raw);
    delete map[roomCode.toLowerCase()];
    localStorage.setItem(LOCAL_HOSTED_SERVERS_KEY, JSON.stringify(map));
    notifyLocalHostedListeners();
  } catch {}
};

/**
 * Ensures the serialized server backup fits safely under Firestore's 1MB document limit
 * by trimming heavy non-essential mesh/prop arrays if needed while preserving accounts, bans, and player saves.
 */
const trimBackupForFirestore = (payload: Record<string, any>): Record<string, any> => {
  const MAX_BYTES = 850_000;
  try {
    let serialized = JSON.stringify(payload);
    if (serialized.length <= MAX_BYTES) return payload;

    // Pass 1: drop groundItems and bulky vehicle deformation vertices from hostWorldState
    if (payload.hostWorldState && typeof payload.hostWorldState === 'object') {
      const hw = { ...payload.hostWorldState };
      delete hw.groundItems;
      if (Array.isArray(hw.vehicles)) {
        hw.vehicles = hw.vehicles.slice(0, 25).map((v: any) => {
          if (!v || typeof v !== 'object') return v;
          const copy = { ...v };
          if (copy.damage && typeof copy.damage === 'object') {
            const dmg = { ...copy.damage };
            delete dmg.deformedVertices;
            delete dmg.scratches;
            copy.damage = dmg;
          }
          return copy;
        });
      }
      payload = { ...payload, hostWorldState: hw };
      serialized = JSON.stringify(payload);
      if (serialized.length <= MAX_BYTES) return payload;

      // Pass 2: drop apartments furniture details if still large
      const hw2 = { ...hw };
      delete hw2.apartmentsState;
      delete hw2.furnitureStorageState;
      payload = { ...payload, hostWorldState: hw2 };
    }
  } catch {}
  return payload;
};

/**
 * Saves a hosted server's complete state (settings, password accounts, bans, mutes, player saves, host world state).
 * Persists to Cloud Firestore (`hosted_servers/{hostUid}_{roomCode}`) when signed in, plus local cache.
 */
export const saveHostedServerBackup = async (
  backup: Omit<HostedServerBackup, 'id' | 'createdAt' | 'updatedAt' | 'storageSource'>
): Promise<{ savedToCloud: boolean; savedLocally: boolean; docId: string }> => {
  const now = Date.now();
  const cleanRoom = (backup.roomCode || 'room').trim().slice(0, 64);
  const currentUid = auth.currentUser?.uid || '';
  const accountsObj = backup.accounts && typeof backup.accounts === 'object' ? backup.accounts : {};
  const bansObj = backup.bans && typeof backup.bans === 'object' ? backup.bans : {};
  const mutesObj = backup.mutes && typeof backup.mutes === 'object' ? backup.mutes : {};
  const playerSavesObj = backup.playerSaves && typeof backup.playerSaves === 'object' ? backup.playerSaves : {};

  const docId = buildHostedServerDocId(currentUid || backup.hostUid || 'local', cleanRoom);

  const basePayload: Record<string, any> = sanitizeForFirestore({
    hostUid: (currentUid || backup.hostUid || 'local').slice(0, 128),
    hostName: (backup.hostName || 'Хост').trim().slice(0, 64),
    roomCode: cleanRoom,
    serverName: (backup.serverName || `Сервер ${cleanRoom}`).trim().slice(0, 80),
    mapName: (backup.mapName || 'flatbody').trim().slice(0, 64),
    gameMode: (backup.gameMode || 'free_roam').trim().slice(0, 32),
    access: backup.access === 'code' ? 'code' : 'all',
    maxPlayers: Math.max(1, Math.min(32, Math.round(backup.maxPlayers || 8))),
    trafficEnabled: Boolean(backup.trafficEnabled),
    vehicleCount: Math.max(0, Math.min(200, Math.round(backup.vehicleCount ?? 15))),
    pedestrianCount: Math.max(0, Math.min(200, Math.round(backup.pedestrianCount ?? 10))),
    passwordRequired: Boolean(backup.passwordRequired),
    savePlayerData: backup.savePlayerData !== false,
    antiCheat: (backup.antiCheat === 'none' || backup.antiCheat === 'strict') ? backup.antiCheat : 'moderate',
    accounts: accountsObj,
    bans: bansObj,
    mutes: mutesObj,
    playerSaves: playerSavesObj,
    hostWorldState: backup.hostWorldState || null,
    accountsCount: Object.keys(accountsObj).length,
    bansCount: Object.keys(bansObj).length,
    savedPlayersCount: Object.keys(playerSavesObj).length,
    lastSavedAt: now
  });

  // Always write local mirror synchronously so tab close / offline still preserves data
  writeLocalHostedServer({
    ...(basePayload as HostedServerBackup),
    id: docId,
    storageSource: currentUid ? 'cloud' : 'local'
  });

  if (!currentUid) {
    return { savedToCloud: false, savedLocally: true, docId };
  }

  try {
    const cloudPayload = trimBackupForFirestore({
      ...basePayload,
      hostUid: currentUid
    });
    const ref = doc(db, HOSTED_SERVERS_COL, docId);
    const existingSnap = await getDoc(ref).catch(() => null);
    if (existingSnap && existingSnap.exists()) {
      await setDoc(ref, {
        ...cloudPayload,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } else {
      await setDoc(ref, {
        ...cloudPayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    return { savedToCloud: true, savedLocally: true, docId };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${HOSTED_SERVERS_COL}/${docId}`);
    return { savedToCloud: false, savedLocally: true, docId };
  }
};

export const deleteHostedServerBackup = async (serverId: string | undefined, roomCode: string): Promise<void> => {
  removeLocalHostedServer(roomCode);
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) return;
  const targetId = serverId || buildHostedServerDocId(currentUid, roomCode);
  try {
    await deleteDoc(doc(db, HOSTED_SERVERS_COL, targetId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${HOSTED_SERVERS_COL}/${targetId}`);
  }
};

/**
 * Subscribes to the signed-in host's saved servers in Firestore (and merges with local fallback backups).
 */
export const subscribeToHostedServers = (
  hostUid: string | null | undefined,
  callback: (servers: HostedServerBackup[]) => void
) => {
  let cloudServers: HostedServerBackup[] = [];

  const emitMerged = () => {
    const byRoom = new Map<string, HostedServerBackup>();
    // Local backups first
    for (const loc of loadLocalHostedServers()) {
      if (!hostUid || !loc.hostUid || loc.hostUid === 'local' || loc.hostUid === hostUid) {
        byRoom.set(loc.roomCode.toLowerCase(), { ...loc, storageSource: 'local' });
      }
    }
    // Cloud backups override local if newer (or always preferred when synced)
    for (const cld of cloudServers) {
      const key = cld.roomCode.toLowerCase();
      const localExisting = byRoom.get(key);
      if (!localExisting || (cld.lastSavedAt || 0) >= (localExisting.lastSavedAt || 0)) {
        byRoom.set(key, { ...cld, storageSource: 'cloud' });
      } else {
        byRoom.set(key, { ...localExisting, id: cld.id, storageSource: 'cloud' });
      }
    }
    const merged = Array.from(byRoom.values()).sort(
      (a, b) => (b.lastSavedAt || 0) - (a.lastSavedAt || 0)
    );
    callback(merged);
  };

  localHostedListeners.add(emitMerged);
  emitMerged();

  let unsubSnapshot: (() => void) | null = null;
  if (hostUid) {
    const colRef = collection(db, HOSTED_SERVERS_COL);
    const q = query(colRef, where("hostUid", "==", hostUid));
    unsubSnapshot = onSnapshot(q, (snap) => {
      const list: HostedServerBackup[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as HostedServerBackup;
        list.push({
          ...data,
          id: docSnap.id,
          storageSource: 'cloud'
        });
      });
      cloudServers = list;
      emitMerged();
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, HOSTED_SERVERS_COL);
    });
  }

  return () => {
    localHostedListeners.delete(emitMerged);
    if (unsubSnapshot) unsubSnapshot();
  };
};


