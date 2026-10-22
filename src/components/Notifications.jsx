
import { useEffect, useState } from "react";
import {
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import "./Notifications.css";

function formatNotificationDate(timestamp) {
  if (!timestamp?.toDate) return "Hace unos instantes";

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(timestamp.toDate());
}

export default function Notifications({ groupId, user, onUnreadCountChange }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!groupId || !user?.uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const notificationsRef = collection(
      db,
      "groups",
      groupId,
      "notifications"
    );

    const notificationsQuery = query(
      notificationsRef,
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        setNotifications(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
        setLoading(false);
        setError("");
      },
      (err) => {
        console.error("Error al cargar notificaciones:", err);
        setError("No se pudieron cargar las notificaciones.");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [groupId, user?.uid]);

  const otherNotifications = notifications.filter(
    (notification) => notification.actorUid !== user?.uid
  );

  const unreadCount = otherNotifications.filter(
    (notification) => !(notification.readBy || []).includes(user?.uid)
  ).length;

  useEffect(() => {
  if (onUnreadCountChange) {
    onUnreadCountChange(unreadCount);
  }
}, [unreadCount, onUnreadCountChange]);

  async function markAsRead(notificationId) {
    if (!user?.uid) return;

    try {
      await updateDoc(
        doc(db, "groups", groupId, "notifications", notificationId),
        {
          readBy: arrayUnion(user.uid),
        }
      );
    } catch (err) {
      console.error("Error al marcar como leída:", err);
      setError("No se pudo marcar la notificación como leída.");
    }
  }

  return (
    <section className="notifications-section" id="section-notifications">
      <header className="notifications-header">
        <div>
          <h2>Notificaciones</h2>
          <p>Avisos sobre los cambios en la agenda familiar.</p>
        </div>

        <span className="notifications-count">
          {unreadCount} sin leer
        </span>
      </header>

      {error && <p className="notifications-error">{error}</p>}

      {loading ? (
        <p>Cargando notificaciones...</p>
      ) : otherNotifications.length === 0 ? (
        <div className="notifications-empty">
          <span>🔔</span>
          <p>No hay avisos nuevos.</p>
          <small>
            Acá aparecerán las altas y modificaciones que realice el otro
            integrante.
          </small>
        </div>
      ) : (
        <div className="notifications-list">
          {otherNotifications.map((notification) => {
            const isRead = (notification.readBy || []).includes(user.uid);

            return (
              <article
                key={notification.id}
                className={`notification-item ${isRead ? "is-read" : "is-unread"}`}
              >
                <div className="notification-item-top">
                  <strong>
                    {notification.type === "created"
                      ? "Nuevo evento"
                      : "Evento modificado"}
                  </strong>

                  {!isRead && (
                    <span className="notification-new">Nuevo</span>
                  )}
                </div>

                <p className="notification-message">
                  <strong>{notification.actorName || "Integrante"}</strong>{" "}
                  {notification.message ||
                    "Realizó un cambio en la agenda."}
                </p>

                <small className="notification-date">
                  {formatNotificationDate(notification.createdAt)}
                </small>

                {!isRead && (
                  <button
                    type="button"
                    className="notification-read-button"
                    onClick={() => markAsRead(notification.id)}
                  >
                    Marcar como leída
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
