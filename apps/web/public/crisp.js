// https://crisp.chat/

window.$crisp = [];
window.CRISP_WEBSITE_ID = "NEW_ID";
(() => {
  d = document;
  s = d.createElement("script");
  s.src = "https://client.crisp.chat/l.js";
  s.async = 1;
  d.getElementsByTagName("head")[0].appendChild(s);
})();
