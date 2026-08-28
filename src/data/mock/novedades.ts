export type NovedadResumen = {
  criterio: string;
  cantidad: number;
  pct: number;
  operarios: string;
};

export type NovedadesData = {
  fecha: string;
  mesHoja: string;
  presupuestados: number;
  laborando: number;
  ausentismo: number;
  resumen: NovedadResumen[];
  operatividad: {
    criterio: string;
    real: number;
    pct: number;
    dia: number;
    diaPct: number;
    dif: number;
  }[];
};

export const novedadesMock: NovedadesData = {
  fecha: "2026-08-19",
  mesHoja: "AGOSTO 2026",
  presupuestados: 60,
  laborando: 48,
  ausentismo: 12,
  resumen: [
    { criterio: "LABORANDO", cantidad: 48, pct: 0.8, operarios: "" },
    {
      criterio: "VACACIONES",
      cantidad: 4,
      pct: 0.067,
      operarios: "BARAJAS EULISIS / PABON ANDERSON / QUINTERO GERSON / ROMERO ARNOL",
    },
    {
      criterio: "INCAPACIDAD",
      cantidad: 4,
      pct: 0.067,
      operarios: "BENITEZ YOSNEIDER / JOAN CARVAJAL / JAIMES JHON / PAJARO YAIR",
    },
    {
      criterio: "REUBICADO",
      cantidad: 2,
      pct: 0.033,
      operarios: "CANCINO JAVIER / MORALES EFRAIN",
    },
    {
      criterio: "RENUNCIA",
      cantidad: 2,
      pct: 0.033,
      operarios: "SUAREZ ANDREY / YEDINSON GERES",
    },
  ],
  operatividad: [
    { criterio: "LIDER/APOYO", real: 1, pct: 0.017, dia: 0, diaPct: 0, dif: -0.017 },
    { criterio: "OPERACION", real: 45, pct: 0.75, dia: 45, diaPct: 0.75, dif: 0 },
    { criterio: "VACACIONES", real: 3, pct: 0.05, dia: 4, diaPct: 0.0667, dif: -0.017 },
    { criterio: "INC, DF, SUS, PER, PAT", real: 4, pct: 0.067, dia: 6, diaPct: 0.1, dif: -0.033 },
    { criterio: "POR CONTRATAR", real: 0, pct: 0, dia: 0, diaPct: 0, dif: 0 },
    { criterio: "REUBICADO", real: 1, pct: 0.017, dia: 2, diaPct: 0.033, dif: 0.017 },
    { criterio: "ENTRENAMIENTO", real: 3, pct: 0.05, dia: 3, diaPct: 0.05, dif: 0 },
  ],
};
