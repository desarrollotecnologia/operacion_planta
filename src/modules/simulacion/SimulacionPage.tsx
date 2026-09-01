import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../components/ui";
import { useCierreStore } from "../../store/CierreStore";
import { useCierreVistas } from "../../hooks/useCierreVistas";
import { api, ApiError } from "../../lib/api";
import { calcBloquesSimulacion, calcSimulacion, fmtPctExcel, SIMULACION_VACIA, VACIADO_LINEA_HR } from "../../lib/simulacionCalc";
import type { SimulacionInput } from "../../data/types";
import "../../components/ui.css";
import "./simulacion.css";

function toFormInput(data: Partial<SimulacionInput>): SimulacionInput {
  return {
    reses: data.reses ?? SIMULACION_VACIA.reses,
    velocidadBruta: data.velocidadBruta ?? SIMULACION_VACIA.velocidadBruta,
    paradaProgramadaHr: data.paradaProgramadaHr ?? SIMULACION_VACIA.paradaProgramadaHr,
    vaciadoLineaHr: VACIADO_LINEA_HR,
    horaInicio: data.horaInicio ?? SIMULACION_VACIA.horaInicio,
    ultimaNoqueada: data.ultimaNoqueada ?? "",
    ultimaPesada: data.ultimaPesada ?? "",
  };
}

