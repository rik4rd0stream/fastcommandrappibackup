import { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc, orderBy, query, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase"; // Importando seu Firebase
import { onAuthStateChanged, signOut } from "firebase/auth";
import { requestNotificationPermission, onForegroundMessage } from "@/lib/fcm";
import PedidosList from "@/components/PedidosList";
import RTConsulta from "@/components/RTConsulta";
import SolicitacaoPedido from "@/components/SolicitacaoPedido";
import LoginScreen from "@/components/LoginScreen";
import SignupScreen from "@/components/SignupScreen";

interface Motoboy {
  id: string;
  nome: string;
  id_motoboy: string;
}

const COMMANDS = ["!!bundleBR", "!!rebr", "!!Br", "!!forzabr"] as const;

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [perfil, setPerfil] = useState<string | null>(null);
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  const [motoboys, setMotoboys] = useState<Motoboy[]>([]);
  const [comandoAtual, setComandoAtual] = useState("!!bundleBR");
  const [idPedido, setIdPedido] = useState("");
  const [showCadastro, setShowCadastro] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [idMotoboy, setIdMotoboy] = useState("");
  const [pedidosEnviados, setPedidosEnviados] = useState<Set<string>>(new Set());
  const [showRTConsulta, setShowRTConsulta] = useState(false);
  const [showSolicitacao, setShowSolicitacao] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  // --- LÓGICA DE AUTH FIREBASE ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          // Busca o perfil que você criou (Ricardo/Programador) no Firestore
          const docRef = doc(db, "profiles", currentUser.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            setPerfil(data.perfil);
            setNomeUsuario(data.nome);
          } else {
            console.warn("Perfil não encontrado no Firestore para este UID.");
            setPerfil("usuario"); // Padrão se não achar
          }
        } catch (e) {
          console.error("Erro ao buscar perfil no Firestore:", e);
        }
      } else {
        setPerfil(null);
        setNomeUsuario("");
      }
      setAuthLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // Register FCM token only for líder (Mantido do seu código original)
  useEffect(() => {
    if (!user || perfil !== "lider") return;

    const registerFCM = async () => {
      try {
        const token = await requestNotificationPermission("SUA_VAPID_KEY_AQUI"); 
        if (token) {
          await setDoc(doc(db, "usuarios", user.uid), {
            perfil,
            fcmToken: token,
            deviceInfo: navigator.userAgent,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
      } catch (e) {
        console.error("FCM registration error:", e);
      }
    };

    registerFCM();
  }, [user, perfil]);

  // Lista Motoboys do Firestore
  useEffect(() => {
    const q = query(collection(db, "entregadores"), orderBy("nome", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: Motoboy[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as { nome: string; id_motoboy: string }),
      }));
      setMotoboys(list);
    });
    return unsub;
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm animate-pulse">Sincronizando Firebase...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={() => {}} />;
  }

  const perfilLabel = perfil === "programador" ? "Programador" : perfil === "lider" ? "Líder" : "Usuário";
  const canSeeSolicitacao = perfil === "programador";
  const canSeeSignup = perfil === "programador";

  // --- Funções de Salvar/Deletar/Enviar (Mantidas as suas) ---
  const toggleCadastro = () => { setShowCadastro((v) => !v); if (showCadastro) resetForm(); };
  const resetForm = () => { setEditId(null); setNome(""); setIdMotoboy(""); };
  const selecionarMotoboy = (id: string) => {
    const m = motoboys.find((mb) => mb.id === id);
    if (m) { setEditId(m.id); setNome(m.nome); setIdMotoboy(m.id_motoboy); } else { resetForm(); }
  };
  const salvar = async () => {
    if (!nome || !idMotoboy) return alert("Preencha tudo!");
    if (editId) { await updateDoc(doc(db, "entregadores", editId), { nome, id_motoboy: idMotoboy }); }
    else { await addDoc(collection(db, "entregadores"), { nome, id_motoboy: idMotoboy }); }
    resetForm(); setShowCadastro(false);
  };
  const deletar = async () => {
    if (!editId || !confirm("Excluir entregador?")) return;
    await deleteDoc(doc(db, "entregadores", editId));
    resetForm(); setShowCadastro(false);
  };
  const colarPedido = async () => {
    const text = await navigator.clipboard.readText();
    setIdPedido(text.replace(/\D/g, ""));
  };
  const enviar = (nomeMotoboy: string, id: string) => {
    if (!idPedido) return alert("Falta o ID do pedido!");
    const msg = `${comandoAtual} ${idPedido} ${id}`;
    setPedidosEnviados((prev) => new Set(prev).add(idPedido));
    window.location.href = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <div className="max-w-md mx-auto">
        <header className="flex justify-between items-center mb-6 pt-4">
          <div>
            <h1 className="text-2xl font-black italic text-primary tracking-tighter uppercase">Fast Command</h1>
            <p className="text-[10px] text-muted-foreground tracking-[0.3em] uppercase font-bold font-mono">
              Despacho Firebase • {perfilLabel}
            </p>
          </div>
          <div className="flex gap-2">
            {canSeeSolicitacao && (
              <button onClick={() => setShowSolicitacao(true)} className="h-12 px-3 rounded-2xl bg-chart-4/10 border border-chart-4/30 text-[10px] font-bold uppercase">📩 Solicitar</button>
            )}
            {canSeeSignup && (
              <button onClick={() => setShowSignup(true)} className="h-12 px-3 rounded-2xl bg-secondary border border-border text-[10px] font-bold uppercase">👤+</button>
            )}
            <button onClick={() => setShowRTConsulta(true)} className="h-12 px-3 rounded-2xl bg-accent/10 border border-accent/30 text-[10px] font-bold uppercase">📋 RTs</button>
            <button onClick={toggleCadastro} className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/30 text-primary text-2xl font-bold">+</button>
          </div>
        </header>

        <button onClick={handleLogout} className="mb-4 text-[9px] text-muted-foreground uppercase font-mono tracking-widest hover:text-destructive">
          🔒 Sair ({nomeUsuario || user?.email})
        </button>

        {showCadastro && (
          <div className="mb-8 p-6 bg-card rounded-3xl border border-primary/20 shadow-2xl">
            <h3 className="text-xs font-bold text-primary mb-4 uppercase">Gerenciar Motoboys</h3>
            <select value={editId || ""} onChange={(e) => selecionarMotoboy(e.target.value)} className="w-full p-4 mb-3 bg-background rounded-xl border border-border">
              <option value="">+ Novo Motoboy</option>
              {motoboys.map((m) => (<option key={m.id} value={m.id}>{m.nome} (ID: {m.id_motoboy})</option>))}
            </select>
            <input value={nome} onChange={(e) => setNome(e.target.value)} type="text" placeholder="Nome" className="w-full p-4 mb-3 bg-background rounded-xl border border-border" />
            <input value={idMotoboy} onChange={(e) => setIdMotoboy(e.target.value)} type="text" placeholder="ID" className="w-full p-4 mb-4 bg-background rounded-xl border border-border" />
            <div className="flex gap-2">
              <button onClick={salvar} className="flex-1 p-4 bg-primary text-primary-foreground rounded-xl font-bold uppercase text-xs">{editId ? "Atualizar" : "Salvar"}</button>
              {editId && <button onClick={deletar} className="p-4 bg-destructive/20 text-destructive border border-destructive/30 rounded-xl font-bold text-xs uppercase">Excluir</button>}
              <button onClick={toggleCadastro} className="p-4 bg-secondary rounded-xl font-bold text-xs text-secondary-foreground">X</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mb-6">
          {COMMANDS.map((cmd) => (
            <button key={cmd} onClick={() => setComandoAtual(cmd)} className={`p-3 rounded-xl font-bold text-[10px] ${comandoAtual === cmd ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{cmd}</button>
          ))}
        </div>

        <PedidosList onSelectPedido={(id) => setIdPedido(id)} pedidoSelecionado={idPedido} />

        <div className="mb-6">
          <div className="relative mb-2">
            <input value={idPedido} onChange={(e) => setIdPedido(e.target.value.replace(/\D/g, ""))} type="text" placeholder="ID DO PEDIDO" className="w-full p-3.5 bg-background border-2 border-border rounded-2xl text-xl font-black text-center text-primary" />
            {idPedido && <button onClick={() => setIdPedido("")} className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground text-xl">✕</button>}
          </div>
          <button onClick={colarPedido} className="w-full p-3 bg-primary/10 text-primary border border-primary/30 rounded-xl font-bold text-xs uppercase active:scale-95">📋 COLAR MANUAL</button>
        </div>

        <div className="grid grid-cols-3 gap-2 pb-24">
          {motoboys.map((m) => (
            <button key={m.id} onClick={() => enviar(m.nome, m.id_motoboy)} className="w-full h-[90px] p-2 bg-card/80 rounded-xl border border-border flex flex-col justify-center items-center">
              <span className="font-bold text-[13px] text-foreground uppercase text-center leading-tight line-clamp-2">{m.nome}</span>
              <span className="text-[9px] text-primary font-mono font-bold">ID: {m.id_motoboy}</span>
            </button>
          ))}
        </div>
      </div>
      {showRTConsulta && <RTConsulta onClose={() => setShowRTConsulta(false)} motoboys={motoboys} onSelectPedido={(id) => { setIdPedido(id); setShowRTConsulta(false); }} />}
      {showSolicitacao && <SolicitacaoPedido onClose={() => setShowSolicitacao(false)} motoboys={motoboys} comandoAtual={comandoAtual} />}
      {showSignup && (
        <div className="fixed inset-0 bg-background/95 z-50 overflow-y-auto">
          <div className="absolute top-4 right-4">
            <button onClick={() => setShowSignup(false)} className="w-10 h-10 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive font-bold">✕</button>
          </div>
          <SignupScreen onSignup={() => setShowSignup(false)} onGoToLogin={() => setShowSignup(false)} />
        </div>
      )}
    </div>
  );
};

export default Index;
