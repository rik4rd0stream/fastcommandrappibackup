import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

interface SignupScreenProps {
  onSignup: () => void;
  onGoToLogin: () => void;
}

const SignupScreen = ({ onSignup, onGoToLogin }: SignupScreenProps) => {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [perfil, setPerfil] = useState<"usuario" | "lider" | "programador">("usuario");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!nome || !email || !senha) return setErro("Preencha todos os campos.");
    setLoading(true);
    setErro("");

    try {
      // 1. Cria o usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
      const user = userCredential.user;

      // 2. Salva os dados extras (nome e perfil) no Firestore
      await setDoc(doc(db, "profiles", user.uid), {
        nome: nome,
        perfil: perfil,
        email: email,
        user_id: user.uid,
        createdAt: new Date().toISOString()
      });

      onSignup();
    } catch (error: any) {
      console.error("Erro no cadastro:", error);
      if (error.code === "auth/email-already-in-use") {
        setErro("Este e-mail já está em uso no Firebase.");
      } else {
        setErro("Erro ao criar conta. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black italic text-primary tracking-tighter uppercase">Fast Command</h1>
          <p className="text-[10px] text-muted-foreground tracking-[0.3em] uppercase font-bold font-mono">Cadastro Firebase</p>
        </div>

        <div className="space-y-4">
          <input
            placeholder="Nome Completo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full p-4 bg-background border-2 border-border rounded-2xl text-center font-bold outline-none focus:border-primary/50"
          />
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-4 bg-background border-2 border-border rounded-2xl text-center font-bold outline-none focus:border-primary/50"
          />
          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full p-4 bg-background border-2 border-border rounded-2xl text-center font-bold outline-none focus:border-primary/50"
          />

          <div className="flex gap-2">
            {(["usuario", "lider", "programador"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPerfil(p)}
                className={`flex-1 p-3 rounded-xl text-[10px] font-bold uppercase transition-all ${
                  perfil === p ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground border border-border"
                }`}
              >
                {p === "usuario" ? "Usuário" : p === "lider" ? "Líder" : "Programador"}
              </button>
            ))}
          </div>

          {erro && <p className="text-destructive text-xs text-center bg-destructive/10 p-2 rounded-xl border border-destructive/20">{erro}</p>}

          <button
            onClick={handleSignup}
            disabled={loading}
            className="w-full p-4 bg-primary text-primary-foreground rounded-2xl font-bold uppercase disabled:opacity-50"
          >
            {loading ? "Criando..." : "Criar Conta"}
          </button>

          <button onClick={onGoToLogin} className="w-full text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
            Voltar para o Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignupScreen;
