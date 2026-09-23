function setPlaybackSession() {
  try {
    if ("audioSession" in navigator) navigator.audioSession.type = "playback";
  } catch {
    // AudioSession is Safari-only.
  }
}

function bedEl() {
  return document.getElementById("timer-bed");
}

function beepEl() {
  return document.getElementById("timer-beep");
}

function playMedia(el) {
  if (!el) return;
  const play = el.play();
  if (play && typeof play.catch === "function") play.catch(() => {});
}

export function unlockSound() {
  setPlaybackSession();
  const bed = bedEl();
  if (bed) {
    bed.muted = false;
    bed.loop = true;
    bed.volume = 1;
    playMedia(bed);
  }
  const beep = beepEl();
  if (beep) {
    beep.muted = false;
    beep.volume = 1;
    try {
      beep.load();
    } catch {
      // ignore
    }
  }
}

export function playBeep() {
  setPlaybackSession();
  const bed = bedEl();
  if (bed?.paused) playMedia(bed);
  const beep = beepEl();
  if (!beep) return;
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
  for (const el of [bedEl(), beepEl()]) {
    if (!el) continue;
    try {
      el.pause();
      el.currentTime = 0;
    } catch {
      // ignore
    }
  }
}
