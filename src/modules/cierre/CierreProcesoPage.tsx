import { Badge, MetricCard, PageHeader, Panel, formatDate, pct } from "../../components/ui";
import { cierreProcesoMock } from "../../data/mock/cierreProceso";
import "../../components/ui.css";

function difClass(n: number) {
  if (Math.abs(n) < 0.0005) return "dif-zero";
  return n < 0 ? "dif-neg" : "dif-pos";
}

export function CierreProcesoPage() {
  const c = cierreProcesoMock;

  return (
    <div>
      <PageHeader
        eyebrow="Módulo 4 · Visualizar"
        title="Cierre de proceso"
        description="Tablero del turno: indicadores de beneficio, OEE, pieles y operatividad de personal importada desde Novedades."
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
        <MetricCard label="OEE día" value={pct(c.oeeDia)} tone="ok" delay={0.15} />
        <MetricCard
          label="Productividad"
          value={c.productividad.toFixed(1)}
          hint={`Paradas prog. ${c.paradasProgramadasMin} min`}
          delay={0.2}
        />
      </div>

      <div className="stack-2">
        <Panel title="Indicadores del turno" delay={0.18}>
          <table className="data-table">
            <tbody>
              {[
                ["Velocidad línea", `${c.velocidadLinea} r/h`],
                ["Horas laboradas", c.horasLaboradas],
                ["Tardanza inicio", `${c.tardanzaInicio} min`],
                ["Velocidad neta", c.velocidadNeta],
                ["Velocidad bruta", c.velocidadBruta],
                ["Tolerancia cero", pct(c.toleranciaCero)],
                ["Pieles", pct(c.pieles)],
                ["Tiempos improductivos", `${c.tiemposImproductivosMin} min`],
              ].map(([k, v]) => (
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

        <Panel title="Observaciones" delay={0.22}>
          <p className="note-block">
            <strong>Fallos maquinaria</strong>
            <br />
            {c.fallosMaquinaria}
          </p>
          <p className="note-block" style={{ marginTop: "0.75rem" }}>
            <strong>Proceso</strong>
            <br />
            {c.observaciones}
          </p>
        </Panel>
      </div>

      <Panel
        title="Operatividad de línea"
        subtitle="Equivalente a IMPORTRANGE RESUMEN!H3:M12"
        delay={0.28}
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>Criterio</th>
              <th>Real</th>
              <th>%</th>
              <th>Día</th>
              <th>% día</th>
              <th>Dif</th>
            </tr>
          </thead>
          <tbody>
            {c.operatividadLinea.map((r) => (
              <tr key={r.criterio}>
                <td>{r.criterio}</td>
                <td>{r.real}</td>
                <td>{pct(r.pct)}</td>
                <td>{r.dia}</td>
                <td>{pct(r.diaPct)}</td>
                <td className={difClass(r.dif)}>{pct(r.dif)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel
        title="Laborando · detalle"
        subtitle="Equivalente a IMPORTRANGE RESUMEN!C26:F34"
        delay={0.34}
      >
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

      <Panel
        title="Operatividad PCCOM"
        subtitle="Equivalente a IMPORTRANGE PCCOM RESUMEN!H3:M11"
        delay={0.4}
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>Criterio</th>
              <th>Real</th>
              <th>%</th>
              <th>Día</th>
              <th>% día</th>
              <th>Dif</th>
            </tr>
          </thead>
          <tbody>
            {c.operatividadPccom.map((r) => (
              <tr key={r.criterio}>
                <td>{r.criterio}</td>
                <td>{r.real}</td>
                <td>{pct(r.pct)}</td>
                <td>{r.dia}</td>
                <td>{pct(r.diaPct)}</td>
                <td className={difClass(r.dif)}>{pct(r.dif)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
