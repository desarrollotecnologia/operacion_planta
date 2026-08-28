import { useMemo, useState } from "react";
import { Badge, MetricCard, PageHeader, Panel, formatDate, pct } from "../../components/ui";
import { ESTADOS_NOVEDAD } from "../../data/mock/operarios";
import { usePersonalStore } from "../../store/PersonalStore";
import "../../components/ui.css";

export function AsistenciaPage() {
  const { operarios, guardarAsistencia, getAsistencia, getResumenDia } = usePersonalStore();
  const [fecha, setFecha] = useState("2026-08-19");
  const [area, setArea] = useState<"LINEA" | "PCCOM">("LINEA");

  const ops = useMemo(
    () => operarios.filter((o) => o.activo && o.area === area),
    [operarios, area],
  );

  const resumen = useMemo(() => getResumenDia(fecha, area), [getResumenDia, fecha, area]);
  const laborando = resumen.find((r) => r.criterio === "LABORANDO")?.cantidad ?? 0;
  const ausentes = ops.length - laborando;

  return (
    <div>
      <PageHeader
        eyebrow="Capturar · Asistencia"
        title="Novedades del día"
        description="Marca el estado de cada operario. Esto alimenta el RESUMEN y el cierre de proceso (sin Excel)."
      />

      <div className="chip-row">
        <button
          type="button"
          className={`chip ${area === "LINEA" ? "active" : ""}`}
          onClick={() => setArea("LINEA")}
        >
          Línea
        </button>
        <button
          type="button"
          className={`chip ${area === "PCCOM" ? "active" : ""}`}
          onClick={() => setArea("PCCOM")}
        >
          PCCOM
        </button>
      </div>

      <div className="metrics-grid">
        <MetricCard label="Fecha" value={formatDate(fecha)} tone="accent" delay={0.05} />
        <MetricCard label="Operarios" value={String(ops.length)} delay={0.1} />
        <MetricCard label="Laborando" value={String(laborando)} tone="ok" delay={0.15} />
        <MetricCard label="Ausentes" value={String(ausentes)} tone="warn" delay={0.2} />
      </div>

      <div className="stack-2">
        <Panel title="Registro diario" subtitle="Matriz operario × día (como columnas E–AJ del Excel)" delay={0.18}>
          <div className="field" style={{ maxWidth: 220, marginBottom: "1rem" }}>
            <label htmlFor="fecha-asist">Fecha operativa</label>
            <input
              id="fecha-asist"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          <div style={{ overflowX: "auto", maxHeight: 480 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Operario</th>
                  <th>Puesto</th>
                  <th>Estado del día</th>
                </tr>
              </thead>
              <tbody>
                {ops.map((o) => {
                  const estado = getAsistencia(o.id, fecha) ?? "LABORANDO";
                  return (
                    <tr key={o.id}>
                      <td>{o.itemOrden}</td>
                      <td>{o.nombreCorto}</td>
                      <td>{o.puesto}</td>
                      <td>
                        <select
                          value={estado}
                          onChange={(e) =>
                            guardarAsistencia(o.id, fecha, e.target.value)
                          }
                          style={{
                            width: "100%",
                            padding: "0.45rem 0.5rem",
                            borderRadius: 8,
                            border: "1px solid var(--line-strong)",
                          }}
                        >
                          {ESTADOS_NOVEDAD.map((e) => (
                            <option key={e.codigo} value={e.codigo}>
                              {e.nombre}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Resumen calculado" subtitle="Equivale a hoja RESUMEN del Excel" delay={0.24}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Criterio</th>
                <th>#</th>
                <th>%</th>
                <th>Operarios</th>
              </tr>
            </thead>
            <tbody>
              {resumen.map((r) => (
                <tr key={r.criterio}>
                  <td>
                    {r.criterio.includes("INCAPACIDAD") ? (
                      <Badge tone="danger">{r.criterio}</Badge>
                    ) : r.criterio === "LABORANDO" ? (
                      <Badge tone="ok">{r.criterio}</Badge>
                    ) : (
                      r.criterio
                    )}
                  </td>
                  <td>{r.cantidad}</td>
                  <td>{pct(r.pct)}</td>
                  <td>{r.operarios || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="note-block" style={{ marginTop: "0.85rem" }}>
            Al conectar la BD en el servidor 205, cada cambio guardará en{" "}
            <strong>asistencia_operario</strong> y el resumen saldrá de{" "}
            <strong>vw_resumen_novedades_dia</strong>.
          </p>
        </Panel>
      </div>
    </div>
  );
}
