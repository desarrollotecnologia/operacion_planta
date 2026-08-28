import { NavLink, Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import { NAV_ITEMS } from "../data/nav";
import { useCierreStore } from "../store/CierreStore";
import "./AppShell.css";

export function AppShell() {
  const { registros, selectedFecha, setSelectedFecha } = useCierreStore();

  return (
    <div className="shell">
      <aside className="shell-nav">
        <div className="brand">
          <div className="brand-mark" aria-hidden />
          <div>
            <p className="brand-kicker">Planta de beneficio</p>
            <h1 className="brand-name">Cierre de Operaciones</h1>
          </div>
        </div>

        <nav>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/simulacion"} className="nav-link">
              <span className="nav-label">{item.label}</span>
              <span className="nav-hint">{item.hint}</span>
            </NavLink>
          ))}
        </nav>

        <div className="nav-foot">
          <p>Alcance 2026+</p>
          <p className="muted">{registros.length} cierres en base</p>
        </div>
      </aside>

      <div className="shell-main">
        <header className="shell-top">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <p className="top-title">Cierre de Operaciones</p>
            <p className="top-sub">Simulación · Cierre · Base de datos · Asistencia · más</p>
          </motion.div>
          <div className="top-actions">
            <label className="fecha-select">
              <span>Fecha cierre</span>
              <select
                value={selectedFecha}
                onChange={(e) => setSelectedFecha(e.target.value)}
                disabled={!registros.length}
              >
                {registros.map((r) => (
                  <option key={r.fecha} value={r.fecha}>
                    {r.fecha}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>
        <main className="shell-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
