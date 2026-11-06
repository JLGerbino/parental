
const BottomBar = ({
  activePage,
  setActivePage,
  bothResponsiblesLinked,
  unreadChat,
  unreadNotifications,
  upcomingAgendaCount,
}) => {
  const navigate = (page) => {
    if (!bothResponsiblesLinked && page !== "home") return;
    setActivePage(page);
  };

  return (
    <div className="bottom-bar">

      <div
        className={`bottom-icon ${activePage === "home" ? "active" : ""}`}
        onClick={() => navigate("home")}
      >
        <i className="fa-solid fa-house"></i>
        <small>Inicio</small>
      </div>

      <div
  className={`bottom-icon ${!bothResponsiblesLinked ? "disabled" : ""} ${activePage === "agenda" ? "active" : ""}`}
  onClick={() => navigate("agenda")}
>
  <i className="fa-solid fa-calendar-days"></i>
  <small>Agenda</small>

  {upcomingAgendaCount > 0 && (
    <span className="notification-badge">
      {upcomingAgendaCount > 99 ? "99+" : upcomingAgendaCount}
    </span>
  )}
</div>

<div
  className={`bottom-icon ${
    !bothResponsiblesLinked ? "disabled" : ""
  } ${activePage === "convivencia" ? "active" : ""}`}
  onClick={() => navigate("convivencia")}
>
  <i className="fa-solid fa-people-roof"></i>
  <small>Convivencia</small>
</div>

      <div
        className={`bottom-icon ${!bothResponsiblesLinked ? "disabled" : ""} ${activePage === "notifications" ? "active" : ""}`}
        onClick={() => navigate("notifications")}
      >
        <i className="fa-solid fa-bell"></i>
        <small>Avisos</small>

        {unreadNotifications > 0 && (
          <span className="notification-badge">
            {unreadNotifications > 99 ? "99+" : unreadNotifications}
          </span>
        )}
      </div>

      <div
        className={`bottom-icon ${!bothResponsiblesLinked ? "disabled" : ""} ${activePage === "chat" ? "active" : ""}`}
        onClick={() => navigate("chat")}
      >
        <i className="fa-solid fa-comments"></i>
        <small>Chat</small>

        {unreadChat > 0 && (
          <span className="notification-badge">
            {unreadChat > 99 ? "99+" : unreadChat}
          </span>
        )}
      </div>

    </div>
  );
};

export default BottomBar;
