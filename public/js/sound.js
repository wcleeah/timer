function setPlaybackSession() {
  try {
    if ("audioSession" in navigator) navigator.audioSession.type = "playback";
  } catch {
    // AudioSession is Safari-only.
  }
}

function ensureMedia(id, src, { loop = false } = {}) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("audio");
    el.id = id;
    el.preload = "auto";
    el.playsInline = true;
    el.setAttribute("playsinline", "");
    el.setAttribute("webkit-playsinline", "");
    document.body.appendChild(el);
  }
  if (el.getAttribute("src") !== src) el.src = src;
  el.loop = loop;
  return el;
}

function bedEl() {
  return ensureMedia("timer-bed", "/sounds/silence.mp3", { loop: true });
}

function beepEl() {
  return ensureMedia("timer-beep", "/sounds/beep.mp3");
}

function playMedia(el) {
  if (!el) return;
  const play = el.play();
  if (play && typeof play.catch === "function") play.catch(() => {});
}

export function unlockSound() {
  setPlaybackSession();
  const bed = bedEl();
  bed.muted = false;
  bed.volume = 1;
  playMedia(bed);
  const beep = beepEl();
  beep.muted = false;
  beep.volume = 1;
}

export function playBeep() {
  setPlaybackSession();
  const bed = bedEl();
  if (bed.paused) playMedia(bed);
  const beep = beepEl();
  beep.muted = false;
  beep.volume = 1;
  try {
    beep.currentTime = 0;
  } catch {
    // iOS can throw if the element is not ready.
  }
  playMedia(beep);
}

export function releaseSound() {
  for (const el of [document.getElementById("timer-bed"), document.getElementById("timer-beep")]) {
    if (!el) continue;
    try {
      el.pause();
      el.currentTime = 0;
    } catch {
      // ignore
    }
  }
}
