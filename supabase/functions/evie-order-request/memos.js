// Everyday Venmo, Cash App, and PayPal memos. The first 50 are used before any generated
// variant. Keep this list free of dog references; the cat is Barfie.
export const CURATED_MEMOS = [
  "Food",
  "Gas",
  "Dinner",
  "Barfie\u2019s vet bill",
  "Cat food",
  "Vet bill",
  "Books 4 school",
  "Coffee run",
  "Groceries",
  "Cat litter",
  "Uber",
  "Lunch",
  "Phone bill",
  "School supplies",
  "Target run",
  "Takeout",
  "Pet meds",
  "Cat treats",
  "Breakfast",
  "Snacks",
  "Pharmacy run",
  "Parking",
  "Nails",
  "Laundry",
  "Electricity bill",
  "Water bill",
  "WiFi bill",
  "Textbooks",
  "Gas station",
  "Late night food",
  "Morning coffee",
  "Smoothie",
  "Boba",
  "Haircut",
  "Car wash",
  "Cat toys",
  "Vet checkup",
  "Taco night",
  "Uber Eats",
  "Matcha",
  "Supplies for class",
  "Dinner out",
  "Car insurance",
  "Dry cleaning",
  "Movie night",
  "Rent help",
  "Lunch out",
  "Cat care",
  "School lab fee",
  "Vet visit"
];

const EXTRA_MEMOS = [
  "Cat food for Barfie",
  "Barfie\u2019s food",
  "More cat litter",
  "Gas money",
  "Dinner tonight",
  "Coffee for class",
  "Extra groceries",
  "Barfie\u2019s litter",
  "School books",
  "Late groceries",
  "Cat meds",
  "Vet follow up",
  "Lunch money",
  "Breakfast sandwich",
  "Snack run",
  "Parking meter",
  "Laundry day",
  "Phone top up",
  "Class supplies"
];

const curatedSet = new Set(CURATED_MEMOS);
const extraSet = new Set(EXTRA_MEMOS);

function randomItem(list) {
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

export function isKnownMemo(memo) {
  const text = typeof memo === "string" ? memo.trim() : "";
  if (!text || text.length > 80) return false;
  if (curatedSet.has(text) || extraSet.has(text)) return true;
  const match = text.match(/^(.+) (\d+)$/);
  if (!match) return false;
  const n = Number(match[2]);
  return curatedSet.has(match[1]) && Number.isInteger(n) && n >= 2 && n <= 10000;
}

export function pickMemo(usedList, excludeList) {
  const used = new Set(usedList || []);
  const exclude = new Set(excludeList || []);
  const fresh = (list) => list.filter((memo) => !used.has(memo) && !exclude.has(memo));
  const curated = fresh(CURATED_MEMOS);
  if (curated.length) return randomItem(curated);
  const extras = fresh(EXTRA_MEMOS);
  if (extras.length) return randomItem(extras);
  for (let n = 2; n <= 9999; n += 1) {
    const numbered = fresh(CURATED_MEMOS.map((base) => base + " " + n));
    if (numbered.length) return randomItem(numbered);
  }
  return "Cat care 10000";
}

if (typeof window !== "undefined") {
  window.EVIE_MEMOS = {CURATED_MEMOS, pickMemo, isKnownMemo};
  window.dispatchEvent(new Event("evie-memos-ready"));
}
