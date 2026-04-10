const { onCall } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

// Inicializa o Firebase Admin
admin.initializeApp();

exports.enviarNotificacaoHighPriority = onCall(async (request) => {
  const { tokenDestino, titulo, mensagem } = request.data;

  const payload = {
    token: tokenDestino,
    notification: {
      title: titulo,
      body: mensagem,
    },
    // Configurações específicas para furar a economia de bateria no Android
    android: {
      priority: "high",
      notification: {
        sound: "default",
        defaultSound: true,
        notificationPriority: "PRIORITY_MAX", // Força o Android a mostrar na hora
      }
    },
    // Configuração para PWA (Navegador)
    webpush: {
      headers: {
        Urgency: "high",
      },
      notification: {
        requireInteraction: true, // A notificação não some sozinha
        icon: "/icon.png", // Ajuste para o caminho do seu ícone
      },
    },
  };

  try {
    const response = await admin.messaging().send(payload);
    console.log("Notificação enviada com sucesso:", response);
    return { success: true, responseId: response };
  } catch (error) {
    console.error("Erro ao enviar notificação:", error);
    return { success: false, error: error.message };
  }
});