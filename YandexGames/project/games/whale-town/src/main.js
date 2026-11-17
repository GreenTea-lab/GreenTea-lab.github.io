// Точка входа: SDK, язык, сохранения, покупки, игра
import { sdk } from "./sdk.js";
import { setLang } from "./i18n.js";
import { save } from "./save.js";
import { iap } from "./iap.js";
import { audio } from "./audio.js";
import { initVolume } from "./volume.js";
import { Game, IAP_DEFS } from "./game.js";
import { Scene } from "./scene.js";

// живая заставка: тот же кит с городком, что и в игре, пока грузятся SDK и сохранения
function bootScene() {
  const box = document.getElementById("boot");
  if (!box) return () => {};
  try {
    const cv = document.createElement("canvas");
    cv.className = "bcv";
    box.prepend(cv);
    const sc = new Scene(cv);
    sc.setState({
      stage: 2,
      biome: "warm",
      isl: 2,
      counts: { lemon: 3, fish: 2, light: 1, bakery: 1, mill: 1 },
    });
    // кит — под названием и шкалой, чтобы они не закрывали городок
    const bx = box.querySelector(".bx");
    const fit = () => {
      const W = innerWidth,
        H = innerHeight;
      const top = bx
        ? Math.max(
            0,
            Math.min(H * 0.45, bx.getBoundingClientRect().bottom - H * 0.06),
          )
        : 0;
      sc.resize(W, H, Math.min(devicePixelRatio || 1, 2), {
        x: 0,
        y: top,
        w: W,
        h: H - top,
      });
    };
    fit();
    addEventListener("resize", fit);
    let raf = 0,
      last = performance.now(),
      puff = 0.8,
      shown = false;
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // кит сам время от времени пускает фонтан
      if ((puff -= dt) < 0) {
        puff = 1.3 + Math.random() * 1.2;
        sc.spout = Math.min(1.2, sc.spout + 0.7);
        sc.squish = 1;
      }
      sc.draw(dt);
      if (!shown) {
        shown = true;
        cv.classList.add("on");
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", fit);
    };
  } catch (e) {
    console.warn("[boot]", e);
    return () => {};
  }
}
const stopBoot = bootScene();

// шкала загрузки на заставке
function progress(p) {
  const f = document.getElementById("bootFill"),
    t = document.getElementById("bootPct");
  if (f) f.style.width = Math.round(p) + "%";
  if (t) t.textContent = Math.round(p) + "%";
}

async function boot() {
  progress(15);
  await sdk.init();
  progress(40);
  setLang(sdk.lang);
  await save.load();
  progress(58);
  try {
    await iap.init(IAP_DEFS, () => save.flush());
  } catch (e) {
    console.warn("[IAP] init", e);
  }
  if (iap.owned.has("disable_ads")) save.data.noAds = true;
  sdk.noAds = !!save.data.noAds;
  initVolume(save.data.settings);
  progress(72);
  try {
    await Promise.all(
      ["800 20px Rubik", "600 20px Rubik", "20px Marmelad"].map((f) =>
        document.fonts.load(f, "Аa1"),
      ),
    );
  } catch (e) {}
  progress(86);
  const game = new Game();
  progress(100);
  const unlock = () => {
    audio.unlock();
    audio.startMusic();
  };
  addEventListener("pointerdown", unlock, { capture: true });
  addEventListener("keydown", unlock, { capture: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      audio.suspend("hidden");
      game.persist();
    } else audio.resume("hidden");
    game.setGameplay();
  });
  addEventListener("blur", () => audio.suspend("blur"));
  addEventListener("focus", () => audio.resume("blur"));
  sdk.on("pause", () => {
    audio.suspend("sdk");
    sdk.gameplay(false);
  });
  sdk.on("resume", () => {
    audio.resume("sdk");
    game.setGameplay();
  });
  document.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("selectstart", (e) => e.preventDefault());
  document.addEventListener("dblclick", (e) => e.preventDefault());
  document.addEventListener(
    "touchmove",
    (e) => {
      if (!e.target.closest(".plist,.list,.mbox")) e.preventDefault();
    },
    { passive: false },
  );
  const b = document.getElementById("boot");
  setTimeout(() => {
    b.style.opacity = "0";
    setTimeout(() => {
      stopBoot();
      b.remove();
    }, 550);
  }, 350);
  sdk.ready();
}

boot();
