/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// Configuração do Firebase
firebase.initializeApp({
  apiKey: "AIzaSyB8ojoSzZRfgw6PRPTZ-fF3NfZRCJArt5M",
  authDomain: "motoboy-13742.firebaseapp.com",
  projectId: "motoboy-13742",
  storageBucket: "motoboy-13742.firebasestorage.app",
  messagingSenderId: "224481701159",
  appId: "1:224481701159:web:fe86a0fd8404adb876cd02",
});

const messaging = firebase.messaging();

// Força a ativação e controle imediato do Service Worker
self.addEventListener("install", (event) => { self.skipWaiting(); });
self.addEventListener("activate", (event) => { event.waitUntil(clients.claim()); });

// --- NOVO: Manipulador de mensagens em segundo plano ---
// Este handler é mais inteligente: ele usa o título, corpo e ações enviados pelo backend.
messaging.onBackgroundMessage((payload) => {
  console.log("[SW] Mensagem em background recebida:", payload);

  const notification = payload.notification || {};
  const data = payload.data || {};
  
  const title = notification.title || 'Nova Notificação';
  const options = {
    body: notification.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    // Passa TODOS os dados (action, whatsappUrl) para a notificação.
    data: data, 
    // Usa as ações customizadas enviadas pelo backend (ex: 'Aceitar e Abrir')
    actions: payload.webpush?.notification?.actions || [{ action: 'open', title: 'Abrir App' }]
  };

  self.registration.showNotification(title, options);
});


// --- NOVO: Manipulador de clique na notificação ---
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Clique na notificação:", event);
  event.notification.close();

  const data = event.notification.data || {};
  const notificationAction = data.action; // ex: 'confirmar_solicitacao'
  const whatsappUrl = data.whatsappUrl;

  // Se a notificação for uma solicitação, abra o app para confirmação.
  if (notificationAction === 'confirmar_solicitacao' && whatsappUrl) {
    
    // Constrói a URL da aplicação com os parâmetros para confirmação.
    const appUrl = new URL('/', self.location.origin);
    appUrl.searchParams.set('action', 'confirmar_solicitacao');
    appUrl.searchParams.set('whatsapp_url', encodeURIComponent(whatsappUrl));

    // Procura por uma aba aberta do app e a foca/navega.
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        if (clientList.length > 0) {
          const client = clientList[0];
          client.navigate(appUrl.href);
          return client.focus();
        }
        // Se não houver abas abertas, abre uma nova.
        return clients.openWindow(appUrl.href);
      })
    );
  } else if (whatsappUrl) {
    // Comportamento antigo como fallback.
    console.log("[SW] Ação não é de confirmação, abrindo WhatsApp diretamente.");
    event.waitUntil(clients.openWindow(whatsappUrl));
  }
});