type NumKey = "reses" | "velocidadBruta" | "paradaProgramadaHr";

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
  const bloques = useMemo(() => calcBloquesSimulacion(calc.reses), [calc.reses]);

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
      await api.guardarSimulacion(selectedFecha, { ...form, vaciadoLineaHr: VACIADO_LINEA_HR });
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
    <div className="sim-page">
      <PageHeader
        title="Simulación"
        description={`Cierre del ${selectedFecha}. Verde = editable, gris = fórmula.`}
      />

      <div className="sim-legend">
        <span className="lg-input">
          <i aria-hidden /> Verde — entrada
        </span>
        <span className="lg-calc">
          <i aria-hidden /> Gris — calculado
        </span>
        <span className="lg-ref">
          <i aria-hidden /> Amarillo — referencia # reses
        </span>
      </div>

      <div className="sim-workbook">
        <div className="sim-sheet-tab">SIMULACION</div>

        <div className="sim-sheet">
          <table className="sim-grid" aria-label="Simulación filas 3 y 4">
            <thead>
              <tr className="sim-row-letters">
                <th className="sim-corner" />
                <th>C</th>
                <th>D</th>
                <th>E</th>
                <th>F</th>
                <th>G</th>
                <th>H</th>
                <th>I</th>
                <th>J</th>
                <th>K</th>
                <th>L</th>
                <th>M</th>
                <th className="sim-col-ref">Ref</th>
                <th>P</th>
              </tr>
              <tr className="sim-row-labels">
                <th className="sim-row-num">3</th>
                <th># RESES</th>
                <th>VEL. BRUTA<br />(Reses/Hr)</th>
                <th>PARADA PROG.<br />(Hr)</th>
                <th>VACIADO LÍNEA<br />(Hr)</th>
                <th>DUR. PROCESO<br />DESEADA (Hr)</th>
                <th>DUR. EFECTIVA<br />PROCESO (Hr)</th>
                <th>DUR. EFECTIVA<br />NOQUEAR (Hr)</th>
                <th>VEL. NETA<br />(Reses/Hr)</th>
                <th>VEL. NETA<br />NOQUEO/Hr</th>
                <th># RESES<br />/ Min</th>
                <th>MIN / RES</th>
                <th className="sim-col-ref"># RESES</th>
                <th>NOQUEAR CADA<br />Seg/Res</th>
              </tr>
            </thead>
            <tbody>
              <tr className="sim-row-data">
                <th className="sim-row-num">4</th>
                <td>
                  <input
                    className="sim-input"
                    type="number"
                    min={0}
                    title="C4 — # RESES"
                    value={form.reses || ""}
                    onChange={(e) => setNum("reses", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="sim-input"
                    type="number"
                    min={0}
                    step={0.1}
                    title="D4 — Velocidad bruta"
                    value={form.velocidadBruta || ""}
                    onChange={(e) => setNum("velocidadBruta", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="sim-input"
                    type="number"
                    min={0}
                    step={0.01}
                    title="E4 — Parada programada"
                    value={form.paradaProgramadaHr || ""}
                    onChange={(e) => setNum("paradaProgramadaHr", e.target.value)}
                  />
                </td>
                <td className="sim-calc" title="F4 — Vaciado línea (fijo)">
                  {VACIADO_LINEA_HR.toFixed(2)}
                </td>
                <td className="sim-calc" title="G = # RESES / Vel. bruta">
                  {calc.duracionDeseadaHr.toFixed(4)}
                </td>
                <td className="sim-calc" title="H = G − parada programada">
                  {calc.duracionEfectivaHr.toFixed(4)}
                </td>
                <td className="sim-calc" title="I = H − vaciado línea">
                  {calc.duracionNoqueoHr.toFixed(4)}
                </td>
                <td className="sim-calc" title="J = # RESES / H">
                  {calc.velocidadNeta.toFixed(2)}
                </td>
                <td className="sim-calc" title="K = # RESES / I">
                  {calc.velocidadNetaNoqueo.toFixed(2)}
                </td>
                <td className="sim-calc" title="L = K / 60">
                  {calc.resesPorMin.toFixed(4)}
                </td>
                <td className="sim-calc" title="M = 1 / L">
                  <span className="sim-time">{calc.minPorResTexto}</span>
                  <span className="sim-sub">{calc.minutosPorRes.toFixed(4)} min</span>
                </td>
                <td className="sim-ref" title="Referencia = # RESES">
                  {calc.reses}
                </td>
                <td className="sim-calc" title="P = 3600 / K">
                  {calc.segundosPorRes}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="sim-block-label">Control de tiempos (filas 7–10)</p>

        <div className="sim-sheet">
          <table className="sim-grid sim-grid-times" aria-label="Horarios de trabajo">
            <thead>
              <tr className="sim-row-letters">
                <th className="sim-corner" />
                <th>C</th>
                <th>D</th>
                <th>E</th>
                <th>F</th>
                <th>G</th>
              </tr>
              <tr className="sim-row-labels">
                <th className="sim-row-num">7</th>
                <th colSpan={2}>HORA DE INICIO</th>
                <th>ÚLTIMA NOQUEADA</th>
                <th>ÚLTIMA PESADA</th>
                <th>TIEMPO LABORADO</th>
              </tr>
            </thead>
            <tbody>
              <tr className="sim-row-data">
                <th className="sim-row-num">10</th>
                <td colSpan={2}>
                  <input
                    className="sim-input sim-input-time"
                    type="time"
                    title="D7 — Hora de inicio"
                    value={form.horaInicio}
                    onChange={(e) => setTime("horaInicio", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="sim-input sim-input-time"
                    type="time"
                    value={form.ultimaNoqueada}
                    onChange={(e) => setTime("ultimaNoqueada", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="sim-input sim-input-time"
                    type="time"
                    value={form.ultimaPesada}
                    onChange={(e) => setTime("ultimaPesada", e.target.value)}
                  />
                </td>
                <td className="sim-calc" title="Última pesada − hora inicio">
                  {calc.tiempoLaborado || "—"}
                </td>
              </tr>
              <tr className="sim-row-labels">
                <th className="sim-row-num" />
                <th colSpan={3}>DESFASE PESADA − NOQUEO</th>
                <th colSpan={2}>HORAS LABORADAS (decimal)</th>
              </tr>
              <tr className="sim-row-data">
                <th className="sim-row-num" />
                <td className="sim-calc" colSpan={3} title="Última pesada − última noqueada">
                  {calc.desfasePesadaNoqueo || "—"}
                </td>
                <td className="sim-calc" colSpan={2}>
                  {calc.horasLaboradas.toFixed(4)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="sim-block-label">Proyección y tolerancias (filas 8–13)</p>

        <div className="sim-extra-blocks">
          <div className="sim-sheet sim-sheet-inline">
            <table className="sim-proy-grid" aria-label="Proyección # reses">
              <tbody>
                <tr>
                  <td className="sim-proy-empty" />
                  <td className="sim-ref sim-proy-ref" title="G8 = C4 (# RESES)">
                    {bloques.referenciaReses}
                  </td>
                </tr>
                <tr>
                  <td className="sim-proy-val" title="F9 = G8 × 4">
                    {bloques.resesX4}
                  </td>
                  <td className="sim-proy-val" title="G9 = G8 × 2">
                    {bloques.resesX2}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="sim-sheet sim-sheet-inline">
            <table className="sim-tol-grid" aria-label="Tolerancias de calidad">
              <thead>
                <tr>
                  <th>TOLERANCIA</th>
                  <th>PIELES/ C. GRASA</th>
                  <th>C.PIERNA/S.ROTA</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="sim-tol-pct" title="F12 = (F13/F9)×100">
                    {fmtPctExcel(bloques.toleranciaPct[0])}
                  </td>
                  <td className="sim-tol-pct" title="G12 = (G13/G9)×100">
                    {fmtPctExcel(bloques.toleranciaPct[1])}
                  </td>
                  <td className="sim-tol-pct" title="H12 = (H13/G9)×100">
                    {fmtPctExcel(bloques.toleranciaPct[2])}
                  </td>
                </tr>
                <tr>
                  <td className="sim-tol-tope" title="F13 = F9 × 0,007">
                    {bloques.toleranciaTope[0]}
                  </td>
                  <td className="sim-tol-tope" title="G13 = G9 × 0,015">
                    {bloques.toleranciaTope[1]}
                  </td>
                  <td className="sim-tol-tope" title="H13 = G9 × 0,01">
                    {bloques.toleranciaTope[2]}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="sim-actions">
          <button type="button" className="btn btn-primary" disabled={guardando} onClick={() => void guardar()}>
            {guardando ? "Guardando…" : "Guardar simulación"}
          </button>
          {mensaje ? <p className="note-block sim-msg-ok">{mensaje}</p> : null}
          {errorGuardado ? <p className="note-block sim-msg-err">{errorGuardado}</p> : null}
        </div>
      </div>
    </div>
  );
}
