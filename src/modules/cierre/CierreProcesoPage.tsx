import type {
  CierrePccomIndicadores,
  CierreProcesoData,
  OperatividadBeneficioRow,
  OperatividadTotales,
} from "../../data/types";
import { Badge, MetricCard, PageHeader, Panel, formatDate, pct } from "../../components/ui";
import { useCierreVistas } from "../../hooks/useCierreVistas";
import { useCierreStore } from "../../store/CierreStore";
import "../../components/ui.css";
import "./cierreProceso.css";

function indicadoresLinea(c: CierreProcesoData) {
  return [
    ["Hora de inicio", c.horaInicio],
    ["Hora fin", c.horaFin],
    ["Horas laboradas", c.horasLaboradas.toFixed(1)],
    ["Tardanza de inicio", String(c.tardanzaInicio)],
    ["Productividad", c.productividad.toFixed(1)],
    ["Velocidad bruta", c.velocidadBruta.toFixed(1)],
    ["Tolerancia cero", pct(c.toleranciaCero)],
    ["Pieles rotas", pct(c.pieles)],
    ["Cortes en pierna", pct(c.cortePierna)],
    ["Sobrebarriga rotas", pct(c.sobrebarrigaRota)],
    ["Cobertura grasa", pct(c.coberturaGrasa)],
    ["Paradas programadas (min)", String(c.paradasProgramadasMin)],
    ["Tiempos improductivos (min)", String(c.tiemposImproductivosMin)],
  ] as const;
}

function indicadoresPccom(p: CierrePccomIndicadores) {
  return [
    ["Hora inicio cabezas", p.horaInicioCabezas],
    ["Hora última víscera amarrada", p.horaUltimaViscera],
    ["Total paros", p.totalParosHr.toFixed(2)],
    ["Duración proceso (hrs)", p.duracionProcesoHr.toFixed(2)],
    ["Rendimiento bruto (visceras/hora)", p.rendimientoBruto?.toFixed(0) ?? "—"],
    ["Rendimiento neto (visceras/hora)", p.rendimientoNeto?.toFixed(0) ?? "—"],
    ["Rendimiento (visceras/hr/hombre)", p.rendimientoPorHombre?.toFixed(2) ?? "—"],
    ["Minutos paros programados", String(p.paradasProgramadasMin)],
    ["Minutos paros no programados", String(p.tiemposImproductivosMin)],
  ] as const;
}

function TablaIndicadores({ filas }: { filas: readonly (readonly [string, string])[] }) {
  return (
    <table className="data-table">
      <tbody>
        {filas.map(([k, v]) => (
          <tr key={k}>
            <td>{k}</td>
            <td>
              <strong>{v}</strong>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OperatividadBlock({
  titulo,
  filas,
  totales,
}: {
  titulo: string;
  filas: OperatividadBeneficioRow[];
  totales: OperatividadTotales;
}) {
  if (!filas.length) {
    return (
      <Panel title={titulo} className="cierre-op-panel">
        <p className="note-block">Sin datos de personal para esta área. Regístrelos en Asistencia diaria.</p>
      </Panel>
    );
  }

  return (
    <Panel title={titulo} className="cierre-op-panel">
      <div className="cierre-op-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Criterio</th>
              <th># Personas</th>
              <th>% de part.</th>
              <th>Colaborador</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((r) => (
              <tr key={`${r.item}-${r.criterio}`}>
                <td>{r.item}</td>
                <td>
                  {r.estadoCodigo === "INCAPACIDAD" && r.personas > 3 ? (
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
      </div>
      <div className="cierre-op-foot">
        <span>Total {totales.totalPersonas}, 100%</span>
        <span className="ausentismo">Total ausentismo {pct(totales.ausentismoPct)}</span>
      </div>
    </Panel>
  );
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
        description={`Resumen del ${formatDate(c.fecha)} · línea de beneficio y productos cárnicos COM.`}
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

      <div className="cierre-dashboard">
        <aside className="cierre-dashboard-left">
          <Panel title="Cierre de proceso · Línea de beneficio" className="cierre-ind-panel">
            <TablaIndicadores filas={indicadoresLinea(c)} />
          </Panel>
          <Panel title="Cierre de proceso · Productos cárnicos COM" className="cierre-ind-panel">
            <TablaIndicadores filas={indicadoresPccom(c.pccom)} />
          </Panel>
        </aside>

        <div className="cierre-dashboard-right">
          <div className="cierre-obs-row">
            <Panel title="Fallos en maquinaria">
              <p className="note-block cierre-obs-text">{c.fallosMaquinaria?.trim() || "—"}</p>
            </Panel>
            <Panel title="Observaciones de proceso">
              <p className="note-block cierre-obs-text">{c.observaciones?.trim() || "—"}</p>
            </Panel>
          </div>

          <OperatividadBlock
            titulo="Operatividad línea beneficio"
            filas={c.laborandoLinea}
            totales={c.totalesLinea}
          />

          <OperatividadBlock
            titulo="Operatividad productos cárnicos comestibles"
            filas={c.laborandoPccom}
            totales={c.totalesPccom}
          />
        </div>
      </div>
    </div>
  );
}
