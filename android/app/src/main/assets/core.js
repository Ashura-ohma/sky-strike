(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.MobaCore = api;
})(globalThis, function () {
  "use strict";

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function inRange(a, b, range) {
    return distance(a, b) <= range;
  }

  function applyDamage(unit, amount) {
    const before = Math.max(0, unit.hp);
    unit.hp = Math.max(0, before - Math.max(0, amount));
    return { dealt: before - unit.hp, killed: before > 0 && unit.hp === 0 };
  }

  return { clamp, distance, inRange, applyDamage };
});
