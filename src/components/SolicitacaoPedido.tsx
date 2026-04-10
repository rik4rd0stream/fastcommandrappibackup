import { useState } from "react";
import PedidosList from "./PedidosList";
import { useToast } from "./ui/use-toast";
import { getFunction } from "@/lib/firebase"; // Importando o helper

interface Motoboy {
  id: string;
  nome: string;
  id_motoboy: string;
}

interface SolicitacaoPedidoProps {
  onClose: () => void;
  motoboys: Motoboy[];
  comandoAtual: string;
}

// A chamada para a Cloud Function agora é real
const notificarLider = getFunction('solicitarAtendimento');

const SolicitacaoPedido = ({
  onClose,
  motoboys,
  comandoAtual,
}: SolicitacaoPedidoProps) => {
  const [idPedido, setIdPedido] = useState("");
  const [loading, setLoading] = useState(false); // Para feedback visual
  const { toast } = useToast();

  const colarPedido = async () => {
    const text = await navigator.clipboard.readText();
    setIdPedido(text.replace(/\D/g, ""));
  };

  const solicitar = async (nomeMotoboy: string, motoboyId: string) => {
    if (!idPedido) {
      toast({
        title: "Erro",
        description: "Você precisa selecionar um ID de pedido.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);

    const msg = `${comandoAtual} ${idPedido} ${motoboyId}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;

    try {
      const result: any = await notificarLider({
        pedidoId: idPedido,
        motoboyId: motoboyId,
        motoboyNome: nomeMotoboy,
        comando: comandoAtual,
        whatsappUrl: whatsappUrl,
      });

      if (result.data.success) {
        toast({
          title: "Sucesso!",
          description: `Solicitação para o pedido #${idPedido} enviada ao líder.`,
          className: "bg-green-500 text-white",
        });
        setIdPedido("");
      } else {
        throw new Error(result.data.message || "Falha ao notificar o líder.");
      }
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro na Solicitação",
        description: error.message || "Não foi possível enviar a notificação.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/95 z-40 p-4 overflow-y-auto">
      <div className="max-w-md mx-auto">
        <header className="flex justify-between items-center mb-6 pt-4">
          <div>
            <h1 className="text-xl font-black italic text-chart-4 tracking-tighter uppercase">
              Solicitar Despacho
            </h1>
            <p className="text-[10px] text-muted-foreground tracking-[0.3em] uppercase font-bold font-mono">
              Selecione o pedido e o motoboy
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-center justify-center text-destructive text-lg font-bold active:scale-90 transition-transform"
          >
            ✕
          </button>
        </header>

        {loading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                <p className="text-lg font-bold animate-pulse">Enviando...</p>
            </div>
        )}

        <PedidosList
          onSelectPedido={(id) => setIdPedido(id)}
          pedidoSelecionado={idPedido}
        />

        <div className="my-6">
          <div className="relative mb-2">
            <input
              value={idPedido}
              onChange={(e) => setIdPedido(e.target.value.replace(/\D/g, ""))}
              type="text"
              placeholder="ID DO PEDIDO"
              className="w-full p-3.5 bg-background border-2 border-border rounded-2xl text-xl font-black text-center text-primary"
            />
            {idPedido && (
              <button
                onClick={() => setIdPedido("")}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground text-xl"
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={colarPedido}
            className="w-full p-3 bg-primary/10 text-primary border border-primary/30 rounded-xl font-bold text-xs uppercase active:scale-95"
          >
            📋 COLAR MANUAL
          </button>
        </div>

        <p className="text-[10px] text-muted-foreground font-mono text-center mb-2">
          Selecione o Motoboy para enviar ao líder:
        </p>

        <div className="grid grid-cols-3 gap-2 pb-24">
          {motoboys.map((m) => (
            <button
              key={m.id}
              onClick={() => solicitar(m.nome, m.id_motoboy)}
              disabled={loading} // Desabilita botões durante o envio
              className="w-full h-[90px] p-2 bg-card/80 rounded-xl border border-border flex flex-col justify-center items-center active:scale-95 transition-transform disabled:opacity-50"
            >
              <span className="font-bold text-[13px] text-foreground uppercase text-center leading-tight line-clamp-2">
                {m.nome}
              </span>
              <span className="text-[9px] text-primary font-mono font-bold">
                ID: {m.id_motoboy}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SolicitacaoPedido;