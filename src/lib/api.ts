/**
 * Cliente de la API.
 *
 * Por defecto usa rutas relativas (/api) porque el mismo proceso Node sirve
 * el frontend y la API. VITE_API_URL solo hace falta si algun dia se separan.
 */
import type {
  AsistenciaDia,
  Catalogos,
  CierreProcesoData,
  ConsolidadoRow,
  NovedadesDiaData,
  NuevoOperarioInput,
  NuevoRegistroInput,
  Operario,
  RegistroCierre,
  SimulacionData,
} from "../data/types";

const BASE = import.meta.env.VITE_API_URL ?? "/api";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;

  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(0, "No se pudo contactar al servidor.");
  }

  if (!res.ok) {
    // El backend responde { error } en JSON, pero un proxy podria devolver HTML.
    let mensaje = `Error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) mensaje = body.error;
    } catch {
      /* se queda el mensaje generico */
    }
    throw new ApiError(res.status, mensaje);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const qs = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
};

export type EstadoSalud = {
  ok: boolean;
  db?: string;
  mysql?: string;
  destino?: string;
  error?: string;
};

export const api = {
  salud: () => request<EstadoSalud>("/health"),

  catalogos: () => request<Catalogos>("/catalogos"),

  cierres: (params: { anio?: number; mes?: string; desde?: string; hasta?: string } = {}) =>
    request<RegistroCierre[]>(`/cierres${qs(params)}`),

  ultimaFechaCierre: () => request<{ fecha: string }>("/cierres/ultimo"),

  consolidado: (params: { anio?: number; mes?: string } = {}) =>
    request<ConsolidadoRow[]>(`/cierres/consolidado${qs(params)}`),

  simulacion: (fecha: string) => request<SimulacionData>(`/cierres/${fecha}/simulacion`),

  cierreProceso: (fecha: string) => request<CierreProcesoData>(`/cierres/${fecha}/cierre-proceso`),

  novedadesDia: (fecha: string) => request<NovedadesDiaData>(`/cierres/${fecha}/novedades`),

  guardarCierre: (input: NuevoRegistroInput) =>
    request<RegistroCierre>("/cierres", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  eliminarCierre: (fecha: string) =>
    request<void>(`/cierres/${fecha}`, { method: "DELETE" }),

  operarios: (params: { area?: string; activo?: boolean } = {}) =>
    request<Operario[]>(
      `/operarios${qs({ area: params.area, activo: params.activo === undefined ? undefined : String(params.activo) })}`,
    ),

  crearOperario: (input: NuevoOperarioInput) =>
    request<Operario>("/operarios", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  actualizarOperario: (id: string, input: Partial<NuevoOperarioInput>) =>
    request<Operario>(`/operarios/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),

  asistencia: (params: { fecha?: string; desde?: string; hasta?: string; area?: string } = {}) =>
    request<AsistenciaDia[]>(`/asistencia${qs(params)}`),

  guardarAsistencia: (operarioId: string, fecha: string, estadoCodigo: string) =>
    request<AsistenciaDia>("/asistencia", {
      method: "PUT",
      body: JSON.stringify({ operarioId, fecha, estadoCodigo }),
    }),
};
