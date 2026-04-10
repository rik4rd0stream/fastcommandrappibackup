/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// Inicialização do Firebase
firebase.initializeApp({
  apiKey: "AIzaSyB8ojoSzZRfgw6PRPTZ-fF3NfZRCJArt5M",
  authDomain: "motoboy-13742.firebaseapp.com",
  projectId: "motoboy-13742",
  storageBucket: "motoboy-13742.firebasestorage.app",
  messagingSenderId: "224481701159",
  appId: "1:224481701159:web:fe86a0fd8404adb876cd02",
});

const messaging = firebase.messaging();

// --- MELHORIA DE ESTABILIDADE PWA ---
// Força o Service Worker a se ativar assim que for instalado, 
// sem esperar que o usuário feche todas as abas.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Garante que o Service Worker tome controle da página imediatamente após a ativação.
self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Captura erros para evitar que o SW "congele" a aplicação
self.addEventListener('error', (event) => {
  console.error('[SW Error]:', event.message);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW Unhandled Rejection]:', event.reason);
});
// ------------------------------------

// Lógica de mensagens em segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Background message:", payload);

  const data = payload.data || {};
  const title = data.title || payload.notification?.title || "Nova Solicitação";
  const body = data.body || payload.notification?.body || "";
  const whatsappUrl = data.whatsappUrl || "";

  const options = {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [200, 100, 200],
    requireInteraction: true,
    data: { whatsappUrl },
    actions: [
      {
        action: "aceitar",
        title: "✅ Aceitar",
      },
    ],
  };

  self.registration.showNotification(title, options);
});

// Lógica de clique na notificação
self.addEventListener("notificationclick", (event) => {
  console.log("[firebase-messaging-sw.js] Notification click:", event.action);
  event.notification.close();

  const whatsappUrl = event.notification.data?.whatsappUrl;

  if (event.action === "aceitar" && whatsappUrl) {
    event.waitUntil(clients.openWindow(whatsappUrl));
  } else if (whatsappUrl) {
    event.waitUntil(clients.openWindow(whatsappUrl));
  }
});
