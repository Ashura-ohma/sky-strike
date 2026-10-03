const test = require("node:test");
const assert = require("node:assert/strict");
const { clamp, distance, inRange, applyDamage } = require("../android/app/src/main/assets/core.js");

test("clamp keeps movement within the lane", () => {
  assert.equal(clamp(12, 0, 10), 10);
  assert.equal(clamp(-2, 0, 10), 0);
  assert.equal(clamp(5, 0, 10), 5);
});

test("range checks use two-dimensional distance", () => {
  const a = { x: 0, y: 0 }, b = { x: 3, y: 4 };
  assert.equal(distance(a, b), 5);
  assert.equal(inRange(a, b, 5), true);
  assert.equal(inRange(a, b, 4.99), false);
});

test("damage cannot heal or drive health below zero", () => {
  const unit = { hp: 12 };
  assert.deepEqual(applyDamage(unit, 5), { dealt: 5, killed: false });
  assert.deepEqual(applyDamage(unit, 50), { dealt: 7, killed: true });
  assert.equal(unit.hp, 0);
  assert.deepEqual(applyDamage(unit, 1), { dealt: 0, killed: false });
});
