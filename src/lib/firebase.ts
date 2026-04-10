import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // <--- ADICIONE ISSO

const firebaseConfig = {
  apiKey: "AIzaSyB8ojoSzZRfgw6PRPTZ-fF3NfZRCJArt5M",
  authDomain: "motoboy-13742.firebaseapp.com",
  projectId: "motoboy-13742",
  storageBucket: "motoboy-13742.firebasestorage.app",
  messagingSenderId: "224481701159",
  appId: "1:224481701159:web:fe86a0fd8404adb876cd02",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app); // <--- ADICIONE ISSO E EXPORTE
