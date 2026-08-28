import { NavLink, Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import { NAV_ITEMS } from "../data/nav";
import "./AppShell.css";

export function AppShell() {
  const ver = NAV_ITEMS.filter((i) => i.group === "ver");
  const capturar = NAV_ITEMS.filter((i) => i.group === "capturar");

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
          <p className="nav-group">Visualizar</p>
          {ver.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"} className="nav-link">
              <span className="nav-label">{item.label}</span>
              <span className="nav-hint">{item.hint}</span>
            </NavLink>
          ))}

          <p className="nav-group">Capturar</p>
          {capturar.map((item) => (
            <NavLink key={item.to} to={item.to} className="nav-link capture">
              <span className="nav-label">{item.label}</span>
              <span className="nav-hint">{item.hint}</span>
            </NavLink>
          ))}
        </nav>

        <div className="nav-foot">
          <p>Alcance 2026+</p>
          <p className="muted">Mock local · BD en servidor después</p>
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
            <p className="top-sub">Resumen del día · Simulación · Cierre · Consolidado · Novedades</p>
          </motion.div>
          <div className="top-pill">Prototipo visual</div>
        </header>
        <main className="shell-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
