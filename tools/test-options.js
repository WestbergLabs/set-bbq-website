// Self-check for grouped order options: node tools/test-options.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'order.js'), 'utf8');
const EXPORTS = `
  return { orderState, renderOrderOptions, getOptionDefinitions, getModifierGroups, getLineGroup,
    getOptionLines, getSelectedLines, needsLineQuantities, getLineTotal, lineKey,
    setOptionSelection, updateMainQuantity, setLineQuantity, hasValidOptions, buildOrderItems };`;

function newDocument() {
  return {
    addEventListener() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ className: '', innerHTML: '', appendChild() {} })
  };
}

const load = new Function('document', 'window', source + EXPORTS);

const FLAVORS = ['Blueberry Lemon Drop', 'Strawberry Only', 'Strawberry Banana Lovers', 'Regular Banana Pudding'];
const menu = {
  categories: [{
    id: 'desserts',
    items: [
      {
        id: 'banana-pudding-full-pan', name: 'Banana Pudding', priceKey: 'banana-pudding-full-pan',
        category: 'desserts', unit: 'Full Size',
        pricing: { type: 'groups', groups: [
          { label: 'Flavor', options: FLAVORS.map((label) => ({ label, adjustment: 0 })) },
          { label: 'Cookies', appliesTo: FLAVORS.slice(0, 3), options: [
            { label: 'No Cookies', adjustment: 0 }, { label: 'Half Cookies', adjustment: 0 }, { label: 'Regular Cookies', adjustment: 5 }] },
          { label: 'Cookies', appliesTo: [FLAVORS[3]], options: [
            { label: 'Regular Cookies', adjustment: 0 }, { label: 'Different Cookies', adjustment: 0 }] }
        ] }
      },
      {
        id: 'brisket', name: 'Brisket', priceKey: 'brisket', category: 'meats', unit: 'Select size',
        pricing: { type: 'adjustment', options: [{ label: '10-14 lbs', adjustment: 0 }, { label: '14+ lbs', adjustment: 30 }] }
      },
      { id: 'wings', name: 'Wings', priceKey: 'wings', category: 'meats', unit: '10 lbs', orderOptions: ['Mild', 'Spicy'] },
      { id: 'cole-slaw', name: 'Cole Slaw', priceKey: 'cole-slaw', category: 'sides', unit: '1 pan' }
    ]
  }]
};
const prices = { currency: 'USD', deliveryFee: 20, items: {
  'banana-pudding-full-pan': { basePrice: 35 }, brisket: { basePrice: 155 }, wings: { basePrice: 75 }, 'cole-slaw': { basePrice: 50 }
} };

function fresh() {
  const api = load(newDocument(), {});
  api.orderState.menu = menu;
  api.orderState.prices = prices;
  return api;
}

const pudding = menu.categories[0].items[0];
const brisket = menu.categories[0].items[1];

// Data shape: the first group drives the checkboxes, later groups are scoped modifiers.
{
  const api = fresh();
  assert.deepStrictEqual(api.getOptionDefinitions(pudding).map((o) => o.label), FLAVORS);
  assert.deepStrictEqual(api.getLineGroup(pudding, 'Strawberry Only').options.map((o) => o.label),
    ['No Cookies', 'Half Cookies', 'Regular Cookies']);
  assert.deepStrictEqual(api.getLineGroup(pudding, 'Regular Banana Pudding').options.map((o) => o.label),
    ['Regular Cookies', 'Different Cookies']);
  assert.strictEqual(api.getLineGroup(brisket, '14+ lbs'), null, 'a single-group item has no modifier lines');
}

// Scenario: a plain item with no options.
{
  const api = fresh();
  api.updateMainQuantity('cole-slaw', 3);
  assert.strictEqual(api.hasValidOptions(), true);
  assert.deepStrictEqual(api.buildOrderItems().map((i) => [i.item_name, i.quantity, i.unit_price, i.option]),
    [['Cole Slaw', 3, 50, null]]);
}

// Scenario: one priced option, no modifiers. No quantities asked for, adjustment applies.
{
  const api = fresh();
  api.updateMainQuantity('brisket', 2);
  api.setOptionSelection('brisket', '14+ lbs', true);
  assert.strictEqual(api.needsLineQuantities('brisket'), false);
  assert.strictEqual(api.hasValidOptions(), true);
  assert.deepStrictEqual(api.buildOrderItems().map((i) => [i.quantity, i.unit_price, i.option]), [[2, 185, '14+ lbs']]);
}

// Scenario: quantity 1 caps the flavors at one.
{
  const api = fresh();
  api.updateMainQuantity('banana-pudding-full-pan', 1);
  api.setOptionSelection('banana-pudding-full-pan', 'Strawberry Only', true);
  api.setOptionSelection('banana-pudding-full-pan', 'Blueberry Lemon Drop', true);
  assert.deepStrictEqual(Array.from(api.orderState.optionSelections.get('banana-pudding-full-pan')), ['Strawberry Only']);
}

