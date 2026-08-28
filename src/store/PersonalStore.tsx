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
import type {
  Area,
  AsistenciaDia,
  EstadoNovedad,
  NuevoOperarioInput,
  Operario,
} from "../data/types";
import { ESTADOS_NOVEDAD } from "../data/mock/operarios";

type ResumenEstado = {
  criterio: string;
  cantidad: number;
  pct: number;
  operarios: string;
};

type PersonalStore = {
  operarios: Operario[];
  asistencias: AsistenciaDia[];
  estados: EstadoNovedad[];
  cargando: boolean;
  error: string | null;
  crearOperario: (input: NuevoOperarioInput) => Promise<Operario | null>;
  guardarAsistencia: (operarioId: string, fecha: string, estadoCodigo: string) => Promise<void>;
  getAsistencia: (operarioId: string, fecha: string) => string | undefined;
  getResumenDia: (fecha: string, area?: Area) => ResumenEstado[];
  recargar: () => Promise<void>;
};

const PersonalStoreContext = createContext<PersonalStore | null>(null);

export function PersonalStoreProvider({ children }: { children: ReactNode }) {
  const [operarios, setOperarios] = useState<Operario[]>([]);
  const [asistencias, setAsistencias] = useState<AsistenciaDia[]>([]);
  const [estados, setEstados] = useState<EstadoNovedad[]>(ESTADOS_NOVEDAD);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const [ops, asis, cat] = await Promise.all([
        api.operarios(),
        api.asistencia(),
        api.catalogos(),
      ]);
      setOperarios(ops);
      setAsistencias(asis);
      if (cat.estados.length) setEstados(cat.estados);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar el personal.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const crearOperario = useCallback(async (input: NuevoOperarioInput) => {
    try {
      const creado = await api.crearOperario(input);
      setOperarios((prev) => [...prev, creado].sort((a, b) => a.itemOrden - b.itemOrden));
      setError(null);
      return creado;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el operario.");
      return null;
    }
  }, []);

  const guardarAsistencia = useCallback(
    async (operarioId: string, fecha: string, estadoCodigo: string) => {
      const anterior = asistencias;
      // Actualiza la vista de inmediato; si la API falla se revierte.
      setAsistencias((prev) => {
        const idx = prev.findIndex((a) => a.operarioId === operarioId && a.fecha === fecha);
        if (idx === -1) return [...prev, { operarioId, fecha, estadoCodigo }];
        const next = [...prev];
        next[idx] = { operarioId, fecha, estadoCodigo };
        return next;
      });

      try {
        await api.guardarAsistencia(operarioId, fecha, estadoCodigo);
        setError(null);
      } catch (err) {
        setAsistencias(anterior);
        setError(err instanceof ApiError ? err.message : "No se pudo guardar la asistencia.");
      }
    },
    [asistencias],
  );

  const getAsistencia = useCallback(
    (operarioId: string, fecha: string) =>
      asistencias.find((a) => a.operarioId === operarioId && a.fecha === fecha)?.estadoCodigo,
    [asistencias],
  );

  const getResumenDia = useCallback(
    (fecha: string, area: Area = "LINEA"): ResumenEstado[] => {
      const ops = operarios.filter((o) => o.activo && o.area === area);
      const total = ops.length || 1;

      const byEstado = new Map<string, Operario[]>();
      for (const op of ops) {
        const codigo = getAsistencia(op.id, fecha) ?? "LABORANDO";
        const list = byEstado.get(codigo) ?? [];
        list.push(op);
        byEstado.set(codigo, list);
      }

      return estados
        .filter((e) => (byEstado.get(e.codigo)?.length ?? 0) > 0)
        .map((e) => {
          const list = byEstado.get(e.codigo) ?? [];
          return {
            criterio: e.nombre.toUpperCase(),
            cantidad: list.length,
            pct: list.length / total,
            operarios: list.map((o) => o.nombreCorto).join(" / "),
          };
        });
    },
    [operarios, getAsistencia, estados],
  );

  const value = useMemo(
    () => ({
      operarios,
      asistencias,
      estados,
      cargando,
      error,
      crearOperario,
      guardarAsistencia,
      getAsistencia,
      getResumenDia,
      recargar,
    }),
    [
      operarios,
      asistencias,
      estados,
      cargando,
      error,
      crearOperario,
      guardarAsistencia,
      getAsistencia,
      getResumenDia,
      recargar,
    ],
  );

  return (
    <PersonalStoreContext.Provider value={value}>{children}</PersonalStoreContext.Provider>
  );
}

export function usePersonalStore() {
  const ctx = useContext(PersonalStoreContext);
  if (!ctx) throw new Error("usePersonalStore must be used within PersonalStoreProvider");
  return ctx;
}
