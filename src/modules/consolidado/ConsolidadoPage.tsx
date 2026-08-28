import { useMemo, useState } from "react";
import { MetricCard, PageHeader, Panel, formatDate } from "../../components/ui";
import { consolidado2026Mock, consolidadoMeses } from "../../data/mock/consolidado";
import "../../components/ui.css";

export function ConsolidadoPage() {
  const [mes, setMes] = useState("Agosto");
  const rows = consolidado2026Mock;

  const totals = useMemo(() => {
    const beneficio = rows.reduce((a, r) => a + r.totalBeneficio, 0);
    const avgAsignado = Math.round(
      rows.reduce((a, r) => a + r.personalAsignado, 0) / rows.length,
    );
    return { beneficio, avgAsignado, dias: rows.length };
  }, [rows]);

  return (
    <div>
      <PageHeader
        eyebrow="Módulo 6 · Visualizar"
        title="Consolidado de cierre"
        description="Histórico 2026: beneficio, tiempos, rendimientos y personal asignado/contratado por día."
      />

      <div className="chip-row">
        {consolidadoMeses.map((m) => (
          <button
            key={m}
            type="button"
            className={`chip ${mes === m ? "active" : ""}`}
            onClick={() => setMes(m)}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="metrics-grid">
        <MetricCard label="Mes foco" value={mes} hint="2026" delay={0.05} />
        <MetricCard
          label="Reses (muestra)"
          value={String(totals.beneficio)}
          tone="accent"
          delay={0.1}
        />
        <MetricCard label="Días cargados" value={String(totals.dias)} delay={0.15} />
        <MetricCard
          label="Personal asignado avg"
          value={String(totals.avgAsignado)}
          tone="ok"
          delay={0.2}
        />
      </div>

      <Panel
        title={`Detalle ${mes} 2026`}
        subtitle="Incluye columnas que hoy vienen por TRANSPONER(IMPORTRANGE) de Novedades PCCOM"
        delay={0.22}
      >
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Beneficio</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Paros</th>
                <th>Duración h</th>
                <th>Rend. bruto</th>
                <th>Rend. neto</th>
                <th>Asignado</th>
                <th>Contratado</th>
                <th>Novedades</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.fecha}>
                  <td>{formatDate(r.fecha)}</td>
                  <td>
                    <strong>{r.totalBeneficio}</strong>
                  </td>
                  <td>{r.horaInicio}</td>
                  <td>{r.horaFin}</td>
                  <td>{r.totalParos}</td>
                  <td>{r.duracionHr}</td>
                  <td>{r.rendimientoBruto}</td>
                  <td>{r.rendimientoNeto}</td>
                  <td>{r.personalAsignado}</td>
                  <td>{r.personalContratado}</td>
                  <td>{r.novedades}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
