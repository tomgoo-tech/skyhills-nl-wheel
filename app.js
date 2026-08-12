"use strict";

const CONFIG = (() => {
  const params = new URLSearchParams(window.location.search);
  const defaults = Object.freeze({
    lang: "nl",
    brand: "skyhills-casino",
    title: "Skyhills Casino Geluksrad — Champagne",
    offer: "https://tmhh7.com/LPzj3Kzn",
    bonus1: "€ 4,000",
    bonus2: "100 FS",
    i18n: "./assets/system/i18n.json?v=skyhills-1",
  });
  const privateParams = new Set(["lang", "brand", "b1", "b2", "offer"]);

  const getParam = (name, fallback) => {
    const value = params.get(name)?.trim();
    return value || fallback;
  };

  const splitBonus = (raw) => {
    const normalized = raw.trim().replace(/\+/g, " ");
    const parts = normalized.split(/\s+/).filter(Boolean);
    const currencies = new Set(["€", "$", "£", "¥"]);

    if (currencies.has(parts[0]) && parts[1]) {
      return {
        top: parts[1],
        bottom: [parts[0], ...parts.slice(2)].join(" "),
        display: normalized,
      };
    }

    return {
      top: parts[0] || "",
      bottom: parts.slice(1).join(" "),
      display: normalized,
    };
  };

  const buildOfferUrl = (base) => {
    const url = new URL(base, window.location.href);
    url.searchParams.set("se_referrer", document.referrer);
    url.searchParams.set("default_keyword", defaults.title);

    params.forEach((value, key) => {
      if (!privateParams.has(key)) url.searchParams.append(key, value);
    });

    return url.href;
  };

  const offer = getParam("offer", defaults.offer);

  return Object.freeze({
    lang: getParam("lang", defaults.lang),
    brand: getParam("brand", defaults.brand),
    title: defaults.title,
    i18nUrl: defaults.i18n,
    offerUrl: buildOfferUrl(offer),
    bonuses: {
      first: splitBonus(getParam("b1", defaults.bonus1)),
      second: splitBonus(getParam("b2", defaults.bonus2)),
    },
    assets: {
      desktopBackground: "./assets/brand/bg-desktop.webp",
      mobileBackground: "./assets/brand/bg-mobile.webp",
    },
  });
})();

const FALLBACK_COPY = Object.freeze({
  spin_button: "Draaien",
  wheel_plus_spins: "Kansen",
  wheel_retry: "Opnieuw",
  wheel_empty: "Leeg",
  main_title: "Draai en win!",
  attempts_label: "Pogingen over:",
  popup_title: "Gefeliciteerd!",
  popup_win_prefix: "Je winst:",
  popup_retry_button: "Nog een keer",
  popup_claim_button: "Bonus ophalen",
});

const dom = {};
const state = {
  busy: false,
  messages: FALLBACK_COPY,
};

function cacheDom() {
  dom.landing = document.querySelector("#landing");
  dom.wheelShell = document.querySelector("#wheelShell");
  dom.wheelRotor = document.querySelector("#wheelRotor");
  dom.bulbRing = document.querySelector("#bulbRing");
  dom.spinButton = document.querySelector("#spinButton");
  dom.counter = document.querySelector("#counter");
  dom.firstPopup = document.querySelector("#firstPopup");
  dom.secondPopup = document.querySelector("#secondPopup");
  dom.retryButton = document.querySelector("#retryButton");
  dom.claimButton = document.querySelector("#claimButton");
  dom.firstReward = document.querySelector("#firstReward");
  dom.finalRewardPrefix = document.querySelector("#finalRewardPrefix");
  dom.finalRewardValue = document.querySelector("#finalRewardValue");
}

function createBulbs(count = 32) {
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < count; index += 1) {
    const bulb = document.createElement("span");
    bulb.className = "bulb";
    bulb.style.setProperty("--bulb-index", index);
    fragment.appendChild(bulb);
  }
  dom.bulbRing.replaceChildren(fragment);
}

function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(url);
    image.onerror = reject;
    image.src = url;
  });
}

const backgroundMedia = window.matchMedia("(max-width: 700px), (orientation: portrait)");

async function applyResponsiveBackground() {
  const preferred = backgroundMedia.matches
    ? CONFIG.assets.mobileBackground
    : CONFIG.assets.desktopBackground;

  try {
    await preloadImage(preferred);
    dom.landing.style.backgroundImage = `url("${preferred}")`;
  } catch {
    dom.landing.style.backgroundImage =
      "radial-gradient(circle at 50% 30%, #173755, #06101d 68%)";
  }
}

function bindResponsiveBackground() {
  const refresh = () => applyResponsiveBackground();
  if (backgroundMedia.addEventListener) {
    backgroundMedia.addEventListener("change", refresh);
  } else {
    backgroundMedia.addListener(refresh);
  }
}

async function loadMessages() {
  try {
    const response = await fetch(CONFIG.i18nUrl, { cache: "force-cache" });
    if (!response.ok) throw new Error(`i18n request failed: ${response.status}`);
    const messages = await response.json();
    return { ...FALLBACK_COPY, ...(messages[CONFIG.lang] || messages.nl || {}) };
  } catch {
    return FALLBACK_COPY;
  }
}

