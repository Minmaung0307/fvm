import { seasonalEvent } from "./seasonal-core.js";

const event = seasonalEvent();
const workspace = document.querySelector("#workspace");

function showSeasonalDelight() {
  if (!event || workspace?.hidden) return;
  const dismissedKey = `family-vault-seasonal-dismissed-${event.id}`;
  try {
    if (localStorage.getItem(dismissedKey)) return;
  } catch {}
  if (document.querySelector(".seasonal-banner")) return;
  const banner = document.createElement("aside");
  banner.className = "seasonal-banner";
  banner.setAttribute("aria-label", event.name);
  banner.innerHTML = `<span class="seasonal-icon" aria-hidden="true">${event.icon}</span><div><strong>${event.name}</strong><p>${event.message}</p></div><button type="button" aria-label="Dismiss ${event.name}">✕</button>`;
  document.querySelector("main")?.prepend(banner);
  banner.querySelector("button").onclick = () => {
    try { localStorage.setItem(dismissedKey, "1"); } catch {}
    banner.remove();
  };
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const colors = ["#5b50e6", "#e7a947", "#e46f83", "#55a88d"];
    for (let index = 0; index < 18; index++) {
      const piece = document.createElement("i");
      piece.className = "seasonal-confetti";
      piece.style.setProperty("--x", `${6 + Math.random() * 88}%`);
      piece.style.setProperty("--delay", `${Math.random() * .7}s`);
      piece.style.setProperty("--color", colors[index % colors.length]);
      banner.append(piece);
    }
  }
}

if (event && workspace) {
  new MutationObserver(showSeasonalDelight).observe(workspace, { attributes: true, attributeFilter: ["hidden"] });
  showSeasonalDelight();
}
