
import {setGlobalOptions} from "firebase-functions/v2";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();

// Definindo a região globalmente
setGlobalOptions({ region: "us-central1" });

// Função para solicitar atendimento, agora com CORS definido corretamente
export const solicitarAtendimento = onCall({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'A função deve ser chamada por um usuário autenticado.');
    }
    const solicitanteUid = request.auth.uid;
    const solicitanteNome = request.auth.token.name || 'Usuário';

    const db = admin.firestore();
    const solicitanteProfileDoc = await db.collection('profiles').doc(solicitanteUid).get();
    const solicitanteProfile = solicitanteProfileDoc.data();

    if (solicitanteProfile?.perfil !== 'programador' && solicitanteProfile?.podeSolicitar !== true) {
         throw new HttpsError('permission-denied', 'Você não tem permissão para realizar esta ação.');
    }

    const { pedidoId, motoboyNome, whatsappUrl } = request.data;
    if (!pedidoId || !motoboyNome || !whatsappUrl) {
        throw new HttpsError('invalid-argument', 'Dados da solicitação incompletos.');
    }

    logger.info(`Iniciando solicitação por ${solicitanteNome}`, { data: request.data });

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
    
    // CORREÇÃO: Usando `sendEachForMulticast` que é o método correto e mais robusto
    const message = {
        notification: {
            title: 'Nova Solicitação de Despacho',
            body: `${solicitanteNome} solicitou o pedido #${pedidoId} para ${motoboyNome}.`,
        },
        data: { whatsappUrl: whatsappUrl, action: 'confirmar_solicitacao' },
        webpush: { notification: { icon: 'https://fastcommand.vercel.app/icon-192x192.png', actions: [{ action: 'abrir_whatsapp', title: 'Aceitar e Abrir' }] } },
        android: { priority: "high" as const, notification: { sound: "default", priority: "max" as const } }, // Corrigido com "as const"
    };

    try {
        // CORREÇÃO: Substituído `sendToDevice` por `sendEachForMulticast`
        const response = await admin.messaging().sendEachForMulticast({ tokens, ...message });
        logger.info('Notificações enviadas:', { successCount: response.successCount, failureCount: response.failureCount });
        return { success: true, message: `Notificação enviada para ${response.successCount} líder(es).` };
    } catch (error) {
        logger.error("Erro ao enviar notificações:", error);
        throw new HttpsError('internal', 'Erro no servidor ao enviar notificações.');
    }
});

// Função para criar usuário, com CORS e código limpo
export const createUser = onCall({ cors: true }, async (request) => {
    if (!request.auth || !request.auth.uid) {
        throw new HttpsError('unauthenticated', 'A função deve ser chamada por um usuário autenticado.');
    }
    const callerUid = request.auth.uid;
    
    try {
        const db = admin.firestore();
        const callerProfileDoc = await db.collection('profiles').doc(callerUid).get();
        if (callerProfileDoc.data()?.perfil !== 'programador') {
            throw new HttpsError('permission-denied', 'Apenas programadores podem criar usuários.');
        }

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
            podeSolicitar: !!podeSolicitar,
            user_id: userRecord.uid,
            createdAt: new Date().toISOString()
        };

        await db.collection("profiles").doc(userRecord.uid).set(profileData);

        return { success: true, message: `Usuário '${nome}' criado com sucesso.` };

    } catch (error: any) {
        logger.error("Falha Crítica ao Criar Usuário:", { details: error.message, fullError: error });
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Ocorreu um erro no servidor.');
    }
});

// Função para atualizar usuário, com CORS e código limpo
export const updateUser = onCall({ cors: true }, async (request) => {
    if (!request.auth || !request.auth.uid) {
        throw new HttpsError('unauthenticated', 'A função deve ser chamada por um usuário autenticado.');
    }
    const callerUid = request.auth.uid;

    try {
        const db = admin.firestore();
        const callerProfileDoc = await db.collection('profiles').doc(callerUid).get();
        if (callerProfileDoc.data()?.perfil !== 'programador') {
            throw new HttpsError('permission-denied', 'Apenas programadores podem editar usuários.');
        }

        logger.info("Iniciando processo de atualização de usuário."); // LOG ADICIONADO PARA FORÇAR DEPLOY

        const { uid, nome, perfil, recebeNotificacao, podeSolicitar } = request.data;
        if (!uid || !nome || !perfil) {
            throw new HttpsError('invalid-argument', 'Dados incompletos para atualização.');
        }

        const updatedData = { 
            nome, 
            perfil, 
            recebeNotificacao: !!recebeNotificacao, 
            podeSolicitar: !!podeSolicitar 
        };

        await db.collection("profiles").doc(uid).update(updatedData);

        return { success: true, message: `Usuário '${nome}' atualizado com sucesso.` };

    } catch (error: any) {
        logger.error("Falha Crítica ao Atualizar Usuário:", { details: error.message, fullError: error });
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Ocorreu um erro no servidor.');
    }
});
