import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError } from "../lib/api";
import type { NuevoRegistroInput, RegistroCierre } from "../data/types";

type Store = {
  registros: RegistroCierre[];
  cargando: boolean;
  error: string | null;
  guardando: boolean;
  upsertRegistro: (input: NuevoRegistroInput) => Promise<RegistroCierre | null>;
  recargar: () => Promise<void>;
  selectedFecha: string;
  setSelectedFecha: (fecha: string) => void;
};

const CierreStoreContext = createContext<Store | null>(null);

export function CierreStoreProvider({ children }: { children: ReactNode }) {
  const [registros, setRegistros] = useState<RegistroCierre[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFecha, setSelectedFecha] = useState("");

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const datos = await api.cierres({ anio: 2026, hasta: "2026-08-27" });
      setRegistros(datos);
      setError(null);
      // Al primer cargue selecciona el dia mas reciente.
      setSelectedFecha((actual) =>
        actual && datos.some((r) => r.fecha === actual) ? actual : (datos[0]?.fecha ?? ""),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar los cierres.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const upsertRegistro = useCallback(async (input: NuevoRegistroInput) => {
    setGuardando(true);
    try {
      const guardado = await api.guardarCierre(input);
      setRegistros((prev) => {
        const idx = prev.findIndex((r) => r.fecha === guardado.fecha);
        if (idx === -1) {
          return [guardado, ...prev].sort((a, b) => b.fecha.localeCompare(a.fecha));
        }
        const next = [...prev];
        next[idx] = guardado;
        return next;
      });
      setSelectedFecha(guardado.fecha);
      setError(null);
      return guardado;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el cierre.");
      return null;
    } finally {
      setGuardando(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      registros,
      cargando,
      guardando,
      error,
      upsertRegistro,
      recargar,
      selectedFecha,
      setSelectedFecha,
    }),
    [registros, cargando, guardando, error, upsertRegistro, recargar, selectedFecha],
  );

  return <CierreStoreContext.Provider value={value}>{children}</CierreStoreContext.Provider>;
}

export function useCierreStore() {
  const ctx = useContext(CierreStoreContext);
  if (!ctx) throw new Error("useCierreStore must be used within CierreStoreProvider");
  return ctx;
}
