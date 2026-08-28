import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  baseDatosCierreSeed,
  type NuevoRegistroInput,
  type RegistroCierre,
} from "../data/mock/baseDatosCierre";

type Store = {
  registros: RegistroCierre[];
  upsertRegistro: (input: NuevoRegistroInput) => void;
  selectedFecha: string;
  setSelectedFecha: (fecha: string) => void;
};

const CierreStoreContext = createContext<Store | null>(null);

function mesFromFecha(fecha: string) {
  const meses = [
    "ENERO",
    "FEBRERO",
    "MARZO",
    "ABRIL",
    "MAYO",
    "JUNIO",
    "JULIO",
    "AGOSTO",
    "SEPTIEMBRE",
    "OCTUBRE",
    "NOVIEMBRE",
    "DICIEMBRE",
  ];
  const d = new Date(`${fecha}T12:00:00`);
  return meses[d.getMonth()];
}

function calcDuracion(horaInicio: string, horaFin: string) {
  const [hi, mi] = horaInicio.split(":").map(Number);
  const [hf, mf] = horaFin.split(":").map(Number);
  return hf * 60 + mf - (hi * 60 + mi);
}

export function CierreStoreProvider({ children }: { children: ReactNode }) {
  const [registros, setRegistros] = useState<RegistroCierre[]>(baseDatosCierreSeed);
  const [selectedFecha, setSelectedFecha] = useState(baseDatosCierreSeed[0].fecha);

  const upsertRegistro = useCallback((input: NuevoRegistroInput) => {
    const registro: RegistroCierre = {
      ...input,
      id: input.fecha,
      duracionMin: input.duracionMin ?? calcDuracion(input.horaInicio, input.horaFin),
      mes: mesFromFecha(input.fecha),
      anio: Number(input.fecha.slice(0, 4)),
    };

    setRegistros((prev) => {
      const idx = prev.findIndex((r) => r.fecha === registro.fecha);
      if (idx === -1) return [registro, ...prev];
      const next = [...prev];
      next[idx] = registro;
      return next;
    });
    setSelectedFecha(registro.fecha);
  }, []);

  const value = useMemo(
    () => ({ registros, upsertRegistro, selectedFecha, setSelectedFecha }),
    [registros, upsertRegistro, selectedFecha],
  );

  return <CierreStoreContext.Provider value={value}>{children}</CierreStoreContext.Provider>;
}

export function useCierreStore() {
  const ctx = useContext(CierreStoreContext);
  if (!ctx) throw new Error("useCierreStore must be used within CierreStoreProvider");
  return ctx;
}