// Scenario: quantity 1, one flavor. The cookie choice still has to be made.
{
  const api = fresh();
  api.updateMainQuantity('banana-pudding-full-pan', 1);
  api.setOptionSelection('banana-pudding-full-pan', 'Strawberry Only', true);
  assert.strictEqual(api.needsLineQuantities('banana-pudding-full-pan'), true);
  assert.strictEqual(api.hasValidOptions(), false, 'no cookie quantity yet');
  api.orderState.optionSplits.set(api.lineKey('banana-pudding-full-pan', 'Strawberry Only', 'Regular Cookies'), 1);
  assert.strictEqual(api.hasValidOptions(), true);
  assert.deepStrictEqual(api.buildOrderItems().map((i) => [i.quantity, i.unit_price, i.option]),
    [[1, 40, 'Strawberry Only · Regular Cookies']], 'the cookie upcharge is added');
}

// Scenario: two of the same flavor, one with cookies and one without.
{
  const api = fresh();
  const id = 'banana-pudding-full-pan';
  api.updateMainQuantity(id, 2);
  api.setOptionSelection(id, 'Blueberry Lemon Drop', true);
  api.orderState.optionSplits.set(api.lineKey(id, 'Blueberry Lemon Drop', 'Half Cookies'), 1);
  api.orderState.optionSplits.set(api.lineKey(id, 'Blueberry Lemon Drop', 'No Cookies'), 1);
  assert.strictEqual(api.getLineTotal(id), 2);
  assert.strictEqual(api.hasValidOptions(), true);
  assert.deepStrictEqual(api.buildOrderItems().map((i) => [i.quantity, i.option]), [
    [1, 'Blueberry Lemon Drop · No Cookies'],
    [1, 'Blueberry Lemon Drop · Half Cookies']
  ]);
}

// Scenario: two flavors, each with its own cookie amount.
{
  const api = fresh();
  const id = 'banana-pudding-full-pan';
  api.updateMainQuantity(id, 2);
  api.setOptionSelection(id, 'Strawberry Only', true);
  api.setOptionSelection(id, 'Regular Banana Pudding', true);
  api.orderState.optionSplits.set(api.lineKey(id, 'Strawberry Only', 'Half Cookies'), 1);
  api.orderState.optionSplits.set(api.lineKey(id, 'Regular Banana Pudding', 'Different Cookies'), 1);
  assert.strictEqual(api.hasValidOptions(), true);
  assert.deepStrictEqual(api.buildOrderItems().map((i) => i.option),
    ['Strawberry Only · Half Cookies', 'Regular Banana Pudding · Different Cookies']);
}

// Scenario: a cookie choice from the other flavor's group cannot be used.
{
  const api = fresh();
  const id = 'banana-pudding-full-pan';
  api.updateMainQuantity(id, 1);
  api.setOptionSelection(id, 'Regular Banana Pudding', true);
  api.orderState.optionSplits.set(api.lineKey(id, 'Regular Banana Pudding', 'Half Cookies'), 1);
  assert.strictEqual(api.getLineTotal(id), 0, 'Half Cookies is not offered for this flavor');
  assert.strictEqual(api.hasValidOptions(), false);
}

// Scenario: the quantities have to add up to the item quantity.
{
  const api = fresh();
  const id = 'banana-pudding-full-pan';
  api.updateMainQuantity(id, 3);
  api.setOptionSelection(id, 'Strawberry Only', true);
  api.orderState.optionSplits.set(api.lineKey(id, 'Strawberry Only', 'No Cookies'), 2);
  assert.strictEqual(api.hasValidOptions(), false, 'two of three assigned');
  api.orderState.optionSplits.set(api.lineKey(id, 'Strawberry Only', 'No Cookies'), 4);
  assert.strictEqual(api.hasValidOptions(), false, 'four of three assigned');
}

// Scenario: a line cannot take more than the item quantity has left.
{
  const api = fresh();
  const id = 'banana-pudding-full-pan';
  api.updateMainQuantity(id, 2);
  api.setOptionSelection(id, 'Blueberry Lemon Drop', true);
  api.setOptionSelection(id, 'Strawberry Banana Lovers', true);
  assert.strictEqual(api.setLineQuantity(id, 'Blueberry Lemon Drop--No Cookies', 1), 1);
  assert.strictEqual(api.setLineQuantity(id, 'Blueberry Lemon Drop--Half Cookies', 1), 1);
  assert.strictEqual(api.setLineQuantity(id, 'Strawberry Banana Lovers--No Cookies', 4), 0, 'nothing left to give');
  assert.strictEqual(api.getLineTotal(id), 2);
  assert.strictEqual(api.hasValidOptions(), true);

  // Freeing a line makes room again, and an oversized entry lands on what remains.
  api.setLineQuantity(id, 'Blueberry Lemon Drop--Half Cookies', 0);
  assert.strictEqual(api.setLineQuantity(id, 'Strawberry Banana Lovers--No Cookies', 9), 1);
  assert.strictEqual(api.getLineTotal(id), 2);
}

