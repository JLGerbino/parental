
import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import Swal from "sweetalert2";
import "./Agenda.css";

const initialForm = {
  title: "",
  category: "Salud",
  date: "",
  childId: "todos",
  childName: "Todos",
  location: "",
  notes: "",
};

const categories = [
  "Salud",
  "Colegio",
  "Actividad",
  "Reunión",
  "Otro",
];

function formatDate(value) {
  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getLocalDateTimeMin() {
  const date = new Date();

  // Redondeamos al próximo minuto
  date.setSeconds(0, 0);
  date.setMinutes(date.getMinutes() + 1);

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);

  return localDate.toISOString().slice(0, 16);
}

function AgendaEventCard({ event, onEdit, onDelete, isPast = false }) {
  return (
    <article className={`agenda-event ${isPast ? "agenda-event-past" : ""}`} key={event.id}>
      <div className="agenda-event-top">
        <span className="agenda-category">
          {event.category || "Otro"}
        </span>

        <span className="agenda-event-date">
          {formatDate(event.date)}
        </span>
      </div>

      <h4>{event.title}</h4>

      <p className="agenda-event-child">
        <strong>Hijo/a:</strong> {event.childName || "Todos"}
      </p>

      {event.location && (
        <p className="agenda-event-detail">
          <strong>Lugar:</strong> {event.location}
        </p>
      )}

      {event.notes && (
        <p className="agenda-event-notes">{event.notes}</p>
      )}

      <p className="agenda-event-author">
        Cargado por {event.createdByName || "Integrante"}
      </p>

      <div className="agenda-event-actions">
        {!isPast && (
          <button
            type="button"
            className="agenda-button agenda-button-secondary"
            onClick={() => onEdit(event)}
          >
            Editar
          </button>
        )}

        <button
          type="button"
          className="agenda-button agenda-button-danger"
          onClick={() => onDelete(event)}
        >
          Eliminar
        </button>
      </div>
    </article>
  );
}

