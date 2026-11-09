import { useState, useEffect } from "react";
import "./Convivencia.css";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  orderBy,
  doc,
  runTransaction,
} from "firebase/firestore";



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
  const [otherWeeksCreated, setOtherWeeksCreated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [proposals, setProposals] = useState([]);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [decidingProposal, setDecidingProposal] = useState(false);
  const [decisionError, setDecisionError] = useState("");
  //const [currentRegime, setCurrentRegime] = useState(null);//
  const [regimes, setRegimes] = useState([]);
  const [loadingRegime, setLoadingRegime] = useState(true);
  const [selectedRegimeDay, setSelectedRegimeDay] = useState(null);
  const [activeRegimeWeek, setActiveRegimeWeek] = useState(1);
  const [selectedProposalDay, setSelectedProposalDay] = useState(null);
  const [activeSection, setActiveSection] = useState("menu");
  const [selectedRegimeId, setSelectedRegimeId] = useState(null);
  const [regimeOrigin, setRegimeOrigin] = useState(null);

  const currentWeek = weeks.find((week) => week.id === activeWeek);
  

  const today = new Date().toISOString().slice(0, 10);

const currentRegime = regimes.find(
  (regime) =>
    regime.startDate <= today &&
    regime.endDate >= today
) || null;

const displayedRegime =
  activeSection === "detalleRegimen"
    ? regimes.find((regime) => regime.id === selectedRegimeId)
    : currentRegime;

const displayedRegimeWeek =
  displayedRegime?.weeks?.find(
    (week) => week.id === activeRegimeWeek
  );    

const upcomingRegimes = regimes
  .filter((regime) => regime.startDate > today)
  .sort((a, b) => a.startDate.localeCompare(b.startDate));

const pastRegimes = regimes
  .filter((regime) => regime.endDate < today)
  .sort((a, b) => b.startDate.localeCompare(a.startDate));

const currentRegimeWeek = currentRegime?.weeks?.find((week) => week.id === activeRegimeWeek);

  useEffect(() => {
  if (!groupId || !user?.uid || !responsableVinculado?.id) {
    setLoadingProposals(false);
    return;
  }
  const proposalsRef = collection(
    db,
    "groups",
    groupId,
    "scheduleProposals"
  );
  const proposalsQuery = query(
    proposalsRef,
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );
  const unsubscribe = onSnapshot(
    proposalsQuery,
    (snapshot) => {
      const receivedProposals = snapshot.docs
        .map((document) => ({
          id: document.id,
          ...document.data(),
        }))
        .filter(
          (proposal) => proposal.createdByUid !== user.uid
        );

      setProposals(receivedProposals);
      setLoadingProposals(false);
    },
    (err) => {
      console.error("Error al cargar propuestas:", err);
      setLoadingProposals(false);
    }
  );

  return () => unsubscribe();
}, [groupId, user?.uid, responsableVinculado?.id]);


useEffect(() => {
  if (!groupId || !user?.uid || !responsableVinculado?.id) {
    setLoadingRegime(false);
    return;
  }

  const regimesRef = collection(
    db,
    "groups",
    groupId,
    "regimes"
  );

  const regimesQuery = query(
    regimesRef,
    orderBy("startDate", "asc")
  );
  const unsubscribe = onSnapshot(
    regimesQuery,
    (snapshot) => {
      const loadedRegimes = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }));

      setRegimes(loadedRegimes);
console.log("REGÍMENES CARGADOS:", loadedRegimes);
console.log("FECHA DE HOY:", today);


      // Compatibilidad temporal con la pantalla actual.
      // const current = loadedRegimes.find(
      //   (regime) => regime.id === "current"
      // );

      // setCurrentRegime(current || null);

      setLoadingRegime(false);
    },
    (err) => {
      console.error("Error al cargar los regímenes:", err);
      setLoadingRegime(false);
    }
  );
  return () => unsubscribe();
}, [groupId, user?.uid, responsableVinculado?.id]);