function applyMessages(messages) {
  state.messages = messages;
  document.documentElement.lang = CONFIG.lang;
  document.title = CONFIG.title;

  const copyMap = {
    "spin-button": messages.spin_button,
    "wheel-plus": messages.wheel_plus_spins,
    "wheel-retry": messages.wheel_retry,
    "wheel-empty": messages.wheel_empty,
    "main-title": messages.main_title,
    "attempts-label": messages.attempts_label,
    "popup-title": messages.popup_title,
    "popup-prefix": messages.popup_win_prefix,
    "retry-button": messages.popup_retry_button,
    "claim-button": messages.popup_claim_button,
  };

  Object.entries(copyMap).forEach(([key, value]) => {
    document.querySelectorAll(`[data-copy="${key}"]`).forEach((element) => {
      element.textContent = value;
    });
  });
}

function applyBonuses() {
  const first = CONFIG.bonuses.first;
  const second = CONFIG.bonuses.second;

  document.querySelectorAll('[data-bonus="first-top"]').forEach((element) => {
    element.textContent = first.top;
  });
  document.querySelectorAll('[data-bonus="first-bottom"]').forEach((element) => {
    element.textContent = first.bottom;
  });
  document.querySelectorAll('[data-bonus="second-top"]').forEach((element) => {
    element.textContent = second.top;
  });
  document.querySelectorAll('[data-bonus="second-bottom"]').forEach((element) => {
    element.textContent = second.bottom;
  });

  dom.firstReward.textContent = first.display;
  dom.finalRewardPrefix.textContent = `${state.messages.popup_win_prefix} ${first.display}`;
  dom.finalRewardValue.textContent = `+ ${second.display}`;
}

const storageKey = `wheel-state:${CONFIG.lang}:${CONFIG.brand}:v1`;

function readSavedState() {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) || "null");
  } catch {
    return null;
  }
}

function saveFinishedState() {
  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        finished: true,
        finalRewardPrefix: dom.finalRewardPrefix.textContent,
        finalRewardValue: dom.finalRewardValue.textContent,
      }),
    );
  } catch {
    // Storage can be unavailable in privacy mode; the current session still works.
  }
}

function openModal(modal) {
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(modal) {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

function getAnimationDuration(element) {
  const style = window.getComputedStyle(element);
  const durations = style.animationDuration
    .split(",")
    .map((value) => (value.includes("ms") ? Number.parseFloat(value) : Number.parseFloat(value) * 1000))
    .filter(Number.isFinite);
  return Math.max(0, ...durations);
}

function runSpin(className) {
  dom.wheelRotor.classList.remove("spin-one", "spin-two", "final-state");
  void dom.wheelRotor.offsetWidth;
  dom.wheelRotor.classList.add(className);
  dom.wheelShell.classList.add("is-spinning");

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      dom.wheelRotor.removeEventListener("animationend", onAnimationEnd);
      dom.wheelShell.classList.remove("is-spinning");
      resolve();
    };
    const onAnimationEnd = (event) => {
      if (event.animationName === "spinOne" || event.animationName === "spinTwo") finish();
    };

    dom.wheelRotor.addEventListener("animationend", onAnimationEnd);
    window.setTimeout(finish, getAnimationDuration(dom.wheelRotor) + 180);
  });
}

function setBusy(busy) {
  state.busy = busy;
  dom.spinButton.disabled = busy;
  dom.spinButton.setAttribute("aria-busy", String(busy));
}

async function handleFirstSpin() {
  if (state.busy) return;
  if (readSavedState()?.finished) {
    restoreFinishedState();
    return;
  }

  setBusy(true);
  dom.counter.textContent = "1";
  await runSpin("spin-one");
  openModal(dom.firstPopup);
  setBusy(false);
}

async function handleSecondSpin() {
  if (state.busy) return;
  setBusy(true);
  closeModal(dom.firstPopup);
  dom.counter.textContent = "0";
  await runSpin("spin-two");
  saveFinishedState();
  openModal(dom.secondPopup);
  setBusy(false);
}

function restoreFinishedState() {
  const saved = readSavedState();
  if (!saved?.finished) return;

  if (typeof saved.finalRewardPrefix === "string") {
    dom.finalRewardPrefix.textContent = saved.finalRewardPrefix;
  }
  if (typeof saved.finalRewardValue === "string") {
    dom.finalRewardValue.textContent = saved.finalRewardValue;
  }

  dom.counter.textContent = "0";
  dom.wheelRotor.classList.remove("spin-one", "spin-two");
  dom.wheelRotor.classList.add("final-state");
  openModal(dom.secondPopup);
}

function bindEvents() {
  dom.spinButton.addEventListener("click", handleFirstSpin);
  dom.retryButton.addEventListener("click", handleSecondSpin);
  dom.claimButton.addEventListener("click", (event) => {
    event.preventDefault();
    if (typeof window.gtag_report_conversion === "function") {
      window.gtag_report_conversion(CONFIG.offerUrl);
      return;
    }
    window.location.assign(CONFIG.offerUrl);
  });
}

async function init() {
  cacheDom();
  createBulbs();
  bindResponsiveBackground();
  bindEvents();

  const [messages] = await Promise.all([loadMessages(), applyResponsiveBackground()]);
  applyMessages(messages);
  applyBonuses();
  restoreFinishedState();
  document.body.classList.add("is-ready");
}

init();