export default function Agenda({ groupId, user, hijos = [], responsables = [], }) {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const currentResponsible = responsables.find(
  (responsable) => responsable.linkedUid === user?.uid
);

const currentUserName =
  currentResponsible?.nombre ||
  user?.displayName ||
  "Integrante";

  useEffect(() => {
    if (!groupId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const eventsRef = collection(
      db,
      "groups",
      groupId,
      "events"
    );

    const eventsQuery = query(eventsRef, orderBy("date", "asc"));

    const unsubscribe = onSnapshot(
      eventsQuery,
      (snapshot) => {
        setEvents(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
        setLoading(false);
        setError("");
      },
      (err) => {
        console.error("Error al cargar la agenda:", err);
        setError("No se pudo cargar la agenda. Revisá los permisos de Firebase.");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [groupId]);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
    setError("");
    setShowForm(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!groupId || !user?.uid) {
      setError("No se encontró el grupo o el usuario. Volvé a ingresar.");
      return;
    }

    if (!form.title.trim() || !form.date) {
      setError("Completá el título y la fecha del evento.");
      return;
    }

    if (!editingId && new Date(form.date) < new Date()) {
  setError("La fecha del evento debe ser futura.");
  return;
}

    setSaving(true);
    setError("");

    try {
      const eventData = {
  title: form.title.trim(),
  category: form.category,
  date: form.date,
  childId: form.childId,
  childName: form.childName,
  location: form.location.trim(),
  notes: form.notes.trim(),
  updatedAt: serverTimestamp(),
  updatedBy: user.uid,
  updatedByName: currentUserName,
};

      const eventsRef = collection(
        db,
        "groups",
        groupId,
        "events"
      );

      
let eventId = editingId;
let notificationType = "created";

if (editingId) {
  await updateDoc(doc(eventsRef, editingId), eventData);
  notificationType = "updated";
} else {
  const newEvent = await addDoc(eventsRef, {
    ...eventData,
    createdAt: serverTimestamp(),
    createdBy: user.uid,
    createdByName: currentUserName,
  });

  eventId = newEvent.id;
}

await addDoc(
  collection(db, "groups", groupId, "notifications"),
  {
    type: notificationType,
    eventId,
    eventTitle: form.title.trim(),
    childId: form.childId,
    childName: form.childName,
    actorUid: user.uid,
    actorName: currentUserName,
    message:
      notificationType === "created"
        ? `Agregó un evento: ${form.title.trim()}`
        : `Modificó el evento: ${form.title.trim()}`,
    createdAt: serverTimestamp(),
    readBy: [],
  }
);

    //   if (editingId) {
    //     await updateDoc(doc(eventsRef, editingId), eventData);
    //   } else {
    //     await addDoc(eventsRef, {
    //       ...eventData,
    //       createdAt: serverTimestamp(),
    //       createdBy: user.uid,
    //       createdByName: user.displayName || "Integrante",
    //     });
    //   }

      resetForm();
    } catch (err) {
      console.error("Error al guardar el evento:", err);
      setError("No se pudo guardar el evento. Revisá las reglas de Firestore.");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(event) {
  setForm({
    title: event.title || "",
    category: event.category || "Otro",
    date: event.date || "",
    childId: event.childId || "todos",
    childName: event.childName || "Todos",
    location: event.location || "",
    notes: event.notes || "",
  });

  setEditingId(event.id);
  setError("");
  setShowForm(true);
}

  async function handleDelete(event) {
  const result = await Swal.fire({
    title: "¿Eliminar evento?",
    text: `¿Querés eliminar "${event.title}" de la agenda?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#6b7280",
    reverseButtons: true,
  });

  if (!result.isConfirmed) return;

  setError("");

  try {
    await deleteDoc(
      doc(db, "groups", groupId, "events", event.id)
    );

    if (editingId === event.id) resetForm();

    await Swal.fire({
      title: "Evento eliminado",
      text: "El evento se eliminó de la agenda.",
      icon: "success",
      confirmButtonText: "Aceptar",
    });

  } catch (err) {
    console.error("Error al eliminar el evento:", err);

    setError("No se pudo eliminar el evento. Revisá los permisos de Firebase.");
  }
}

  
const now = new Date();

const upcomingEvents = events.filter(
  (event) => new Date(event.date) >= now
);

const pastEvents = events.filter(
  (event) => new Date(event.date) < now
).reverse();


  return (
  <section className="agenda">
    <header className="agenda-header">
      <div>
        <h2>Agenda familiar</h2>
        <p>Un espacio compartido para organizar las actividades.</p>
      </div>

      <span className="agenda-count">
        {events.length} {events.length === 1 ? "evento" : "eventos"}
      </span>
    </header>

    <div className="agenda-toolbar">
      <h3>Eventos familiares</h3>

      <button
        type="button"
        className="agenda-button agenda-add-button"
        onClick={() => {
          resetForm();
          setShowForm(true);
        }}
      >
        <i className="fa-solid fa-plus"></i>
        Agregar evento
      </button>
    </div>

    {error && !showForm && (
      <p className="agenda-error">{error}</p>
    )}
<div className="agenda-list">
  {loading ? (
    <p>Cargando agenda...</p>
  ) : events.length === 0 ? (
    <div className="agenda-empty">
      <span className="agenda-empty-icon">📅</span>
      <p>Todavía no hay eventos en la agenda.</p>
      <small>Agregá el primero usando el botón «Agregar evento».</small>
    </div>
  ) : (
    <>
      <section className="agenda-section">
        <h3>Próximos eventos</h3>

        {upcomingEvents.length === 0 ? (
          <p className="agenda-section-empty">
            No hay próximos eventos.
          </p>
        ) : (
          upcomingEvents.map((event) => (
            <AgendaEventCard
              key={event.id}
              event={event}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </section>

      <section className="agenda-section agenda-past-section">
        <h3>Eventos pasados</h3>

        {pastEvents.length === 0 ? (
          <p className="agenda-section-empty">
            Todavía no hay eventos pasados.
          </p>
        ) : (
          pastEvents.map((event) => (
            <AgendaEventCard
              key={event.id}
              event={event}
              onDelete={handleDelete}
              isPast
            />
          ))
        )}
      </section>
    </>
  )}
</div>
    {/* <div className="agenda-list">
      {loading ? (
        <p>Cargando agenda...</p>
      ) : events.length === 0 ? (
        <div className="agenda-empty">
          <span className="agenda-empty-icon">📅</span>
          <p>Todavía no hay eventos en la agenda.</p>
          <small>Agregá el primero usando el botón «Agregar evento».</small>
        </div>
      ) : (
        events.map((event) => (
          <article className="agenda-event" key={event.id}>
            <div className="agenda-event-top">
              <span className="agenda-category">
                {event.category || "Otro"}
              </span>

              <span className="agenda-event-date">
                {formatDate(event.date)}
              </span>
            </div>

            <h4>{event.title}</h4>

            <p className="agenda-event-child">
              <strong>Hijo/a:</strong> {event.childName || "Todos"}
            </p>

            {event.location && (
              <p className="agenda-event-detail">
                <strong>Lugar:</strong> {event.location}
              </p>
            )}

            {event.notes && (
              <p className="agenda-event-notes">{event.notes}</p>
            )}

            <p className="agenda-event-author">
              Cargado por {event.createdByName || "Integrante"}
            </p>

            <div className="agenda-event-actions">
              <button
                type="button"
                className="agenda-button agenda-button-secondary"
                onClick={() => handleEdit(event)}
              >
                Editar
              </button>

              <button
                type="button"
                className="agenda-button agenda-button-danger"
                onClick={() => handleDelete(event)}
              >
                Eliminar
              </button>
            </div>
          </article>
        ))
      )}
    </div> */}

    {showForm && (
      <div
        className="agenda-modal-overlay"
        onClick={(event) => {
          if (event.target === event.currentTarget && !saving) {
            resetForm();
          }
        }}
      >
        <div
          className="agenda-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="agenda-modal-title"
        >
          <div className="agenda-modal-header">
            <h3 id="agenda-modal-title">
              {editingId ? "Editar evento" : "Nuevo evento"}
            </h3>

            <button
              type="button"
              className="agenda-modal-close"
              onClick={resetForm}
              disabled={saving}
              aria-label="Cerrar"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <form className="agenda-form" onSubmit={handleSubmit}>
            <label>
              Título *
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Ej.: Control pediátrico"
                required
              />
            </label>

            <div className="agenda-form-row">
              <label>
                Categoría
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Fecha y hora *
                <input
                  type="datetime-local"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  min={getLocalDateTimeMin()}
                  required
                />
              </label>
            </div>

            <label>
              ¿A quién corresponde?
              <select
                name="childId"
                value={form.childId}
                onChange={(event) => {
                  const selectedId = event.target.value;

                  const selectedChild = hijos.find(
                    (hijo) => hijo.id === selectedId
                  );

                  setForm((previous) => ({
                    ...previous,
                    childId: selectedId,
                    childName: selectedChild
                      ? selectedChild.nombre
                      : "Todos",
                  }));
                }}
              >
                <option value="todos">Todos los hijos</option>

                {hijos.map((hijo) => (
                  <option key={hijo.id} value={hijo.id}>
                    {hijo.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Lugar
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="Ej.: Hospital o escuela"
              />
            </label>

            <label>
              Notas
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Información adicional..."
                rows={3}
              />
            </label>

            {error && <p className="agenda-error">{error}</p>}

            <div className="agenda-form-actions">
              <button
                type="button"
                className="agenda-button agenda-button-secondary"
                onClick={resetForm}
                disabled={saving}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="agenda-button"
                disabled={saving}
              >
                {saving
                  ? "Guardando..."
                  : editingId
                    ? "Guardar cambios"
                    : "Agregar evento"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </section>
);

}
