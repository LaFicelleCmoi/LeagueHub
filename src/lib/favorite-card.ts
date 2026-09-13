import { getLeague } from "./leagues";
import type { ClubRef } from "./types";

// Recto du badge personnalisé avec le club favori, dessiné dans le navigateur.
// Mêmes dimensions que public/lanyard/card-front.png (zone UV du modèle 3D).
const WIDTH = 839;
const HEIGHT = 1266;
const GOLD = "#c9a052";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    // Le CDN d'ESPN autorise l'usage de ses logos dans un canvas (CORS).
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

/** Logo du club, en variante claire (pour fond sombre) quand elle existe. */
async function loadLogo(url: string | null): Promise<HTMLImageElement | null> {
  if (!url) return null;
  for (const candidate of [url.replace("/500/", "/500-dark/"), url]) {
    try {
      return await loadImage(candidate);
    } catch {
      // Variante indisponible : on essaie la suivante.
    }
  }
  return null;
}

/** Réduit la police jusqu'à ce que le texte tienne dans la largeur voulue. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, size: number, family: string) {
  let current = size;
  ctx.font = `700 ${current}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && current > 28) {
    current -= 4;
    ctx.font = `700 ${current}px ${family}`;
  }
}

export async function renderFavoriteCard({ team, league: slug }: ClubRef): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponible");

  await document.fonts.ready;
  const family = getComputedStyle(document.body).fontFamily || "sans-serif";
  const league = getLeague(slug);
  const logo = await loadLogo(team.logo);
  const center = WIDTH / 2;
  const logoY = HEIGHT * 0.37;

  const background = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  background.addColorStop(0, "#1d3f82");
  background.addColorStop(1, "#0b1a3d");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const halo = ctx.createRadialGradient(center, logoY, 0, center, logoY, WIDTH * 0.4);
  halo.addColorStop(0, "rgba(255, 255, 255, 0.22)");
  halo.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(29, 29, WIDTH - 58, HEIGHT - 58, 29);
  ctx.stroke();

  ctx.textAlign = "center";
  const logoSize = WIDTH * 0.46;
  if (logo) {
    const scale = Math.min(logoSize / logo.width, logoSize / logo.height);
    const width = logo.width * scale;
    const height = logo.height * scale;
    ctx.drawImage(logo, center - width / 2, logoY - height / 2, width, height);
  } else {
    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    ctx.beginPath();
    ctx.arc(center, logoY, logoSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.font = `700 120px ${family}`;
    ctx.fillText(team.abbreviation, center, logoY);
  }

  ctx.textBaseline = "alphabetic";
  const name = team.name.toUpperCase();
  ctx.fillStyle = "#ffffff";
  fitFont(ctx, name, WIDTH * 0.8, 88, family);
  ctx.fillText(name, center, HEIGHT * 0.65);

  ctx.fillStyle = GOLD;
  ctx.font = `700 38px ${family}`;
  ctx.letterSpacing = "10px";
  ctx.fillText("CLUB FAVORI", center, HEIGHT * 0.71);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = league?.accent ?? GOLD;
  ctx.beginPath();
  ctx.roundRect(WIDTH * 0.3, HEIGHT * 0.78, WIDTH * 0.4, 12, 6);
  ctx.fill();

  ctx.fillStyle = "#cbd5e1";
  ctx.font = `600 34px ${family}`;
  ctx.fillText((league?.name ?? "").toUpperCase(), center, HEIGHT * 0.855);
  ctx.fillStyle = "#94a3b8";
  ctx.font = `600 28px ${family}`;
  ctx.fillText("LEAGUEHUB · PASS SUPPORTER", center, HEIGHT * 0.905);

  return canvas.toDataURL("image/png");
}
