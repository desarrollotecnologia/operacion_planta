import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { CierreProcesoData, NovedadesDiaData, SimulacionData } from "../data/types";

export function useCierreVistas(fecha: string) {
  const [simulacion, setSimulacion] = useState<SimulacionData | null>(null);
  const [cierreProceso, setCierreProceso] = useState<CierreProcesoData | null>(null);
  const [novedades, setNovedades] = useState<NovedadesDiaData | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    if (!fecha) {
      setSimulacion(null);
      setCierreProceso(null);
      setNovedades(null);
      return;
    }

    setCargando(true);
    try {
      const [sim, cierre, nov] = await Promise.all([
        api.simulacion(fecha),
        api.cierreProceso(fecha),
        api.novedadesDia(fecha),
      ]);
      setSimulacion(sim);
      setCierreProceso(cierre);
      setNovedades(nov);
      setError(null);
    } catch (err) {
      setSimulacion(null);
      setCierreProceso(null);
      setNovedades(null);
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar las vistas del cierre.");
    } finally {
      setCargando(false);
    }
  }, [fecha]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  return { simulacion, cierreProceso, novedades, cargando, error, recargar };
}
