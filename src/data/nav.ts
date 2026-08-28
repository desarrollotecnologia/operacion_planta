export type NavItem = {
  to: string;
  label: string;
  hint: string;
};

export const NAV_ITEMS: NavItem[] = [
  { to: "/simulacion", label: "Simulación", hint: "Velocidad y duración" },
  { to: "/cierre-proceso", label: "Cierre de proceso", hint: "Indicadores del turno" },
  {
    to: "/base-datos-cierre",
    label: "Base de datos cierre",
    hint: "Captura que alimenta el resto",
  },
  {
    to: "/asistencia",
    label: "Asistencia diaria",
    hint: "Novedades por operario y día",
  },
  { to: "/consolidado", label: "Consolidado", hint: "Histórico 2026" },
  { to: "/novedades", label: "Novedades", hint: "Operatividad personal" },
  {
    to: "/operarios",
    label: "Operarios",
    hint: "Crear y administrar trabajadores",
  },
];
