import { useState, useEffect, useCallback } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "@/lib/firebase";
import { useToast } from "@/components/ui/use-toast";

interface UserProfile {
  user_id: string;
  nome: string;
  email: string;
  perfil: "usuario" | "lider" | "programador";
  recebeNotificacao: boolean;
}

interface GerenciadorUsuariosProps {
  onClose: () => void;
}

const GerenciadorUsuarios = ({ onClose }: GerenciadorUsuariosProps) => {
  const [usuarios, setUsuarios] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(true);

  // Campos do formulário
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [perfil, setPerfil] = useState<"usuario" | "lider" | "programador">("usuario");
  const [recebeNotificacao, setRecebeNotificacao] = useState(true);
  
  const [loadingAction, setLoadingAction] = useState(false);
  const [erro, setErro] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, "profiles"), orderBy("nome", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const usersList: UserProfile[] = snapshot.docs.map(doc => doc.data() as UserProfile);
      setUsuarios(usersList);
      setLoadingUsers(false);
    }, (error) => {
      console.error("Erro ao buscar usuários:", error);
      setErro("Não foi possível carregar a lista de usuários.");
      setLoadingUsers(false);
    });
    return unsub;
  }, []);

  const resetForm = useCallback(() => {
    setNome("");
    setEmail("");
    setSenha("");
    setPerfil("usuario");
    setRecebeNotificacao(true);
    setErro("");
    setLoadingAction(false);
  }, []);

  const handleUserSelection = (userId: string) => {
    setSelectedUserId(userId);
    if (userId === "new") {
      setIsNewUser(true);
      resetForm();
    } else {
      const user = usuarios.find(u => u.user_id === userId);
      if (user) {
        setIsNewUser(false);
        setNome(user.nome);
        setEmail(user.email);
        setPerfil(user.perfil);
        setRecebeNotificacao(user.recebeNotificacao);
        setSenha(""); // Limpa o campo de senha na edição
        setErro("");
      }
    }
  };

  const handleSave = async () => {
    if (!nome || (!isNewUser && !selectedUserId)) {
      return setErro("O nome é obrigatório.");
    }
    if (isNewUser && (!email || !senha)) {
        return setErro("E-mail e senha são obrigatórios para novos usuários.");
    }

    setLoadingAction(true);
    setErro("");

    try {
      const functions = getFunctions(undefined, 'us-central1'); // CORREÇÃO: Especificando a região
      let result: any;

      if (isNewUser) {
        const createUser = httpsCallable(functions, 'createUser');
        result = await createUser({ nome, email, password: senha, perfil, recebeNotificacao });
      } else {
        const updateUser = httpsCallable(functions, 'updateUser');
        result = await updateUser({ uid: selectedUserId, nome, perfil, recebeNotificacao });
      }

      toast({
        title: "Sucesso!",
        description: result.data.message,
        variant: "success",
      });
      
      handleUserSelection("new");

    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      setErro(error.message || "Ocorreu um erro desconhecido.");
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/95 z-50 p-4 overflow-y-auto">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6 pt-4">
            <h1 className="text-xl font-black italic text-primary tracking-tighter uppercase">Gerenciar Usuários</h1>
            <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive font-bold text-lg">✕</button>
        </div>

        <div className="space-y-4">
            <select 
                value={selectedUserId || "new"}
                onChange={(e) => handleUserSelection(e.target.value)}
                disabled={loadingUsers}
                className="w-full p-4 mb-3 bg-background border-2 border-border rounded-2xl font-bold outline-none focus:border-primary/50"
            >
                <option value="new">+ Novo Usuário</option>
                {usuarios.map(u => <option key={u.user_id} value={u.user_id}>{u.nome}</option>)}
            </select>

            <input
                placeholder="Nome Completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full p-4 bg-card border-2 border-border rounded-2xl text-center font-bold outline-none focus:border-primary/50"
            />
            <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!isNewUser}
                className="w-full p-4 bg-card border-2 border-border rounded-2xl text-center font-bold outline-none focus:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {isNewUser && (
                <input
                    type="password"
                    placeholder="Senha (mín. 6 caracteres)"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="w-full p-4 bg-card border-2 border-border rounded-2xl text-center font-bold outline-none focus:border-primary/50"
                />
            )}

            <div className="flex gap-2">
                {(["usuario", "lider", "programador"] as const).map((p) => (
                <button
                    key={p}
                    onClick={() => setPerfil(p)}
                    className={`flex-1 p-3 rounded-xl text-[10px] font-bold uppercase transition-all ${
                    perfil === p ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground border border-border"
                    }`}
                >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
                ))}
            </div>

            <div 
                onClick={() => setRecebeNotificacao(!recebeNotificacao)}
                className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-secondary border border-border cursor-pointer transition-all"
            >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${recebeNotificacao ? 'bg-primary' : 'bg-background'}`}>
                    {recebeNotificacao && <span className="text-primary-foreground text-xs">✓</span>}
                </div>
                <span className="text-sm font-bold text-muted-foreground">Receber Notificações</span>
            </div>

            {erro && <p className="text-destructive text-xs text-center bg-destructive/10 p-2 rounded-xl border border-destructive/20">{erro}</p>}

            <button
                onClick={handleSave}
                disabled={loadingAction}
                className="w-full p-4 bg-primary text-primary-foreground rounded-2xl font-bold uppercase disabled:opacity-50"
            >
                {loadingAction ? "Salvando..." : (isNewUser ? "Criar Conta" : "Atualizar Usuário")}
            </button>
        </div>
      </div>
    </div>
  );
};

export default GerenciadorUsuarios;