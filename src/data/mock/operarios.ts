export type Operario = {
  id: string;
  area: "LINEA" | "PCCOM";
  itemOrden: number;
  puesto: string;
  nombreCompleto: string;
  nombreCorto: string;
  documento?: string;
  activo: boolean;
  fechaIngreso?: string;
};

export type EstadoNovedad = {
  codigo: string;
  nombre: string;
  esAusentismo: boolean;
};

export const ESTADOS_NOVEDAD: EstadoNovedad[] = [
  { codigo: "LABORANDO", nombre: "Laborando", esAusentismo: false },
  { codigo: "VACACIONES", nombre: "Vacaciones", esAusentismo: true },
  { codigo: "INCAPACIDAD", nombre: "Incapacidad", esAusentismo: true },
  { codigo: "INCAPACIDAD_LARGA", nombre: "Incapacidad larga", esAusentismo: true },
  { codigo: "REUBICADO", nombre: "Reubicado", esAusentismo: true },
  { codigo: "RENUNCIA", nombre: "Renuncia", esAusentismo: true },
  { codigo: "PDTE_CONTRATAR", nombre: "Pendiente por contratar", esAusentismo: true },
  { codigo: "DOMINGO_FESTIVO", nombre: "Domingo y festivo", esAusentismo: false },
  { codigo: "ENTRENAMIENTO", nombre: "Entrenamiento", esAusentismo: false },
  { codigo: "AMORTIZAR_EXTRAS", nombre: "Amortizar extras", esAusentismo: true },
  { codigo: "COMPENSATORIO", nombre: "Compensatorio", esAusentismo: true },
  { codigo: "SUSPENSION", nombre: "Suspensión", esAusentismo: true },
  { codigo: "LICENCIA_NR", nombre: "Licencia no remunerada", esAusentismo: true },
  { codigo: "PERMISO_REMUNERADO", nombre: "Permiso remunerado", esAusentismo: true },
];

export type AsistenciaDia = {
  operarioId: string;
  fecha: string;
  estadoCodigo: string;
};

export const operariosSeed: Operario[] = [
  { id: "op-1", area: "LINEA", itemOrden: 1, puesto: "AFANADOR", nombreCompleto: "PINEDA NELSON", nombreCorto: "AFANADOR NELSON", activo: true },
  { id: "op-2", area: "LINEA", itemOrden: 2, puesto: "AGUILAR", nombreCompleto: "SAAVEDRA LUIS DAVID", nombreCorto: "AGUILAR LUIS", activo: true },
  { id: "op-3", area: "LINEA", itemOrden: 3, puesto: "ALVAREZ", nombreCompleto: "MARCHAN ELIBER", nombreCorto: "ALVAREZ ELIBER", activo: true },
  { id: "op-4", area: "LINEA", itemOrden: 4, puesto: "ANDRADES", nombreCompleto: "JOSE FRANCISCO", nombreCorto: "ANDRADES FRANCISCO", activo: true },
  { id: "op-5", area: "LINEA", itemOrden: 5, puesto: "ANGEL", nombreCompleto: "DAVID CRUZ RUIZ", nombreCorto: "ANGEL CRUZ", activo: true },
  { id: "op-6", area: "LINEA", itemOrden: 6, puesto: "AYALA", nombreCompleto: "ORELLAN JOSE GABRIEL", nombreCorto: "AYALA JOSE", activo: true },
  { id: "op-7", area: "LINEA", itemOrden: 7, puesto: "AYALA", nombreCompleto: "PEÑARANDA CRISTIAN DAVID", nombreCorto: "AYALA CRISTIAN", activo: true },
  { id: "op-8", area: "LINEA", itemOrden: 8, puesto: "BALLESTEROS", nombreCompleto: "NUÑEZ DERSO", nombreCorto: "BALLESTEROS DERSO", activo: true },
  { id: "op-9", area: "LINEA", itemOrden: 9, puesto: "BARAJAS", nombreCompleto: "APARICIO FIDEL", nombreCorto: "BARAJAS FIDEL", activo: true },
  { id: "op-10", area: "LINEA", itemOrden: 10, puesto: "BARAJAS", nombreCompleto: "GUEVARA EULISIS", nombreCorto: "BARAJAS EULISIS", activo: true },
  { id: "op-11", area: "LINEA", itemOrden: 11, puesto: "BECERRA", nombreCompleto: "JAIMES DIEGO ARMANDO", nombreCorto: "BECERRA DIEGO", activo: true },
  { id: "op-12", area: "LINEA", itemOrden: 12, puesto: "BENITEZ", nombreCompleto: "VIDES YOSNEIDER", nombreCorto: "BENITEZ YOSNEIDER", activo: true },
];

// Asistencia mock 2026-08-19 (del Excel)
export const asistenciaSeed: AsistenciaDia[] = [
  { operarioId: "op-1", fecha: "2026-08-19", estadoCodigo: "LABORANDO" },
  { operarioId: "op-2", fecha: "2026-08-19", estadoCodigo: "LABORANDO" },
  { operarioId: "op-3", fecha: "2026-08-19", estadoCodigo: "LABORANDO" },
  { operarioId: "op-10", fecha: "2026-08-19", estadoCodigo: "VACACIONES" },
  { operarioId: "op-12", fecha: "2026-08-19", estadoCodigo: "INCAPACIDAD" },
];

export type NuevoOperarioInput = Omit<Operario, "id" | "nombreCorto"> & {
  nombreCorto?: string;
};
