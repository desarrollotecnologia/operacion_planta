import { Badge, MetricCard, PageHeader, Panel, formatDate, pct } from "../../components/ui";
import { novedadesMock } from "../../data/mock/novedades";
import "../../components/ui.css";

function difClass(n: number) {
  if (Math.abs(n) < 0.0005) return "dif-zero";
  return n < 0 ? "dif-neg" : "dif-pos";
}

export function NovedadesPage() {
  const n = novedadesMock;

  return (
    <div>
      <PageHeader
        eyebrow="Desde archivo Novedades · Visualizar"
        title="Novedades de personal"
        description="Operatividad de línea alineada a la fecha del cierre. Aquí se ve el resumen; la matriz persona×día se conectará después."
      />

      <div className="metrics-grid">
        <MetricCard label="Fecha sync" value={formatDate(n.fecha)} hint={n.mesHoja} delay={0.05} />
        <MetricCard
          label="Laborando"
          value={String(n.laborando)}
          tone="ok"
          hint={`${pct(n.laborando / n.presupuestados)}`}
          delay={0.1}
        />
        <MetricCard
          label="Ausentismo"
          value={String(n.ausentismo)}
          tone="warn"
          delay={0.15}
        />
        <MetricCard label="Presupuestados" value={String(n.presupuestados)} delay={0.2} />
      </div>

      <div className="stack-2">
        <Panel title="Resumen del día" subtitle="Criterios con participación" delay={0.18}>
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
              {n.resumen.map((r) => (
                <tr key={r.criterio}>
                  <td>
                    {r.criterio === "INCAPACIDAD" ? (
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
        </Panel>

        <Panel title="Operatividad vs plantilla" delay={0.24}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Criterio</th>
                <th>Real</th>
                <th>%</th>
                <th>Dif</th>
              </tr>
            </thead>
            <tbody>
              {n.operatividad.map((r) => (
                <tr key={r.criterio}>
                  <td>{r.criterio}</td>
                  <td>{r.real}</td>
                  <td>{pct(r.pct)}</td>
                  <td className={difClass(r.dif)}>{pct(r.dif)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}
