import type {
  CierrePccomIndicadores,
  CierreProcesoData,
  OperatividadBeneficioRow,
  OperatividadTotales,
} from "../../data/types";
import { PageHeader, formatDate, pct } from "../../components/ui";
import { useCierreVistas } from "../../hooks/useCierreVistas";
import { useCierreStore } from "../../store/CierreStore";
import { estadoVelocidadNeta, fmtCeil } from "../../lib/simulacionCalc";
import "../../components/ui.css";
import "./cierreProceso.css";

type IndicadorFila = {
  label: string;
  value: string;
  valorClass?: string;
};

function fmtPct(n: number) {
  return pct(n);
}

function fmtNum(n: number) {
  return fmtCeil(n);
}

function indicadoresLinea(c: CierreProcesoData): IndicadorFila[] {
  const velNeta = estadoVelocidadNeta(c.velocidadNeta);
  return [
    { label: "Total de beneficio", value: String(c.totalBeneficio) },
    { label: "Hora de inicio", value: c.horaInicio?.slice(0, 5) ?? "—" },
    { label: "Hora fin", value: c.horaFin?.slice(0, 5) ?? "—" },
    { label: "O.E.E mes", value: fmtPct(c.oeeMes) },
    { label: "O.E.E día", value: fmtPct(c.oeeDia) },
    { label: "Velocidad línea de beneficio", value: fmtNum(c.velocidadLinea) },
    { label: "Horas laboradas", value: c.horasLaboradas.toFixed(1) },
    { label: "Tardanza de inicio", value: String(c.tardanzaInicio) },
    { label: "Productividad", value: fmtNum(c.productividad) },
    {
      label: "Velocidad neta",
      value: fmtNum(c.velocidadNeta),
      valorClass: `cp-vel-${velNeta}`,
    },
    { label: "Velocidad bruta", value: fmtNum(c.velocidadBruta) },
    { label: "Tolerancia cero", value: fmtPct(c.toleranciaCero) },
    {
      label: "Pieles rotas",
      value: fmtPct(c.pieles),
      valorClass: c.pieles > 0.05 ? "cp-val-danger" : undefined,
    },
    { label: "Cortes en pierna", value: fmtPct(c.cortePierna) },
    { label: "Sobrebarriga rotas", value: fmtPct(c.sobrebarrigaRota) },
    { label: "Cobertura grasa", value: fmtPct(c.coberturaGrasa) },
    { label: "Paradas programadas (min)", value: String(c.paradasProgramadasMin) },
    {
      label: "Tiempos improductivos (min)",
      value: String(c.tiemposImproductivosMin),
      valorClass: c.tiemposImproductivosMin > 0 ? "cp-val-warn" : undefined,
    },
  ];
}

function indicadoresPccom(p: CierrePccomIndicadores): IndicadorFila[] {
  return [
    { label: "Hora inicio cabezas", value: p.horaInicioCabezas?.slice(0, 5) ?? "—" },
    { label: "Hora última víscera amarrada", value: p.horaUltimaViscera?.slice(0, 5) ?? "—" },
    { label: "Total paros (hr)", value: fmtNum(p.totalParosHr) },
    { label: "Duración proceso (hrs)", value: p.duracionProcesoHr.toFixed(2) },
    { label: "Rendimiento bruto (visceras/hora)", value: p.rendimientoBruto != null ? fmtNum(p.rendimientoBruto) : "—" },
    { label: "Rendimiento neto (visceras/hora)", value: p.rendimientoNeto != null ? fmtNum(p.rendimientoNeto) : "—" },
    {
      label: "Rendimiento (visceras/hr/hombre)",
      value: p.rendimientoPorHombre != null ? p.rendimientoPorHombre.toFixed(2) : "—",
    },
    { label: "Minutos paros programados", value: String(p.paradasProgramadasMin) },
    {
      label: "Minutos paros no programados",
      value: String(p.tiemposImproductivosMin),
      valorClass: p.tiemposImproductivosMin > 0 ? "cp-val-warn" : undefined,
    },
  ];
}

