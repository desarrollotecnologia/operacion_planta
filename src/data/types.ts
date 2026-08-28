/** Tipos del dominio. Los comparten la API, los stores y las pantallas. */

export type RegistroCierre = {
  id: string;
  fecha: string;
  totalBeneficio: number;
  horaInicio: string;
  horaFin: string;
  duracionMin: number;
  tiempoParadasMin: number;
  paradaProgramadaMin: number;
  velocidadLinea: number;
  horasLaboradas: number;
  tardanzaInicio: number;
  productividad: number;
  velocidadNeta: number;
  velocidadBruta: number;
  toleranciaCero: number;
  pieles: number;
  observacion: string;
  mes: string;
  anio: number;
};

export type NuevoRegistroInput = Omit<RegistroCierre, "id" | "mes" | "anio" | "duracionMin"> & {
  duracionMin?: number;
};

export type Area = "LINEA" | "PCCOM";

export type Operario = {
  id: string;
  area: Area;
  itemOrden: number;
  puesto: string;
  nombreCompleto: string;
  nombreCorto: string;
  documento?: string;
  activo: boolean;
  fechaIngreso?: string;
};

/** itemOrden es opcional: si no llega, la API asigna el siguiente del area. */
export type NuevoOperarioInput = Omit<Operario, "id" | "nombreCorto" | "itemOrden"> & {
  nombreCorto?: string;
  itemOrden?: number;
};

export type EstadoNovedad = {
  codigo: string;
  nombre: string;
  esAusentismo: boolean;
};

export type AsistenciaDia = {
  operarioId: string;
  fecha: string;
  estadoCodigo: string;
};

export type Catalogos = {
  areas: { codigo: string; nombre: string }[];
  estados: EstadoNovedad[];
};
