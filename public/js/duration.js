import { splitDuration, combineDuration } from "./timer-math.js";
import { esc } from "./dom.js";

function partValue(n) {
  return n === 0 ? "" : String(n);
}

export function durationFieldsHtml(ms) {
  const parts = splitDuration(ms);
  return `<div class="duration">
    <label>
      <span>H</span>
      <input data-part="hours" inputmode="numeric" placeholder="0" aria-label="Hours" value="${esc(partValue(parts.hours))}" />
    </label>
    <span class="colon">:</span>
    <label>
      <span>M</span>
      <input data-part="minutes" inputmode="numeric" placeholder="0" aria-label="Minutes" value="${esc(partValue(parts.minutes))}" />
    </label>
    <span class="colon">:</span>
    <label>
      <span>S</span>
      <input data-part="seconds" inputmode="numeric" placeholder="0" aria-label="Seconds" value="${esc(partValue(parts.seconds))}" />
    </label>
  </div>`;
}

export function durationFrom(el) {
  const wrap = el.closest(".duration");
  if (!wrap) return 0;
  return combineDuration({
    hours: Number(wrap.querySelector('[data-part="hours"]').value) || 0,
    minutes: Number(wrap.querySelector('[data-part="minutes"]').value) || 0,
    seconds: Number(wrap.querySelector('[data-part="seconds"]').value) || 0,
  });
}

export function bindDuration(root, onSave) {
  root.querySelectorAll(".duration input").forEach((input) => {
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "");
    });
    input.addEventListener("focus", () => input.select());
    input.addEventListener("blur", () => onSave(input, durationFrom(input)));
  });
}
