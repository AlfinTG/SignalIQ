(function () {
  "use strict";

  // Find the script tag that loaded this widget
  var currentScript =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName("script");
      return scripts[scripts.length - 1];
    })();

  if (!currentScript) return;

  var formId = currentScript.getAttribute("data-form") || "form-default";
  var mode = currentScript.getAttribute("data-mode") || "floating"; // 'floating' or 'inline'
  var targetId = currentScript.getAttribute("data-target");
  var accentColor = currentScript.getAttribute("data-accent") || "#2563EB";
  var buttonText = currentScript.getAttribute("data-text") || "Feedback";

  // Determine base host from script src
  var scriptSrc = currentScript.src || "";
  var parser = document.createElement("a");
  parser.href = scriptSrc;
  var host = parser.origin || (window.location.protocol + "//" + window.location.host);

  // If script is loaded from API port 8000 in dev, the frontend hosted form is at 5173
  // In production, both are served from the same host.
  var frontendHost = host;
  if (host.indexOf(":8000") !== -1) {
    frontendHost = host.replace(":8000", ":5173");
  }

  var formUrl = frontendHost + "/f/" + encodeURIComponent(formId) + "?embed=1";

  if (mode === "inline") {
    var targetEl = targetId ? document.getElementById(targetId) : currentScript.parentNode;
    if (targetEl) {
      var iframe = document.createElement("iframe");
      iframe.src = formUrl;
      iframe.style.width = "100%";
      iframe.style.minHeight = "480px";
      iframe.style.border = "1px solid #E2E8F0";
      iframe.style.borderRadius = "12px";
      iframe.style.backgroundColor = "#FFFFFF";
      targetEl.appendChild(iframe);
    }
    return;
  }

  // Floating trigger button & modal
  var button = document.createElement("button");
  button.id = "signaliq-floating-trigger";
  button.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>' +
    buttonText;
  button.style.position = "fixed";
  button.style.bottom = "20px";
  button.style.right = "20px";
  button.style.zIndex = "999990";
  button.style.display = "inline-flex";
  button.style.alignItems = "center";
  button.style.padding = "10px 16px";
  button.style.backgroundColor = accentColor;
  button.style.color = "#FFFFFF";
  button.style.border = "none";
  button.style.borderRadius = "9999px";
  button.style.fontFamily = "Inter, Segoe UI, system-ui, sans-serif";
  button.style.fontSize = "14px";
  button.style.fontWeight = "600";
  button.style.boxShadow = "0 4px 14px rgba(0,0,0,0.16)";
  button.style.cursor = "pointer";
  button.style.transition = "transform 0.15s ease, opacity 0.15s ease";

  button.onmouseenter = function () {
    button.style.transform = "scale(1.04)";
  };
  button.onmouseleave = function () {
    button.style.transform = "scale(1)";
  };

  // Modal Container
  var overlay = document.createElement("div");
  overlay.id = "signaliq-modal-overlay";
  overlay.style.position = "fixed";
  overlay.style.bottom = "80px";
  overlay.style.right = "20px";
  overlay.style.width = "400px";
  overlay.style.maxWidth = "calc(100vw - 40px)";
  overlay.style.height = "560px";
  overlay.style.maxHeight = "calc(100vh - 120px)";
  overlay.style.zIndex = "999999";
  overlay.style.borderRadius = "16px";
  overlay.style.boxShadow = "0 12px 32px rgba(15, 23, 42, 0.18)";
  overlay.style.overflow = "hidden";
  overlay.style.display = "none";
  overlay.style.border = "1px solid #E2E8F0";
  overlay.style.backgroundColor = "#FFFFFF";
  overlay.style.flexDirection = "column";

  var iframeModal = document.createElement("iframe");
  iframeModal.src = formUrl;
  iframeModal.style.width = "100%";
  iframeModal.style.height = "100%";
  iframeModal.style.border = "none";
  overlay.appendChild(iframeModal);

  var isOpen = false;
  button.onclick = function () {
    isOpen = !isOpen;
    overlay.style.display = isOpen ? "flex" : "none";
    button.innerHTML = isOpen
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>' +
        buttonText;
  };

  document.body.appendChild(overlay);
  document.body.appendChild(button);
})();
