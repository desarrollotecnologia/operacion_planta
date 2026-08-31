import { useEffect, useMemo, useState, type FormEvent } from "react";
import { MetricCard, PageHeader, Panel, formatDate, pct } from "../../components/ui";
import type { NuevoRegistroInput, RegistroCierre } from "../../data/types";
import { calcCierreDerived, pielesRotasFromRatio } from "../../lib/cierreCalc";
import { useCierreStore } from "../../store/CierreStore";
import "../../components/ui.css";
import "./baseDatos.css";

function mesLabelFromFecha(fecha: string) {
  if (!fecha || fecha.length < 7) return "—";
  const [anio, mes] = fecha.split("-").map(Number);
  const nombre = new Date(anio, mes - 1, 1).toLocaleDateString("es-CO", { month: "long" });
  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
}

const empty: NuevoRegistroInput = {
  fecha: "",
  totalBeneficio: 0,
  horaInicio: "14:00",
  horaFin: "20:00",
  tiempoParadasMin: 0,
  paradaProgramadaMin: 30,
  velocidadLinea: 75,
  horasLaboradas: 0,
  tardanzaInicio: 0,
  productividad: 0,
  velocidadNeta: 75,
  velocidadBruta: 70,
  toleranciaCero: 0.01,
  pieles: 0,
  cortePierna: 0,
  sobrebarrigaRota: 0,
  coberturaGrasa: 0,
  observacion: "",
};

type FormState = NuevoRegistroInput & { totalPielesRotas: number };

function registroToForm(r: RegistroCierre): FormState {
  const { id: _id, mes: _m, anio: _a, duracionMin: _d, ...rest } = r;
  return {
    ...empty,
    ...rest,
    totalPielesRotas: pielesRotasFromRatio(rest.pieles, rest.totalBeneficio),
  };
}

function CampoCalculado({ id, label, value, hint }: { id: string; label: string; value: string; hint?: string }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className="field-calc"
        type="text"
        readOnly
        tabIndex={-1}
        value={value}
        title={hint ?? "Fórmula (como Excel)"}
      />
    </div>
  );
}