function TablaIndicadoresExcel({
  titulo,
  fecha,
  filas,
}: {
  titulo: string;
  fecha?: string;
  filas: IndicadorFila[];
}) {
  return (
    <table className="cp-sheet cp-ind-sheet">
      <thead>
        <tr>
          <th colSpan={2} className="cp-title">
            {titulo}
          </th>
        </tr>
        {fecha ? (
          <tr>
            <th colSpan={2} className="cp-date">
              {fecha}
            </th>
          </tr>
        ) : null}
      </thead>
      <tbody>
        {filas.map((f) => (
          <tr key={f.label}>
            <td className="cp-label">{f.label}</td>
            <td className={`cp-val ${f.valorClass ?? ""}`.trim()}>{f.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CajaObservacion({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="cp-obs-box">
      <div className="cp-obs-head">{titulo}</div>
      <div className="cp-obs-body">{texto?.trim() ? texto : "—"}</div>
    </div>
  );
}

function TablaOperatividadExcel({
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
      <div className="cp-op-block">
        <div className="cp-op-title">{titulo}</div>
        <p className="cp-op-empty">Sin datos de personal para esta área. Regístrelos en Asistencia diaria.</p>
      </div>
    );
  }

  return (
    <div className="cp-op-block">
      <table className="cp-sheet cp-op-sheet">
        <thead>
          <tr>
            <th colSpan={5} className="cp-op-title">
              {titulo}
            </th>
          </tr>
          <tr className="cp-op-head">
            <th>Item</th>
            <th>Criterio</th>
            <th># Personas</th>
            <th>% de part.</th>
            <th>Colaborador</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((r) => {
            const incAlta = r.estadoCodigo === "INCAPACIDAD" && r.personas > 3;
            return (
              <tr key={`${r.item}-${r.criterio}`}>
                <td>{r.item}</td>
                <td className={incAlta ? "cp-inc-label" : undefined}>{r.criterio}</td>
                <td className={incAlta ? "cp-val-danger" : undefined}>{r.personas}</td>
                <td>{pct(r.pct)}</td>
                <td className={incAlta ? "cp-inc-label" : undefined}>{r.colaboradores || "—"}</td>
              </tr>
            );
          })}
          <tr className="cp-op-foot">
            <td colSpan={2}>
              <strong>TOTAL</strong>
            </td>
            <td>
              <strong>{totales.totalPersonas}</strong>
            </td>
            <td>
              <strong>100%</strong>
            </td>
            <td />
          </tr>
          <tr className="cp-op-foot cp-op-aus">
            <td colSpan={3}>
              <strong>TOTAL AUSENTISMO</strong>
            </td>
            <td colSpan={2}>
              <strong>{pct(totales.ausentismoPct)}</strong>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
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

  const fechaFmt = formatDate(c.fecha);

  return (
    <div className="cp-page">
      <PageHeader
        eyebrow="Cierre de proceso"
        title="Cierre de proceso"
        description={`Vista consolidada del ${fechaFmt} · línea de beneficio y productos cárnicos COM.`}
      />

      <div className="cp-dashboard">
        <aside className="cp-dashboard-left">
          <TablaIndicadoresExcel
            titulo="Cierre de proceso · Línea de beneficio"
            fecha={fechaFmt}
            filas={indicadoresLinea(c)}
          />
          <TablaIndicadoresExcel
            titulo="Cierre de proceso · Productos cárnicos COM"
            filas={indicadoresPccom(c.pccom)}
          />
        </aside>

        <div className="cp-dashboard-right">
          <div className="cp-obs-row">
            <CajaObservacion titulo="Fallos en maquinaria" texto={c.fallosMaquinaria} />
            <CajaObservacion titulo="Observaciones de proceso" texto={c.observaciones} />
          </div>

          <TablaOperatividadExcel
            titulo="Operatividad línea de beneficio"
            filas={c.laborandoLinea}
            totales={c.totalesLinea}
          />

          <TablaOperatividadExcel
            titulo="Operatividad productos cárnicos comestibles"
            filas={c.laborandoPccom}
            totales={c.totalesPccom}
          />
        </div>
      </div>
    </div>
  );
}
