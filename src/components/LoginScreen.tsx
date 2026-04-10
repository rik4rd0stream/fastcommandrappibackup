import { useState } from "react";
import { auth } from "@/lib/firebase"; // Importando o seu Firebase
import { signInWithEmailAndPassword } from "firebase/auth";

interface LoginScreenProps {
  onLogin: () => void;
}

const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !senha) return setErro("Preencha todos os campos.");
    setLoading(true);
    setErro("");

    try {
      // TROCADO: Agora usa o Firebase para logar
      await signInWithEmailAndPassword(auth, email, senha);
      onLogin();
    } catch (error: any) {
      console.error("Erro no login:", error);
      setErro("Email ou senha incorretos no Firebase.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black italic text-primary tracking-tighter uppercase">
            Fast Command
          </h1>
          <p className="text-[10px] text-muted-foreground tracking-[0.3em] uppercase font-bold font-mono">
            Identificação Firebase
          </p>
        </div>

        <div className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErro(""); }}
            placeholder="Email"
            className="w-full p-4 bg-background border-2 border-border rounded-2xl text-base font-bold text-center text-foreground outline-none focus:border-primary/50 transition-all"
            autoFocus
          />
          <input
            type="password"
            value={senha}
            onChange={(e) => { setSenha(e.target.value); setErro(""); }}
            placeholder="Senha"
            className="w-full p-4 bg-background border-2 border-border rounded-2xl text-base font-bold text-center text-foreground outline-none focus:border-primary/50 transition-all"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          {erro && (
            <p className="text-destructive text-[11px] text-center bg-destructive/10 rounded-xl p-2 border border-destructive/20">
              {erro}
            </p>
          )}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full p-4 bg-primary text-primary-foreground rounded-2xl font-bold uppercase text-sm active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
