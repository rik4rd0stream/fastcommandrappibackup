const {setGlobalOptions} = require("firebase-functions/v2");
const {onRequest} = require("firebase-functions/v2/https");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const axios = require("axios");
const cors = require("cors")({origin: true});

admin.initializeApp();

setGlobalOptions({ 
    region: "us-central1", 
    maxInstances: 10,
});

// FINAL-FIX: This proxy function is the definitive solution.
exports.redashProxy = onRequest((request, response) => {
    cors(request, response, async () => {
        logger.info("Redash Proxy function triggered.");

        const redashApiUrl = "https://redash.rappi.com/api/queries/130603/results.json?api_key=VqwlaUY9wOLjhUJTvrfuKdFExSsJG8ktuzUXy4fR";

        try {
            const redashResponse = await axios.get(redashApiUrl);

            if (redashResponse.status !== 200) {
                logger.error("Redash API returned a non-200 status.", { status: redashResponse.status });
                throw new Error("Failed to fetch data from Redash.");
            }
            
            logger.info("Successfully fetched data from Redash.");
            response.status(200).send(redashResponse.data);

        } catch (error) {
            logger.error("Critical failure in Redash Proxy function.", {
                errorMessage: error.message,
                axiosError: error.response ? error.response.data : "No response from axios",
            });
            response.status(500).send({
                error: "Internal Server Error",
                message: "The server encountered an error while trying to proxy the request to Redash.",
            });
        }
    });
});


exports.createUser = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'A função deve ser chamada por um usuário autenticado.');
    }
    const callerUid = request.auth.uid;
    
    try {
        const callerProfileDoc = await admin.firestore().collection('profiles').doc(callerUid).get();
        if (!callerProfileDoc.exists || callerProfileDoc.data()?.perfil !== 'programador') {
            throw new HttpsError('permission-denied', 'Permissão negada. Apenas programadores podem criar usuários.');
        }

        const { email, password, nome, perfil, recebeNotificacao } = request.data;
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
            user_id: userRecord.uid,
            createdAt: new Date().toISOString()
        };

        const db = admin.firestore();
        const profileRef = db.collection("profiles").doc(userRecord.uid);
        const userRef = db.collection("usuarios").doc(userRecord.uid);
        
        const batch = db.batch();
        batch.set(profileRef, profileData);
        batch.set(userRef, { nome, perfil, recebeNotificacao: !!recebeNotificacao }, { merge: true });

        await batch.commit();

        return { success: true, message: `Usuário '${nome}' criado com sucesso.` };

    } catch (error) {
        logger.error("Falha Crítica ao Criar Usuário:", { details: error.message, fullError: error });
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Ocorreu um erro desconhecido no servidor.');
    }
});

exports.updateUser = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'A função deve ser chamada por um usuário autenticado.');
    }
    const callerUid = request.auth.uid;

    try {
        const callerProfileDoc = await admin.firestore().collection('profiles').doc(callerUid).get();
        if (!callerProfileDoc.exists || callerProfileDoc.data()?.perfil !== 'programador') {
            throw new HttpsError('permission-denied', 'Permissão negada. Apenas programadores podem editar usuários.');
        }

        const { uid, nome, perfil, recebeNotificacao } = request.data;
        if (!uid || !nome || !perfil) {
            throw new HttpsError('invalid-argument', 'Dados incompletos para atualização.');
        }

        const updatedData = { nome, perfil, recebeNotificacao: !!recebeNotificacao };

        const db = admin.firestore();
        const profileRef = db.collection("profiles").doc(uid);
        const userRef = db.collection("usuarios").doc(uid);

        const batch = db.batch();
        batch.update(profileRef, updatedData);
        batch.set(userRef, updatedData, { merge: true });

        await batch.commit();

        return { success: true, message: `Usuário '${nome}' atualizado com sucesso.` };

    } catch (error) {
        logger.error("Falha Crítica ao Atualizar Usuário:", { details: error.message, fullError: error });
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Ocorreu um erro desconhecido no servidor.');
    }
});

exports.enviarNotificacaoHighPriority = onCall(async (request) => {
    const { tokenDestino, titulo, mensagem } = request.data;
    
    const payload = {
      token: tokenDestino,
      notification: { title: titulo, body: mensagem },
      android: {
        priority: "high",
        notification: { sound: "default", notificationPriority: "PRIORITY_MAX" }
      },
      webpush: {
        headers: { Urgency: "high" },
        notification: { requireInteraction: true, icon: "/icon.png" },
      },
    };

    try {
        const response = await admin.messaging().send(payload);
        logger.info("Notificação enviada com sucesso:", response);
        return { success: true, response };
    } catch(error) {
        logger.error("Erro ao enviar notificação:", error);
        throw new HttpsError('internal', error.message || 'Falha ao enviar a notificação.');
    }
});