// Scenario: lowering the item quantity trims the lines already entered.
{
  const api = fresh();
  const id = 'banana-pudding-full-pan';
  api.updateMainQuantity(id, 3);
  api.setOptionSelection(id, 'Strawberry Only', true);
  api.setLineQuantity(id, 'Strawberry Only--No Cookies', 2);
  api.setLineQuantity(id, 'Strawberry Only--Half Cookies', 1);
  api.updateMainQuantity(id, 1);
  assert.strictEqual(api.getLineTotal(id), 1);
  assert.strictEqual(api.hasValidOptions(), true);
  assert.deepStrictEqual(api.buildOrderItems().map((i) => [i.quantity, i.option]),
    [[1, 'Strawberry Only \u00b7 No Cookies']]);
}

// Scenario: wings mixed on a single unit, then split across several.
{
  const api = fresh();
  api.updateMainQuantity('wings', 1);
  api.setOptionSelection('wings', 'Mild', true);
  api.setOptionSelection('wings', 'Spicy', true);
  assert.strictEqual(api.needsLineQuantities('wings'), false);
  assert.deepStrictEqual(api.buildOrderItems().map((i) => [i.quantity, i.option]), [[1, 'Mixed: Mild + Spicy']]);

  api.updateMainQuantity('wings', 4);
  assert.strictEqual(api.needsLineQuantities('wings'), true);
  assert.strictEqual(api.hasValidOptions(), false);
  assert.strictEqual(api.setLineQuantity('wings', 'Mild', 3), 3);
  assert.strictEqual(api.setLineQuantity('wings', 'Spicy', 2), 1, 'only one of four left');
  assert.deepStrictEqual(api.buildOrderItems().map((i) => [i.quantity, i.option]), [[3, 'Mild'], [1, 'Spicy']]);
}

// Scenario: dropping the item quantity to zero clears its options and quantities.
{
  const api = fresh();
  const id = 'banana-pudding-full-pan';
  api.updateMainQuantity(id, 2);
  api.setOptionSelection(id, 'Strawberry Only', true);
  api.orderState.optionSplits.set(api.lineKey(id, 'Strawberry Only', 'No Cookies'), 2);
  api.updateMainQuantity(id, 0);
  assert.strictEqual(api.orderState.selected.has(id), false);
  assert.strictEqual(api.orderState.optionSelections.has(id), false);
  assert.strictEqual(api.orderState.optionSplits.size, 0);
}

// Scenario: unchecking a flavor drops the quantities entered under it.
{
  const api = fresh();
  const id = 'banana-pudding-full-pan';
  api.updateMainQuantity(id, 2);
  api.setOptionSelection(id, 'Strawberry Only', true);
  api.orderState.optionSplits.set(api.lineKey(id, 'Strawberry Only', 'No Cookies'), 2);
  api.setOptionSelection(id, 'Strawberry Only', false);
  assert.strictEqual(api.orderState.optionSplits.size, 0);
  assert.strictEqual(api.hasValidOptions(), false, 'an item with options needs one selected');
}

// Scenario: lowering the quantity trims the extra flavors and their quantities.
{
  const api = fresh();
  const id = 'banana-pudding-full-pan';
  api.updateMainQuantity(id, 2);
  api.setOptionSelection(id, 'Strawberry Only', true);
  api.setOptionSelection(id, 'Regular Banana Pudding', true);
  api.orderState.optionSplits.set(api.lineKey(id, 'Regular Banana Pudding', 'Regular Cookies'), 1);
  api.updateMainQuantity(id, 1);
  assert.deepStrictEqual(Array.from(api.orderState.optionSelections.get(id)), ['Strawberry Only']);
  assert.strictEqual(api.orderState.optionSplits.size, 0, 'the trimmed flavor takes its quantity with it');
}

// The markup puts each option's quantity lines directly under that option, scoped to it.
{
  const rendered = [];
  const doc = newDocument();
  doc.querySelector = (selector) => (selector === '[data-order-categories]'
    ? { innerHTML: '', appendChild(child) { rendered.push(child.innerHTML); } }
    : null);
  const api = load(doc, {});
  api.orderState.menu = menu;
  api.orderState.prices = prices;
  api.renderOrderOptions();

  const html = rendered.join('');
  assert.strictEqual(html.match(/class="option-choice-row"/g).length, 8, 'four flavors, two sizes, two wing heats');
  assert.ok(!html.includes('option-modifier-select'), 'the dropdown is gone');

  const blocks = html.split('data-option-detail=');
  const strawberry = blocks.find((block) => block.startsWith('"banana-pudding-full-pan--Strawberry Only"'));
  assert.ok(strawberry.includes('data-option-key="Strawberry Only--Half Cookies"'));
  assert.ok(!strawberry.includes('Different Cookies'));

  const regular = blocks.find((block) => block.startsWith('"banana-pudding-full-pan--Regular Banana Pudding"'));
  assert.ok(regular.includes('data-option-key="Regular Banana Pudding--Different Cookies"'));
  assert.ok(!regular.includes('Half Cookies'));

  const size = blocks.find((block) => block.startsWith('"brisket--14+ lbs"'));
  assert.ok(size.includes('data-option-key="14+ lbs"'), 'an option with no modifiers gets one quantity box');
  assert.ok(!size.includes('option-modifier-line'));
}

console.log('all order option scenarios passed');
