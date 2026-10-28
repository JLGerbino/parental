import i18n from "i18next";

const LanguageSelector = ({ direction = "horizontal" }) => {

  const changeLang = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
  };

  return (
    <div className={`lang-container ${direction}`}>
      <button className="botonBandera" onClick={() => changeLang("es")}>
        <img src="argentina.png" alt="Español" className="bandera"/>
      </button>

      <button className="botonBandera" onClick={() => changeLang("pt")}>
        <img src="brasil.png" alt="Português" className="bandera"/>
      </button>

      <button className="botonBandera" onClick={() => changeLang("en")}>
        <img src="estados-unidos.png" alt="English" className="bandera"/>
      </button>

      <button className="botonBandera" onClick={() => changeLang("fr")}>
        <img src="francia.png" alt="Français" className="bandera"/>
      </button>
    </div>
  );
};

export default LanguageSelector;