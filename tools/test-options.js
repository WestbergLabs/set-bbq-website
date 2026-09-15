// Self-check for grouped order options: node tools/test-options.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'order.js'), 'utf8');
const stubs = {
  addEventListener() {},
  querySelector: () => null,
  querySelectorAll: () => []
};
const load = new Function('document', 'window', `${source}
  return { orderState, optionAdjustment, optionFullLabel, modifiersComplete, getOptionDefinitions, getModifierGroups, modifierKey };`);
const api = load(stubs, {});

const pudding = {
  id: 'banana-pudding-full-pan',
  name: 'Banana Pudding',
  priceKey: 'banana-pudding-full-pan',
  category: 'desserts',
  pricing: {
    type: 'groups',
    groups: [
      { label: 'Flavor', options: [{ label: 'Strawberry Only', adjustment: 0 }, { label: 'Regular Banana Pudding', adjustment: 0 }] },
      { label: 'Cookies', appliesTo: ['Strawberry Only'], options: [{ label: 'No Cookies', adjustment: 0 }, { label: 'Half Cookies', adjustment: 0 }, { label: 'Regular Cookies', adjustment: 5 }] },
      { label: 'Cookies', appliesTo: ['Regular Banana Pudding'], options: [{ label: 'Regular Cookies', adjustment: 0 }, { label: 'Different Cookies', adjustment: 0 }] }
    ]
  }
};
const brisket = {
  id: 'brisket',
  name: 'Brisket',
  priceKey: 'brisket',
  category: 'meats',
  pricing: { type: 'adjustment', options: [{ label: '10-14 lbs', adjustment: 0 }, { label: '14+ lbs', adjustment: 30 }] }
};

api.orderState.menu = { categories: [{ id: 'x', items: [pudding, brisket] }] };
api.orderState.prices = { currency: 'USD', deliveryFee: 20, items: { 'banana-pudding-full-pan': { basePrice: 35 }, brisket: { basePrice: 155 } } };

// The primary group drives the checkboxes; later groups are modifiers.
assert.deepStrictEqual(api.getOptionDefinitions(pudding).map((o) => o.label), ['Strawberry Only', 'Regular Banana Pudding']);
// Each flavor only offers the cookie group that names it.
assert.deepStrictEqual(
  api.getModifierGroups(pudding, 'Strawberry Only').flatMap((g) => g.options.map((o) => o.label)),
  ['No Cookies', 'Half Cookies', 'Regular Cookies']
);
assert.deepStrictEqual(
  api.getModifierGroups(pudding, 'Regular Banana Pudding').flatMap((g) => g.options.map((o) => o.label)),
  ['Regular Cookies', 'Different Cookies']
);

// A flavor with no cookie choice is incomplete and carries no modifier price.
assert.strictEqual(api.modifiersComplete(pudding, 'Strawberry Only'), false);
assert.strictEqual(api.optionAdjustment(pudding, 'Strawberry Only'), 0);
assert.strictEqual(api.optionFullLabel(pudding, 'Strawberry Only'), 'Strawberry Only');

// Each flavor keeps its own cookie choice.
api.orderState.optionModifiers.set(api.modifierKey('banana-pudding-full-pan', 'Strawberry Only', 'Cookies'), 'Regular Cookies');
api.orderState.optionModifiers.set(api.modifierKey('banana-pudding-full-pan', 'Regular Banana Pudding', 'Cookies'), 'Different Cookies');
assert.strictEqual(api.modifiersComplete(pudding, 'Strawberry Only'), true);
assert.strictEqual(api.optionAdjustment(pudding, 'Strawberry Only'), 5);
assert.strictEqual(api.optionAdjustment(pudding, 'Regular Banana Pudding'), 0);
assert.strictEqual(api.optionFullLabel(pudding, 'Strawberry Only'), 'Strawberry Only · Regular Cookies');
assert.strictEqual(api.optionFullLabel(pudding, 'Regular Banana Pudding'), 'Regular Banana Pudding · Different Cookies');
assert.strictEqual(api.modifiersComplete(pudding, 'Regular Banana Pudding'), true);

// A choice that belongs to the other flavor's cookie group does not count.
api.orderState.optionModifiers.set(api.modifierKey('banana-pudding-full-pan', 'Regular Banana Pudding', 'Cookies'), 'Half Cookies');
assert.strictEqual(api.modifiersComplete(pudding, 'Regular Banana Pudding'), false);

// Single-group items keep the old behavior.
assert.strictEqual(api.modifiersComplete(brisket, '14+ lbs'), true);
assert.strictEqual(api.optionAdjustment(brisket, '14+ lbs'), 30);
assert.strictEqual(api.optionFullLabel(brisket, '14+ lbs'), '14+ lbs');

console.log('grouped option checks passed');
