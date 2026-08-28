export type ConsolidadoRow = {
  fecha: string;
  totalBeneficio: number;
  horaInicio: string;
  horaFin: string;
  totalParos: number;
  duracionHr: number;
  rendimientoBruto: number;
  rendimientoNeto: number;
  personalAsignado: number;
  personalContratado: number;
  novedades: string;
};

export const consolidado2026Mock: ConsolidadoRow[] = [
  {
    fecha: "2026-08-19",
    totalBeneficio: 306,
    horaInicio: "14:00",
    horaFin: "20:18",
    totalParos: 0.85,
    duracionHr: 6.3,
    rendimientoBruto: 48.6,
    rendimientoNeto: 56.1,
    personalAsignado: 60,
    personalContratado: 59,
    novedades: "Incapacidades 4 · Vacaciones 4",
  },
  {
    fecha: "2026-08-18",
    totalBeneficio: 298,
    horaInicio: "14:05",
    horaFin: "20:40",
    totalParos: 0.8,
    duracionHr: 6.58,
    rendimientoBruto: 45.3,
    rendimientoNeto: 51.7,
    personalAsignado: 60,
    personalContratado: 59,
    novedades: "Reubicados 2",
  },
  {
    fecha: "2026-08-15",
    totalBeneficio: 312,
    horaInicio: "13:50",
    horaFin: "20:10",
    totalParos: 0.58,
    duracionHr: 6.33,
    rendimientoBruto: 49.3,
    rendimientoNeto: 54.4,
    personalAsignado: 59,
    personalContratado: 59,
    novedades: "Sin novedad crítica",
  },
  {
    fecha: "2026-08-14",
    totalBeneficio: 280,
    horaInicio: "14:10",
    horaFin: "20:55",
    totalParos: 1.1,
    duracionHr: 6.75,
    rendimientoBruto: 41.5,
    rendimientoNeto: 49.8,
    personalAsignado: 59,
    personalContratado: 58,
    novedades: "Paro no programado sierra",
  },
  {
    fecha: "2026-08-13",
    totalBeneficio: 305,
    horaInicio: "14:00",
    horaFin: "20:22",
    totalParos: 0.7,
    duracionHr: 6.37,
    rendimientoBruto: 47.9,
    rendimientoNeto: 54.0,
    personalAsignado: 59,
    personalContratado: 59,
    novedades: "Entrenamiento 3",
  },
];

export const consolidadoMeses = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
] as const;
