
import { useState } from "react";
import "./Convivencia.css";

const days = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

const hours = Array.from({ length: 48 }, (_, i) => {
  const total = i * 30;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
});

const endHours = [...hours, "24:00"];

const createEmptyWeek = (number) => ({
  id: number,
  days: days.map(() => ({ periods: [] })),
});

const cloneWeek = (week, number) => ({
  id: number,
  days: week.days.map((day) => ({
    periods: day.periods.map((period) => ({ ...period })),
  })),
});

const Convivencia = ({
  groupId,
  user,
  hijos,
  responsables,
  responsableVinculado,
}) => {
  const [weeks, setWeeks] = useState([createEmptyWeek(1)]);
  const [activeWeek, setActiveWeek] = useState(1);
  const [expandedDay, setExpandedDay] = useState(null);
  const [error, setError] = useState("");

  const currentWeek = weeks.find((week) => week.id === activeWeek);

  const updateDay = (dayIndex, callback) => {
    setWeeks((previous) =>
      previous.map((week) =>
        week.id !== activeWeek
          ? week
          : {
              ...week,
              days: week.days.map((day, index) =>
                index === dayIndex ? callback(day) : day
              ),
            }
      )
    );
    setError("");
  };

  const addPeriod = (dayIndex) => {
    updateDay(dayIndex, (day) => ({
      ...day,
      periods: [
        ...day.periods,
        { start: "", end: "", responsibleId: "" },
      ],
    }));
  };

  const updatePeriod = (dayIndex, periodIndex, field, value) => {
    updateDay(dayIndex, (day) => ({
      ...day,
      periods: day.periods.map((period, index) =>
        index === periodIndex
          ? { ...period, [field]: value }
          : period
      ),
    }));
  };

  const removePeriod = (dayIndex, periodIndex) => {
    updateDay(dayIndex, (day) => ({
      ...day,
      periods: day.periods.filter(
        (_, index) => index !== periodIndex
      ),
    }));
  };

  const setFullDay = (dayIndex, responsibleId) => {
    updateDay(dayIndex, (day) => ({
      ...day,
      periods: [
        {
          start: "00:00",
          end: "24:00",
          responsibleId,
        },
      ],
    }));
  };

  const getResponsible = (id) =>
    responsables.find((item) => item.id === id);

  const getResponsibleColor = (id) => {
    const index = responsables.findIndex((item) => item.id === id);
    return index === 0 ? "#4389CE" : "#269181";
  };

  


const validateWeek = (week) => {
  const errors = [];

  for (let i = 0; i < week.days.length; i++) {
    const periods = week.days[i].periods;
    const dayName = days[i].toLowerCase();

    if (periods.length === 0) {
      errors.push(`Falta configurar el ${dayName}.`);
      continue;
    }

    let hasIncompletePeriod = false;

    for (const period of periods) {
      if (!period.start || !period.end || !period.responsibleId) {
        errors.push(`Hay un tramo incompleto el ${dayName}.`);
        hasIncompletePeriod = true;
        break;
      }

      if (period.end <= period.start) {
        errors.push(`El horario de finalización debe ser posterior al inicio el ${dayName}.`);
        hasIncompletePeriod = true;
        break;
      }
    }

    if (hasIncompletePeriod) continue;

    const ordered = [...periods].sort((a, b) =>
      a.start.localeCompare(b.start)
    );

    if (ordered[0].start !== "00:00") {
      errors.push(`El ${dayName} debe comenzar a las 00:00.`);
    }

    for (let j = 1; j < ordered.length; j++) {
      if (ordered[j].start > ordered[j - 1].end) {
        errors.push(
          `El ${dayName} tiene un horario sin asignar: de ${ordered[j - 1].end} a ${ordered[j].start}.`
        );
      }

      if (ordered[j].start < ordered[j - 1].end) {
        errors.push(`Hay horarios superpuestos el ${dayName}.`);
      }
    }

    const lastPeriod = ordered[ordered.length - 1];

    if (lastPeriod.end !== "24:00") {
      errors.push(
        `El ${dayName} queda sin asignar desde las ${lastPeriod.end} hasta las 24:00.`
      );
    }
  }

  return errors.join("\n");
};




  const createFourWeeks = () => {
    const validationError = validateWeek(weeks[0]);   
    if (validationError) {
      setError(validationError);
      return;
    }

    const firstWeek = weeks[0];

    setWeeks([
      firstWeek,
      cloneWeek(firstWeek, 2),
      cloneWeek(firstWeek, 3),
      cloneWeek(firstWeek, 4),
    ]);

    setActiveWeek(2);
    setExpandedDay(null);
    setError("");
  };

  const addAnotherWeek = () => {
    const lastWeek = weeks[weeks.length - 1];
    const newNumber = lastWeek.id + 1;

    setWeeks((previous) => [
      ...previous,
      cloneWeek(lastWeek, newNumber),
    ]);

    setActiveWeek(newNumber);
    setExpandedDay(null);
    setError("");
  };

  const handleWeekReady = () => {
    const validationError = validateWeek(currentWeek);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("La semana está completa. Podés seguir con la siguiente.");
  };

  const getDayColors = (day) => {
    const colors = [
      ...new Set(
        day.periods
          .filter((period) => period.responsibleId)
          .map((period) => getResponsibleColor(period.responsibleId))
      ),
    ];

    return colors;
  };

  return (
    <div className="convivencia-container">
      <h2>Régimen de convivencia</h2>

      <p className="convivencia-description">
        Organicen los tiempos de convivencia de sus hijos
        mediante un acuerdo entre ambos responsables.
      </p>

      <div className="convivencia-form">
        <h3>Planificar convivencia</h3>

        <p className="convivencia-help">
          Configurá los siete días de la primera semana.
          Después podrás crear otras semanas copiando esa distribución
          y modificar cada una por separado.
        </p>

        {hijos.length > 0 && (
          <div className="convivencia-children">
            <strong>Hijos incluidos</strong>
            <p>{hijos.map((hijo) => hijo.nombre).join(", ")}</p>
            <small>El régimen se aplica inicialmente a todos los hijos.</small>
          </div>
        )}

        <div className="convivencia-week-tabs">
          {weeks.map((week) => (
            <button
              type="button"
              key={week.id}
              className={activeWeek === week.id ? "active" : ""}
              onClick={() => {
                setActiveWeek(week.id);
                setExpandedDay(null);
                setError("");
              }}
            >
              Semana {week.id}
            </button>
          ))}
        </div>

        <div className="convivencia-week-heading">
          <h3>Semana {activeWeek}</h3>
          <span>Seleccioná un día para configurarlo</span>
        </div>

        <div className="convivencia-days-grid">
          {currentWeek.days.map((day, dayIndex) => {
            const colors = getDayColors(day);

            return (
              <button
                type="button"
                key={days[dayIndex]}
                className={`convivencia-day ${
                  expandedDay === dayIndex ? "selected" : ""
                }`}
                onClick={() =>
                  setExpandedDay(
                    expandedDay === dayIndex ? null : dayIndex
                  )
                }
              >
                <strong>{days[dayIndex].slice(0, 3)}</strong>

                <div className="convivencia-day-colors">
                  {colors.length === 0 ? (
                    <span className="convivencia-day-empty">
                      <i className="fa-solid fa-plus"></i>
                    </span>
                  ) : (
                    colors.map((color, index) => (
                      <span
                        key={index}
                        style={{ backgroundColor: color }}
                      />
                    ))
                  )}
                </div>

                <small>
                  {day.periods.length === 0
                    ? "Configurar"
                    : `${day.periods.length} tramo(s)`}
                </small>
              </button>
            );
          })}
        </div>

        {expandedDay !== null && (
          <div className="convivencia-day-editor">
            <div className="convivencia-day-editor-header">
              <h3>{days[expandedDay]}</h3>
              <button
                type="button"
                onClick={() => setExpandedDay(null)}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <p>¿Cómo se organiza este día?</p>

            <div className="convivencia-full-day">
              <strong>Todo el día</strong>
              <span>Un responsable durante las 24 horas.</span>

              <div className="convivencia-full-day-buttons">
                {responsables.map((responsable, index) => (
                  <button
                    type="button"
                    key={responsable.id}
                    style={{
                      backgroundColor: index === 0 ? "#4389CE" : "#269181",
                    }}
                    onClick={() =>
                      setFullDay(expandedDay, responsable.id)
                    }
                  >
                    {responsable.nombre}
                  </button>
                ))}
              </div>
            </div>

            <div className="convivencia-periods-heading">
              <strong>Distribución por horarios</strong>
              <button
                type="button"
                onClick={() => addPeriod(expandedDay)}
              >
                <i className="fa-solid fa-plus"></i> Agregar tramo
              </button>
            </div>

            {currentWeek.days[expandedDay].periods.map(
              (period, periodIndex) => (
                <div
                  className="convivencia-period"
                  key={periodIndex}
                >
                  <div className="convivencia-period-header">
                    <strong>Tramo {periodIndex + 1}</strong>
                    <button
                      type="button"
                      onClick={() =>
                        removePeriod(expandedDay, periodIndex)
                      }
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>

                  <label>Desde</label>
                  <select
                    value={period.start}
                    onChange={(e) =>
                      updatePeriod(
                        expandedDay,
                        periodIndex,
                        "start",
                        e.target.value
                      )
                    }
                  >
                    <option value="">Hora de inicio</option>
                    {hours.map((hour) => (
                      <option key={hour} value={hour}>
                        {hour}
                      </option>
                    ))}
                  </select>

                  <label>Hasta</label>
                  <select
                    value={period.end}
                    onChange={(e) =>
                      updatePeriod(
                        expandedDay,
                        periodIndex,
                        "end",
                        e.target.value
                      )
                    }
                  >
                    <option value="">Hora de finalización</option>
                    {endHours.map((hour) => (
                      <option key={hour} value={hour}>
                        {hour}
                      </option>
                    ))}
                  </select>

                  <label>¿Con quién?</label>
                  <select
                    value={period.responsibleId}
                    onChange={(e) =>
                      updatePeriod(
                        expandedDay,
                        periodIndex,
                        "responsibleId",
                        e.target.value
                      )
                    }
                  >
                    <option value="">Seleccionar responsable</option>
                    {responsables.map((responsable) => (
                      <option
                        key={responsable.id}
                        value={responsable.id}
                      >
                        {responsable.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )
            )}

            {currentWeek.days[expandedDay].periods.length === 0 && (
              <p className="convivencia-no-periods">
                Todavía no hay horarios cargados.
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="convivencia-error">{error}</p>
        )}

        {weeks.length === 1 ? (
          <button
            type="button"
            className="convivencia-main-button"
            onClick={createFourWeeks}
          >
            Listo: crear cuatro semanas
          </button>
        ) : (
          <>
            <button
              type="button"
              className="convivencia-main-button"
              onClick={handleWeekReady}
            >
              Listo con esta semana
            </button>

            <button
              type="button"
              className="convivencia-add-week"
              onClick={addAnotherWeek}
            >
              <i className="fa-solid fa-plus"></i>
              Agregar otra semana
            </button>
          </>
        )}

        <p className="convivencia-preview-note">
          Esta versión es una prueba local. Los cambios todavía no se
          guardan en Firebase ni se envían al otro responsable.
        </p>
      </div>
    </div>
  );
};

export default Convivencia;
