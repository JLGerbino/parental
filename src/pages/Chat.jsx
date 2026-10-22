
import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import "./Chat.css";

function Chat({ groupId, user }) {   
  const [name, setName] = useState("");
  const [savedName, setSavedName] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // Perfil del usuario dentro del grupo
  useEffect(() => {
    if (!groupId || !user?.uid) return;

    let active = true;
    const profileRef = doc(
      db,
      "groups",
      groupId,
      "chatProfiles",
      user.uid
    );

    setLoadingProfile(true);
    setSavedName("");
    setName("");

    getDoc(profileRef)
      .then((snapshot) => {
        if (!active) return;

        if (snapshot.exists()) {
          const profileName = snapshot.data().name || "";
          setSavedName(profileName);
          setName(profileName);
        }
      })
      .catch((err) => {
        console.error("Error al cargar el perfil del chat:", err);
        if (active) setError("No se pudo cargar tu perfil.");
      })
      .finally(() => {
        if (active) setLoadingProfile(false);
      });

    return () => {
      active = false;
    };
  }, [groupId, user?.uid]);

  // Escuchar mensajes en tiempo real
  useEffect(() => {
    if (!groupId || !user?.uid || !savedName) {
      setMessages([]);
      return;
    }

    const messagesRef = collection(
      db,
      "groups",
      groupId,
      "messages"
    );

    const messagesQuery = query(
      messagesRef,
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      
(snapshot) => {
  setMessages(
    snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    }))
  );

  updateDoc(
    doc(db, "groups", groupId, "chatProfiles", user.uid),
    { lastReadAt: serverTimestamp() }
  ).catch((err) => {
    console.error("Error al actualizar la lectura:", err);
  });
},

    //   (snapshot) => {
    //     setMessages(
    //       snapshot.docs.map((item) => ({
    //         id: item.id,
    //         ...item.data(),
    //       }))
    //     );
    //   },
      (err) => {
        console.error("Error al escuchar mensajes:", err);
        setError("No se pudieron cargar los mensajes.");
      }
    );

    return unsubscribe;
  }, [groupId, user?.uid, savedName]);

  // Guardar el nombre del usuario
  const handleSaveName = async (event) => {
    event.preventDefault();

    const cleanName = name.trim();
    if (!cleanName || !user?.uid || !groupId) return;

    setSavingName(true);
    setError("");

    try {
      await setDoc(
        doc(db, "groups", groupId, "chatProfiles", user.uid),
        {
          name: cleanName,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setSavedName(cleanName);
    } catch (err) {
      console.error("Error al guardar el nombre:", err);
      setError("No se pudo guardar el nombre. Intentá nuevamente.");
    } finally {
      setSavingName(false);
    }
  };

  // Enviar mensaje
  const handleSendMessage = async (event) => {
    event.preventDefault();

    const cleanMessage = message.trim();

    if (!cleanMessage || !savedName || !user?.uid || sending) return;

    setSending(true);
    setError("");

    try {
      await addDoc(
        collection(db, "groups", groupId, "messages"),
        {
          text: cleanMessage,
          senderUid: user.uid,
          senderName: savedName,
          createdAt: serverTimestamp(),
        }
      );

      setMessage("");
    } catch (err) {
      console.error("Error al enviar el mensaje:", err);
      setError("No se pudo enviar el mensaje. Intentá nuevamente.");
    } finally {
      setSending(false);
    }
  };

  if (loadingProfile) {
    return (
      <section className="chat-page">
        <p className="chat-status">Cargando chat...</p>
      </section>
    );
  }

  if (!user?.uid || !groupId) {
    return (
      <section className="chat-page">
        <p className="chat-status">
          Necesitás ingresar a un grupo para usar el chat.
        </p>
      </section>
    );
  }

  // Primera entrada: elegir nombre
  if (!savedName) {
    return (
      <section className="chat-page">
        <header className="chat-header">
          <div className="chat-header-icon">
            <i className="fa-solid fa-comments" />
          </div>
          <div>
            <h2>Chat familiar</h2>
            <p>Identificate para comenzar</p>
          </div>
        </header>

        <form className="chat-name-form" onSubmit={handleSaveName}>
          <label htmlFor="chat-name">¿Cómo te llamás?</label>
          <input
            id="chat-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ingresá tu nombre"
            maxLength={60}
            required
          />
          <button type="submit" disabled={savingName || !name.trim()}>
            {savingName ? "Guardando..." : "Ingresar al chat"}
          </button>
        </form>

        {error && <p className="chat-error">{error}</p>}
      </section>
    );
  }

  return (
    <section className="chat-page">
      <header className="chat-header">
        <div className="chat-header-icon">
          <i className="fa-solid fa-comments" />
        </div>

        <div>
          <h2>Chat familiar</h2>
          <p>Estás participando como {savedName}</p>
        </div>
      </header>

      <div className="chat-messages" aria-live="polite">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <i className="fa-regular fa-message" />
            <p>Todavía no hay mensajes.</p>
            <span>Podés iniciar la conversación.</span>
          </div>
        ) : (
          messages.map((item) => {
            const ownMessage = item.senderUid === user.uid;
            const date = item.createdAt?.toDate?.();

            return (
              <div
                key={item.id}
                className={`chat-message ${
                  ownMessage ? "chat-message-own" : "chat-message-other"
                }`}
              >
                {!ownMessage && (
                  <span className="chat-sender">
                    {item.senderName || "Integrante"}
                  </span>
                )}

                <p>{item.text}</p>

                <span className="chat-time">
                  {date
                    ? date.toLocaleString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Enviando..."}
                </span>
              </div>
            );
          })
        )}
      </div>

      <form className="chat-compose" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Escribí un mensaje..."
          maxLength={2000}
          aria-label="Mensaje"
        />
        <button
          type="submit"
          aria-label="Enviar mensaje"
          disabled={sending || !message.trim()}
        >
          <i className="fa-solid fa-paper-plane" />
        </button>
      </form>

      {error && <p className="chat-error">{error}</p>}
    </section>
  );
}

export default Chat;
