import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../components/ui";
import { useCierreStore } from "../../store/CierreStore";
import { useCierreVistas } from "../../hooks/useCierreVistas";
import { api, ApiError } from "../../lib/api";
import { calcBloquesSimulacion, calcResumenSacrificio, calcSimulacion, estadoVelocidadNeta, fmtCeil, fmtPctExcel, fmtResumenTimestamp, normalizeTimeInput, SIMULACION_VACIA, toHHMM, toHMS, VACIADO_LINEA_HR } from "../../lib/simulacionCalc";
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
    ultimaNoqueada: "",
    ultimaPesada: "",
    resesSacrificadas: data.resesSacrificadas ?? SIMULACION_VACIA.resesSacrificadas,
  };
}

type NumKey = "reses" | "velocidadBruta" | "paradaProgramadaHr" | "resesSacrificadas";

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
  const resumen = useMemo(
    () => calcResumenSacrificio(calc, form.resesSacrificadas),
    [calc, form.resesSacrificadas],
  );
  const velNetaEstado = estadoVelocidadNeta(calc.velocidadNeta);
  const velResumenEstado = estadoVelocidadNeta(resumen.velocidadLinea);

  const setNum = useCallback((key: NumKey, raw: string) => {
    const n = raw === "" ? 0 : Number(raw);
    setForm((prev) => ({ ...prev, [key]: Number.isFinite(n) ? n : 0 }));
    setMensaje(null);
    setErrorGuardado(null);
  }, []);

  const setTime = useCallback((key: "horaInicio", value: string) => {
    setForm((prev) => ({ ...prev, [key]: normalizeTimeInput(value) }));
    setMensaje(null);
    setErrorGuardado(null);
  }, []);

  const guardar = async () => {
    if (!selectedFecha) return;
    setGuardando(true);
    setErrorGuardado(null);
    setMensaje(null);
    try {
      await api.guardarSimulacion(selectedFecha, {
        ...form,
        vaciadoLineaHr: VACIADO_LINEA_HR,
        resesSacrificadas: form.resesSacrificadas,
        ultimaNoqueada: toHHMM(calc.ultimaNoqueada),
        ultimaPesada: toHHMM(calc.ultimaPesada),
      });
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
                  {fmtCeil(VACIADO_LINEA_HR)}
                </td>
                <td className="sim-calc" title="G = # RESES / Vel. bruta">
                  {fmtCeil(calc.duracionDeseadaHr)}
                </td>
                <td className="sim-calc" title="H = G − parada programada">
                  {fmtCeil(calc.duracionEfectivaHr)}
                </td>
                <td className="sim-calc" title="I = H − vaciado línea">
                  {fmtCeil(calc.duracionNoqueoHr)}
                </td>
                <td
                  className={`sim-calc sim-vel-neta sim-vel-${velNetaEstado}`}
                  title="J = # RESES / H — meta 75 Reses/Hr"
                >
                  {fmtCeil(calc.velocidadNeta)}
                </td>
                <td className="sim-calc" title="K = # RESES / I">
                  {fmtCeil(calc.velocidadNetaNoqueo)}
                </td>
                <td className="sim-calc" title="L = K / 60">
                  {fmtCeil(calc.resesPorMin)}
                </td>
                <td className="sim-calc" title="M = 1 / L">
                  {calc.minPorResTexto}
                </td>
                <td className="sim-ref" title="Referencia = # RESES">
                  {calc.reses}
                </td>
                <td className="sim-calc" title="P = 3600 / K">
                  {fmtCeil(calc.segundosPorRes)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="sim-lower-blocks">
          <section className="sim-times-section">
            <p className="sim-block-label sim-times-title">Proyección de Beneficio</p>

            <div className="sim-sheet sim-sheet-inline sim-times-wrap">
              <table className="sim-times-vertical" aria-label="Control de tiempos">
                <tbody>
                  <tr>
                    <th scope="row">HORA DE INICIO</th>
                    <td className="sim-times-editable">
                      <input
                        className="sim-input sim-input-time sim-input-cell sim-input-24h"
                        type="text"
                        inputMode="numeric"
                        placeholder="HH:MM"
                        pattern="[0-9]{1,2}:[0-9]{2}"
                        title="D7 — Hora de inicio (24 h)"
                        value={toHHMM(form.horaInicio)}
                        onChange={(e) => setTime("horaInicio", e.target.value)}
                        onBlur={(e) => setTime("horaInicio", e.target.value)}
                      />
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">ÚLTIMA NOQUEADA</th>
                    <td className="sim-times-calc" title="Última pesada − 30 min">
                      {toHMS(calc.ultimaNoqueada) || "—"}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">ÚLTIMA PESADA</th>
                    <td className="sim-times-calc" title="Inicio + tiempo laborado">
                      {toHMS(calc.ultimaPesada) || "—"}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">TIEMPO LABORADO</th>
                    <td className="sim-times-calc" title="= G4/24 (duración deseada)">
                      {toHMS(calc.tiempoLaborado) || "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="sim-tol-section">
            <p className="sim-block-label sim-tol-title">Tolerancias de calidad</p>

            <div className="sim-sheet sim-sheet-inline sim-tol-wrap">
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
          </section>
        </div>

        <section className="sim-sac-section">
          <table className="sim-sac-grid" aria-label="Resumen parcial de sacrificio">
            <thead>
              <tr>
                <th colSpan={3} className="sim-sac-title">
                  RESUMEN PARCIAL DE SACRIFICIO
                </th>
              </tr>
              <tr>
                <th colSpan={3} className="sim-sac-timestamp">
                  {fmtResumenTimestamp()}
                </th>
              </tr>
              <tr className="sim-sac-head">
                <th>#</th>
                <th>ITEM</th>
                <th>CIFRA/TOTAL</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td className="sim-sac-item">Hora de inicio</td>
                <td>{resumen.horaInicio || "—"}</td>
              </tr>
              <tr>
                <td>2</td>
                <td className="sim-sac-item">Total de sacrificio</td>
                <td>{resumen.totalSacrificio}</td>
              </tr>
              <tr>
                <td>3</td>
                <td className="sim-sac-item">Reses sacrificadas</td>
                <td className="sim-sac-editable">
                  <input
                    className="sim-input sim-sac-input"
                    type="number"
                    min={0}
                    max={form.reses || undefined}
                    title="Entrada manual (Excel E8)"
                    value={form.resesSacrificadas || ""}
                    onChange={(e) => setNum("resesSacrificadas", e.target.value)}
                  />
                </td>
              </tr>
              <tr>
                <td>4</td>
                <td className="sim-sac-item">Reses faltantes</td>
                <td>{resumen.resesFaltantes}</td>
              </tr>
              <tr>
                <td>5</td>
                <td className="sim-sac-item">Velocidad de línea (Reses/hora)</td>
                <td className={`sim-vel-neta sim-vel-${velResumenEstado}`}>
                  {resumen.velocidadLinea}
                </td>
              </tr>
              <tr>
                <td>6</td>
                <td className="sim-sac-item">Hora estimada de finalización</td>
                <td className="sim-sac-highlight">{resumen.horaEstimadaFin || "—"}</td>
              </tr>
            </tbody>
          </table>
        </section>

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
