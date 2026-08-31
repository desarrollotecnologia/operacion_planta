import type { CierreProcesoData } from "../../data/types";
import { Badge, MetricCard, PageHeader, Panel, formatDate, pct } from "../../components/ui";
import { useCierreVistas } from "../../hooks/useCierreVistas";
import { useCierreStore } from "../../store/CierreStore";
import "../../components/ui.css";

function indicadoresTurno(c: CierreProcesoData) {
  return [
    ["Hora de inicio", c.horaInicio],
    ["Hora fin", c.horaFin],
    ["Horas laboradas", c.horasLaboradas.toFixed(2)],
    ["Tardanza inicio", `${c.tardanzaInicio} min`],
    ["Productividad", c.productividad.toFixed(1)],
    ["Velocidad bruta", `${c.velocidadBruta.toFixed(1)} r/h`],
    ["Tolerancia cero", pct(c.toleranciaCero)],
    ["Pieles rotas", pct(c.pieles)],
    ["Cortes en pierna", pct(c.cortePierna)],
    ["Sobrebarriga rotas", pct(c.sobrebarrigaRota)],
    ["Cobertura grasa", pct(c.coberturaGrasa)],
    ["Paradas programadas minutos", `${c.paradasProgramadasMin} min`],
    ["Tiempos improductivos", `${c.tiemposImproductivosMin} min`],
  ] as const;
}

export function CierreProcesoPage() {
  const { selectedFecha } = useCierreStore();
  const { cierreProceso: c, cargando, error } = useCierreVistas(selectedFecha);

  if (cargando && !c) {
    return <p className="note-block">Cargando cierre de proceso…</p>;
  }

  if (error || !c) {
    return <p className="note-block">{error ?? "No hay cierre de proceso para la fecha seleccionada."}</p>;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Cierre de proceso"
        title="Cierre de proceso"
        description="Tablero del turno: indicadores de beneficio, OEE y calidad."
      />

      <div className="metrics-grid">
        <MetricCard label="Fecha" value={formatDate(c.fecha)} delay={0.05} />
        <MetricCard
          label="Total beneficio"
          value={String(c.totalBeneficio)}
          hint={`${c.horaInicio} – ${c.horaFin}`}
          tone="accent"
          delay={0.1}
        />
        <MetricCard
          label="Velocidad línea beneficio"
          value={`${c.velocidadNeta.toFixed(1)} r/h`}
          hint="Velocidad neta"
          tone="ok"
          delay={0.15}
        />
        <MetricCard label="OEE día" value={pct(c.oeeDia)} delay={0.2} />
      </div>

      <div className="stack-2">
        <Panel title="Indicadores del turno" delay={0.18}>
          <table className="data-table">
            <tbody>
              {indicadoresTurno(c).map(([k, v]) => (
                <tr key={String(k)}>
                  <td>{k}</td>
                  <td>
                    <strong>{v}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        {(c.fallosMaquinaria || c.observaciones) && (
          <Panel title="Observaciones" delay={0.22}>
            {c.fallosMaquinaria ? (
              <p className="note-block">
                <strong>Fallos maquinaria</strong>
                <br />
                {c.fallosMaquinaria}
              </p>
            ) : null}
            {c.observaciones ? (
              <p className="note-block" style={{ marginTop: c.fallosMaquinaria ? "0.75rem" : 0 }}>
                <strong>Proceso</strong>
                <br />
                {c.observaciones}
              </p>
            ) : null}
          </Panel>
        )}
      </div>

      {c.laborandoLinea.length > 0 && (
        <Panel title="Laborando · detalle" delay={0.28}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Criterio</th>
                <th>Personas</th>
                <th>%</th>
                <th>Colaboradores</th>
              </tr>
            </thead>
            <tbody>
              {c.laborandoLinea.map((r) => (
                <tr key={r.item}>
                  <td>{r.item}</td>
                  <td>
                    {r.criterio === "INCAPACIDAD" ? (
                      <Badge tone="danger">{r.criterio}</Badge>
                    ) : (
                      r.criterio
                    )}
                  </td>
                  <td>{r.personas}</td>
                  <td>{pct(r.pct)}</td>
                  <td>{r.colaboradores || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}
