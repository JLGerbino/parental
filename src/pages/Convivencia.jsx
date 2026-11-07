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

const getDateFromString = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const addDays = (dateString, amount) => {
  const date = getDateFromString(dateString);
  date.setDate(date.getDate() + amount);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const formatDate = (dateString) =>
  getDateFromString(dateString).toLocaleDateString("es-AR");

const getDayName = (dateString) => {
  const dayIndex = getDateFromString(dateString).getDay();
  return days[dayIndex === 0 ? 6 : dayIndex - 1];
};

const getDaysBetween = (start, end) => {
  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [endYear, endMonth, endDay] = end.split("-").map(Number);

  const startTime = Date.UTC(startYear, startMonth - 1, startDay);
  const endTime = Date.UTC(endYear, endMonth - 1, endDay);

  return Math.floor((endTime - startTime) / 86400000) + 1;
};

const createEmptyWeek = (number, weekStartDate) => ({
  id: number,
  startDate: weekStartDate,
  days: Array.from({ length: 7 }, (_, index) => ({
    date: addDays(weekStartDate, index),
    periods: [],
  })),
});

const validateDay = (day) => {
  const periods = day.periods;
  const dayName = getDayName(day.date).toLowerCase();
  const dateLabel = formatDate(day.date);
  const errors = [];

  if (periods.length === 0) {
    return `Falta configurar el ${dayName} ${dateLabel}.`;
  }

  for (const period of periods) {
    if (!period.start || !period.end || !period.responsibleId) {
      return `Hay un tramo incompleto el ${dayName} ${dateLabel}.`;
    }

    if (period.end <= period.start) {
      return `El horario de finalización debe ser posterior al inicio el ${dayName} ${dateLabel}.`;
    }
  }

  const ordered = [...periods].sort((a, b) =>
    a.start.localeCompare(b.start)
  );

  if (ordered[0].start !== "00:00") {
    errors.push(`El ${dayName} ${dateLabel} debe comenzar a las 00:00.`);
  }

  for (let i = 1; i < ordered.length; i++) {
    if (ordered[i].start > ordered[i - 1].end) {
      errors.push(
        `Hay un horario sin asignar el ${dayName} ${dateLabel}: de ${ordered[i - 1].end} a ${ordered[i].start}.`
      );
    }

    if (ordered[i].start < ordered[i - 1].end) {
      errors.push(`Hay horarios superpuestos el ${dayName} ${dateLabel}.`);
    }
  }

  const lastPeriod = ordered[ordered.length - 1];

  if (lastPeriod.end !== "24:00") {
    errors.push(
      `El ${dayName} ${dateLabel} queda sin asignar desde las ${lastPeriod.end} hasta las 24:00.`
    );
  }

  return errors.join("\n");
};

const validateWeek = (week, endDate) => {
  const errors = [];

  for (const day of week.days) {
    // Los días posteriores a la fecha final no forman parte del período.
    if (day.date > endDate) continue;

    const error = validateDay(day);
    if (error) errors.push(error);
  }

  return errors.join("\n");
};

const Convivencia = ({
  groupId,
  user,
  hijos,
  responsables,
  responsableVinculado,
}) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [weeks, setWeeks] = useState([]);
  const [activeWeek, setActiveWeek] = useState(1);
  const [expandedDay, setExpandedDay] = useState(null);
  const [editingPeriods, setEditingPeriods] = useState([]);
  const [modalError, setModalError] = useState("");
  const [error, setError] = useState("");
  const [scheduleClosed, setScheduleClosed] = useState(false);

  const currentWeek = weeks.find((week) => week.id === activeWeek);

  const createSchedule = () => {
    if (!startDate || !endDate) {
      setError("Seleccioná la fecha de inicio y la fecha de finalización.");
      return;
    }

    if (endDate < startDate) {
      setError("La fecha de finalización no puede ser anterior a la de inicio.");
      return;
    }

    const totalDays = getDaysBetween(startDate, endDate);
    const totalWeeks = Math.ceil(totalDays / 7);

    const newWeeks = Array.from({ length: totalWeeks }, (_, index) =>
      createEmptyWeek(index + 1, addDays(startDate, index * 7))
    );

    setWeeks(newWeeks);
    setActiveWeek(1);
    setScheduleClosed(false);
    setError("");
  };

  const openDay = (dayIndex) => {
    if (scheduleClosed) return;

    const periods = currentWeek.days[dayIndex].periods;
    setEditingPeriods(periods.map((period) => ({ ...period })));
    setExpandedDay(dayIndex);
    setModalError("");
    setError("");
  };

  const closeDay = () => {
    setExpandedDay(null);
    setEditingPeriods([]);
    setModalError("");
  };

  const updateEditingPeriod = (periodIndex, field, value) => {
    setEditingPeriods((previous) =>
      previous.map((period, index) =>
        index === periodIndex ? { ...period, [field]: value } : period
      )
    );

    setModalError("");
  };

  const addPeriod = () => {
    setEditingPeriods((previous) => [
      ...previous,
      { start: "", end: "", responsibleId: "" },
    ]);

    setModalError("");
  };

  const removePeriod = (periodIndex) => {
    setEditingPeriods((previous) =>
      previous.filter((_, index) => index !== periodIndex)
    );

    setModalError("");
  };

  const setFullDay = (responsibleId) => {
    setEditingPeriods([
      {
        start: "00:00",
        end: "24:00",
        responsibleId,
      },
    ]);

    setModalError("");
  };

  const saveDay = () => {
    const validationError = validateDay({
      date: currentWeek.days[expandedDay].date,
      periods: editingPeriods,
    });

    if (validationError) {
      setModalError(validationError);
      return;
    }

    setWeeks((previous) =>
      previous.map((week) =>
        week.id !== activeWeek
          ? week
          : {
              ...week,
              days: week.days.map((day, index) =>
                index === expandedDay
                  ? {
                      ...day,
                      periods: editingPeriods.map((period) => ({ ...period })),
                    }
                  : day
              ),
            }
      )
    );

    closeDay();
    setError("");
  };

  const getResponsibleColor = (id) => {
    const index = responsables.findIndex((item) => item.id === id);
    return index === 0 ? "#4389CE" : "#269181";
  };

  const getDayColors = (day) => [
    ...new Set(
      day.periods
        .filter((period) => period.responsibleId)
        .map((period) => getResponsibleColor(period.responsibleId))
    ),
  ];

  const getWeekEndDate = (week) => {
    const lastDay = week.days[6].date;
    return lastDay > endDate ? endDate : lastDay;
  };

  const handleWeekReady = () => {
    const validationError = validateWeek(currentWeek, endDate);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("Esta semana está completa.");
  };

  const closeSchedule = () => {
    const errors = weeks
      .map((week) => validateWeek(week, endDate))
      .filter(Boolean);

    if (errors.length > 0) {
      setError(errors.join("\n"));
      return;
    }

    setScheduleClosed(true);
    setError("");
  };

  return (
    <div className="convivencia-container">
      <h2>Régimen de convivencia</h2>

      <p className="convivencia-description">
        Organicen los tiempos de convivencia de sus hijos mediante un acuerdo
        entre ambos responsables.
      </p>

      <div className="convivencia-form">
        <h3>Planificar convivencia</h3>

        {!weeks.length ? (
          <>
            <p className="convivencia-help">
              Elegí la fecha de inicio y la fecha de finalización del período.
              La planificación se organizará en semanas consecutivas de siete
              días, comenzando en la fecha que selecciones.
            </p>

            <div className="convivencia-date-selection">
              <label htmlFor="convivencia-start-date">Fecha de inicio</label>
              <input
                id="convivencia-start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setError("");
                }}
              />

              <label htmlFor="convivencia-end-date">
                Fecha de finalización
              </label>
              <input
                id="convivencia-end-date"
                type="date"
                min={startDate || undefined}
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setError("");
                }}
              />
            </div>

            {hijos.length > 0 && (
              <div className="convivencia-children">
                <strong>Hijos incluidos</strong>
                <p>{hijos.map((hijo) => hijo.nombre).join(", ")}</p>
                <small>El régimen se aplica inicialmente a todos los hijos.</small>
              </div>
            )}

            {error && <p className="convivencia-error">{error}</p>}

            <button
              type="button"
              className="convivencia-main-button"
              onClick={createSchedule}
              disabled={!startDate || !endDate || endDate < startDate}
            >
              Comenzar planificación
            </button>
          </>
        ) : (
          <>
            <div className="convivencia-children">
              <strong>Hijos incluidos</strong>
              <p>{hijos.map((hijo) => hijo.nombre).join(", ")}</p>
              <small>El régimen se aplica inicialmente a todos los hijos.</small>
            </div>

            <p className="convivencia-help">
              Período: {formatDate(startDate)} al {formatDate(endDate)}.
              Configurá todos los días incluidos en ese rango. Los días que
              queden fuera del período no se muestran ni se validan.
            </p>

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

            {currentWeek && (
              <>
                <div className="convivencia-week-heading">
                  <h3>Semana {activeWeek}</h3>
                  <span>
                    {formatDate(currentWeek.startDate)}
                    {" al "}
                    {formatDate(getWeekEndDate(currentWeek))}
                  </span>
                </div>

                <p className="convivencia-help">
                  Seleccioná un día para configurar sus horarios. Cada día debe
                  quedar cubierto desde las 00:00 hasta las 24:00.
                </p>

                <div className="convivencia-days-grid">
                  {currentWeek.days
                    .map((day, dayIndex) => ({ day, dayIndex }))
                    .filter(({ day }) => day.date <= endDate)
                    .map(({ day, dayIndex }) => {
                      const colors = getDayColors(day);
                      const date = getDateFromString(day.date);

                      return (
                        <button
                          type="button"
                          key={day.date}
                          className="convivencia-day"
                          onClick={() => openDay(dayIndex)}
                          disabled={scheduleClosed}
                        >
                          <strong>{getDayName(day.date).slice(0, 3)}</strong>
                          <small>
                            {date.getDate()}/{date.getMonth() + 1}
                          </small>

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
              </>
            )}

            {error && <p className="convivencia-error">{error}</p>}

            {!scheduleClosed && (
              <>
                <button
                  type="button"
                  className="convivencia-main-button"
                  onClick={handleWeekReady}
                >
                  Verificar esta semana
                </button>

                <button
                  type="button"
                  className="convivencia-main-button"
                  onClick={closeSchedule}
                >
                  Cerrar planificación
                </button>
              </>
            )}

            {scheduleClosed && (
              <p className="convivencia-success">
                La planificación del período está completa y cerrada. Esto no
                significa que el régimen habitual haya finalizado ni que el
                otro responsable lo haya aceptado.
              </p>
            )}

            <p className="convivencia-preview-note">
              Esta versión es una prueba local. Los cambios todavía no se
              guardan en Firebase ni se envían al otro responsable.
            </p>
          </>
        )}
      </div>

      {expandedDay !== null && currentWeek && (
        <div className="convivencia-modal-overlay">
          <div
            className="convivencia-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="convivencia-modal-title"
          >
            <div className="convivencia-modal-header">
              <div>
                <h3 id="convivencia-modal-title">
                  {getDayName(currentWeek.days[expandedDay].date)}{" "}
                  {formatDate(currentWeek.days[expandedDay].date)}
                </h3>
                <span>Semana {activeWeek}</span>
              </div>

              <button
                type="button"
                onClick={closeDay}
                aria-label="Cerrar"
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
                    onClick={() => setFullDay(responsable.id)}
                  >
                    {responsable.nombre}
                  </button>
                ))}
              </div>
            </div>

            <div className="convivencia-periods-heading">
              <strong>Distribución por horarios</strong>
              <button type="button" onClick={addPeriod}>
                <i className="fa-solid fa-plus"></i> Agregar tramo
              </button>
            </div>

            <div className="convivencia-modal-periods">
              {editingPeriods.map((period, periodIndex) => (
                <div className="convivencia-period" key={periodIndex}>
                  <div className="convivencia-period-header">
                    <strong>Tramo {periodIndex + 1}</strong>
                    <button
                      type="button"
                      onClick={() => removePeriod(periodIndex)}
                      aria-label={`Eliminar tramo ${periodIndex + 1}`}
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>

                  <label>Desde</label>
                  <select
                    value={period.start}
                    onChange={(e) =>
                      updateEditingPeriod(periodIndex, "start", e.target.value)
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
                      updateEditingPeriod(periodIndex, "end", e.target.value)
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
                      updateEditingPeriod(
                        periodIndex,
                        "responsibleId",
                        e.target.value
                      )
                    }
                  >
                    <option value="">Seleccionar responsable</option>
                    {responsables.map((responsable) => (
                      <option key={responsable.id} value={responsable.id}>
                        {responsable.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {editingPeriods.length === 0 && (
              <p className="convivencia-no-periods">
                Todavía no hay horarios cargados.
              </p>
            )}

            {modalError && (
              <p className="convivencia-error convivencia-modal-error">
                {modalError}
              </p>
            )}

            <div className="convivencia-modal-actions">
              <button
                type="button"
                className="convivencia-cancel-button"
                onClick={closeDay}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="convivencia-save-button"
                onClick={saveDay}
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Convivencia;

























// import { useState } from "react";
// import "./Convivencia.css";

// const days = [
//   "Lunes",
//   "Martes",
//   "Miércoles",
//   "Jueves",
//   "Viernes",
//   "Sábado",
//   "Domingo",
// ];

// const hours = Array.from({ length: 48 }, (_, i) => {
//   const total = i * 30;
//   const h = Math.floor(total / 60);
//   const m = total % 60;
//   return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
// });

// const endHours = [...hours, "24:00"];

// // const formatDate = (date) =>
// //   date.toLocaleDateString("es-AR", {
// //     day: "2-digit",
// //     month: "2-digit",
// //     year: "numeric",
// //   });

// // const addDays = (dateString, amount) => {
// //   const [year, month, day] = dateString.split("-").map(Number);
// //   const date = new Date(year, month - 1, day);
// //   date.setDate(date.getDate() + amount);

// //   const y = date.getFullYear();
// //   const m = String(date.getMonth() + 1).padStart(2, "0");
// //   const d = String(date.getDate()).padStart(2, "0");

// //   return `${y}-${m}-${d}`;
// // };

// const getDateFromString = (dateString) => {
//   const [year, month, day] = dateString.split("-").map(Number);
//   return new Date(year, month - 1, day);
// };

// // const getDayName = (dateString) =>
// //   days[getDateFromString(dateString).getDay() === 0
// //     ? 6
// //     : getDateFromString(dateString).getDay() - 1];

// // const createEmptyWeek = (number, startDate) => ({
// //   id: number,
// //   startDate,
// //   days: Array.from({ length: 7 }, (_, index) => ({
// //     date: addDays(startDate, index),
// //     periods: [],
// //   })),
// // });

// const addDays = (dateString, amount) => {
//   const [year, month, day] = dateString.split("-").map(Number);
//   const date = new Date(year, month - 1, day);

//   date.setDate(date.getDate() + amount);

//   return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
// };

// const formatDate = (dateString) => {
//   const [year, month, day] = dateString.split("-").map(Number);

//   return new Date(year, month - 1, day).toLocaleDateString("es-AR");
// };

// const getDayName = (dateString) => {
//   const [year, month, day] = dateString.split("-").map(Number);
//   const dayIndex = new Date(year, month - 1, day).getDay();

//   return days[dayIndex === 0 ? 6 : dayIndex - 1];
// };

// const getDaysBetween = (start, end) => {
//   const [startYear, startMonth, startDay] = start.split("-").map(Number);
//   const [endYear, endMonth, endDay] = end.split("-").map(Number);

//   const startTime = Date.UTC(startYear, startMonth - 1, startDay);
//   const endTime = Date.UTC(endYear, endMonth - 1, endDay);

//   return Math.floor((endTime - startTime) / 86400000) + 1;
// };

// const createEmptyWeek = (number, weekStartDate) => ({
//   id: number,
//   days: Array.from({ length: 7 }, (_, index) => ({
//     date: addDays(weekStartDate, index),
//     periods: [],
//   })),
// });

// const cloneWeek = (week, number, startDate) => ({
//   id: number,
//   startDate,
//   days: week.days.map((day) => ({
//     date: day.date,
//     periods: day.periods.map((period) => ({ ...period })),
//   })),
// });

// const validateDay = (day) => {
//   const periods = day.periods;
//   const dayName = getDayName(day.date).toLowerCase();
//   const errors = [];

//   if (periods.length === 0) {
//     return `Falta configurar el ${dayName} ${formatDate(
//       getDateFromString(day.date)
//     )}.`;
//   }

//   for (const period of periods) {
//     if (!period.start || !period.end || !period.responsibleId) {
//       return `Hay un tramo incompleto el ${dayName}.`;
//     }

//     if (period.end <= period.start) {
//       return `El horario de finalización debe ser posterior al inicio el ${dayName}.`;
//     }
//   }

//   const ordered = [...periods].sort((a, b) =>
//     a.start.localeCompare(b.start)
//   );

//   if (ordered[0].start !== "00:00") {
//     errors.push(`El ${dayName} debe comenzar a las 00:00.`);
//   }

//   for (let i = 1; i < ordered.length; i++) {
//     if (ordered[i].start > ordered[i - 1].end) {
//       errors.push(
//         `Hay un horario sin asignar el ${dayName}: de ${ordered[i - 1].end} a ${ordered[i].start}.`
//       );
//     }

//     if (ordered[i].start < ordered[i - 1].end) {
//       errors.push(`Hay horarios superpuestos el ${dayName}.`);
//     }
//   }

//   const lastPeriod = ordered[ordered.length - 1];

//   if (lastPeriod.end !== "24:00") {
//     errors.push(
//       `El ${dayName} queda sin asignar desde las ${lastPeriod.end} hasta las 24:00.`
//     );
//   }

//   return errors.join("\n");
// };

// const validateWeek = (week) => {
//   const errors = [];

//   for (const day of week.days) {
//     const error = validateDay(day);

//     if (error) {
//       errors.push(error);
//     }
//   }

//   return errors.join("\n");
// };

// const Convivencia = ({
//   groupId,
//   user,
//   hijos,
//   responsables,
//   responsableVinculado,
// }) => {
//   const [startDate, setStartDate] = useState("");
//   const [endDate, setEndDate] = useState("");
//   const [weeks, setWeeks] = useState([]);
//   const [activeWeek, setActiveWeek] = useState(1);

//   const [expandedDay, setExpandedDay] = useState(null);
//   const [editingPeriods, setEditingPeriods] = useState([]);
//   const [modalError, setModalError] = useState("");

//   const [error, setError] = useState("");

//   const currentWeek = weeks.find((week) => week.id === activeWeek);

//   const createSchedule = () => {
//     if (!startDate) {
//       setError("Seleccioná la fecha de inicio del régimen.");
//       return;
//     }

//     setWeeks([createEmptyWeek(1, startDate)]);
//     setActiveWeek(1);
//     setError("");
//   };

//   const openDay = (dayIndex) => {
//     const periods = currentWeek.days[dayIndex].periods;

//     setEditingPeriods(periods.map((period) => ({ ...period })));
//     setExpandedDay(dayIndex);
//     setModalError("");
//     setError("");
//   };

//   const closeDay = () => {
//     setExpandedDay(null);
//     setEditingPeriods([]);
//     setModalError("");
//   };

//   const updateEditingPeriod = (periodIndex, field, value) => {
//     setEditingPeriods((previous) =>
//       previous.map((period, index) =>
//         index === periodIndex
//           ? { ...period, [field]: value }
//           : period
//       )
//     );

//     setModalError("");
//   };

//   const addPeriod = () => {
//     setEditingPeriods((previous) => [
//       ...previous,
//       { start: "", end: "", responsibleId: "" },
//     ]);

//     setModalError("");
//   };

//   const removePeriod = (periodIndex) => {
//     setEditingPeriods((previous) =>
//       previous.filter((_, index) => index !== periodIndex)
//     );

//     setModalError("");
//   };

//   const setFullDay = (responsibleId) => {
//     setEditingPeriods([
//       {
//         start: "00:00",
//         end: "24:00",
//         responsibleId,
//       },
//     ]);

//     setModalError("");
//   };

//   const saveDay = () => {
//     const validationError = validateDay({
//       date: currentWeek.days[expandedDay].date,
//       periods: editingPeriods,
//     });

//     if (validationError) {
//       setModalError(validationError);
//       return;
//     }

//     setWeeks((previous) =>
//       previous.map((week) =>
//         week.id !== activeWeek
//           ? week
//           : {
//               ...week,
//               days: week.days.map((day, index) =>
//                 index === expandedDay
//                   ? {
//                       ...day,
//                       periods: editingPeriods.map((period) => ({
//                         ...period,
//                       })),
//                     }
//                   : day
//               ),
//             }
//       )
//     );

//     closeDay();
//     setError("");
//   };

//   const getResponsibleColor = (id) => {
//     const index = responsables.findIndex((item) => item.id === id);
//     return index === 0 ? "#4389CE" : "#269181";
//   };

//   const createFourWeeks = () => {
//     const validationError = validateWeek(weeks[0]);

//     if (validationError) {
//       setError(validationError);
//       return;
//     }

//     const firstWeek = weeks[0];

//     const newWeeks = [firstWeek];

//     for (let i = 2; i <= 4; i++) {
//       const newStartDate = addDays(firstWeek.startDate, (i - 1) * 7);

//       newWeeks.push(
//         cloneWeek(firstWeek, i, newStartDate).days
//           ? {
//               ...cloneWeek(firstWeek, i, newStartDate),
//               days: cloneWeek(firstWeek, i, newStartDate).days.map(
//                 (day, index) => ({
//                   ...day,
//                   date: addDays(newStartDate, index),
//                 })
//               ),
//             }
//           : null
//       );
//     }

//     setWeeks(newWeeks);
//     setActiveWeek(2);
//     setExpandedDay(null);
//     setError("");
//   };

//   const addAnotherWeek = () => {
//     const lastWeek = weeks[weeks.length - 1];
//     const newNumber = lastWeek.id + 1;
//     const newStartDate = addDays(lastWeek.startDate, 7);

//     const newWeek = {
//       ...cloneWeek(lastWeek, newNumber, newStartDate),
//       days: lastWeek.days.map((day, index) => ({
//         ...day,
//         date: addDays(newStartDate, index),
//         periods: day.periods.map((period) => ({ ...period })),
//       })),
//     };

//     setWeeks((previous) => [...previous, newWeek]);
//     setActiveWeek(newNumber);
//     setExpandedDay(null);
//     setError("");
//   };

//   const handleWeekReady = () => {
//     const validationError = validateWeek(currentWeek);

//     if (validationError) {
//       setError(validationError);
//       return;
//     }

//     setError("La semana está completa. Podés seguir con la siguiente.");
//   };

//   const getDayColors = (day) => {
//     return [
//       ...new Set(
//         day.periods
//           .filter((period) => period.responsibleId)
//           .map((period) =>
//             getResponsibleColor(period.responsibleId)
//           )
//       ),
//     ];
//   };

//   const getWeekEndDate = (week) =>
//     addDays(week.startDate, 6);

//   return (
//     <div className="convivencia-container">
//       <h2>Régimen de convivencia</h2>

//       <p className="convivencia-description">
//         Organicen los tiempos de convivencia de sus hijos
//         mediante un acuerdo entre ambos responsables.
//       </p>

//       <div className="convivencia-form">
// {weeks.length === 0 && (
//   <div className="convivencia-date-selection">
//     <h3>Período de planificación</h3>

//     <div>
//       <label>Fecha de inicio</label>
//       <input
//         type="date"
//         value={startDate}
//         onChange={(e) => setStartDate(e.target.value)}
//       />
//     </div>

//     <div>
//       <label>Fecha de finalización</label>
//       <input
//         type="date"
//         value={endDate}
//         min={startDate || undefined}
//         onChange={(e) => setEndDate(e.target.value)}
//       />
//     </div>

//     <button
//       type="button"
//       onClick={createSchedule}
//       disabled={!startDate || !endDate || endDate < startDate}
//     >
//       Comenzar planificación
//     </button>
//   </div>
// )}
      
//         <h3>Planificar convivencia</h3>

//         {!weeks.length ? (
//           <>
//             <p className="convivencia-help">
//               Elegí la fecha en la que comenzará el régimen.
//               El primer día comenzará a las 00:00.
//             </p>

//             <label htmlFor="convivencia-start-date">
//               Fecha de inicio
//             </label>

//             <input
//               id="convivencia-start-date"
//               type="date"
//               value={startDate}
//               onChange={(e) => {
//                 setStartDate(e.target.value);
//                 setError("");
//               }}
//             />

//             {hijos.length > 0 && (
//               <div className="convivencia-children">
//                 <strong>Hijos incluidos</strong>
//                 <p>{hijos.map((hijo) => hijo.nombre).join(", ")}</p>
//                 <small>El régimen se aplica inicialmente a todos los hijos.</small>
//               </div>
//             )}

//             {error && (
//               <p className="convivencia-error">{error}</p>
//             )}

//             <button
//               type="button"
//               className="convivencia-main-button"
//               onClick={createSchedule}
//             >
//               Comenzar planificación
//             </button>
//           </>
//         ) : (
//           <>
//             <div className="convivencia-children">
//               <strong>Hijos incluidos</strong>
//               <p>{hijos.map((hijo) => hijo.nombre).join(", ")}</p>
//               <small>El régimen se aplica inicialmente a todos los hijos.</small>
//             </div>

//             <div className="convivencia-week-tabs">
//               {weeks.map((week) => (
//                 <button
//                   type="button"
//                   key={week.id}
//                   className={activeWeek === week.id ? "active" : ""}
//                   onClick={() => {
//                     setActiveWeek(week.id);
//                     setExpandedDay(null);
//                     setError("");
//                   }}
//                 >
//                   Semana {week.id}
//                 </button>
//               ))}
//             </div>

//             <div className="convivencia-week-heading">
//               <h3>Semana {activeWeek}</h3>
//               <span>
//                 {formatDate(getDateFromString(currentWeek.startDate))}
//                 {" al "}
//                 {formatDate(getDateFromString(getWeekEndDate(currentWeek)))}
//               </span>
//             </div>

//             <p className="convivencia-help">
//               Seleccioná un día para configurar sus horarios.
//             </p>

//             <div className="convivencia-days-grid">
//               {currentWeek.days.map((day, dayIndex) => {
//                 const colors = getDayColors(day);
//                 const date = getDateFromString(day.date);

//                 return (
//                   <button
//                     type="button"
//                     key={day.date}
//                     className="convivencia-day"
//                     onClick={() => openDay(dayIndex)}
//                   >
//                     <strong>{getDayName(day.date).slice(0, 3)}</strong>
//                     <small>{date.getDate()}/{date.getMonth() + 1}</small>

//                     <div className="convivencia-day-colors">
//                       {colors.length === 0 ? (
//                         <span className="convivencia-day-empty">
//                           <i className="fa-solid fa-plus"></i>
//                         </span>
//                       ) : (
//                         colors.map((color, index) => (
//                           <span
//                             key={index}
//                             style={{ backgroundColor: color }}
//                           />
//                         ))
//                       )}
//                     </div>

//                     <small>
//                       {day.periods.length === 0
//                         ? "Configurar"
//                         : `${day.periods.length} tramo(s)`}
//                     </small>
//                   </button>
//                 );
//               })}
//             </div>

//             {error && (
//               <p className="convivencia-error">{error}</p>
//             )}

//             {weeks.length === 1 ? (
//               <button
//                 type="button"
//                 className="convivencia-main-button"
//                 onClick={createFourWeeks}
//               >
//                 Listo: crear cuatro semanas
//               </button>
//             ) : (
//               <>
//                 <button
//                   type="button"
//                   className="convivencia-main-button"
//                   onClick={handleWeekReady}
//                 >
//                   Listo con esta semana
//                 </button>

//                 <button
//                   type="button"
//                   className="convivencia-add-week"
//                   onClick={addAnotherWeek}
//                 >
//                   <i className="fa-solid fa-plus"></i>
//                   Agregar otra semana
//                 </button>
//               </>
//             )}

//             <p className="convivencia-preview-note">
//               Esta versión es una prueba local. Los cambios todavía no se
//               guardan en Firebase ni se envían al otro responsable.
//             </p>
//           </>
//         )}
//       </div>

//       {expandedDay !== null && currentWeek && (
//         <div className="convivencia-modal-overlay">
//           <div
//             className="convivencia-modal"
//             role="dialog"
//             aria-modal="true"
//             aria-labelledby="convivencia-modal-title"
//           >
//             <div className="convivencia-modal-header">
//               <div>
//                 <h3 id="convivencia-modal-title">
//                   {getDayName(currentWeek.days[expandedDay].date)}
//                   {" "}
//                   {formatDate(
//                     getDateFromString(currentWeek.days[expandedDay].date)
//                   )}
//                 </h3>
//                 <span>Semana {activeWeek}</span>
//               </div>

//               <button
//                 type="button"
//                 onClick={closeDay}
//                 aria-label="Cerrar"
//               >
//                 <i className="fa-solid fa-xmark"></i>
//               </button>
//             </div>

//             <p>¿Cómo se organiza este día?</p>

//             <div className="convivencia-full-day">
//               <strong>Todo el día</strong>
//               <span>Un responsable durante las 24 horas.</span>

//               <div className="convivencia-full-day-buttons">
//                 {responsables.map((responsable, index) => (
//                   <button
//                     type="button"
//                     key={responsable.id}
//                     style={{
//                       backgroundColor:
//                         index === 0 ? "#4389CE" : "#269181",
//                     }}
//                     onClick={() => setFullDay(responsable.id)}
//                   >
//                     {responsable.nombre}
//                   </button>
//                 ))}
//               </div>
//             </div>

//             <div className="convivencia-periods-heading">
//               <strong>Distribución por horarios</strong>
//               <button type="button" onClick={addPeriod}>
//                 <i className="fa-solid fa-plus"></i> Agregar tramo
//               </button>
//             </div>

//             <div className="convivencia-modal-periods">
//               {editingPeriods.map((period, periodIndex) => (
//                 <div
//                   className="convivencia-period"
//                   key={periodIndex}
//                 >
//                   <div className="convivencia-period-header">
//                     <strong>Tramo {periodIndex + 1}</strong>
//                     <button
//                       type="button"
//                       onClick={() => removePeriod(periodIndex)}
//                       aria-label={`Eliminar tramo ${periodIndex + 1}`}
//                     >
//                       <i className="fa-solid fa-trash"></i>
//                     </button>
//                   </div>

//                   <label>Desde</label>
//                   <select
//                     value={period.start}
//                     onChange={(e) =>
//                       updateEditingPeriod(periodIndex, "start", e.target.value)
//                     }
//                   >
//                     <option value="">Hora de inicio</option>
//                     {hours.map((hour) => (
//                       <option key={hour} value={hour}>
//                         {hour}
//                       </option>
//                     ))}
//                   </select>

//                   <label>Hasta</label>
//                   <select
//                     value={period.end}
//                     onChange={(e) =>
//                       updateEditingPeriod(periodIndex, "end", e.target.value)
//                     }
//                   >
//                     <option value="">Hora de finalización</option>
//                     {endHours.map((hour) => (
//                       <option key={hour} value={hour}>
//                         {hour}
//                       </option>
//                     ))}
//                   </select>

//                   <label>¿Con quién?</label>
//                   <select
//                     value={period.responsibleId}
//                     onChange={(e) =>
//                       updateEditingPeriod(
//                         periodIndex,
//                         "responsibleId",
//                         e.target.value
//                       )
//                     }
//                   >
//                     <option value="">Seleccionar responsable</option>
//                     {responsables.map((responsable) => (
//                       <option
//                         key={responsable.id}
//                         value={responsable.id}
//                       >
//                         {responsable.nombre}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//               ))}
//             </div>

//             {editingPeriods.length === 0 && (
//               <p className="convivencia-no-periods">
//                 Todavía no hay horarios cargados.
//               </p>
//             )}

//             {modalError && (
//               <p className="convivencia-error convivencia-modal-error">
//                 {modalError}
//               </p>
//             )}

//             <div className="convivencia-modal-actions">
//               <button
//                 type="button"
//                 className="convivencia-cancel-button"
//                 onClick={closeDay}
//               >
//                 Cancelar
//               </button>

//               <button
//                 type="button"
//                 className="convivencia-save-button"
//                 onClick={saveDay}
//               >
//                 Listo
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default Convivencia;




// // import { useState } from "react";
// // import "./Convivencia.css";

// // const days = [
// //   "Lunes",
// //   "Martes",
// //   "Miércoles",
// //   "Jueves",
// //   "Viernes",
// //   "Sábado",
// //   "Domingo",
// // ];

// // const hours = Array.from({ length: 48 }, (_, i) => {
// //   const total = i * 30;
// //   const h = Math.floor(total / 60);
// //   const m = total % 60;
// //   return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
// // });

// // const endHours = [...hours, "24:00"];

// // const createEmptyWeek = (number) => ({
// //   id: number,
// //   days: days.map(() => ({ periods: [] })),
// // });

// // const cloneWeek = (week, number) => ({
// //   id: number,
// //   days: week.days.map((day) => ({
// //     periods: day.periods.map((period) => ({ ...period })),
// //   })),
// // });

// // const validateDay = (day, dayIndex) => {
// //   const periods = day.periods;
// //   const dayName = days[dayIndex].toLowerCase();
// //   const errors = [];

// //   if (periods.length === 0) {
// //     return `Falta configurar el ${dayName}.`;
// //   }

// //   for (const period of periods) {
// //     if (!period.start || !period.end || !period.responsibleId) {
// //       return `Hay un tramo incompleto el ${dayName}.`;
// //     }

// //     if (period.end <= period.start) {
// //       return `El horario de finalización debe ser posterior al inicio el ${dayName}.`;
// //     }
// //   }

// //   const ordered = [...periods].sort((a, b) =>
// //     a.start.localeCompare(b.start)
// //   );

// //   if (ordered[0].start !== "00:00") {
// //     errors.push(`El ${dayName} debe comenzar a las 00:00.`);
// //   }

// //   for (let i = 1; i < ordered.length; i++) {
// //     if (ordered[i].start > ordered[i - 1].end) {
// //       errors.push(
// //         `Hay un horario sin asignar el ${dayName}: de ${ordered[i - 1].end} a ${ordered[i].start}.`
// //       );
// //     }

// //     if (ordered[i].start < ordered[i - 1].end) {
// //       errors.push(`Hay horarios superpuestos el ${dayName}.`);
// //     }
// //   }

// //   const lastPeriod = ordered[ordered.length - 1];

// //   if (lastPeriod.end !== "24:00") {
// //     errors.push(
// //       `El ${dayName} queda sin asignar desde las ${lastPeriod.end} hasta las 24:00.`
// //     );
// //   }

// //   return errors.join("\n");
// // };

// // const validateWeek = (week) => {
// //   const errors = [];

// //   for (let i = 0; i < week.days.length; i++) {
// //     const error = validateDay(week.days[i], i);

// //     if (error) {
// //       errors.push(error);
// //     }
// //   }

// //   return errors.join("\n");
// // };

// // const Convivencia = ({
// //   groupId,
// //   user,
// //   hijos,
// //   responsables,
// //   responsableVinculado,
// // }) => {
// //   const [weeks, setWeeks] = useState([createEmptyWeek(1)]);
// //   const [activeWeek, setActiveWeek] = useState(1);

// //   const [expandedDay, setExpandedDay] = useState(null);
// //   const [editingPeriods, setEditingPeriods] = useState([]);
// //   const [modalError, setModalError] = useState("");

// //   const [error, setError] = useState("");

// //   const currentWeek = weeks.find((week) => week.id === activeWeek);

// //   const openDay = (dayIndex) => {
// //     const periods = currentWeek.days[dayIndex].periods;

// //     setEditingPeriods(periods.map((period) => ({ ...period })));
// //     setExpandedDay(dayIndex);
// //     setModalError("");
// //     setError("");
// //   };

// //   const closeDay = () => {
// //     setExpandedDay(null);
// //     setEditingPeriods([]);
// //     setModalError("");
// //   };

// //   const updateEditingPeriod = (periodIndex, field, value) => {
// //     setEditingPeriods((previous) =>
// //       previous.map((period, index) =>
// //         index === periodIndex
// //           ? { ...period, [field]: value }
// //           : period
// //       )
// //     );

// //     setModalError("");
// //   };

// //   const addPeriod = () => {
// //     setEditingPeriods((previous) => [
// //       ...previous,
// //       { start: "", end: "", responsibleId: "" },
// //     ]);

// //     setModalError("");
// //   };

// //   const removePeriod = (periodIndex) => {
// //     setEditingPeriods((previous) =>
// //       previous.filter((_, index) => index !== periodIndex)
// //     );

// //     setModalError("");
// //   };

// //   const setFullDay = (responsibleId) => {
// //     setEditingPeriods([
// //       {
// //         start: "00:00",
// //         end: "24:00",
// //         responsibleId,
// //       },
// //     ]);

// //     setModalError("");
// //   };

// //   const saveDay = () => {
// //     const validationError = validateDay(
// //       { periods: editingPeriods },
// //       expandedDay
// //     );

// //     if (validationError) {
// //       setModalError(validationError);
// //       return;
// //     }

// //     setWeeks((previous) =>
// //       previous.map((week) =>
// //         week.id !== activeWeek
// //           ? week
// //           : {
// //               ...week,
// //               days: week.days.map((day, index) =>
// //                 index === expandedDay
// //                   ? {
// //                       ...day,
// //                       periods: editingPeriods.map((period) => ({
// //                         ...period,
// //                       })),
// //                     }
// //                   : day
// //               ),
// //             }
// //       )
// //     );

// //     closeDay();
// //     setError("");
// //   };

// //   const getResponsibleColor = (id) => {
// //     const index = responsables.findIndex((item) => item.id === id);
// //     return index === 0 ? "#4389CE" : "#269181";
// //   };

// //   const createFourWeeks = () => {
// //     const validationError = validateWeek(weeks[0]);

// //     if (validationError) {
// //       setError(validationError);
// //       return;
// //     }

// //     const firstWeek = weeks[0];

// //     setWeeks([
// //       firstWeek,
// //       cloneWeek(firstWeek, 2),
// //       cloneWeek(firstWeek, 3),
// //       cloneWeek(firstWeek, 4),
// //     ]);

// //     setActiveWeek(2);
// //     setExpandedDay(null);
// //     setError("");
// //   };

// //   const addAnotherWeek = () => {
// //     const lastWeek = weeks[weeks.length - 1];
// //     const newNumber = lastWeek.id + 1;

// //     setWeeks((previous) => [
// //       ...previous,
// //       cloneWeek(lastWeek, newNumber),
// //     ]);

// //     setActiveWeek(newNumber);
// //     setExpandedDay(null);
// //     setError("");
// //   };

// //   const handleWeekReady = () => {
// //     const validationError = validateWeek(currentWeek);

// //     if (validationError) {
// //       setError(validationError);
// //       return;
// //     }

// //     setError("La semana está completa. Podés seguir con la siguiente.");
// //   };

// //   const getDayColors = (day) => {
// //     return [
// //       ...new Set(
// //         day.periods
// //           .filter((period) => period.responsibleId)
// //           .map((period) =>
// //             getResponsibleColor(period.responsibleId)
// //           )
// //       ),
// //     ];
// //   };

// //   return (
// //     <div className="convivencia-container">
// //       <h2>Régimen de convivencia</h2>

// //       <p className="convivencia-description">
// //         Organicen los tiempos de convivencia de sus hijos
// //         mediante un acuerdo entre ambos responsables.
// //       </p>

// //       <div className="convivencia-form">
// //         <h3>Planificar convivencia</h3>

// //         <p className="convivencia-help">
// //           Configurá los siete días de la primera semana.
// //           Después podrás crear otras semanas copiando esa distribución
// //           y modificar cada una por separado.
// //         </p>

// //         {hijos.length > 0 && (
// //           <div className="convivencia-children">
// //             <strong>Hijos incluidos</strong>
// //             <p>{hijos.map((hijo) => hijo.nombre).join(", ")}</p>
// //             <small>El régimen se aplica inicialmente a todos los hijos.</small>
// //           </div>
// //         )}

// //         <div className="convivencia-week-tabs">
// //           {weeks.map((week) => (
// //             <button
// //               type="button"
// //               key={week.id}
// //               className={activeWeek === week.id ? "active" : ""}
// //               onClick={() => {
// //                 setActiveWeek(week.id);
// //                 setExpandedDay(null);
// //                 setError("");
// //               }}
// //             >
// //               Semana {week.id}
// //             </button>
// //           ))}
// //         </div>

// //         <div className="convivencia-week-heading">
// //           <h3>Semana {activeWeek}</h3>
// //           <span>Seleccioná un día para configurarlo</span>
// //         </div>

// //         <div className="convivencia-days-grid">
// //           {currentWeek.days.map((day, dayIndex) => {
// //             const colors = getDayColors(day);

// //             return (
// //               <button
// //                 type="button"
// //                 key={days[dayIndex]}
// //                 className="convivencia-day"
// //                 onClick={() => openDay(dayIndex)}
// //               >
// //                 <strong>{days[dayIndex].slice(0, 3)}</strong>

// //                 <div className="convivencia-day-colors">
// //                   {colors.length === 0 ? (
// //                     <span className="convivencia-day-empty">
// //                       <i className="fa-solid fa-plus"></i>
// //                     </span>
// //                   ) : (
// //                     colors.map((color, index) => (
// //                       <span
// //                         key={index}
// //                         style={{ backgroundColor: color }}
// //                       />
// //                     ))
// //                   )}
// //                 </div>

// //                 <small>
// //                   {day.periods.length === 0
// //                     ? "Configurar"
// //                     : `${day.periods.length} tramo(s)`}
// //                 </small>
// //               </button>
// //             );
// //           })}
// //         </div>

// //         {error && (
// //           <p className="convivencia-error">{error}</p>
// //         )}

// //         {weeks.length === 1 ? (
// //           <button
// //             type="button"
// //             className="convivencia-main-button"
// //             onClick={createFourWeeks}
// //           >
// //             Listo: crear cuatro semanas
// //           </button>
// //         ) : (
// //           <>
// //             <button
// //               type="button"
// //               className="convivencia-main-button"
// //               onClick={handleWeekReady}
// //             >
// //               Listo con esta semana
// //             </button>

// //             <button
// //               type="button"
// //               className="convivencia-add-week"
// //               onClick={addAnotherWeek}
// //             >
// //               <i className="fa-solid fa-plus"></i>
// //               Agregar otra semana
// //             </button>
// //           </>
// //         )}

// //         <p className="convivencia-preview-note">
// //           Esta versión es una prueba local. Los cambios todavía no se
// //           guardan en Firebase ni se envían al otro responsable.
// //         </p>
// //       </div>

// //       {expandedDay !== null && (
// //         <div className="convivencia-modal-overlay">
// //           <div
// //             className="convivencia-modal"
// //             role="dialog"
// //             aria-modal="true"
// //             aria-labelledby="convivencia-modal-title"
// //           >
// //             <div className="convivencia-modal-header">
// //               <div>
// //                 <h3 id="convivencia-modal-title">
// //                   {days[expandedDay]}
// //                 </h3>
// //                 <span>Semana {activeWeek}</span>
// //               </div>

// //               <button
// //                 type="button"
// //                 onClick={closeDay}
// //                 aria-label="Cerrar"
// //               >
// //                 <i className="fa-solid fa-xmark"></i>
// //               </button>
// //             </div>

// //             <p>¿Cómo se organiza este día?</p>

// //             <div className="convivencia-full-day">
// //               <strong>Todo el día</strong>
// //               <span>Un responsable durante las 24 horas.</span>

// //               <div className="convivencia-full-day-buttons">
// //                 {responsables.map((responsable, index) => (
// //                   <button
// //                     type="button"
// //                     key={responsable.id}
// //                     style={{
// //                       backgroundColor:
// //                         index === 0 ? "#4389CE" : "#269181",
// //                     }}
// //                     onClick={() => setFullDay(responsable.id)}
// //                   >
// //                     {responsable.nombre}
// //                   </button>
// //                 ))}
// //               </div>
// //             </div>

// //             <div className="convivencia-periods-heading">
// //               <strong>Distribución por horarios</strong>
// //               <button type="button" onClick={addPeriod}>
// //                 <i className="fa-solid fa-plus"></i> Agregar tramo
// //               </button>
// //             </div>

// //             <div className="convivencia-modal-periods">
// //               {editingPeriods.map((period, periodIndex) => (
// //                 <div
// //                   className="convivencia-period"
// //                   key={periodIndex}
// //                 >
// //                   <div className="convivencia-period-header">
// //                     <strong>Tramo {periodIndex + 1}</strong>
// //                     <button
// //                       type="button"
// //                       onClick={() => removePeriod(periodIndex)}
// //                       aria-label={`Eliminar tramo ${periodIndex + 1}`}
// //                     >
// //                       <i className="fa-solid fa-trash"></i>
// //                     </button>
// //                   </div>

// //                   <label>Desde</label>
// //                   <select
// //                     value={period.start}
// //                     onChange={(e) =>
// //                       updateEditingPeriod(
// //                         periodIndex,
// //                         "start",
// //                         e.target.value
// //                       )
// //                     }
// //                   >
// //                     <option value="">Hora de inicio</option>
// //                     {hours.map((hour) => (
// //                       <option key={hour} value={hour}>
// //                         {hour}
// //                       </option>
// //                     ))}
// //                   </select>

// //                   <label>Hasta</label>
// //                   <select
// //                     value={period.end}
// //                     onChange={(e) =>
// //                       updateEditingPeriod(
// //                         periodIndex,
// //                         "end",
// //                         e.target.value
// //                       )
// //                     }
// //                   >
// //                     <option value="">Hora de finalización</option>
// //                     {endHours.map((hour) => (
// //                       <option key={hour} value={hour}>
// //                         {hour}
// //                       </option>
// //                     ))}
// //                   </select>

// //                   <label>¿Con quién?</label>
// //                   <select
// //                     value={period.responsibleId}
// //                     onChange={(e) =>
// //                       updateEditingPeriod(
// //                         periodIndex,
// //                         "responsibleId",
// //                         e.target.value
// //                       )
// //                     }
// //                   >
// //                     <option value="">Seleccionar responsable</option>
// //                     {responsables.map((responsable) => (
// //                       <option
// //                         key={responsable.id}
// //                         value={responsable.id}
// //                       >
// //                         {responsable.nombre}
// //                       </option>
// //                     ))}
// //                   </select>
// //                 </div>
// //               ))}
// //             </div>

// //             {editingPeriods.length === 0 && (
// //               <p className="convivencia-no-periods">
// //                 Todavía no hay horarios cargados.
// //               </p>
// //             )}

// //             {modalError && (
// //               <p className="convivencia-error convivencia-modal-error">
// //                 {modalError}
// //               </p>
// //             )}

// //             <div className="convivencia-modal-actions">
// //               <button
// //                 type="button"
// //                 className="convivencia-cancel-button"
// //                 onClick={closeDay}
// //               >
// //                 Cancelar
// //               </button>

// //               <button
// //                 type="button"
// //                 className="convivencia-save-button"
// //                 onClick={saveDay}
// //               >
// //                 Listo
// //               </button>
// //             </div>
// //           </div>
// //         </div>
// //       )}
// //     </div>
// //   );
// // };

// // export default Convivencia;
