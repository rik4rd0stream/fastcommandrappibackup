
import {setGlobalOptions} from "firebase-functions/v2";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();

setGlobalOptions({ region: "us-central1", maxInstances: 10, cors: true });

export const solicitarAtendimento = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'A função deve ser chamada por um usuário autenticado.');
    }
    const solicitanteUid = request.auth.uid;
    const solicitanteNome = request.auth.token.name || 'Usuário';

    // VERIFICAÇÃO DE PERMISSÃO
    const solicitanteProfileDoc = await admin.firestore().collection('profiles').doc(solicitanteUid).get();
    const solicitanteProfile = solicitanteProfileDoc.data();

    if (solicitanteProfile?.perfil !== 'programador' && solicitanteProfile?.podeSolicitar !== true) {
         throw new HttpsError('permission-denied', 'Você não tem permissão para realizar esta ação.');
    }

    const { pedidoId, motoboyNome, whatsappUrl } = request.data;
    if (!pedidoId || !motoboyNome || !whatsappUrl) {
        throw new HttpsError('invalid-argument', 'Dados da solicitação incompletos.');
    }

    logger.info(`Iniciando solicitação por ${solicitanteNome}`, { data: request.data });

    const db = admin.firestore();
    const lideresSnapshot = await db.collection('profiles')
                                    .where('perfil', '==', 'lider')
                                    .where('recebeNotificacao', '==', true)
                                    .get();

    if (lideresSnapshot.empty) {
        throw new HttpsError('not-found', 'Nenhum líder configurado para receber notificações.');
    }

    const tokens = lideresSnapshot.docs.map(doc => doc.data().fcmToken).filter(token => typeof token === 'string' && token.length > 0);

    if (tokens.length === 0) {
        throw new HttpsError('not-found', 'Nenhum líder possui dispositivo registrado para notificações.');
    }
    
    const messagePayload = {
        notification: {
            title: 'Nova Solicitação de Despacho',
            body: `${solicitanteNome} solicitou o pedido #${pedidoId} para ${motoboyNome}.`,
        },
        data: { whatsappUrl: whatsappUrl, action: 'confirmar_solicitacao' },
        webpush: { notification: { icon: 'https://fastcommand.vercel.app/icon-192x192.png', actions: [{ action: 'abrir_whatsapp', title: 'Aceitar e Abrir' }] } },
        android: { priority: "high", notification: { sound: "default", priority: "max" } },
    };

    try {
        const response = await admin.messaging().sendToDevice(tokens, messagePayload);
        logger.info('Notificações enviadas:', { successCount: response.successCount, failureCount: response.failureCount });
        return { success: true, message: `Notificação enviada para ${response.successCount} líder(es).` };
    } catch (error) {
        logger.error("Erro ao enviar notificações:", error);
        throw new HttpsError('internal', 'Erro no servidor ao enviar notificações.');
    }
});

export const createUser = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'A função deve ser chamada por um usuário autenticado.');
    }
    const callerUid = request.auth.uid;
    
    try {
        const callerProfileDoc = await admin.firestore().collection('profiles').doc(callerUid).get();
        if (callerProfileDoc.data()?.perfil !== 'programador') {
            throw new HttpsError('permission-denied', 'Apenas programadores podem criar usuários.');
        }

        // Adicionando 'podeSolicitar' na desestruturação
        const { email, password, nome, perfil, recebeNotificacao, podeSolicitar } = request.data;
        if (!email || !password || !nome || !perfil) {
            throw new HttpsError('invalid-argument', 'Dados incompletos para criação.');
        }

        const userRecord = await admin.auth().createUser({ email, password, displayName: nome, disabled: false });
        logger.info(`Usuário criado no Auth com UID: ${userRecord.uid}`);

        const profileData = {
            nome,
            perfil,
            email,
            recebeNotificacao: !!recebeNotificacao,
            podeSolicitar: !!podeSolicitar, // Salvando o novo campo
            user_id: userRecord.uid,
            createdAt: new Date().toISOString()
        };

        const db = admin.firestore();
        const profileRef = db.collection("profiles").doc(userRecord.uid);
        // O antigo 'usuarios' pode ser removido se não for mais usado em outras partes
        const userRef = db.collection("usuarios").doc(userRecord.uid);
        
        const batch = db.batch();
        batch.set(profileRef, profileData);
        batch.set(userRef, { nome, perfil, recebeNotificacao: !!recebeNotificacao, podeSolicitar: !!podeSolicitar }, { merge: true });

        await batch.commit();

        return { success: true, message: `Usuário '${nome}' criado com sucesso.` };

    } catch (error: any) {
        logger.error("Falha Crítica ao Criar Usuário:", { details: error.message, fullError: error });
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Ocorreu um erro no servidor.');
    }
});

export const updateUser = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'A função deve ser chamada por um usuário autenticado.');
    }
    const callerUid = request.auth.uid;

    try {
        const callerProfileDoc = await admin.firestore().collection('profiles').doc(callerUid).get();
        if (callerProfileDoc.data()?.perfil !== 'programador') {
            throw new HttpsError('permission-denied', 'Apenas programadores podem editar usuários.');
        }

        // Adicionando 'podeSolicitar' na desestruturação
        const { uid, nome, perfil, recebeNotificacao, podeSolicitar } = request.data;
        if (!uid || !nome || !perfil) {
            throw new HttpsError('invalid-argument', 'Dados incompletos para atualização.');
        }

        const updatedData = { nome, perfil, recebeNotificacao: !!recebeNotificacao, podeSolicitar: !!podeSolicitar }; // Salvando o novo campo

        const db = admin.firestore();
        const profileRef = db.collection("profiles").doc(uid);
        // O antigo 'usuarios' pode ser removido se não for mais usado
        const userRef = db.collection("usuarios").doc(uid);

        const batch = db.batch();
        batch.update(profileRef, updatedData);
        batch.set(userRef, updatedData, { merge: true });

        await batch.commit();

        return { success: true, message: `Usuário '${nome}' atualizado com sucesso.` };

    } catch (error: any) {
        logger.error("Falha Crítica ao Atualizar Usuário:", { details: error.message, fullError: error });
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Ocorreu um erro no servidor.');
    }
});

export const enviarNotificacaoHighPriority = onCall(async (request) => {
    const { tokenDestino, titulo, mensagem } = request.data;
    const payload = { token: tokenDestino, notification: { title, body: mensagem }, android: { priority: "high", notification: { sound: "default", notificationPriority: "PRIORITY_MAX" } }, webpush: { headers: { Urgency: "high" }, notification: { requireInteraction: true, icon: "/icon.png" } } };
    try {
        const response = await admin.messaging().send(payload);
        logger.info("Notificação enviada:", response);
        return { success: true, response };
    } catch(error: any) {
        logger.error("Erro ao enviar notificação:", error);
        throw new HttpsError('internal', error.message || 'Falha ao enviar a notificação.');
    }
});
