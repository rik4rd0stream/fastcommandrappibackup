import { useState, useEffect, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const getRedashUrl = () => {
  if (import.meta.env.DEV) {
    return "/api/redash/api/queries/130603/results.json?api_key=VqwlaUY9wOLjhUJTvrfuKdFExSsJG8ktuzUXy4fR";
  }
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/redash-proxy`;
};

interface Pedido {
  order_id: string;
  store_name: string;
  direccion_entrega: string;
}

interface MotoboyRef {
  id: string;
  nome: string;
  id_motoboy: string;
}

interface SolicitacaoPedidoProps {
  onClose: () => void;
  motoboys: MotoboyRef[];
  comandoAtual: string;
}

const SolicitacaoPedido = ({ onClose, motoboys, comandoAtual }: SolicitacaoPedidoProps) => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null);
  const [enviando, setEnviando] = useState(false);

  const buscarPedidos = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const response = await fetch(getRedashUrl());
      if (!response.ok) throw new Error("Erro ao buscar pedidos");
      const data = await response.json();
      const rows = data.query_result.data.rows;

      const pedidosAlphaville = rows.filter((p: any) => p.point_id == 9944);
      const disponiveis = pedidosAlphaville.filter(
        (p: any) => p.rt_asignado_orden === null || p.rt_asignado_orden === ""
      );

      setPedidos(
        disponiveis.map((p: any) => ({
          order_id: String(p.order_id),
          store_name: p.store_name,
          direccion_entrega: p.direccion_entrega || "",
        }))
      );
    } catch {
      setErro("Não foi possível carregar os pedidos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    buscarPedidos();
  }, [buscarPedidos]);

  const enviarSolicitacao = async (motoboy: MotoboyRef) => {
    if (!pedidoSelecionado) return;
    setEnviando(true);

    try {
      // Fetch Líder's FCM token from Firestore
      const liderDoc = await getDoc(doc(db, "usuarios", "lider"));
      if (!liderDoc.exists() || !liderDoc.data()?.fcmToken) {
        alert("❌ O Líder ainda não registrou o dispositivo dele. Peça para ele abrir o app primeiro.");
        setEnviando(false);
        return;
      }

      const targetToken = liderDoc.data().fcmToken;
      const msg = `${comandoAtual} ${pedidoSelecionado.order_id} ${motoboy.id_motoboy}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "⚠️ Solicitação de Envio",
          body: `Ricardo preparou uma nova rota. Clique em Aceitar para enviar ao robô.`,
          whatsappUrl,
          targetToken,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao enviar");
      }

      alert(`✅ Solicitação enviada ao Líder!\nPedido #${pedidoSelecionado.order_id}\nMotoboy: ${motoboy.nome}`);
      setPedidoSelecionado(null);
    } catch (e: any) {
      alert(`❌ Erro: ${e.message || "Verifique a conexão."}`);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/95 z-50 p-4 overflow-y-auto">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6 pt-4">
          <div>
            <h1 className="text-xl font-black italic text-primary tracking-tighter uppercase">
              Solicitação
            </h1>
            <p className="text-[10px] text-muted-foreground tracking-[0.3em] uppercase font-bold font-mono">
              Enviar pedido ao Líder
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={buscarPedidos}
              disabled={loading}
              className="px-3 py-2 bg-primary/10 text-primary rounded-xl font-bold text-[10px] uppercase border border-primary/20 active:scale-95 transition-transform disabled:opacity-50"
            >
              {loading ? "..." : "🔄"}
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-center justify-center text-destructive text-lg font-bold active:scale-90 transition-transform"
            >
              ✕
            </button>
          </div>
        </div>

        {erro && (
          <p className="text-destructive text-[11px] text-center mb-4 bg-destructive/10 rounded-xl p-3 border border-destructive/20">
            {erro}
          </p>
        )}

        <div className="mb-4">
          <h2 className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.3em] ml-2 font-mono italic mb-2">
            1. Selecione o Pedido
          </h2>
          {loading ? (
            <p className="text-muted-foreground text-[11px] animate-pulse text-center py-4">
              Buscando pedidos...
            </p>
          ) : pedidos.length === 0 ? (
            <p className="text-muted-foreground text-[11px] text-center py-4 bg-card rounded-xl border border-border">
              Nenhum pedido Sin RT no momento
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-1.5 max-h-[200px] overflow-y-auto pr-1">
              {pedidos.map((p) => {
                const isSelected = pedidoSelecionado?.order_id === p.order_id;
                return (
                  <button
                    key={p.order_id}
                    onClick={() => setPedidoSelecionado(p)}
                    className={`w-full px-3 py-2 rounded-xl border text-left transition-all active:scale-[0.98] ${
                      isSelected
                        ? "bg-primary/20 border-primary/50 shadow-lg shadow-primary/10"
                        : "bg-card/80 border-border"
                    }`}
                  >
                    <span className="font-bold text-[13px] text-foreground block leading-tight">
                      {p.store_name}
                    </span>
                    {p.direccion_entrega && (
                      <span className="text-[12px] text-muted-foreground block leading-tight mt-0.5 truncate">
                        📍 {p.direccion_entrega}
                      </span>
                    )}
                    <span className={`text-[10px] font-mono font-bold mt-0.5 block ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                      #{p.order_id}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {pedidoSelecionado && (
          <div className="animate-in slide-in-from-bottom-2">
            <div className="mb-3 p-3 bg-primary/10 rounded-xl border border-primary/30">
              <p className="text-[10px] text-muted-foreground font-mono uppercase">Pedido selecionado:</p>
              <p className="text-[13px] font-bold text-primary">
                #{pedidoSelecionado.order_id} - {pedidoSelecionado.store_name}
              </p>
            </div>

            <h2 className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.3em] ml-2 font-mono italic mb-2">
              2. Selecione o Motoboy
            </h2>
            <div className="grid grid-cols-3 gap-2 pb-8">
              {motoboys.map((m) => (
                <button
                  key={m.id}
                  onClick={() => enviarSolicitacao(m)}
                  disabled={enviando}
                  className="w-full h-[90px] p-2 bg-card/80 rounded-xl border border-border active:bg-accent/20 transition-all shadow-lg flex flex-col justify-center items-center overflow-hidden disabled:opacity-50"
                >
                  <span className="font-bold text-[13px] text-foreground uppercase mb-1 line-clamp-2 leading-tight text-center">
                    {m.nome}
                  </span>
                  <span className="text-[9px] text-primary font-mono font-bold tracking-tighter">
                    ID: {m.id_motoboy}
                  </span>
                  <span className="text-[8px] text-accent-foreground mt-1">📩 Enviar</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SolicitacaoPedido;