const getDateKeysInRange = (startDate, endDate) => {
  const dates = [];

  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);

  const current = new Date(Date.UTC(startYear, startMonth - 1, startDay));
  const end = new Date(Date.UTC(endYear, endMonth - 1, endDay));

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
};
// useEffect(() => {
//   if (!groupId || !user?.uid || !responsableVinculado?.id) {
//     setLoadingRegime(false);
//     return;
//   }
//   const regimeRef = doc(
//     db,
//     "groups",
//     groupId,
//     "regimes",
//     "current"
//   );
//   const unsubscribe = onSnapshot(
//     regimeRef,
//     (snapshot) => {
//       if (snapshot.exists()) {
//         setCurrentRegime({
//           id: snapshot.id,
//           ...snapshot.data(),
//         });
//       } else {
//         setCurrentRegime(null);
//       }
//       setLoadingRegime(false);
//     },
//     (err) => {
//       console.error("Error al cargar el régimen vigente:", err);
//       setLoadingRegime(false);
//     }
//   );
//   return () => unsubscribe();
// }, [groupId, user?.uid, responsableVinculado?.id]);


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
    setOtherWeeksCreated(false);
    setError("");
  };

  const createOtherWeeks = () => {
    if (weeks.length <= 1 || !weeks[0]) return;

    const validationError = validateWeek(weeks[0], endDate);
    if (validationError) {
      setError(`Antes de crear las demás semanas, completá la primera:\\n${validationError}`);
      return;
    }

    const firstWeek = weeks[0];
    setWeeks((previous) =>
      previous.map((week, index) =>
        index === 0
          ? week
          : {
              ...week,
              days: week.days.map((day, dayIndex) => ({
                ...day,
                periods: firstWeek.days[dayIndex].periods.map((period) => ({ ...period })),
              })),
            }
      )
    );
    setOtherWeeksCreated(true);
    setError("Las demás semanas se crearon copiando la primera. Ahora podés modificarlas de manera independiente.");
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


  const handleProposalDecision = async (decision) => {
  if (!selectedProposal || decidingProposal) return;

  if (decision !== "approved" && decision !== "rejected") return;

  if (selectedProposal.createdByUid === user.uid) {
    setDecisionError("No podés decidir sobre una propuesta que enviaste.");
    return;
  }

  setDecidingProposal(true);
  setDecisionError("");

  const proposalRef = doc(
    db,
    "groups",
    groupId,
    "scheduleProposals",
    selectedProposal.id
  );

  // Cada régimen tendrá como ID el ID de su propuesta.
  const regimeRef = doc(
    db,
    "groups",
    groupId,
    "regimes",
    selectedProposal.id
  );

  try {
    await runTransaction(db, async (transaction) => {
      const proposalSnapshot = await transaction.get(proposalRef);

      if (!proposalSnapshot.exists()) {
        throw new Error("La propuesta ya no existe.");
      }

      const proposal = proposalSnapshot.data();

      if (proposal.status !== "pending") {
        throw new Error("Esta propuesta ya fue resuelta.");
      }

      if (proposal.createdByUid === user.uid) {
        throw new Error("No podés decidir sobre tu propia propuesta.");
      }

      if (decision === "approved") {
        const dateKeys = getDateKeysInRange(
          proposal.startDate,
          proposal.endDate
        );

        const dateRefs = dateKeys.map((dateKey) =>
          doc(
            db,
            "groups",
            groupId,
            "regimeDates",
            dateKey
          )
        );

        // Todas las lecturas se hacen antes de escribir.

        const snapshots = await Promise.all([
  transaction.get(regimeRef),
  ...dateRefs.map((dateRef) => transaction.get(dateRef)),
]);

const regimeSnapshot = snapshots[0];
const dateSnapshots = snapshots.slice(1);
        // const [regimeSnapshot, dateSnapshots] = await Promise.all([
        //   transaction.get(regimeRef),
        //   ...dateRefs.map((dateRef) => transaction.get(dateRef)),
        // ]);

        if (regimeSnapshot.exists()) {
          throw new Error("Esta propuesta ya tiene un régimen creado.");
        }

        if (dateSnapshots.some((snapshot) => snapshot.exists())) {
          throw new Error(
            "El período se superpone con otro régimen aprobado."
          );
        }

        transaction.set(regimeRef, {
          proposalId: selectedProposal.id,
          approvedByUid: user.uid,
          approvedByResponsibleId: responsableVinculado.id,
          createdByUid: proposal.createdByUid,
          startDate: proposal.startDate,
          endDate: proposal.endDate,
          childIds: proposal.childIds,
          weeks: proposal.weeks,
          updatedAt: serverTimestamp(),
        });

        dateRefs.forEach((dateRef) => {
          transaction.set(dateRef, {
            date: dateRef.id,
            regimeId: selectedProposal.id,
            startDate: proposal.startDate,
            endDate: proposal.endDate,
            createdAt: serverTimestamp(),
          });
        });
      }

      transaction.update(proposalRef, {
        status: decision,
        decidedByUid: user.uid,
        decidedAt: serverTimestamp(),
      });
    });

    setSelectedProposal(null);
    setDecisionError("");
  } catch (err) {
    console.error("Error al resolver la propuesta:", err);

    setDecisionError(
      err.message === "Esta propuesta ya fue resuelta." ||
      err.message === "No podés decidir sobre tu propia propuesta." ||
      err.message === "El período se superpone con otro régimen aprobado." ||
      err.message === "Esta propuesta ya tiene un régimen creado."
        ? err.message
        : "No se pudo registrar la decisión. Revisá tu conexión e intentá nuevamente."
    );
  } finally {
    setDecidingProposal(false);
  }
};
  //   const handleProposalDecision = async (decision) => {
  //   if (!selectedProposal || decidingProposal) return;

  //   if (decision !== "approved" && decision !== "rejected") return;

  //   if (selectedProposal.createdByUid === user.uid) {
  //     setDecisionError("No podés decidir sobre una propuesta que enviaste.");
  //     return;
  //   }

  //   setDecidingProposal(true);
  //   setDecisionError("");

  //   const proposalRef = doc(
  //     db,
  //     "groups",
  //     groupId,
  //     "scheduleProposals",
  //     selectedProposal.id
  //   );

  //   const regimeRef = doc(
  //     db,
  //     "groups",
  //     groupId,
  //     "regimes",
  //     "current"
  //   );

  //   try {
  //     await runTransaction(db, async (transaction) => {
  //       const proposalSnapshot = await transaction.get(proposalRef);

  //       if (!proposalSnapshot.exists()) {
  //         throw new Error("La propuesta ya no existe.");
  //       }

  //       const proposal = proposalSnapshot.data();

  //       if (proposal.status !== "pending") {
  //         throw new Error("Esta propuesta ya fue resuelta.");
  //       }

  //       if (proposal.createdByUid === user.uid) {
  //         throw new Error("No podés decidir sobre tu propia propuesta.");
  //       }

  //       if (decision === "approved") {
  //         transaction.set(regimeRef, {
  //           proposalId: selectedProposal.id,
  //           approvedByUid: user.uid,
  //           approvedByResponsibleId: responsableVinculado.id,
  //           createdByUid: proposal.createdByUid,
  //           startDate: proposal.startDate,
  //           endDate: proposal.endDate,
  //           childIds: proposal.childIds,
  //           weeks: proposal.weeks,
  //           updatedAt: serverTimestamp(),
  //         });
  //       }

  //       transaction.update(proposalRef, {
  //         status: decision,
  //         decidedByUid: user.uid,
  //         decidedAt: serverTimestamp(),
  //       });
  //     });

  //     setSelectedProposal(null);
  //     setDecisionError("");
  //   } catch (err) {
  //     console.error("Error al resolver la propuesta:", err);
  //     setDecisionError(
  //       err.message === "Esta propuesta ya fue resuelta."
  //         ? err.message
  //         : "No se pudo registrar la decisión. Revisá tu conexión e intentá nuevamente."
  //     );
  //   } finally {
  //     setDecidingProposal(false);
  //   }
  // };




  const closeSchedule = async () => {
  if (saving || scheduleClosed) return;

  if (!groupId || !user?.uid || !responsableVinculado?.id) {
    setError("No se pudo identificar tu cuenta o tu responsable vinculado.");
    return;
  }

  const errors = weeks
    .map((week) => validateWeek(week, endDate))
    .filter(Boolean);

  if (errors.length > 0) {
    setError(errors.join("\n"));
    return;
  }

  setSaving(true);
  setError("");

  try {
    await addDoc(
      collection(db, "groups", groupId, "scheduleProposals"),
      {
        createdByUid: user.uid,
        createdByResponsibleId: responsableVinculado.id,

        startDate,
        endDate,

        childIds: hijos.map((hijo) => hijo.id),

        weeks,

        status: "pending",
        createdAt: serverTimestamp(),

        decidedByUid: null,
        decidedAt: null,
      }
    );

    setScheduleClosed(true);
    setError("");
  } catch (err) {
    console.error("Error al enviar la planificación:", err);
    setError("No se pudo enviar la planificación. Intentá nuevamente.");
  } finally {
    setSaving(false);
  }
};

  // const closeSchedule = () => {
  //   const errors = weeks
  //     .map((week) => validateWeek(week, endDate))
  //     .filter(Boolean);

  //   if (errors.length > 0) {
  //     setError(errors.join("\n"));
  //     return;
  //   }

  //   setScheduleClosed(true);
  //   setError("");
  // };

  return (
    <div className="convivencia-container">

      {activeSection === "menu" && (
  <div className="convivencia-form">
    <h2>Convivencia</h2>
    <p>Organizá los tiempos de convivencia de tus hijos.</p>

    <button
      type="button"
      className="convivencia-main-button"
      onClick={() => setActiveSection("planificar")}
    >
      Planificar convivencia
    </button>

    <button
      type="button"
      className="convivencia-main-button"
      onClick={() => setActiveSection("vigente")}
    >
      Régimen vigente
    </button>

    <button
      type="button"
      className="convivencia-main-button"
      onClick={() => setActiveSection("aprobados")}
    >
      Regímenes aprobados
    </button>

    <button
      type="button"
      className="convivencia-main-button"
      onClick={() => setActiveSection("pasados")}
    >
      Regímenes pasados
    </button>
  </div>
)}

{/* <div className="convivencia-form">
  <h3>Régimen vigente</h3> */}
{(activeSection === "vigente" ||
  activeSection === "detalleRegimen") && (
  <div className="convivencia-form">
    <div className="d-flex justify-content-between align-items-center">
      <h2>
  {activeSection === "detalleRegimen"
    ? "Detalle del régimen"
    : "Régimen vigente"}
</h2>
      <button
        type="button"
        className="btn btn-outline-secondary"
        onClick={() => {
  if (activeSection === "detalleRegimen") {
    setSelectedRegimeId(null);
    setActiveSection(regimeOrigin || "aprobados");
    setRegimeOrigin(null);
  } else {
    setActiveSection("menu");
  }
}}
      >
        Volver
      </button>
    </div>

  {loadingRegime ? (
    <p>Cargando régimen vigente...</p>
  ) : displayedRegime ? (
    <>
      <p className="convivencia-help">
        Período: {formatDate(displayedRegime.startDate)} al{" "}
        {formatDate(displayedRegime.endDate)}
      </p>

      <div className="convivencia-children">
        <strong>Hijos incluidos</strong>
        <p>
          {displayedRegime.childIds
            .map(
              (childId) =>
                hijos.find((hijo) => hijo.id === childId)?.nombre ||
                "Hijo"
            )
            .join(", ")}
        </p>
      </div>

      <p className="convivencia-help">
        Propuesta aprobada por:{" "}
        {responsables.find(
          (item) => item.id === displayedRegime.approvedByResponsibleId
        )?.nombre || "Responsable"}
      </p>

      <div className="convivencia-week-tabs">
  {displayedRegime.weeks.map((week) => (
    <button
      type="button"
      key={week.id}
      className={activeRegimeWeek === week.id ? "active" : ""}
      onClick={() => {
        setActiveRegimeWeek(week.id);
        setSelectedRegimeDay(null);
      }}
    >
      Semana {week.id}
    </button>
  ))}
</div>

{displayedRegimeWeek && (
  <>
    <div className="convivencia-week-heading">
      <h3>Semana {activeRegimeWeek}</h3>
      <span>
        {formatDate(displayedRegimeWeek.startDate)}
        {" al "}
        {formatDate(
          displayedRegimeWeek.days
            .filter(
              (day) =>
                day.date >= displayedRegime.startDate &&
                day.date <= displayedRegime.endDate
            )
            .slice(-1)[0]?.date || displayedRegimeWeek.startDate
        )}
      </span>
    </div>

    <p className="convivencia-help">
      Seleccioná un día para consultar los horarios asignados.
    </p>

    <div className="convivencia-days-grid">
      {displayedRegimeWeek.days
        .filter(
          (day) =>
            day.date >= displayedRegime.startDate &&
            day.date <= displayedRegime.endDate
        )
        .map((day) => {
          const colors = getDayColors(day);
          const date = getDateFromString(day.date);

          return (
            <button
              type="button"
              key={day.date}
              className="convivencia-day"
              onClick={() => setSelectedRegimeDay(day)}
            >
              <strong>{getDayName(day.date).slice(0, 3)}</strong>

              <small>
                {date.getDate()}/{date.getMonth() + 1}
              </small>

              <div className="convivencia-day-colors">
                {colors.map((color, index) => (
                  <span
                    key={index}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              <small>
                {day.periods.length} tramo(s)
              </small>
            </button>
          );
        })}
    </div>
  </>
)}

      {/* {currentRegime.weeks.map((week) => (
        <div
          key={week.id}
          className="convivencia-proposal-week"
        >
          <h4>
            Semana {week.id} — {formatDate(week.startDate)}
          </h4>

          {week.days
            .filter(
              (day) =>
                day.date >= currentRegime.startDate &&
                day.date <= currentRegime.endDate
            )
            .map((day) => (
              <div
                key={day.date}
                className="convivencia-proposal-day"
              >
                <strong>
                  {getDayName(day.date)} {formatDate(day.date)}
                </strong>

                {day.periods.map((period, index) => {
                  const responsible = responsables.find(
                    (item) => item.id === period.responsibleId
                  );

                  return (
                    <p
                      key={index}
                      style={{
                        borderLeft: `4px solid ${getResponsibleColor(
                          period.responsibleId
                        )}`,
                        paddingLeft: "8px",
                      }}
                    >
                      {period.start} a {period.end} —{" "}
                      {responsible?.nombre || "Responsable no identificado"}
                    </p>
                  );
                })}
              </div>
            ))}
        </div>
      ))} */}
    </>
  ) : (
    <p className="convivencia-help">
      Todavía no hay un régimen de convivencia aprobado.
    </p>
  )}
</div>)}
      
{selectedRegimeDay && (
  <div className="convivencia-modal-overlay">
    <div
      className="convivencia-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="regime-day-title"
    >
      <div className="convivencia-modal-header">
        <div>
          <h3 id="regime-day-title">
            {getDayName(selectedRegimeDay.date)}{" "}
            {formatDate(selectedRegimeDay.date)}
          </h3>
          <span>Régimen aprobado · Solo consulta</span>
        </div>

        <button
          type="button"
          onClick={() => setSelectedRegimeDay(null)}
          aria-label="Cerrar"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      <h4>Distribución de horarios</h4>

      {selectedRegimeDay.periods
        .slice()
        .sort((a, b) => a.start.localeCompare(b.start))
        .map((period, index) => {
          const responsible = responsables.find(
            (item) => item.id === period.responsibleId
          );

          return (
            <div
              key={index}
              className="convivencia-period"
              style={{
                borderLeft: `4px solid ${getResponsibleColor(
                  period.responsibleId
                )}`,
                paddingLeft: "12px",
                marginBottom: "12px",
              }}
            >
              <strong>
                {period.start} a {period.end}
              </strong>

              <p>
                {responsible?.nombre || "Responsable no identificado"}
              </p>
            </div>
          );
        })}

      <div className="convivencia-modal-actions">
        <button
          type="button"
          className="convivencia-cancel-button"
          onClick={() => setSelectedRegimeDay(null)}
        >
          Cerrar
        </button>
      </div>
    </div>
  </div>
)}


{activeSection === "planificar" && (
  <>
      {loadingProposals ? (
  <p>Cargando propuestas...</p>
) : proposals.length > 0 ? (
  <div className="convivencia-form">
    <h3>Propuestas recibidas</h3>

    {proposals.map((proposal) => {
      const author = responsables.find(
        (item) => item.id === proposal.createdByResponsibleId
      );

      return (
        <div key={proposal.id} className="convivencia-proposal">
          <strong>
            Propuesta de {author?.nombre || "el otro responsable"}
          </strong>

          <p>
            Período: {formatDate(proposal.startDate)} al{" "}
            {formatDate(proposal.endDate)}
          </p>

          <button
            type="button"
            className="convivencia-main-button"
            onClick={() => setSelectedProposal(proposal)}
          >
            Revisar propuesta
          </button>
        </div>
      );
    })}
  </div>
) : null}


{selectedProposal && (
  <div className="convivencia-form">
    <h3>Revisión de propuesta</h3>

    <p>
      <strong>Período:</strong>{" "}
      {formatDate(selectedProposal.startDate)} al{" "}
      {formatDate(selectedProposal.endDate)}
    </p>

    <p>
      <strong>Hijos incluidos:</strong>{" "}
      {selectedProposal.childIds
        .map((childId) =>
          hijos.find((hijo) => hijo.id === childId)?.nombre || "Hijo"
        )
        .join(", ")}
    </p>
    {selectedProposal.weeks.map((week) => (
  <div key={week.id} className="convivencia-proposal-week">
    <h4>
      Semana {week.id} — {formatDate(week.startDate)}
    </h4>

    <div className="convivencia-days-grid">
      {week.days
        .filter(
          (day) =>
            day.date >= selectedProposal.startDate &&
            day.date <= selectedProposal.endDate
        )
        .map((day) => (
          <button
            key={day.date}
            type="button"
            className="convivencia-day"
            onClick={() => setSelectedProposalDay(day)}
          >
            <strong>{getDayName(day.date).slice(0, 3)}</strong>

            <span>{day.date.split("-")[2]}</span>

            <div className="convivencia-day-colors">
              {getDayColors(day).map((color, index) => (
                <span
                  key={index}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </button>
        ))}
    </div>
  </div>
))}
    
        {decisionError && (
      <p className="convivencia-error">{decisionError}</p>
    )}

    <div className="convivencia-modal-actions">
      <button
        type="button"
        className="convivencia-cancel-button"
        disabled={decidingProposal}
        onClick={() => handleProposalDecision("rejected")}
      >
        {decidingProposal ? "Procesando..." : "Rechazar propuesta"}
      </button>

      <button
        type="button"
        className="convivencia-save-button"
        disabled={decidingProposal}
        onClick={() => handleProposalDecision("approved")}
      >
        {decidingProposal ? "Procesando..." : "Aceptar propuesta"}
      </button>
    </div>

    <button
      type="button"
      className="convivencia-cancel-button"
      disabled={decidingProposal}
      onClick={() => setSelectedProposal(null)}
    >
      Cerrar revisión
    </button>
  </div>
)}  </>
)}

{selectedProposalDay && (
  <div className="convivencia-modal-overlay">
    <div
      className="convivencia-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="proposal-day-title"
    >
      <div className="convivencia-modal-header">
        <div>
          <h3 id="proposal-day-title">
            {getDayName(selectedProposalDay.date)}{" "}
            {formatDate(selectedProposalDay.date)}
          </h3>
          <span>Propuesta pendiente · Solo consulta</span>
        </div>

        <button
          type="button"
          onClick={() => setSelectedProposalDay(null)}
          aria-label="Cerrar"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      <h4>Distribución de horarios</h4>

      {selectedProposalDay.periods
        .slice()
        .sort((a, b) => a.start.localeCompare(b.start))
        .map((period, index) => {
          const responsible = responsables.find(
            (item) => item.id === period.responsibleId
          );

          return (
            <div
              key={index}
              style={{
                borderLeft: `4px solid ${getResponsibleColor(
                  period.responsibleId
                )}`,
                padding: "10px 12px",
                marginBottom: "10px",
                background: "#f5f5f5",
                borderRadius: "6px",
              }}
            >
              <strong>
                {period.start} a {period.end}
              </strong>
              <p>
                {responsible?.nombre || "Responsable no identificado"}
              </p>
            </div>
          );
        })}

      <div className="convivencia-modal-actions">
        <button
          type="button"
          className="convivencia-cancel-button"
          onClick={() => setSelectedProposalDay(null)}
        >
          Cerrar
        </button>
      </div>
    </div>
  </div>
)}


{activeSection === "aprobados" && (
  <div className="convivencia-form">
    <div className="d-flex justify-content-between align-items-center">
      <h2>Regímenes aprobados</h2>

      <button
        type="button"
        className="btn btn-outline-secondary"
        onClick={() => setActiveSection("menu")}
      >
        Volver
      </button>
    </div>

    {upcomingRegimes.length === 0 ? (
      <p>No hay regímenes aprobados pendientes de comenzar.</p>
    ) : (
      upcomingRegimes.map((regime) => (
        <div key={regime.id} className="convivencia-proposal">
          <strong>Régimen aprobado</strong>

          <p>
            Período: {formatDate(regime.startDate)} al{" "}
            {formatDate(regime.endDate)}
          </p>
          <button
  type="button"
  className="convivencia-main-button"
  onClick={() => {
    setSelectedRegimeId(regime.id);
    setRegimeOrigin("aprobados");
    setActiveSection("detalleRegimen");
  }}
>
  Ver calendario
</button>
        </div>
      ))
    )}
  </div>
)}

{/* Pantalla regimenes pasados */}
{activeSection === "pasados" && (
  <div className="convivencia-form">
    <div className="d-flex justify-content-between align-items-center">
      <h2>Regímenes pasados</h2>

      <button
        type="button"
        className="btn btn-outline-secondary"
        onClick={() => setActiveSection("menu")}
      >
        Volver
      </button>
    </div>

    {pastRegimes.length === 0 ? (
      <p>No hay regímenes anteriores.</p>
    ) : (
      pastRegimes.map((regime) => (
        <div key={regime.id} className="convivencia-proposal">
          <strong>Régimen finalizado</strong>

          <p>
            Período: {formatDate(regime.startDate)} al{" "}
            {formatDate(regime.endDate)}
          </p>

          <button
            type="button"
            className="convivencia-main-button"
            onClick={() => {
              setSelectedRegimeId(regime.id);
              setRegimeOrigin("pasados");
              setActiveSection("detalleRegimen");
            }}
          >
            Ver calendario
          </button>
        </div>
      ))
    )}
  </div>
)}

{/* <div className="convivencia-form">
      <h2>Régimen de convivencia</h2> */}

      {activeSection === "planificar" && (
  <>
    <div className="d-flex justify-content-between align-items-center">
      <h2>Planificar convivencia</h2>
      <button
        type="button"
        className="btn btn-outline-secondary"
        onClick={() => setActiveSection("menu")}
      >
        Volver
      </button>
    </div>

    <div className="convivencia-form">

      <p className="convivencia-description">
        Organicen los tiempos de convivencia de sus hijos mediante un acuerdo
        entre ambos responsables.
      </p>

      
        <h3>Planificar convivencia</h3>

        {!weeks.length ? (
          <>
            <p className="convivencia-help">
              Elegí la fecha de inicio y la fecha de finalización del período.
              La planificación se organizará en semanas consecutivas de siete
              días, comenzando en la fecha que selecciones.
            </p>

            <div className="convivencia-date-selection">
              <div>
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
              </div>
              <div>
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
              Configurá todos los días incluidos en ese rango.
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

            {!scheduleClosed && weeks.length > 1 && !otherWeeksCreated && (
              <button
                type="button"
                className="convivencia-main-button"
                onClick={createOtherWeeks}
              >
                Crear las otras semanas
              </button>
            )}          

            

                <button
                  type="button"
                  className="convivencia-main-button"
                  disabled={saving}
                  onClick={closeSchedule}
                >
                  {saving ? "Enviando..." : "Enviar propuesta al otro responsable"}
                </button>
              </>
            )}

            {scheduleClosed && (
  <p className="convivencia-success">
    La propuesta fue enviada correctamente. Está pendiente de revisión y
    aceptación por parte del otro responsable. Hasta entonces, no modifica
    el régimen vigente.
  </p>
)}  

            {/* {scheduleClosed && (
              <p className="convivencia-success">
                La planificación del período está completa y cerrada. Esto no
                significa que el régimen habitual haya finalizado ni que el
                otro responsable lo haya aceptado.
              </p>
            )} */}
          </>
        
              )}
      </div>
  </>
)}

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
