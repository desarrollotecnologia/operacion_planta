import type { CierrePccomIndicadores, CierreProcesoData, OperatividadBeneficioRow, OperatividadTotales } from "../../data/types";
import { Badge, MetricCard, PageHeader, Panel, formatDate, pct } from "../../components/ui";
import { useCierreVistas } from "../../hooks/useCierreVistas";
import { useCierreStore } from "../../store/CierreStore";
import "../../components/ui.css";
import "./cierreProceso.css";

function indicadoresLinea(c: CierreProcesoData) {
  return [
    ["Total de beneficio", String(c.totalBeneficio)],
    ["Hora de inicio", c.horaInicio],
    ["Hora fin", c.horaFin],
    ["Indicador O.E.E (mes)", pct(c.oeeMes)],
    ["Indicador O.E.E (día)", pct(c.oeeDia)],
    ["Velocidad línea de beneficio", c.velocidadLinea.toFixed(1)],
    ["Horas laboradas", c.horasLaboradas.toFixed(1)],
    ["Tardanza de inicio", String(c.tardanzaInicio)],
    ["Productividad", c.productividad.toFixed(1)],
    ["Velocidad neta", c.velocidadNeta.toFixed(1)],
    ["Velocidad bruta", c.velocidadBruta.toFixed(1)],
    ["Tolerancia cero", pct(c.toleranciaCero)],
    ["Pieles", pct(c.pieles)],
    ["Corte en pierna", pct(c.cortePierna)],
    ["Sobrebarrigas rotas", pct(c.sobrebarrigaRota)],
    ["Cobertura grasa", pct(c.coberturaGrasa)],
    ["Paradas programadas (min)", String(c.paradasProgramadasMin)],
    ["Tiempos improductivos (min)", String(c.tiemposImproductivosMin)],
  ] as const;
}

function indicadoresPccom(p: CierrePccomIndicadores) {
  return [
    ["Total de beneficio", String(p.totalBeneficio)],
    ["Hora inicio cabezas", p.horaInicioCabezas],
    ["Hora última víscera amarrada", p.horaUltimaViscera],
    ["Total paros (hr)", p.totalParosHr.toFixed(2)],
    ["Duración proceso (hr)", p.duracionProcesoHr.toFixed(2)],
    ["Rendimiento bruto (visceras/hr)", p.rendimientoBruto?.toFixed(0) ?? "—"],
    ["Rendimiento neto (visceras/hr)", p.rendimientoNeto?.toFixed(0) ?? "—"],
    ["Minutos paros programados", String(p.paradasProgramadasMin)],
    ["Minutos paros no programados", String(p.tiemposImproductivosMin)],
    ["Novedades", p.novedades || "—"],
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
  embedded = false,
}: {
  titulo: string;
  filas: OperatividadBeneficioRow[];
  totales: OperatividadTotales;
  embedded?: boolean;
}) {
  const body = !filas.length ? (
    <p className="note-block">Sin datos de personal para esta área. Regístrelos en Asistencia diaria.</p>
  ) : (
    <>
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
                  {r.estadoCodigo === "INCAPACIDAD" ? (
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
    </>
  );

  if (embedded) {
    return (
      <Panel title={titulo} className="cierre-op-panel">
        {body}
      </Panel>
    );
  }

  return <Panel title={titulo}>{body}</Panel>;
}

function SeccionCierre({
  titulo,
  subtitulo,
  indicadores,
  observaciones,
  operatividadTitulo,
  operatividadFilas,
  operatividadTotales,
  operatividadAlLado = false,
}: {
  titulo: string;
  subtitulo: string;
  indicadores: readonly (readonly [string, string])[];
  observaciones?: { fallos?: string; proceso?: string };
  operatividadTitulo: string;
  operatividadFilas: OperatividadBeneficioRow[];
  operatividadTotales: OperatividadTotales;
  operatividadAlLado?: boolean;
}) {
  const tablaOperatividad = (
    <OperatividadBlock
      titulo={operatividadTitulo}
      filas={operatividadFilas}
      totales={operatividadTotales}
      embedded={operatividadAlLado}
    />
  );

  return (
    <section className="cierre-seccion">
      <div className="cierre-seccion-head">
        <h2>{titulo}</h2>
        <p>{subtitulo}</p>
      </div>

      {operatividadAlLado ? (
        <div className="cierre-bloque-grid cierre-bloque-grid--split">
          <Panel title="Indicadores" className="cierre-ind-panel">
            <TablaIndicadores filas={indicadores} />
          </Panel>
          {tablaOperatividad}
        </div>
      ) : (
        <>
          <div className="cierre-bloque-grid">
            <Panel title="Indicadores">
              <TablaIndicadores filas={indicadores} />
            </Panel>

            {(observaciones?.fallos || observaciones?.proceso) && (
              <Panel title="Observaciones">
                {observaciones.fallos ? (
                  <p className="note-block">
                    <strong>Fallos en maquinaria</strong>
                    <br />
                    {observaciones.fallos}
                  </p>
                ) : null}
                {observaciones.proceso ? (
                  <p className="note-block" style={{ marginTop: observaciones.fallos ? "0.75rem" : 0 }}>
                    <strong>Observaciones de proceso</strong>
                    <br />
                    {observaciones.proceso}
                  </p>
                ) : null}
              </Panel>
            )}
          </div>

          {tablaOperatividad}
        </>
      )}
    </section>
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

      <SeccionCierre
        titulo="Cierre de proceso · Línea de beneficio"
        subtitulo="Indicadores del turno y operatividad de personal de línea"
        indicadores={indicadoresLinea(c)}
        observaciones={{ fallos: c.fallosMaquinaria, proceso: c.observaciones }}
        operatividadTitulo="Operatividad línea beneficio"
        operatividadFilas={c.laborandoLinea}
        operatividadTotales={c.totalesLinea}
      />

      <SeccionCierre
        titulo="Cierre de proceso · Productos cárnicos COM"
        subtitulo="Indicadores de vísceras y operatividad de personal PCCOM"
        indicadores={indicadoresPccom(c.pccom)}
        operatividadTitulo="Operatividad productos cárnicos comestibles"
        operatividadFilas={c.laborandoPccom}
        operatividadTotales={c.totalesPccom}
        operatividadAlLado
      />
    </div>
  );
}
