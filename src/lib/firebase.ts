import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Esta configuração funciona tanto localmente quanto na Vercel
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB8ojoSzZRfgw6PRPTZ-fF3NfZRCJArt5M",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "motoboy-13742.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "motoboy-13742",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "motoboy-13742.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "224481701159",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:224481701159:web:fe86a0fd8404adb876cd02"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta as instâncias para usar no restante do sistema
export const db = getFirestore(app);
export const auth = getAuth(app);