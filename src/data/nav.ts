export type NavItem = {
  to: string;
  label: string;
  hint: string;
  group: "ver" | "capturar";
};

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Resumen del día", hint: "Indicadores y gráficas", group: "ver" },
  { to: "/simulacion", label: "Simulación", hint: "Velocidad y duración", group: "ver" },
  { to: "/cierre-proceso", label: "Cierre de proceso", hint: "Indicadores del turno", group: "ver" },
  { to: "/consolidado", label: "Consolidado", hint: "Histórico 2026", group: "ver" },
  { to: "/novedades", label: "Novedades", hint: "Operatividad personal", group: "ver" },
  {
    to: "/base-datos-cierre",
    label: "Base de datos cierre",
    hint: "Captura que alimenta el resto",
    group: "capturar",
  },
  {
    to: "/operarios",
    label: "Operarios",
    hint: "Crear y administrar trabajadores",
    group: "capturar",
  },
  {
    to: "/asistencia",
    label: "Asistencia diaria",
    hint: "Novedades por operario y día",
    group: "capturar",
  },
];
