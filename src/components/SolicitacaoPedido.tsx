import { useState, useEffect, useCallback } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getFunctions, httpsCallable } from 'firebase/functions';

const FUNCTIONS_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_FUNCTIONS_BASE_URL || "https://us-central1-motoboy-13742.cloudfunctions.net";

const getRedashUrl = () => {
  // CORRECTED: Use the environment variable for the production URL
  // The "/api" path is a local proxy for development, we need the full functions URL for production.
  // Note: We are assuming redash-proxy is the function name. If not, this needs adjustment.
  // We also remove the hardcoded API key as that should be handled by the proxy function.
  return `${FUNCTIONS_URL}/redash-proxy`;
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
