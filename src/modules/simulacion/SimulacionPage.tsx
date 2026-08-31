import { MetricCard, PageHeader, Panel } from "../../components/ui";
import { useCierreStore } from "../../store/CierreStore";
import { useCierreVistas } from "../../hooks/useCierreVistas";
import "../../components/ui.css";

export function SimulacionPage() {
  const { selectedFecha } = useCierreStore();
  const { simulacion: s, cargando, error } = useCierreVistas(selectedFecha);

  if (cargando && !s) {
    return <p className="note-block">Cargando simulación…</p>;
  }

  if (error || !s) {
    return <p className="note-block">{error ?? "No hay datos de simulación para la fecha seleccionada."}</p>;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Simulación"
        title="Simulación de velocidad"
        description={`Parámetros del cierre del ${selectedFecha} (hoja SIMULACION / Base de datos).`}
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
        <Panel title="Parámetros de simulación" subtitle="Derivados del cierre diario" delay={0.18}>
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
      </div>
    </div>
  );
}
