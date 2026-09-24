import test from "node:test";
import assert from "node:assert/strict";
import { parseNaturalTransaction, parseNaturalTransactions } from "../lib/parser.ts";
import { assertProfileAccess, canAdminister, canMutate } from "../lib/authz.ts";

test("natural-language transaction creation extracts a ride", () => { const tx = parseNaturalTransaction("13dh inDrive", new Date("2026-09-21T12:00:00Z")); assert.equal(tx.amountCents, 1300); assert.equal(tx.category, "Transport"); assert.equal(tx.merchant, "indrive"); assert.equal(tx.type, "expense"); });
test("natural-language savings remains distinct from expense", () => { const tx = parseNaturalTransaction("I saved 2000dh this month", new Date("2026-09-21T12:00:00Z")); assert.equal(tx.amountCents, 200_000); assert.equal(tx.type, "saving"); assert.equal(tx.category, "Savings"); });
test("yesterday changes the structured date", () => { const tx = parseNaturalTransaction("31dh game yesterday", new Date("2026-09-21T12:00:00Z")); assert.match(tx.occurredAt, /^2026-09-20/); assert.equal(tx.necessity, "discretionary"); });
test("one input can preview several separate transactions", () => { const items = parseNaturalTransactions("3dh biscuit, 24 dh inDrive, 29dh Pizza", new Date("2026-09-21T12:00:00Z")); assert.equal(items.length, 3); assert.deepEqual(items.map((item) => item.amountCents), [300, 2400, 2900]); assert.deepEqual(items.map((item) => item.category), ["Food", "Transport", "Food"]); });
test("profile isolation rejects missing membership", () => assert.throws(() => assertProfileAccess(null), /access denied/));
test("profile roles enforce read/write/admin boundaries", () => { assert.equal(canMutate("viewer"), false); assert.equal(canMutate("member"), true); assert.equal(canAdminister("member"), false); assert.equal(canAdminister("owner"), true); });
