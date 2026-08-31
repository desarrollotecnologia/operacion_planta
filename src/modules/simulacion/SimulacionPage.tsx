import { useCallback, useEffect, useMemo, useState } from "react";
import { MetricCard, PageHeader, Panel } from "../../components/ui";
import { useCierreStore } from "../../store/CierreStore";
import { useCierreVistas } from "../../hooks/useCierreVistas";
import { api, ApiError } from "../../lib/api";
import { calcSimulacion, SIMULACION_VACIA } from "../../lib/simulacionCalc";
import type { SimulacionInput } from "../../data/types";
import "../../components/ui.css";
import "./simulacion.css";

function toFormInput(data: Partial<SimulacionInput>): SimulacionInput {
  return {
    reses: data.reses ?? SIMULACION_VACIA.reses,
    velocidadBruta: data.velocidadBruta ?? SIMULACION_VACIA.velocidadBruta,
    paradaProgramadaHr: data.paradaProgramadaHr ?? SIMULACION_VACIA.paradaProgramadaHr,
    vaciadoLineaHr: data.vaciadoLineaHr ?? SIMULACION_VACIA.vaciadoLineaHr,
    horaInicio: data.horaInicio ?? SIMULACION_VACIA.horaInicio,
    ultimaNoqueada: data.ultimaNoqueada ?? "",
    ultimaPesada: data.ultimaPesada ?? "",
  };
}

type NumKey = "reses" | "velocidadBruta" | "paradaProgramadaHr" | "vaciadoLineaHr";

