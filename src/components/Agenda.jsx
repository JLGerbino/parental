
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
import "./Agenda.css";

const initialForm = {
  title: "",
  category: "Salud",
  date: "",
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

export default function Agenda({ groupId, user }) {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

    setSaving(true);
    setError("");

    try {
      const eventData = {
        title: form.title.trim(),
        category: form.category,
        date: form.date,
        childName: form.childName,
        location: form.location.trim(),
        notes: form.notes.trim(),
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
        updatedByName: user.displayName || "Integrante",
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
    createdByName: user.displayName || "Integrante",
  });

  eventId = newEvent.id;
}

await addDoc(
  collection(db, "groups", groupId, "notifications"),
  {
    type: notificationType,
    eventId,
    eventTitle: form.title.trim(),
    actorUid: user.uid,
    actorName: user.displayName || "Integrante",
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
      childName: event.childName || "Todos",
      location: event.location || "",
      notes: event.notes || "",
    });

    setEditingId(event.id);
    setError("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(event) {
    const confirmed = window.confirm(
      `¿Querés eliminar el evento "${event.title}"?`
    );

    if (!confirmed) return;

    setError("");

    try {
      await deleteDoc(
        doc(db, "groups", groupId, "events", event.id)
      );

      if (editingId === event.id) resetForm();
    } catch (err) {
      console.error("Error al eliminar el evento:", err);
      setError("No se pudo eliminar el evento. Revisá los permisos de Firebase.");
    }
  }

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

      <form className="agenda-form" onSubmit={handleSubmit}>
        <h3>{editingId ? "Editar evento" : "Nuevo evento"}</h3>

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
              required
            />
          </label>
        </div>

        <label>
          ¿A quién corresponde?
          <input
            name="childName"
            value={form.childName}
            onChange={handleChange}
            placeholder="Todos o nombre del hijo"
            list="agenda-children"
          />
          <datalist id="agenda-children">
            <option value="Todos" />
          </datalist>
          <small>
            Por ahora podés escribir el nombre del hijo. Más adelante lo
            vincularemos con las fichas individuales.
          </small>
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
          {editingId && (
            <button
              type="button"
              className="agenda-button agenda-button-secondary"
              onClick={resetForm}
              disabled={saving}
            >
              Cancelar
            </button>
          )}

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

      <div className="agenda-list">
        <h3>Próximos eventos</h3>

        {loading ? (
          <p>Cargando agenda...</p>
        ) : events.length === 0 ? (
          <div className="agenda-empty">
            <span className="agenda-empty-icon">📅</span>
            <p>Todavía no hay eventos en la agenda.</p>
            <small>Agregá el primero usando el formulario.</small>
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
      </div>
    </section>
  );
}
