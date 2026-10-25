import { useEffect, useRef, useState } from "react";
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
  const messagesEndRef = useRef(null);
  const lastReadAtRef = useRef(0);
  const initialScrollDoneRef = useRef(false);
  const [initialTargetId, setInitialTargetId] = useState(null);
  const shouldScrollToBottomRef = useRef(false);
  const [chatProfiles, setChatProfiles] = useState([]);

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
    lastReadAtRef.current = 0;
initialScrollDoneRef.current = false;
setInitialTargetId(null);

    getDoc(profileRef)
      .then((snapshot) => {
        if (!active) return;

        if (snapshot.exists()) {
  const profileData = snapshot.data();
  const profileName = profileData.name || "";

  lastReadAtRef.current =
    profileData.lastReadAt?.toMillis?.() || 0;

  setSavedName(profileName);
  setName(profileName);
} else {
  lastReadAtRef.current = 0;
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
  const loadedMessages = snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));

  setMessages(loadedMessages);

  if (!initialScrollDoneRef.current) {
    const firstUnread = loadedMessages.find((item) => {
      if (item.senderUid === user.uid) return false;

      const createdAt = item.createdAt?.toMillis?.();

      return createdAt && createdAt > lastReadAtRef.current;
    });

    const targetId = firstUnread
      ? firstUnread.id
      : loadedMessages.length > 0
        ? loadedMessages[loadedMessages.length - 1].id
        : null;

    initialScrollDoneRef.current = true;
    setInitialTargetId(targetId);
  }

  // Registrar que el usuario está leyendo el chat.
  updateDoc(
    doc(db, "groups", groupId, "chatProfiles", user.uid),
    { lastReadAt: serverTimestamp() }
  ).catch((err) => {
    console.error("Error al actualizar la lectura:", err);
  });
},
      (err) => {
        console.error("Error al escuchar mensajes:", err);
        setError("No se pudieron cargar los mensajes.");
      }
    );

    return unsubscribe;
  }, [groupId, user?.uid, savedName]);


  // Escuchar cuándo leyó el chat cada participante
useEffect(() => {
  if (!groupId || !user?.uid) {
    setChatProfiles([]);
    return;
  }
  const profilesRef = collection(
    db,
    "groups",
    groupId,
    "chatProfiles"
  );
  const unsubscribe = onSnapshot(
    profilesRef,
    (snapshot) => {
      setChatProfiles(
        snapshot.docs.map((item) => ({
          uid: item.id,
          ...item.data(),
        }))
      );
    },
    (err) => {
      console.error("Error al escuchar perfiles del chat:", err);
    }
  );
  return unsubscribe;
}, [groupId, user?.uid]);


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

  // Desplazamiento inicial al primer mensaje no leído
// o al último mensaje si no hay pendientes.
useEffect(() => {
  if (!initialScrollDoneRef.current) return;

  if (initialTargetId) {
    const target = document.getElementById(
      `chat-message-${initialTargetId}`
    );

    target?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  } else {
    messagesEndRef.current?.scrollIntoView({
      behavior: "auto",
      block: "end",
    });
  }
}, [initialTargetId]);


// scroll al último mensaje después de enviar uno propio
useEffect(() => {
  if (!shouldScrollToBottomRef.current) return;
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.senderUid !== user.uid) return;
  shouldScrollToBottomRef.current = false;
  requestAnimationFrame(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  });
}, [messages, user.uid]);

  // Enviar mensaje
 // Enviar mensaje
const handleSendMessage = async (event) => {
  event.preventDefault();

  const cleanMessage = message.trim();

  if (!cleanMessage || !savedName || !user?.uid || sending) return;

  setSending(true);
  setError("");

  // Indicar que, cuando llegue el mensaje a la lista,
  // queremos desplazarnos al final.
  shouldScrollToBottomRef.current = true;

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
    shouldScrollToBottomRef.current = false;
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
            const messageTime = item.createdAt?.toMillis?.();
            const readByOther = Boolean(
  messageTime &&
    chatProfiles.some(
      (profile) =>
        profile.uid !== user.uid &&
        profile.lastReadAt?.toMillis?.() >= messageTime
    )
);
            const date = item.createdAt?.toDate?.();

            return (
              <div
                key={item.id}
                id={`chat-message-${item.id}`}
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

  {ownMessage && date && (
    <i
      className={`chat-read-status fa-solid ${
        readByOther ? "fa-check-double is-read" : "fa-check-double is-sent"
      }`}
      title={readByOther ? "Leído" : "Enviado"}
      aria-label={readByOther ? "Leído" : "Enviado"}
    />
  )}
</span>
                
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
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
