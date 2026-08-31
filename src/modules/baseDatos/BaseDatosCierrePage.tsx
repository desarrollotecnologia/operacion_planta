import { useEffect, useMemo, useState, type FormEvent } from "react";
import { MetricCard, PageHeader, Panel, formatDate, pct } from "../../components/ui";
import type { NuevoRegistroInput, RegistroCierre } from "../../data/types";
import { useCierreStore } from "../../store/CierreStore";
import "../../components/ui.css";
import "./baseDatos.css";

const MESES = [
  { codigo: "MARZO", label: "Marzo" },
  { codigo: "ABRIL", label: "Abril" },
  { codigo: "MAYO", label: "Mayo" },
  { codigo: "JUNIO", label: "Junio" },
  { codigo: "JULIO", label: "Julio" },
  { codigo: "AGOSTO", label: "Agosto" },
];

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

function registroToForm(r: RegistroCierre): NuevoRegistroInput {
  const { id: _id, mes: _m, anio: _a, duracionMin: _d, ...rest } = r;
  return { ...empty, ...rest };
}

export function BaseDatosCierrePage() {
  const { registros, upsertRegistro, selectedFecha, setSelectedFecha, cargando, guardando, error } =
    useCierreStore();
  const [mes, setMes] = useState("AGOSTO");
  const [form, setForm] = useState<NuevoRegistroInput>(empty);
  const [savedFlash, setSavedFlash] = useState(false);

  const selected = useMemo(
    () => registros.find((r) => r.fecha === selectedFecha) ?? null,
    [registros, selectedFecha],
  );

  const filtradas = useMemo(
    () =>
      registros
        .filter((r) => r.mes === mes)
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [registros, mes],
  );

  const totals = useMemo(() => {
    const beneficio = filtradas.reduce((a, r) => a + r.totalBeneficio, 0);
    return { beneficio, dias: filtradas.length };
  }, [filtradas]);

  const mesLabel = MESES.find((m) => m.codigo === mes)?.label ?? mes;

  useEffect(() => {
    const r = registros.find((x) => x.fecha === selectedFecha);
    if (r) {
      setForm(registroToForm(r));
      setMes(r.mes);
    }
  }, [selectedFecha, registros]);

  function loadRegistro(r: RegistroCierre) {
    setSelectedFecha(r.fecha);
    setForm(registroToForm(r));
    setMes(r.mes);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.fecha) return;
    const guardado = await upsertRegistro(form);
    if (!guardado) return;
    setSavedFlash(true);
    setMes(guardado.mes);
    window.setTimeout(() => setSavedFlash(false), 1800);
  }

  const setNum = (key: keyof NuevoRegistroInput, raw: string) => {
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

      <div className="chip-row">
        {MESES.map((m) => (
          <button
            key={m.codigo}
            type="button"
            className={`chip ${mes === m.codigo ? "active" : ""}`}
            onClick={() => setMes(m.codigo)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="metrics-grid">
        <MetricCard label="Mes foco" value={mesLabel} hint="2026" delay={0.05} />
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

      <Panel title="Formulario del día" subtitle="Campos de BASE DE DATOS CIERRE · clic en la lista para editar" delay={0.12}>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="fecha">Fecha</label>
              <input
                id="fecha"
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
                type="number"
                value={form.totalBeneficio || ""}
                onChange={(e) => setNum("totalBeneficio", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="hi">Hora inicio</label>
              <input
                id="hi"
                type="time"
                value={form.horaInicio}
                onChange={(e) => setForm((f) => ({ ...f, horaInicio: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="hf">Hora fin</label>
              <input
                id="hf"
                type="time"
                value={form.horaFin}
                onChange={(e) => setForm((f) => ({ ...f, horaFin: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="hl">Horas laboradas</label>
              <input
                id="hl"
                type="number"
                step="0.01"
                value={form.horasLaboradas || ""}
                onChange={(e) => setNum("horasLaboradas", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="tard">Tardanza inicio (min)</label>
              <input
                id="tard"
                type="number"
                value={form.tardanzaInicio || ""}
                onChange={(e) => setNum("tardanzaInicio", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="prod">Productividad</label>
              <input
                id="prod"
                type="number"
                step="0.1"
                value={form.productividad || ""}
                onChange={(e) => setNum("productividad", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="vb">Velocidad bruta</label>
              <input
                id="vb"
                type="number"
                step="0.1"
                value={form.velocidadBruta || ""}
                onChange={(e) => setNum("velocidadBruta", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="vn">Velocidad neta / línea</label>
              <input
                id="vn"
                type="number"
                step="0.1"
                value={form.velocidadNeta || ""}
                onChange={(e) => {
                  const n = e.target.value === "" ? 0 : Number(e.target.value);
                  const v = Number.isFinite(n) ? n : 0;
                  setForm((f) => ({ ...f, velocidadNeta: v, velocidadLinea: v }));
                }}
              />
            </div>
            <div className="field">
              <label htmlFor="tol">Tolerancia cero</label>
              <input
                id="tol"
                type="number"
                step="0.0001"
                value={form.toleranciaCero || ""}
                onChange={(e) => setNum("toleranciaCero", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="pieles">Pieles rotas</label>
              <input
                id="pieles"
                type="number"
                step="0.0001"
                value={form.pieles || ""}
                onChange={(e) => setNum("pieles", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="pierna">Cortes en pierna</label>
              <input
                id="pierna"
                type="number"
                step="0.0001"
                value={form.cortePierna || ""}
                onChange={(e) => setNum("cortePierna", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="sobre">Sobrebarriga rotas</label>
              <input
                id="sobre"
                type="number"
                step="0.0001"
                value={form.sobrebarrigaRota || ""}
                onChange={(e) => setNum("sobrebarrigaRota", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="grasa">Cobertura grasa</label>
              <input
                id="grasa"
                type="number"
                step="0.0001"
                value={form.coberturaGrasa || ""}
                onChange={(e) => setNum("coberturaGrasa", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="paradas">Tiempos improductivos (min)</label>
              <input
                id="paradas"
                type="number"
                value={form.tiempoParadasMin || ""}
                onChange={(e) => setNum("tiempoParadasMin", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="prog">Paradas programadas (min)</label>
              <input
                id="prog"
                type="number"
                value={form.paradaProgramadaMin || ""}
                onChange={(e) => setNum("paradaProgramadaMin", e.target.value)}
              />
            </div>
            <div className="field span-3">
              <label htmlFor="obs">Observación</label>
              <textarea
                id="obs"
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
              onClick={() => setForm({ ...empty, fecha: new Date().toISOString().slice(0, 10) })}
            >
              Nuevo vacío
            </button>
          </div>
        </form>
      </Panel>

      <Panel
        title={`Detalle ${mesLabel} 2026`}
        subtitle="Lista de cierres guardados · clic en una fila para cargar al formulario"
        delay={0.2}
      >
        {cargando ? <p className="note-block">Cargando registros…</p> : null}
        <div className="base-table-wrap">
          <table className="data-table">
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
                <th>Observación</th>
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
