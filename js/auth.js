import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { FIREBASE_CONFIG } from "./firebase-config.js";

const app  = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db   = getFirestore(app);

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function registerUser(name, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await setDoc(doc(db, "users", cred.user.uid), {
    name,
    email,
    createdAt:  serverTimestamp(),
    lastActive: serverTimestamp(),
    progress:   {},
  });
  return cred.user;
}

export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await updateDoc(doc(db, "users", cred.user.uid), { lastActive: serverTimestamp() });
  return cred.user;
}

export async function logoutUser() {
  await signOut(auth);
}

export async function loadUserProgress(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data().progress || null) : null;
}

export function saveUserProgress(uid, progress) {
  updateDoc(doc(db, "users", uid), { progress }).catch(() => {});
}
