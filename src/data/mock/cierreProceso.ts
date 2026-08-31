export type CierreIndicador = {
  label: string;
  value: string | number;
  meta?: string;
};

export type OperatividadRow = {
  criterio: string;
  real: number;
  pct: number;
  dia: number;
  diaPct: number;
  dif: number;
};

export type LaborandoRow = {
  item: number;
  criterio: string;
  estadoCodigo: string;
  personas: number;
  pct: number;
  colaboradores: string;
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
  laborandoLinea: LaborandoRow[];
  totalesLinea: { totalPersonas: number; ausentismoPct: number };
  laborandoPccom: LaborandoRow[];
  totalesPccom: { totalPersonas: number; ausentismoPct: number };
  pccom: {
    totalBeneficio: number;
    horaInicioCabezas: string;
    horaUltimaViscera: string;
    totalParosHr: number;
    duracionProcesoHr: number;
    rendimientoBruto: number | null;
    rendimientoNeto: number | null;
    paradasProgramadasMin: number;
    tiemposImproductivosMin: number;
    novedades: string;
  };
  operatividadPccom: OperatividadRow[];
};

export const cierreProcesoMock: CierreProcesoData = {
  fecha: "2026-08-19",
  totalBeneficio: 306,
  horaInicio: "14:00",
  horaFin: "20:18",
  oeeMes: 0.82,
  oeeDia: 0.79,
  velocidadLinea: 75,
  horasLaboradas: 6.3,
  tardanzaInicio: 0,
  productividad: 72.4,
  velocidadNeta: 75,
  velocidadBruta: 68.2,
  toleranciaCero: 0.0096,
  pieles: 0.035,
  cortePierna: 0.0066,
  sobrebarrigaRota: 0.0038,
  coberturaGrasa: 0.0094,
  paradasProgramadasMin: 30,
  tiemposImproductivosMin: 61,
  fallosMaquinaria:
    "1- No se cuenta con contingencias habilitadas: desolladora, sierra canal y box de noqueo.",
  observaciones: "Seguimiento a lustres y presentación de canales en clientes prioritarios.",
  operatividadLinea: [
    { criterio: "LIDER/APOYO", real: 1, pct: 0.017, dia: 0, diaPct: 0, dif: -0.017 },
    { criterio: "OPERACION", real: 45, pct: 0.75, dia: 45, diaPct: 0.75, dif: 0 },
    { criterio: "VACACIONES", real: 3, pct: 0.05, dia: 4, diaPct: 0.0667, dif: -0.017 },
    { criterio: "INC, DF, SUS, PER, PAT", real: 4, pct: 0.067, dia: 6, diaPct: 0.1, dif: -0.033 },
    { criterio: "POR CONTRATAR", real: 0, pct: 0, dia: 0, diaPct: 0, dif: 0 },
    { criterio: "REUBICADO", real: 1, pct: 0.017, dia: 2, diaPct: 0.033, dif: 0.017 },
    { criterio: "ENTRENAMIENTO", real: 3, pct: 0.05, dia: 3, diaPct: 0.05, dif: 0 },
    { criterio: "INCAPACIDAD LARGAS", real: 0, pct: 0, dia: 2, diaPct: 0, dif: 0 },
  ],
  laborandoLinea: [
    { item: 1, criterio: "LABORANDO", estadoCodigo: "LABORANDO", personas: 48, pct: 0.8, colaboradores: "" },
    { item: 2, criterio: "VACACIONES", estadoCodigo: "VACACIONES", personas: 4, pct: 0.067, colaboradores: "Gerson Quintero" },
    { item: 3, criterio: "INCAPACIDAD", estadoCodigo: "INCAPACIDAD", personas: 4, pct: 0.067, colaboradores: "Yair Pajaro" },
  ],
  totalesLinea: { totalPersonas: 60, ausentismoPct: 0.15 },
  laborandoPccom: [
    { item: 1, criterio: "LABORANDO", estadoCodigo: "LABORANDO", personas: 48, pct: 0.92, colaboradores: "" },
    { item: 2, criterio: "INCAPACIDAD", estadoCodigo: "INCAPACIDAD", personas: 1, pct: 0.02, colaboradores: "Daniel Agudelo" },
  ],
  totalesPccom: { totalPersonas: 52, ausentismoPct: 0.08 },
  pccom: {
    totalBeneficio: 306,
    horaInicioCabezas: "14:00",
    horaUltimaViscera: "20:18",
    totalParosHr: 1.02,
    duracionProcesoHr: 6.3,
    rendimientoBruto: 60,
    rendimientoNeto: 67,
    paradasProgramadasMin: 30,
    tiemposImproductivosMin: 61,
    novedades: "",
  },
  operatividadPccom: [
    { criterio: "LIDER/APOYO", real: 2, pct: 0.0392, dia: 2, diaPct: 0.0392, dif: 0 },
    { criterio: "OPERACION", real: 41, pct: 0.8039, dia: 39, diaPct: 0.7647, dif: -0.0392 },
    { criterio: "VACACIONES", real: 3, pct: 0.0588, dia: 2, diaPct: 0.0392, dif: 0.0196 },
    { criterio: "INC, DF, SUS, PER, PAT", real: 4, pct: 0.0784, dia: 5, diaPct: 0.098, dif: -0.0196 },
    { criterio: "POR CONTRATAR", real: 0, pct: 0, dia: 2, diaPct: 0.0392, dif: 0.0392 },
    { criterio: "REUBICADO", real: 1, pct: 0.0196, dia: 1, diaPct: 0.0196, dif: 0 },
    { criterio: "INCAPACIDAD LARGAS", real: 0, pct: 0, dia: 0, diaPct: 0, dif: 0 },
  ],
};