export function BaseDatosCierrePage() {
  const { registros, upsertRegistro, selectedFecha, setSelectedFecha, cargando, guardando, error } =
    useCierreStore();
  const [form, setForm] = useState<FormState>({ ...empty, totalPielesRotas: 0 });
  const [savedFlash, setSavedFlash] = useState(false);

  const prefijoMes = selectedFecha?.slice(0, 7) ?? "";
  const anioFoco = prefijoMes ? Number(prefijoMes.slice(0, 4)) : 2026;
  const mesLabel = mesLabelFromFecha(selectedFecha || `${prefijoMes}-01`);

  const selected = useMemo(
    () => registros.find((r) => r.fecha === selectedFecha) ?? null,
    [registros, selectedFecha],
  );

  const filtradas = useMemo(
    () =>
      registros
        .filter((r) => !prefijoMes || r.fecha.startsWith(prefijoMes))
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [registros, prefijoMes],
  );

  const totals = useMemo(() => {
    const beneficio = filtradas.reduce((a, r) => a + r.totalBeneficio, 0);
    return { beneficio, dias: filtradas.length };
  }, [filtradas]);

  const calc = useMemo(
    () =>
      calcCierreDerived({
        totalBeneficio: form.totalBeneficio,
        horaInicio: form.horaInicio,
        horaFin: form.horaFin,
        tiempoParadasMin: form.tiempoParadasMin,
        paradaProgramadaMin: form.paradaProgramadaMin,
        totalPielesRotas: form.totalPielesRotas,
      }),
    [
      form.totalBeneficio,
      form.horaInicio,
      form.horaFin,
      form.tiempoParadasMin,
      form.paradaProgramadaMin,
      form.totalPielesRotas,
    ],
  );

  useEffect(() => {
    const r = registros.find((x) => x.fecha === selectedFecha);
    if (r) {
      setForm(registroToForm(r));
    }
  }, [selectedFecha, registros]);

  function loadRegistro(r: RegistroCierre) {
    setSelectedFecha(r.fecha);
    setForm(registroToForm(r));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.fecha) return;
    const { totalPielesRotas: _t, ...rest } = form;
    const payload: NuevoRegistroInput & { totalPielesRotas: number } = {
      ...rest,
      totalPielesRotas: form.totalPielesRotas,
      horasLaboradas: calc.horasLaboradas,
      productividad: calc.productividad,
      velocidadNeta: calc.velocidadNeta,
      velocidadLinea: calc.velocidadLinea,
      velocidadBruta: calc.velocidadBruta,
      pieles: calc.pieles,
    };
    const guardado = await upsertRegistro(payload);
    if (!guardado) return;
    setSavedFlash(true);
    setSelectedFecha(guardado.fecha);
    window.setTimeout(() => setSavedFlash(false), 1800);
  }

  const setNum = (key: keyof FormState, raw: string) => {
    const n = raw === "" ? 0 : Number(raw);
    setForm((f) => ({ ...f, [key]: Number.isFinite(n) ? n : 0 }));
  };

  return (
    <div>
      <PageHeader
        eyebrow="Base de datos cierre"
        title="Base de datos cierre"
        description="Capture el día arriba; al guardar se escribe en cierre_diario y aparece en la lista de abajo."
      />

      {error ? <p className="alert-error">{error}</p> : null}

      <div className="metrics-grid">
        <MetricCard label="Mes foco" value={mesLabel} hint={String(anioFoco)} delay={0.05} />
        <MetricCard label="Reses (mes)" value={String(totals.beneficio)} tone="accent" delay={0.1} />
        <MetricCard label="Días cargados" value={String(totals.dias)} delay={0.15} />
        <MetricCard
          label="Estado"
          value={cargando ? "Cargando" : guardando ? "Guardando" : savedFlash ? "Guardado" : "Listo"}
          tone={savedFlash ? "ok" : "default"}
          hint={selected ? formatDate(selected.fecha) : "Sin selección"}
          delay={0.2}
        />
      </div>

      <Panel
        title="Formulario del día"
        subtitle="Amarillo = editable · Blanco = fórmula (hoja BASE DE DATOS CIERRE del Excel)"
        delay={0.12}
      >
        <div className="bd-legend">
          <span className="bd-lg-input">
            <i aria-hidden /> Amarillo — editable
          </span>
          <span className="bd-lg-calc">
            <i aria-hidden /> Blanco — fórmula
          </span>
        </div>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="fecha">Fecha</label>
              <input
                id="fecha"
                className="field-input"
                type="date"
                required
                value={form.fecha}
                onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="beneficio">Total beneficio</label>
              <input
                id="beneficio"
                className="field-input"
                type="number"
                value={form.totalBeneficio || ""}
                onChange={(e) => setNum("totalBeneficio", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="hi">Hora inicio</label>
              <input
                id="hi"
                className="field-input"
                type="time"
                value={form.horaInicio}
                onChange={(e) => setForm((f) => ({ ...f, horaInicio: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="hf">Hora fin</label>
              <input
                id="hf"
                className="field-input"
                type="time"
                value={form.horaFin}
                onChange={(e) => setForm((f) => ({ ...f, horaFin: e.target.value }))}
              />
            </div>
            <CampoCalculado
              id="duracion"
              label="Duración (min)"
              value={String(calc.duracionMin)}
              hint="(Hora fin − inicio) × 24 × 60"
            />
            <div className="field">
              <label htmlFor="paradas">Tiempos improductivos (min)</label>
              <input
                id="paradas"
                className="field-input"
                type="number"
                value={form.tiempoParadasMin || ""}
                onChange={(e) => setNum("tiempoParadasMin", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="prog">Paradas programadas (min)</label>
              <input
                id="prog"
                className="field-input"
                type="number"
                value={form.paradaProgramadaMin || ""}
                onChange={(e) => setNum("paradaProgramadaMin", e.target.value)}
              />
            </div>
            <CampoCalculado
              id="hl"
              label="Horas laboradas"
              value={calc.horasLaboradas.toFixed(2)}
              hint="Duración (min) ÷ 60"
            />
            <div className="field">
              <label htmlFor="tard">Tardanza inicio (min)</label>
              <input
                id="tard"
                className="field-input"
                type="number"
                value={form.tardanzaInicio || ""}
                onChange={(e) => setNum("tardanzaInicio", e.target.value)}
              />
            </div>
            <CampoCalculado
              id="prod"
              label="Productividad"
              value={calc.productividad.toFixed(2)}
              hint="Beneficio ÷ ((duración − parada prog.) ÷ 60)"
            />
            <CampoCalculado
              id="vn"
              label="Velocidad neta / línea"
              value={calc.velocidadNeta.toFixed(2)}
              hint="Beneficio ÷ ((duración − parada prog. − improd.) ÷ 60)"
            />
            <CampoCalculado
              id="vb"
              label="Velocidad bruta"
              value={calc.velocidadBruta.toFixed(2)}
              hint="Beneficio ÷ horas laboradas"
            />
            <div className="field">
              <label htmlFor="tol">Tolerancia cero</label>
              <input
                id="tol"
                className="field-input"
                type="number"
                step="0.0001"
                value={form.toleranciaCero || ""}
                onChange={(e) => setNum("toleranciaCero", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="pieles-count">Total pieles rotas (#)</label>
              <input
                id="pieles-count"
                className="field-input"
                type="number"
                min={0}
                value={form.totalPielesRotas || ""}
                onChange={(e) => setNum("totalPielesRotas", e.target.value)}
              />
            </div>
            <CampoCalculado
              id="pieles"
              label="Pieles (%)"
              value={pct(calc.pieles)}
              hint="Total pieles rotas ÷ beneficio"
            />
            <CampoCalculado
              id="pierna"
              label="Cortes en pierna"
              value={form.cortePierna ? pct(form.cortePierna) : "—"}
              hint="VLOOKUP hoja Liberación de canales"
            />
            <CampoCalculado
              id="sobre"
              label="Sobrebarriga rotas"
              value={form.sobrebarrigaRota ? pct(form.sobrebarrigaRota) : "—"}
              hint="VLOOKUP hoja Liberación de canales"
            />
            <CampoCalculado
              id="grasa"
              label="Cobertura grasa"
              value={form.coberturaGrasa ? pct(form.coberturaGrasa) : "—"}
              hint="VLOOKUP hoja Liberación de canales"
            />
            <div className="field span-3">
              <label htmlFor="obs">Observación</label>
              <textarea
                id="obs"
                className="field-input"
                rows={3}
                value={form.observacion}
                onChange={(e) => setForm((f) => ({ ...f, observacion: e.target.value }))}
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar día"}
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setForm({ ...empty, fecha: new Date().toISOString().slice(0, 10), totalPielesRotas: 0 })}
            >
              Nuevo vacío
            </button>
          </div>
        </form>
      </Panel>

      <Panel
        title={`Detalle ${mesLabel} ${anioFoco}`}
        subtitle="Lista de cierres guardados · clic en una fila para cargar al formulario"
        delay={0.2}
      >
        {cargando ? <p className="note-block">Cargando registros…</p> : null}
        <div className="base-table-wrap">
          <table className="data-table base-detail-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Beneficio</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Horas lab.</th>
                <th>Tardanza</th>
                <th>Productiv.</th>
                <th>Vel. bruta</th>
                <th>Vel. neta</th>
                <th>Toler. cero</th>
                <th>Pieles</th>
                <th>C. pierna</th>
                <th>S. barriga</th>
                <th>C. grasa</th>
                <th>Par. prog.</th>
                <th>T. improd.</th>
                <th className="col-obs">Observación</th>
              </tr>
            </thead>
            <tbody>
              {!cargando && filtradas.length === 0 && (
                <tr>
                  <td colSpan={17} style={{ color: "var(--muted)" }}>
                    Sin registros en {mesLabel}. Guarda un día arriba para verlo aquí.
                  </td>
                </tr>
              )}
              {filtradas.map((r) => (
                <tr
                  key={r.id}
                  className={r.fecha === selectedFecha ? "row-selected" : undefined}
                  onClick={() => loadRegistro(r)}
                >
                  <td>{formatDate(r.fecha)}</td>
                  <td>
                    <strong>{r.totalBeneficio}</strong>
                  </td>
                  <td className="num">{r.horaInicio}</td>
                  <td className="num">{r.horaFin}</td>
                  <td className="num">{r.horasLaboradas.toFixed(2)}</td>
                  <td className="num">{r.tardanzaInicio} min</td>
                  <td className="num">{r.productividad.toFixed(1)}</td>
                  <td className="num">{r.velocidadBruta.toFixed(1)}</td>
                  <td className="num">{r.velocidadNeta.toFixed(1)}</td>
                  <td className="num">{pct(r.toleranciaCero)}</td>
                  <td className="num">{pct(r.pieles)}</td>
                  <td className="num">{pct(r.cortePierna)}</td>
                  <td className="num">{pct(r.sobrebarrigaRota)}</td>
                  <td className="num">{pct(r.coberturaGrasa)}</td>
                  <td className="num">{r.paradaProgramadaMin} min</td>
                  <td className="num">{r.tiempoParadasMin} min</td>
                  <td className="col-obs">{r.observacion || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note-block" style={{ marginTop: "0.9rem" }}>
          Cada guardado hace <strong>upsert</strong> por fecha: volver a guardar el mismo día corrige el
          registro en vez de duplicarlo.
        </p>
      </Panel>
    </div>
  );
}
