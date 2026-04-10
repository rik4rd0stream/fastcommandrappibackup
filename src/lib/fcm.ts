import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { initializeApp, getApps } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyB8ojoSzZRfgw6PRPTZ-fF3NfZRCJArt5M",
  authDomain: "motoboy-13742.firebaseapp.com",
  projectId: "motoboy-13742",
  storageBucket: "motoboy-13742.firebasestorage.app",
  messagingSenderId: "224481701159",
  appId: "1:224481701159:web:fe86a0fd8404adb876cd02",
};

// Use existing app or initialize
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let messagingInstance: ReturnType<typeof getMessaging> | null = null;

const getMessagingInstance = () => {
  if (!messagingInstance) {
    messagingInstance = getMessaging(app);
  }
  return messagingInstance;
};

/**
 * Request notification permission and get FCM token.
 * The VAPID key must be from Firebase Console > Project Settings > Cloud Messaging > Web Push certificates.
 */
export const requestNotificationPermission = async (vapidKey: string): Promise<string | null> => {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Notification permission denied");
      return null;
    }

    // Register the Firebase messaging service worker
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    console.log("Firebase SW registered:", registration.scope);

    const messaging = getMessagingInstance();
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    console.log("FCM Token:", token);
    return token;
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
};

/**
 * Listen for foreground messages
 */
export const onForegroundMessage = (callback: (payload: any) => void) => {
  const messaging = getMessagingInstance();
  return onMessage(messaging, callback);
};
