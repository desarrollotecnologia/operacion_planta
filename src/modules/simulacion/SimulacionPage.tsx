import { MetricCard, PageHeader, Panel } from "../../components/ui";
import { simulacionMock } from "../../data/mock/simulacion";
import "../../components/ui.css";

export function SimulacionPage() {
  const s = simulacionMock;

  return (
    <div>
      <PageHeader
        eyebrow="Módulo 1 · Visualizar"
        title="Simulación de velocidad"
        description="Planifica reses, velocidad bruta y tiempos de parada/vaciado para estimar duración efectiva y ritmo de noqueo."
      />

      <div className="metrics-grid">
        <MetricCard label="# Reses" value={String(s.reses)} delay={0.05} />
        <MetricCard
          label="Velocidad bruta"
          value={`${s.velocidadBruta} r/h`}
          hint="Meta de línea"
          tone="accent"
          delay={0.1}
        />
        <MetricCard
          label="Velocidad neta"
          value={`${s.velocidadNeta} r/h`}
          hint="Tras paradas"
          tone="ok"
          delay={0.15}
        />
        <MetricCard
          label="Seg / res"
          value={String(s.segundosPorRes)}
          hint={`${s.resesPorMin.toFixed(2)} reses/min`}
          delay={0.2}
        />
      </div>

      <div className="stack-2">
        <Panel title="Parámetros de simulación" subtitle="Entradas editables (próximo: formulario vivo)" delay={0.18}>
          <table className="data-table">
            <tbody>
              <tr>
                <td>Hora de inicio</td>
                <td>
                  <strong>{s.horaInicio}</strong>
                </td>
              </tr>
              <tr>
                <td>Parada programada (hr)</td>
                <td>{s.paradaProgramadaHr}</td>
              </tr>
              <tr>
                <td>Vaciado línea (hr)</td>
                <td>{s.vaciadoLineaHr}</td>
              </tr>
              <tr>
                <td>Duración deseada (hr)</td>
                <td>{s.duracionDeseadaHr.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Duración efectiva (hr)</td>
                <td>{s.duracionEfectivaHr.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Duración para noquear total (hr)</td>
                <td>{s.duracionNoqueoHr.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Velocidad neta noqueo</td>
                <td>{s.velocidadNetaNoqueo.toFixed(2)} r/h</td>
              </tr>
            </tbody>
          </table>
        </Panel>

        <Panel title="Lógica (como en Sheets)" subtitle="Fórmulas que migraremos al backend" delay={0.24}>
          <div className="note-block">
            <p>
              <strong>Duración deseada</strong> = Reses ÷ Velocidad bruta
            </p>
            <p style={{ marginTop: "0.55rem" }}>
              <strong>Duración efectiva</strong> = Deseada − Parada programada
            </p>
            <p style={{ marginTop: "0.55rem" }}>
              <strong>Velocidad neta</strong> = Reses ÷ Duración efectiva
            </p>
            <p style={{ marginTop: "0.55rem" }}>
              <strong>Noqueo</strong> = Efectiva − Vaciado línea
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
