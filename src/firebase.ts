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

// Initialize Firestore with auto-detect long polling for maximum resilience in sandboxed/iframe environments
const dbId = firebaseConfigData.firestoreDatabaseId || undefined;
export const db = (() => {
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      ignoreUndefinedProperties: true
    }, dbId);
  } catch {
    return dbId ? getFirestore(app, dbId) : getFirestore(app);
  }
})();

// Validate initial backend connectivity with a 3-second fail-fast timeout to prevent blocking UI/startup
async function validateConnectivity() {
  let hasConnected = false;
  
  // Create a timeout promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      if (!hasConnected) {
        reject(new Error("Timeout waiting for Firestore backend connection"));
      }
    }, 3000);
  });

  try {
    // Try to get a dummy doc from the server within 3 seconds
    await Promise.race([
      getDocFromServer(doc(db, 'test', 'connection')),
      timeoutPromise
    ]);
    hasConnected = true;
    console.log("[Firestore] Successfully verified connection to Cloud Firestore backend.");
  } catch (error: any) {
    console.warn("[Firestore] Could not establish connection to backend within 3 seconds. Falling back to offline/cache mode instantly to prevent UI blocking.");
    try {
      // Force Firestore into offline mode immediately to bypass all 10s network timeouts
      await disableNetwork(db);
      console.log("[Firestore] Operating in high-performance local offline cache mode.");
    } catch (err) {
      console.error("[Firestore] Failed to disable network:", err);
    }
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
  email: string | null;
  displayName: string;
  nickname: string;
  avatarUrl: string;
  bio: string;
  createdAt?: Timestamp | Date | number;
  updatedAt?: Timestamp | Date | number;
  stats: {
    gamesPlayed: number;
    distanceDriven: number;
    moneyEarned: number;
  };
}

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

// Auth helpers
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await ensureUserProfileExists(result.user);
    return result.user;
  } catch (err) {
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
      throw new Error("Анонимный вход отключен в настройках проекта Firebase. Пожалуйста, используйте вход через Google.");
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

// User Profile Helpers
export const ensureUserProfileExists = async (user: User, fallbackName?: string) => {
  if (!user) return;
  const userRef = doc(db, "users", user.uid);
  let snap;
  try {
    snap = await getDoc(userRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
    return;
  }

  if (!snap.exists()) {
    const newProfile: UserProfileData = {
      uid: user.uid,
      email: user.email || null,
      displayName: user.displayName || fallbackName || `Racer #${user.uid.slice(0, 5)}`,
      nickname: fallbackName || user.displayName || `Racer #${user.uid.slice(0, 5)}`,
      avatarUrl: user.photoURL || "",
      bio: "Пилот Sandbox 2D",
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
      stats: {
        gamesPlayed: 0,
        distanceDriven: 0,
        moneyEarned: 0
      }
    };
    try {
      await setDoc(userRef, newProfile);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  }
};

export const fetchUserProfile = async (uid: string): Promise<UserProfileData | null> => {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      return snap.data() as UserProfileData;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${uid}`);
    return null;
  }
};

export const updateUserProfile = async (uid: string, updates: Partial<UserProfileData>) => {
  try {
    const sanitized = sanitizeForFirestore(updates);
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, {
      uid,
      ...sanitized,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
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

export const removeP2PServerDoc = async (serverId: string) => {
  try {
    const serverRef = doc(db, "p2p_servers", serverId);
    await deleteDoc(serverRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `p2p_servers/${serverId}`);
  }
};

export const subscribeToP2PServers = (callback: (servers: P2PServerRoom[]) => void) => {
  const colRef = collection(db, "p2p_servers");
  const q = query(colRef, where("status", "in", ["active", "in_game"]));

  return onSnapshot(q, (snapshot) => {
    const servers: P2PServerRoom[] = [];
    snapshot.forEach((docSnap) => {
      servers.push({
        id: docSnap.id,
        ...docSnap.data()
      } as P2PServerRoom);
    });
    // sort locally by updatedAt or createdAt
    servers.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    callback(servers);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, "p2p_servers");
  });
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

// Update player's online status in Firestore
export const updateUserOnlineStatus = async (
  uid: string, 
  status: 'online' | 'offline' | 'in_game', 
  currentRoomCode: string | null = null
) => {
  try {
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, {
      uid,
      status,
      currentRoomCode: currentRoomCode || null,
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }
};

// Search users by nickname or displayName
export const searchUsers = async (searchTerm: string): Promise<UserProfileData[]> => {
  if (!searchTerm.trim()) return [];
  try {
    const term = searchTerm.trim().toLowerCase();
    const colRef = collection(db, "users");
    const snap = await getDocs(query(colRef, limit(50)));
    const results: UserProfileData[] = [];
    
    snap.forEach((d) => {
      const data = d.data() as UserProfileData;
      const nick = (data.nickname || "").toLowerCase();
      const disp = (data.displayName || "").toLowerCase();
      const uid = (data.uid || "").toLowerCase();
      if (nick.includes(term) || disp.includes(term) || uid.includes(term)) {
        results.push(data);
      }
    });
    return results;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, "users");
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

