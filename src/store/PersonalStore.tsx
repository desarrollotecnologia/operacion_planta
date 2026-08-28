import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  asistenciaSeed,
  ESTADOS_NOVEDAD,
  operariosSeed,
  type AsistenciaDia,
  type NuevoOperarioInput,
  type Operario,
} from "../data/mock/operarios";

type ResumenEstado = {
  criterio: string;
  cantidad: number;
  pct: number;
  operarios: string;
};

type PersonalStore = {
  operarios: Operario[];
  asistencias: AsistenciaDia[];
  crearOperario: (input: NuevoOperarioInput) => void;
  guardarAsistencia: (operarioId: string, fecha: string, estadoCodigo: string) => void;
  getAsistencia: (operarioId: string, fecha: string) => string | undefined;
  getResumenDia: (fecha: string, area?: Operario["area"]) => ResumenEstado[];
};

const PersonalStoreContext = createContext<PersonalStore | null>(null);

function shortName(puesto: string, nombreCompleto: string) {
  const first = nombreCompleto.split(" ")[0] ?? nombreCompleto;
  return `${puesto} ${first}`.trim();
}

export function PersonalStoreProvider({ children }: { children: ReactNode }) {
  const [operarios, setOperarios] = useState<Operario[]>(operariosSeed);
  const [asistencias, setAsistencias] = useState<AsistenciaDia[]>(asistenciaSeed);

  const crearOperario = useCallback((input: NuevoOperarioInput) => {
    const op: Operario = {
      ...input,
      id: `op-${Date.now()}`,
      nombreCorto: input.nombreCorto ?? shortName(input.puesto, input.nombreCompleto),
    };
    setOperarios((prev) => [...prev, op].sort((a, b) => a.itemOrden - b.itemOrden));
  }, []);

  const guardarAsistencia = useCallback(
    (operarioId: string, fecha: string, estadoCodigo: string) => {
      setAsistencias((prev) => {
        const idx = prev.findIndex((a) => a.operarioId === operarioId && a.fecha === fecha);
        if (idx === -1) return [...prev, { operarioId, fecha, estadoCodigo }];
        const next = [...prev];
        next[idx] = { operarioId, fecha, estadoCodigo };
        return next;
      });
    },
    [],
  );

  const getAsistencia = useCallback(
    (operarioId: string, fecha: string) =>
      asistencias.find((a) => a.operarioId === operarioId && a.fecha === fecha)?.estadoCodigo,
    [asistencias],
  );

  const getResumenDia = useCallback(
    (fecha: string, area: Operario["area"] = "LINEA"): ResumenEstado[] => {
      const ops = operarios.filter((o) => o.activo && o.area === area);
      const total = ops.length || 1;

      const byEstado = new Map<string, Operario[]>();
      for (const op of ops) {
        const codigo = getAsistencia(op.id, fecha) ?? "LABORANDO";
        const list = byEstado.get(codigo) ?? [];
        list.push(op);
        byEstado.set(codigo, list);
      }

      return ESTADOS_NOVEDAD.filter((e) => (byEstado.get(e.codigo)?.length ?? 0) > 0).map(
        (e) => {
          const list = byEstado.get(e.codigo) ?? [];
          return {
            criterio: e.nombre.toUpperCase(),
            cantidad: list.length,
            pct: list.length / total,
            operarios: list.map((o) => o.nombreCorto).join(" / "),
          };
        },
      );
    },
    [operarios, getAsistencia],
  );

  const value = useMemo(
    () => ({
      operarios,
      asistencias,
      crearOperario,
      guardarAsistencia,
      getAsistencia,
      getResumenDia,
    }),
    [operarios, asistencias, crearOperario, guardarAsistencia, getAsistencia, getResumenDia],
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
