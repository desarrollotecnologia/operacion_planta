import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MetricCard, PageHeader, Panel, formatDate, pct } from "../../components/ui";
import { useCierreVistas } from "../../hooks/useCierreVistas";
import { api } from "../../lib/api";
import type { ConsolidadoRow } from "../../data/types";
import { useCierreStore } from "../../store/CierreStore";
import "../../components/ui.css";
import "./ResumenDia.css";

const CHART = {
  royal: "#4a90e8",
  cyan: "#2a9bb8",
  indigo: "#6b7fd4",
  deep: "#1e4fb8",
  steel: "#5a7088",
  light: "#7eb8f5",
  navy: "#0c1f4a",
  soft: "#d6e8fa",
};

const PIE_COLORS = [CHART.royal, CHART.cyan, CHART.indigo, CHART.steel, CHART.deep];

function TooltipBox({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      {label ? <p className="chart-tooltip-label">{label}</p> : null}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

export function HomePage() {
  const { registros, selectedFecha } = useCierreStore();
  const { cierreProceso: c, novedades: n, cargando } = useCierreVistas(selectedFecha);
  const [consolidado, setConsolidado] = useState<ConsolidadoRow[]>([]);

  useEffect(() => {
    void api.consolidado({ anio: 2026, mes: "AGOSTO" }).then(setConsolidado).catch(() => setConsolidado([]));
  }, []);

  const personalPie = useMemo(
    () => (n?.resumen ?? []).map((r) => ({ name: r.criterio, value: r.cantidad })),
    [n],
  );

  const beneficioBars = useMemo(
    () =>
      [...consolidado]
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .slice(-10)
        .map((r) => ({
          dia: formatDate(r.fecha).slice(0, 5),
          reses: r.totalBeneficio,
        })),
    [consolidado],
  );

  if (cargando && !c) {
    return <p className="note-block">Cargando resumen del día…</p>;
  }

  if (!c || !n) {
    return (
      <p className="note-block">
        No hay datos para el resumen. Importa los Excel con npm run import:datos en el servidor.
      </p>
    );
  }

  const realVsMeta = [
    { indicador: "OEE día", real: Math.round(c.oeeDia * 100), meta: 80 },
    { indicador: "Productividad", real: Math.round(c.productividad), meta: 75 },
    { indicador: "Vel. neta", real: Math.round(c.velocidadNeta), meta: 75 },
    {
      indicador: "Laborando %",
      real: n.presupuestados ? Math.round((n.laborando / n.presupuestados) * 100) : 0,
      meta: 85,
    },
  ];

  const operatividadCompare = c.operatividadLinea
    .filter((r) => r.criterio !== "INCAPACIDAD LARGAS")
    .map((r) => ({
      criterio: r.criterio.replace("INC, DF, SUS, PER, PAT", "Inc/Perm"),
      plantilla: r.real,
      dia: r.dia,
    }));

  const tiempoUtil =
    c.horasLaboradas > 0
      ? Math.max(0, ((c.horasLaboradas * 60 - c.tiemposImproductivosMin) / (c.horasLaboradas * 60)) * 100)
      : 0;

  const incapacidades = n.resumen.find((r) => r.criterio === "INCAPACIDAD")?.cantidad ?? 0;

  return (
    <div className="resumen-dia">
      <PageHeader
        eyebrow="Resumen del día"
        title="Lectura rápida de la operación"
        description={`Corte del ${formatDate(c.fecha)} · beneficio, personal y cumplimiento en una sola vista.`}
        action={
          <Link className="btn btn-primary" to="/cierre-proceso">
            Ver cierre completo
          </Link>
        }
      />

      <div className="metrics-grid">
        <MetricCard
          label="Beneficio"
          value={`${c.totalBeneficio}`}
          hint={`${c.horaInicio} → ${c.horaFin}`}
          tone="accent"
          delay={0.04}
        />
        <MetricCard
          label="OEE del día"
          value={pct(c.oeeDia)}
          hint="Meta 80%"
          tone={c.oeeDia >= 0.8 ? "ok" : "warn"}
          delay={0.08}
        />
        <MetricCard
          label="Personal laborando"
          value={`${n.laborando}/${n.presupuestados}`}
          hint={n.presupuestados ? pct(n.laborando / n.presupuestados) : "—"}
          tone="ok"
          delay={0.12}
        />
        <MetricCard
          label="Tiempo útil"
          value={`${tiempoUtil.toFixed(0)}%`}
          hint={`${c.tiemposImproductivosMin} min improductivos`}
          delay={0.16}
        />
      </div>

      <div className="resumen-grid">
        <Panel title="Composición del personal" subtitle="¿Quién está disponible hoy?" delay={0.18}>
          <div className="chart-wrap chart-wrap-pie">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={personalPie}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={96}
                  paddingAngle={3}
                  stroke="#fff"
                  strokeWidth={2}
                >
                  {personalPie.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<TooltipBox />} />
                <Legend
                  verticalAlign="bottom"
                  height={48}
                  formatter={(value) => <span className="legend-text">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pie-center">
              <strong>{n.laborando}</strong>
              <span>laborando</span>
            </div>
          </div>
        </Panel>

        <Panel title="Beneficio últimos días" subtitle="Agosto 2026" delay={0.22}>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={beneficioBars} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d5e0ea" vertical={false} />
                <XAxis dataKey="dia" tick={{ fill: "#5a7088", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#5a7088", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<TooltipBox />} />
                <Bar dataKey="reses" name="Reses" radius={[8, 8, 0, 0]} fill={CHART.royal} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="resumen-grid">
        <Panel title="Real vs meta" subtitle="Lectura inmediata de cumplimiento" delay={0.26}>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={realVsMeta} layout="vertical" margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d5e0ea" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "#5a7088", fontSize: 12 }} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="indicador"
                  width={100}
                  tick={{ fill: "#3f5568", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<TooltipBox />} />
                <Legend formatter={(v) => <span className="legend-text">{v}</span>} />
                <Bar dataKey="meta" name="Meta" fill={CHART.soft} radius={[0, 6, 6, 0]} barSize={14} />
                <Bar dataKey="real" name="Real" fill={CHART.cyan} radius={[0, 6, 6, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Plantilla vs día" subtitle="Operatividad de línea" delay={0.3}>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={operatividadCompare} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d5e0ea" vertical={false} />
                <XAxis dataKey="criterio" tick={{ fill: "#5a7088", fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={56} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#5a7088", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<TooltipBox />} />
                <Legend formatter={(v) => <span className="legend-text">{v}</span>} />
                <Bar dataKey="plantilla" name="Plantilla" fill={CHART.deep} radius={[6, 6, 0, 0]} />
                <Bar dataKey="dia" name="Día" fill={CHART.light} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="resumen-grid resumen-grid-wide">
        <Panel title="Señales del turno" subtitle="Qué mirar primero" delay={0.34}>
          <div className="signal-grid">
            <motion.div className="signal-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}>
              <p className="signal-kicker">Productividad</p>
              <p className="signal-value">{c.productividad.toFixed(1)}</p>
              <p className="signal-hint">Velocidad línea {c.velocidadLinea.toFixed(1)} r/h</p>
            </motion.div>
            <motion.div className="signal-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <p className="signal-kicker">Paradas</p>
              <p className="signal-value">{c.paradasProgramadasMin}<span>min</span></p>
              <p className="signal-hint">Improductivos {c.tiemposImproductivosMin} min</p>
            </motion.div>
            <motion.div className="signal-card warn" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }}>
              <p className="signal-kicker">Incapacidades</p>
              <p className="signal-value">{incapacidades}</p>
              <p className="signal-hint">Impacto en disponibilidad</p>
            </motion.div>
            <motion.div className="signal-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}>
              <p className="signal-kicker">Registros base</p>
              <p className="signal-value">{registros.length}</p>
              <p className="signal-hint">Cierres en base de datos</p>
            </motion.div>
          </div>
          {c.fallosMaquinaria ? (
            <p className="note-block" style={{ marginTop: "1rem" }}>
              <strong>Maquinaria:</strong> {c.fallosMaquinaria}
            </p>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
