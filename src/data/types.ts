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
  cortePierna: number;
  sobrebarrigaRota: number;
  coberturaGrasa: number;
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

export type SimulacionInput = {
  reses: number;
  velocidadBruta: number;
  paradaProgramadaHr: number;
  vaciadoLineaHr: number;
  horaInicio: string;
  ultimaNoqueada: string;
  ultimaPesada: string;
};

export type SimulacionData = SimulacionInput & {
  fecha?: string;
  duracionDeseadaHr: number;
  duracionEfectivaHr: number;
  duracionNoqueoHr: number;
  velocidadNeta: number;
  velocidadNetaNoqueo: number;
  resesPorMin: number;
  minutosPorRes: number;
  minPorResTexto: string;
  segundosPorRes: number;
  tiempoLaborado: string;
  desfasePesadaNoqueo: string;
  horasLaboradas: number;
};

export type OperatividadRow = {
  criterio: string;
  real: number;
  pct: number;
  dia: number;
  diaPct: number;
  dif: number;
};

export type OperatividadBeneficioRow = {
  item: number;
  criterio: string;
  estadoCodigo: string;
  personas: number;
  pct: number;
  colaboradores: string;
};

export type OperatividadTotales = {
  totalPersonas: number;
  ausentismoPct: number;
};

export type CierrePccomIndicadores = {
  horaInicioCabezas: string;
  horaUltimaViscera: string;
  totalParosHr: number;
  duracionProcesoHr: number;
  rendimientoBruto: number | null;
  rendimientoNeto: number | null;
  rendimientoPorHombre: number | null;
  paradasProgramadasMin: number;
  tiemposImproductivosMin: number;
};

export type CierreProcesoData = {
  fecha: string;
  totalBeneficio: number;
  horaInicio: string;
  horaFin: string;
  oeeMes: number;
  oeeDia: number;
  velocidadLinea: number;
  horasLaboradas: number;
  tardanzaInicio: number;
  productividad: number;
  velocidadNeta: number;
  velocidadBruta: number;
  toleranciaCero: number;
  pieles: number;
  cortePierna: number;
  sobrebarrigaRota: number;
  coberturaGrasa: number;
  paradasProgramadasMin: number;
  tiemposImproductivosMin: number;
  fallosMaquinaria: string;
  observaciones: string;
  operatividadLinea: OperatividadRow[];
  laborandoLinea: OperatividadBeneficioRow[];
  totalesLinea: OperatividadTotales;
  laborandoPccom: OperatividadBeneficioRow[];
  totalesPccom: OperatividadTotales;
  pccom: CierrePccomIndicadores;
  operatividadPccom: OperatividadRow[];
};

export type NovedadesDiaData = {
  fecha: string;
  mesHoja: string;
  presupuestados: number;
  laborando: number;
  ausentismo: number;
  resumen: { criterio: string; cantidad: number; pct: number; operarios: string }[];
  operatividad: OperatividadRow[];
};

export type ConsolidadoRow = {
  fecha: string;
  totalBeneficio: number;
  horaInicio: string;
  horaFin: string;
  totalParosHr: number;
  duracionHr: number;
  rendimientoBruto: number | null;
  rendimientoNeto: number | null;
  personalAsignado: number | null;
  personalContratado: number | null;
  novedades: string;
  anio: number;
  mes: string;
};
