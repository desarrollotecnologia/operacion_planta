import { useEffect, useMemo, useState } from "react";
import { MetricCard, PageHeader, Panel, formatDate } from "../../components/ui";
import { api, ApiError } from "../../lib/api";
import type { ConsolidadoRow } from "../../data/types";
import "../../components/ui.css";

const MESES = [
  { codigo: "MARZO", label: "Marzo" },
  { codigo: "ABRIL", label: "Abril" },
  { codigo: "MAYO", label: "Mayo" },
  { codigo: "JUNIO", label: "Junio" },
  { codigo: "JULIO", label: "Julio" },
  { codigo: "AGOSTO", label: "Agosto" },
];

export function ConsolidadoPage() {
  const [mes, setMes] = useState("AGOSTO");
  const [rows, setRows] = useState<ConsolidadoRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setCargando(true);
      try {
        const datos = await api.consolidado({ anio: 2026 });
        setRows(datos);
        setError(null);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Error al cargar consolidado.");
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const filtradas = useMemo(
    () => rows.filter((r) => r.mes === mes).sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [rows, mes],
  );

  const totals = useMemo(() => {
    if (!filtradas.length) return { beneficio: 0, avgAsignado: 0, dias: 0 };
    const beneficio = filtradas.reduce((a, r) => a + r.totalBeneficio, 0);
    const avgAsignado = Math.round(
      filtradas.reduce((a, r) => a + (r.personalAsignado ?? 0), 0) / filtradas.length,
    );
    return { beneficio, avgAsignado, dias: filtradas.length };
  }, [filtradas]);

  const mesLabel = MESES.find((m) => m.codigo === mes)?.label ?? mes;

  return (
    <div>
      <PageHeader
        eyebrow="Módulo 6 · Visualizar"
        title="Consolidado de cierre"
        description="Histórico 2026: beneficio, tiempos, rendimientos y personal asignado/contratado por día."
      />

      <div className="chip-row">
        {MESES.map((m) => (
          <button
            key={m.codigo}
            type="button"
            className={`chip ${mes === m.codigo ? "active" : ""}`}
            onClick={() => setMes(m.codigo)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {error ? <p className="note-block">{error}</p> : null}
      {cargando ? <p className="note-block">Cargando consolidado…</p> : null}

      <div className="metrics-grid">
        <MetricCard label="Mes foco" value={mesLabel} hint="2026" delay={0.05} />
        <MetricCard label="Reses (mes)" value={String(totals.beneficio)} tone="accent" delay={0.1} />
        <MetricCard label="Días cargados" value={String(totals.dias)} delay={0.15} />
        <MetricCard label="Personal asignado avg" value={String(totals.avgAsignado)} tone="ok" delay={0.2} />
      </div>

      <Panel title={`Detalle ${mesLabel} 2026`} subtitle="Base de datos cierre + personal del consolidado" delay={0.22}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Beneficio</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Paros h</th>
                <th>Duración h</th>
                <th>Rend. bruto</th>
                <th>Rend. neto</th>
                <th>Asignado</th>
                <th>Contratado</th>
                <th>Novedades</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((r) => (
                <tr key={r.fecha}>
                  <td>{formatDate(r.fecha)}</td>
                  <td>
                    <strong>{r.totalBeneficio}</strong>
                  </td>
                  <td>{r.horaInicio}</td>
                  <td>{r.horaFin}</td>
                  <td>{r.totalParosHr}</td>
                  <td>{r.duracionHr}</td>
                  <td>{r.rendimientoBruto ?? "—"}</td>
                  <td>{r.rendimientoNeto ?? "—"}</td>
                  <td>{r.personalAsignado ?? "—"}</td>
                  <td>{r.personalContratado ?? "—"}</td>
                  <td>{r.novedades || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
