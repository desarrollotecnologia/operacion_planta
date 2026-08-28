export type SimulacionData = {
  reses: number;
  velocidadBruta: number;
  paradaProgramadaHr: number;
  vaciadoLineaHr: number;
  horaInicio: string;
  duracionDeseadaHr: number;
  duracionEfectivaHr: number;
  duracionNoqueoHr: number;
  velocidadNeta: number;
  velocidadNetaNoqueo: number;
  resesPorMin: number;
  segundosPorRes: number;
};

export const simulacionMock: SimulacionData = {
  reses: 306,
  velocidadBruta: 75,
  paradaProgramadaHr: 0,
  vaciadoLineaHr: 0.49,
  horaInicio: "20:18",
  duracionDeseadaHr: 4.08,
  duracionEfectivaHr: 4.08,
  duracionNoqueoHr: 3.59,
  velocidadNeta: 75,
  velocidadNetaNoqueo: 85.24,
  resesPorMin: 1.42,
  segundosPorRes: 42,
};
