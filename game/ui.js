/*
 * ui.js
 * -----
 * Thin wrapper over the HTML overlay elements (crosshair, HUD text, the
 * context prompt at the bottom, and the start/pause screen).
 */
export class UI {
  constructor() {
    this.crosshair = document.getElementById("crosshair");
    this.hud = document.getElementById("hud");
    this.overlay = document.getElementById("overlay");
    this.prompt = document.getElementById("prompt");
    this.location = document.getElementById("hud-location");
    this.racked = document.getElementById("hud-racked");
    this.held = document.getElementById("hud-held");
    this.startBtn = document.getElementById("start-btn");
    this.loading = document.getElementById("loading");
  }

  showGame(visible) {
    this.crosshair.classList.toggle("hidden", !visible);
    this.hud.classList.toggle("hidden", !visible);
    this.overlay.classList.toggle("hidden", visible);
  }

  setPrompt(text) {
    if (text) {
      this.prompt.innerHTML = text;
      this.prompt.classList.add("show");
    } else {
      this.prompt.classList.remove("show");
    }
  }

  setLocation(text) {
    this.location.textContent = text;
  }

  setRacked(n, total) {
    this.racked.textContent = `Items racked: ${n}${total ? " / " + total : ""}`;
  }

  setHeld(name) {
    this.held.textContent = name ? `Hands: ${name}` : "Hands: empty";
  }
}
