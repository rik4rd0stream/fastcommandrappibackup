import { useState, useEffect, useCallback } from "react";

const getRedashUrl = () => {
  if (import.meta.env.DEV) {
    return "/api/redash/api/queries/130603/results.json?api_key=VqwlaUY9wOLjhUJTvrfuKdFExSsJG8ktuzUXy4fR";
  }
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/redash-proxy`;
};

interface PedidoRT {
  order_id: string;
  store_name: string;
  externo: boolean;
}

interface RTInfo {
  rt_id: string;
  rt_name: string;
  pedidos: PedidoRT[];
}

interface MotoboyRef {
  id_motoboy: string;
  nome: string;
}

interface RTConsultaProps {
  onClose: () => void;
  motoboys: MotoboyRef[];
  onSelectPedido?: (orderId: string) => void;
}

const RTConsulta = ({ onClose, motoboys, onSelectPedido }: RTConsultaProps) => {
  const [rts, setRts] = useState<RTInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const buscar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const response = await fetch(getRedashUrl());
      if (!response.ok) throw new Error("Erro ao buscar dados");
      const data = await response.json();
      const rows = data.query_result.data.rows;

      const motoboyMap = new Map(motoboys.map(m => [m.id_motoboy, m.nome]));

      const alphaville = rows.filter((p: any) => p.point_id == 9944);
      const comRT = alphaville.filter(
        (p: any) => p.rt_asignado_orden !== null && p.rt_asignado_orden !== ""
      );

      const grouped: Record<string, RTInfo> = {};
      comRT.forEach((p: any) => {
        const rtId = String(p.rt_asignado_orden);
        if (!grouped[rtId]) {
          const nomeCadastro = motoboyMap.get(rtId) || "";
          grouped[rtId] = {
            rt_id: rtId,
            rt_name: nomeCadastro,
            pedidos: [],
          };
        }
        
        const esTrusted = String(p.es_trusted || "");
        const isExterno = esTrusted.includes("EXTERNO");
        
        grouped[rtId].pedidos.push({
          order_id: String(p.order_id),
          store_name: p.store_name || "",
          externo: isExterno,
        });
      });

      setRts(
        Object.values(grouped).sort((a, b) => b.pedidos.length - a.pedidos.length)
      );
    } catch {
      setErro("Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    buscar();
  }, [buscar]);

  return (
    <div className="fixed inset-0 bg-background/95 z-50 p-4 overflow-y-auto">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6 pt-4">
          <div>
            <h1 className="text-xl font-black italic text-primary tracking-tighter uppercase">
              Consulta RTs
            </h1>
            <p className="text-[10px] text-muted-foreground tracking-[0.3em] uppercase font-bold font-mono">
              Alphaville
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={buscar}
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

        {loading ? (
          <p className="text-muted-foreground text-[11px] animate-pulse text-center py-8">
            Buscando RTs...
          </p>
        ) : rts.length === 0 ? (
          <p className="text-muted-foreground text-[11px] text-center py-8 bg-card rounded-xl border border-border">
            Nenhum RT com pedidos no momento
          </p>
        ) : (
          <div className="space-y-3 pb-8">
            <p className="text-[10px] text-muted-foreground font-mono text-center">
              {rts.length} RT(s) ativos
            </p>
            {rts.map((rt) => {
              const temExterno = rt.pedidos.some((p) => p.externo);
              const externoCount = rt.pedidos.filter((p) => p.externo).length;
              return (
                <div
                  key={rt.rt_id}
                  className={`p-4 rounded-2xl border ${
                    temExterno
                      ? "bg-destructive/5 border-destructive/30"
                      : "bg-card border-border"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-black text-[14px] text-foreground block">
                        RT: {rt.rt_id}{rt.rt_name ? ` - ${rt.rt_name}` : ""}
                      </span>
                      {temExterno && (
                        <span className="text-[10px] font-bold text-destructive">
                          ❌ {externoCount} externo{externoCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <span className="text-[15px] font-black text-primary bg-primary/15 border-2 border-primary/30 rounded-full px-3.5 py-1 font-mono min-w-[32px] text-center">
                      {rt.pedidos.length}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {rt.pedidos.map((p) => (
                      <div
                        key={p.order_id}
                        className={`flex items-center justify-between text-[11px] px-2 py-1.5 rounded-lg ${
                          p.externo ? "bg-destructive/10" : "bg-background/50"
                        }`}
                      >
                        <span className="text-muted-foreground truncate flex-1">
                          {p.store_name}
                        </span>
                        <div className="flex items-center gap-2 ml-2">
                          {p.externo && (
                            <>
                              <span className="text-destructive text-[9px] font-bold bg-destructive/15 px-1.5 py-0.5 rounded">
                                EXTERNO
                              </span>
                              <button
                                onClick={() => onSelectPedido?.(p.order_id)}
                                className="text-[9px] font-bold bg-primary/15 text-primary px-2 py-0.5 rounded border border-primary/30 active:scale-90 transition-transform"
                              >
                                📋 Usar
                              </button>
                            </>
                          )}
                          <span className="font-mono font-bold text-foreground">
                            #{p.order_id}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RTConsulta;
