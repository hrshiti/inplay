import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './utils/console.js'
import './index.css'
import App from './App.jsx'

// ─── GSAP ScrollTrigger Fix ──────────────────────────────────────────────────
// GSAP's internal _refresh100vh helper appends/removes a temp <div> to measure
// 100vh. When React re-renders between append and remove, a "removeChild" crash
// occurs. This patch makes removeChild a safe no-op when the node is not a child.
if (typeof window !== 'undefined') {
  const _origRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child && child.parentNode === this) {
      return _origRemoveChild.call(this, child);
    }
    // Node already removed (e.g. by GSAP/React conflict) — silently ignore
    return child;
  };
}
// ─────────────────────────────────────────────────────────────────────────────

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
