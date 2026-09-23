const BEEP_SRC = "/sounds/beep.wav";

let ctx = null;
let keepAlive = null;
let beepEl = null;

function setPlaybackSession() {
  try {
    if ("audioSession" in navigator) navigator.audioSession.type = "playback";
  } catch {
    // AudioSession is Safari-only.
  }
}

function getCtx() {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function resumeCtx() {
  const audio = getCtx();
  if (audio.state === "suspended" || audio.state === "interrupted") {
    audio.resume().catch(() => {});
  }
  return audio;
}

function startKeepAlive() {
  const audio = resumeCtx();
  if (keepAlive) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.frequency.value = 1;
  gain.gain.value = 0.00001;
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start();
  keepAlive = { osc, gain };
}

function getBeepEl() {
  if (!beepEl) {
    beepEl = new Audio(BEEP_SRC);
    beepEl.preload = "auto";
    beepEl.playsInline = true;
    beepEl.setAttribute("x-webkit-airplay", "deny");
  }
  return beepEl;
}

function blessBeep() {
  const el = getBeepEl();
  if (!el.paused && el.volume > 0 && el.currentTime > 0) return;
  const restore = el.volume || 1;
  el.muted = false;
  el.volume = 0;
  const play = el.play();
  if (play && typeof play.then === "function") {
    play
      .then(() => {
        el.pause();
        el.currentTime = 0;
        el.volume = restore;
      })
      .catch(() => {
        el.volume = restore;
      });
  } else {
    el.volume = restore;
  }
}

function playOscillatorBeep(audio) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, audio.currentTime);
  gain.gain.setValueAtTime(0.35, audio.currentTime);
  osc.connect(gain);
  gain.connect(audio.destination);
  const now = audio.currentTime;
  osc.start(now);
  osc.frequency.setValueAtTime(988, now + 0.22);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
  osc.stop(now + 0.6);
}

export function unlockSound() {
  try {
    setPlaybackSession();
    resumeCtx();
    startKeepAlive();
    blessBeep();
  } catch {
    // ignore audio unlock failures
  }
}

export function releaseSound() {
  try {
    if (keepAlive) {
      keepAlive.osc.stop();
      keepAlive.osc.disconnect();
      keepAlive.gain.disconnect();
      keepAlive = null;
    }
    if (beepEl) {
      beepEl.pause();
      beepEl.currentTime = 0;
    }
  } catch {
    keepAlive = null;
  }
}

export function playBeep() {
  try {
    setPlaybackSession();
    const audio = resumeCtx();
    startKeepAlive();
    const el = getBeepEl();
    el.muted = false;
    el.pause();
    el.currentTime = 0;
    const play = el.play();
    if (play && typeof play.catch === "function") {
      play.catch(() => playOscillatorBeep(audio));
    }
  } catch {
    try {
      playOscillatorBeep(resumeCtx());
    } catch {
      // ignore audio failures
    }
  }
}
