// Applique le thème avant le premier rendu pour éviter tout flash.
// Chargé en synchrone dans <head> ; externe pour rester compatible avec une
// Content-Security-Policy sans 'unsafe-inline'.
try {
  var s = JSON.parse(localStorage.getItem('om-theme'))
  var t = s && s.state && s.state.theme
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t
} catch {}