export function SimulacionPage() {
  const { selectedFecha } = useCierreStore();
  const { simulacion: remota, cargando, error, recargar } = useCierreVistas(selectedFecha);
  const [form, setForm] = useState<SimulacionInput>(SIMULACION_VACIA);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  useEffect(() => {
    if (remota) setForm(toFormInput(remota));
  }, [remota]);

  const calc = useMemo(() => calcSimulacion(form), [form]);

  const setNum = useCallback((key: NumKey, raw: string) => {
    const n = raw === "" ? 0 : Number(raw);
    setForm((prev) => ({ ...prev, [key]: Number.isFinite(n) ? n : 0 }));
    setMensaje(null);
    setErrorGuardado(null);
  }, []);

  const setTime = useCallback((key: "horaInicio" | "ultimaNoqueada" | "ultimaPesada", value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setMensaje(null);
    setErrorGuardado(null);
  }, []);

  const guardar = async () => {
    if (!selectedFecha) return;
    setGuardando(true);
    setErrorGuardado(null);
    setMensaje(null);
    try {
      await api.guardarSimulacion(selectedFecha, form);
      await recargar();
      setMensaje("Simulación guardada y sincronizada con el cierre del día.");
    } catch (err) {
      setErrorGuardado(err instanceof ApiError ? err.message : "No se pudo guardar la simulación.");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando && !remota) {
    return <p className="note-block">Cargando simulación…</p>;
  }

  if (error || !remota) {
    return (
      <p className="note-block">
        {error ?? "No hay cierre registrado para la fecha seleccionada. Regístrelo en Base de datos cierre."}
      </p>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Simulación"
        title="Simulación de velocidad"
        description={`Parámetros editables del cierre del ${selectedFecha}. Los campos calculados se actualizan al instante (hoja SIMULACION).`}
      />

      <div className="sim-legend">
        <span className="lg-input">
          <i aria-hidden /> Entrada editable
        </span>
        <span className="lg-calc">
          <i aria-hidden /> Calculado
        </span>
        <span className="lg-ref">
          <i aria-hidden /> Referencia (# reses)
        </span>
      </div>

      <div className="metrics-grid">
        <MetricCard label="# Reses" value={String(calc.reses)} delay={0.05} />
        <MetricCard label="Velocidad bruta" value={`${calc.velocidadBruta} r/h`} tone="accent" delay={0.1} />
        <MetricCard label="Velocidad neta" value={`${calc.velocidadNeta} r/h`} tone="ok" delay={0.15} />
        <MetricCard
          label="Seg / res (noqueo)"
          value={String(calc.segundosPorRes)}
          hint={`${calc.resesPorMin.toFixed(2)} reses/min · ${calc.minPorResTexto}`}
          delay={0.2}
        />
      </div>

      <Panel title="Bloque 1 — Velocidad y duración" subtitle="Fila 4 del Excel" delay={0.12}>
        <div className="sim-sheet">
          <table className="sim-table">
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Valor</th>
                <th>Unidad</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="sim-label"># Reses</td>
                <td>
                  <input
                    className="sim-input"
                    type="number"
                    min={0}
                    value={form.reses || ""}
                    onChange={(e) => setNum("reses", e.target.value)}
                  />
                </td>
                <td>cab.</td>
              </tr>
              <tr>
                <td className="sim-label">Velocidad bruta</td>
                <td>
                  <input
                    className="sim-input"
                    type="number"
                    min={0}
                    step={0.1}
                    value={form.velocidadBruta || ""}
                    onChange={(e) => setNum("velocidadBruta", e.target.value)}
                  />
                </td>
                <td>reses/h</td>
              </tr>
              <tr>
                <td className="sim-label">Parada programada</td>
                <td>
                  <input
                    className="sim-input"
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.paradaProgramadaHr || ""}
                    onChange={(e) => setNum("paradaProgramadaHr", e.target.value)}
                  />
                </td>
                <td>hr</td>
              </tr>
              <tr>
                <td className="sim-label">Vaciado línea</td>
                <td>
                  <input
                    className="sim-input"
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.vaciadoLineaHr || ""}
                    onChange={(e) => setNum("vaciadoLineaHr", e.target.value)}
                  />
                </td>
                <td>hr</td>
              </tr>
              <tr>
                <td className="sim-label">Referencia (# reses)</td>
                <td className="sim-ref">{calc.reses}</td>
                <td>cab.</td>
              </tr>
              <tr>
                <td className="sim-label">Duración proceso deseada</td>
                <td className="sim-calc">{calc.duracionDeseadaHr.toFixed(4)}</td>
                <td>hr</td>
              </tr>
              <tr>
                <td className="sim-label">Duración efectiva de proceso</td>
                <td className="sim-calc">{calc.duracionEfectivaHr.toFixed(4)}</td>
                <td>hr</td>
              </tr>
              <tr>
                <td className="sim-label">Duración efectiva para noquear</td>
                <td className="sim-calc">{calc.duracionNoqueoHr.toFixed(4)}</td>
                <td>hr</td>
              </tr>
              <tr>
                <td className="sim-label">Velocidad neta</td>
                <td className="sim-calc">{calc.velocidadNeta.toFixed(2)}</td>
                <td>reses/h</td>
              </tr>
              <tr>
                <td className="sim-label">Velocidad neta noqueo/h</td>
                <td className="sim-calc">{calc.velocidadNetaNoqueo.toFixed(2)}</td>
                <td>reses/h</td>
              </tr>
              <tr>
                <td className="sim-label"># Reses / min</td>
                <td className="sim-calc">{calc.resesPorMin.toFixed(4)}</td>
                <td>res/min</td>
              </tr>
              <tr>
                <td className="sim-label">Min / res</td>
                <td className="sim-calc">{calc.minPorResTexto}</td>
                <td>{calc.minutosPorRes.toFixed(4)} min</td>
              </tr>
              <tr>
                <td className="sim-label">Noquear cada (seg/res)</td>
                <td className="sim-calc">{calc.segundosPorRes}</td>
                <td>seg</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Bloque 2 — Horarios de trabajo" subtitle="Tiempos laborados y desfase" delay={0.18}>
        <div className="sim-sheet">
          <table className="sim-table">
            <tbody>
              <tr>
                <td className="sim-label">Hora de inicio</td>
                <td>
                  <input
                    className="sim-input"
                    type="time"
                    value={form.horaInicio}
                    onChange={(e) => setTime("horaInicio", e.target.value)}
                  />
                </td>
              </tr>
              <tr>
                <td className="sim-label">Última noqueada</td>
                <td>
                  <input
                    className="sim-input"
                    type="time"
                    value={form.ultimaNoqueada}
                    onChange={(e) => setTime("ultimaNoqueada", e.target.value)}
                  />
                </td>
              </tr>
              <tr>
                <td className="sim-label">Última pesada</td>
                <td>
                  <input
                    className="sim-input"
                    type="time"
                    value={form.ultimaPesada}
                    onChange={(e) => setTime("ultimaPesada", e.target.value)}
                  />
                </td>
              </tr>
              <tr>
                <td className="sim-label">Tiempo laborado</td>
                <td className="sim-calc">{calc.tiempoLaborado || "—"}</td>
              </tr>
              <tr>
                <td className="sim-label">Desfase pesada − noqueo</td>
                <td className="sim-calc">{calc.desfasePesadaNoqueo || "—"}</td>
              </tr>
              <tr>
                <td className="sim-label">Horas laboradas (decimal)</td>
                <td className="sim-calc">{calc.horasLaboradas.toFixed(4)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="sim-actions">
          <button type="button" className="btn btn-primary" disabled={guardando} onClick={() => void guardar()}>
            {guardando ? "Guardando…" : "Guardar simulación"}
          </button>
          {mensaje ? <p className="note-block tone-ok">{mensaje}</p> : null}
          {errorGuardado ? <p className="note-block tone-danger">{errorGuardado}</p> : null}
        </div>
      </Panel>
    </div>
  );
}
