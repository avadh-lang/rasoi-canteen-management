/* Demo data for Rasoi. Run with `npm run db:seed` (wipes existing data). */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { taxFor } from "../src/lib/domain/pricing";
import { addDays, businessDate, istMidnight } from "../src/lib/domain/time";

const db = new PrismaClient();
const DEMO_PASSWORD = "rasoi@123";

// name, price ₹, veg, prep min, stock (null = made to order), description
type Row = [string, number, boolean, number, number | null, string];
const MENU: Record<string, Row[]> = {
  "Chai & coffee": [
    ["Cutting chai", 12, true, 2, null, "Half glass, strong, extra adrak"],
    ["Filter coffee", 20, true, 3, null, "Chicory blend, frothed in a davara"],
    ["Cold coffee", 45, true, 4, null, "With a scoop of vanilla"],
    ["Lemon iced tea", 35, true, 3, null, "Fresh lime, mint"],
  ],
  Breakfast: [
    ["Kanda poha", 25, true, 5, 40, "Onion, peanuts, sev, lemon wedge"],
    ["Upma", 25, true, 5, 30, "Rava, curry leaves, coconut chutney"],
    ["Idli sambar (3)", 35, true, 4, null, "Steamed idlis with sambar and chutney"],
    ["Masala dosa", 55, true, 10, null, "Crisp dosa, potato bhaji, sambar"],
    ["Medu vada (2)", 35, true, 6, null, "Dunked in sambar on request"],
  ],
  "Snacks & chaat": [
    ["Vada pav", 18, true, 3, 120, "Dry garlic chutney, fried chilli"],
    ["Samosa (2)", 30, true, 3, 80, "With tamarind and green chutney"],
    ["Misal pav", 50, true, 6, null, "Kolhapuri tarri, farsan, 2 pav"],
    ["Pav bhaji", 70, true, 8, null, "Butter pav, extra onion on request"],
    ["Bhel puri", 35, true, 4, null, "Sweet-spicy, raw mango when in season"],
  ],
  Sandwiches: [
    ["Veg grilled sandwich", 50, true, 7, null, "Potato, beetroot, cucumber, cheese"],
    ["Bombay masala toast", 45, true, 6, null, "Aloo masala, green chutney, sev"],
    ["Chicken mayo sandwich", 70, false, 7, 25, "Shredded chicken, mayo, lettuce"],
    ["Egg bhurji pav", 50, false, 7, null, "Spiced scrambled eggs, 2 pav"],
  ],
  "Meals & thali": [
    ["Veg thali", 90, true, 8, 60, "2 sabzi, dal, rice, 3 chapati, salad"],
    ["Rajma chawal", 75, true, 5, 40, "Punjabi rajma, jeera rice, onion"],
    ["Chole bhature", 80, true, 10, null, "2 bhature, chole, pickle"],
    ["Egg curry rice", 85, false, 8, 30, "2 eggs in Malvani gravy"],
    ["Chicken biryani", 130, false, 6, 45, "Dum biryani, raita, salan"],
  ],
  "Indo-Chinese": [
    ["Veg Hakka noodles", 80, true, 10, null, "Wok-tossed, extra schezwan on request"],
    ["Veg schezwan fried rice", 85, true, 10, null, "Spicy, with spring onion"],
    ["Veg Manchurian (dry)", 90, true, 12, null, "Cabbage-carrot balls, garlic sauce"],
    ["Chicken fried rice", 110, false, 12, null, "Egg, chicken strips, soy"],
  ],
  "Cold drinks & packaged": [
    ["Mineral water 1L", 20, true, 0, 150, "Chilled"],
    ["Frooti 200ml", 15, true, 0, 90, "Mango drink"],
    ["Masala chaas", 20, true, 0, 60, "Spiced buttermilk, 200ml"],
    ["Lays classic salted", 20, true, 0, 70, "52g pack"],
    ["Parle-G biscuit pack", 10, true, 0, 100, "The one everyone knows"],
  ],
};

const STUDENTS: [string, string, string][] = [
  ["Aarav Patil", "aarav@student.test", "22CE1001"],
  ["Diya Naik", "diya@student.test", "22CE1002"],
  ["Rohan Deshmukh", "rohan@student.test", "22CE1003"],
  ["Sneha Gawde", "sneha@student.test", "22IT2004"],
  ["Kabir Shaikh", "kabir@student.test", "22EX3005"],
  ["Ishita Rane", "ishita@student.test", "STAFF0107"],
];

// Deterministic PRNG so every seed produces the same history.
let s = 42;
const rand = () => ((s = (s * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

// Rough college rush: breakfast, the 1pm lunch spike, and the 4pm chai break.
const HOUR_WEIGHTS: [number, number][] = [
  [8, 4], [9, 6], [10, 7], [11, 6], [12, 12], [13, 16], [14, 9], [15, 7], [16, 10], [17, 5], [18, 2],
];
function randomMinute(): number {
  const total = HOUR_WEIGHTS.reduce((a, [, w]) => a + w, 0);
  let r = rand() * total;
  for (const [h, w] of HOUR_WEIGHTS) {
    if ((r -= w) <= 0) return h * 60 + Math.floor(rand() * 60);
  }
  return 13 * 60;
}

async function main() {
  console.log("Clearing tables…");
  await db.$transaction([
    db.auditLog.deleteMany(),
    db.walletTxn.deleteMany(),
    db.orderItem.deleteMany(),
    db.order.deleteMany(),
    db.menuItem.deleteMany(),
    db.category.deleteMany(),
    db.user.deleteMany(),
    db.canteenSettings.deleteMany(),
  ]);

  await db.canteenSettings.create({ data: { id: 1, openMinute: 7 * 60 + 30, closeMinute: 23 * 60 + 30 } });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const admin = await db.user.create({ data: { name: "Meera Kulkarni", email: "admin@rasoi.test", role: "ADMIN", passwordHash } });
  await db.user.create({ data: { name: "Ganesh Pawar", email: "kitchen@rasoi.test", role: "KITCHEN", passwordHash } });
  const cashier = await db.user.create({ data: { name: "Sunita More", email: "counter@rasoi.test", role: "CASHIER", passwordHash } });
  const students = [];
  for (const [name, email, rollNo] of STUDENTS) {
    students.push(await db.user.create({ data: { name, email, rollNo, passwordHash, role: "CUSTOMER" } }));
  }

  console.log("Writing menu…");
  const items: { id: string; name: string; pricePaise: number; prepMinutes: number; popularity: number }[] = [];
  let sort = 0;
  for (const [category, rows] of Object.entries(MENU)) {
    const cat = await db.category.create({ data: { name: category, sortOrder: sort++ } });
    for (const [name, price, isVeg, prepMinutes, stock, description] of rows) {
      const item = await db.menuItem.create({
        data: { name, pricePaise: price * 100, isVeg, prepMinutes, stock, description, categoryId: cat.id },
      });
      const popularity = /chai|vada pav|samosa|thali|biryani|noodles|water/i.test(name) ? 4 : 1;
      items.push({ ...item, popularity });
    }
  }
  const weighted = items.flatMap((i) => Array(i.popularity).fill(i));

  console.log("Generating 7 days of orders…");
  const today = businessDate();
  const now = new Date();
  const tokens = new Map<string, number>();
  const balances = new Map(students.map((st) => [st.id, 0]));

  // Opening top-ups for every student.
  for (const st of students) {
    const amount = pick([300, 500, 500, 800, 1000]) * 100;
    balances.set(st.id, amount);
    await db.walletTxn.create({
      data: { userId: st.id, type: "TOPUP", amountPaise: amount, balanceAfter: amount, reference: "Opening top-up · UPI", createdAt: istMidnight(addDays(today, -8)) },
    });
  }

  for (let d = -7; d <= 0; d++) {
    const dateKey = addDays(today, d);
    const midnight = istMidnight(dateKey).getTime();
    const weekday = new Date(`${dateKey}T00:00:00Z`).getUTCDay();
    const count = d === 0 ? 26 : weekday === 0 ? 14 : 55 + Math.floor(rand() * 30);

    for (let n = 0; n < count; n++) {
      const liveTicket = d === 0 && n >= count - 7;
      const placedAt = liveTicket
        ? new Date(now.getTime() - (count - n) * 4.5 * 60_000)
        : new Date(midnight + randomMinute() * 60_000);
      if (placedAt > now && d === 0) continue;
      const lineCount = 1 + Math.floor(rand() * 3);
      const chosen = new Map<string, { item: (typeof items)[number]; qty: number }>();
      for (let l = 0; l < lineCount; l++) {
        const item = pick(weighted);
        const prev = chosen.get(item.id);
        chosen.set(item.id, { item, qty: (prev?.qty ?? 0) + (rand() < 0.8 ? 1 : 2) });
      }
      const lines = [...chosen.values()];
      const subtotal = lines.reduce((a, l) => a + l.item.pricePaise * l.qty, 0);
      const tax = taxFor(subtotal, 500);
      const total = subtotal + tax;

      const online = rand() < 0.6;
      const student = online ? pick(students) : null;
      let method = online ? (rand() < 0.65 ? "WALLET" : "UPI") : pick(["CASH", "CASH", "UPI"]);
      if (method === "WALLET" && (balances.get(student!.id) ?? 0) < total) method = "UPI";

      const token = (tokens.get(dateKey) ?? 100) + 1;
      tokens.set(dateKey, token);

      // Today's recent orders stay active so the kitchen board has work on it.
      const ageMin = (now.getTime() - placedAt.getTime()) / 60_000;
      let status = rand() < 0.03 ? "CANCELLED" : "COLLECTED";
      if (d === 0 && ageMin < 40) status = ageMin < 8 ? "PLACED" : ageMin < 20 ? "PREPARING" : "READY";
      const prep = Math.max(...lines.map((l) => l.item.prepMinutes), 2);
      const at = (m: number) => new Date(placedAt.getTime() + m * 60_000);
      const slot = online ? new Date(Math.ceil((placedAt.getTime() + prep * 60_000) / 900_000) * 900_000) : null;

      const order = await db.order.create({
        data: {
          token,
          businessDate: dateKey,
          channel: online ? "ONLINE" : "COUNTER",
          status,
          customerName: student?.name ?? pick(["Walk-in", "Walk-in", "Prof. Joshi", "Library staff", "Walk-in"]),
          userId: student?.id ?? null,
          handledById: online ? null : cashier.id,
          pickupSlot: slot,
          subtotalPaise: subtotal,
          taxPaise: tax,
          totalPaise: total,
          paymentMethod: method,
          paymentStatus: status === "CANCELLED" ? "REFUNDED" : "PAID",
          paymentRef: method === "UPI" ? `UPI${placedAt.getTime().toString().slice(-8)}${1000 + n}` : null,
          placedAt,
          preparingAt: ["PREPARING", "READY", "COLLECTED"].includes(status) ? at(2) : null,
          readyAt: ["READY", "COLLECTED"].includes(status) ? at(prep + 2) : null,
          collectedAt: status === "COLLECTED" ? at(prep + 4 + Math.floor(rand() * 6)) : null,
          cancelledAt: status === "CANCELLED" ? at(1) : null,
          items: {
            create: lines.map((l) => ({
              menuItemId: l.item.id,
              name: l.item.name,
              unitPaise: l.item.pricePaise,
              qty: l.qty,
              linePaise: l.item.pricePaise * l.qty,
            })),
          },
        },
      });

      if (method === "WALLET" && status !== "CANCELLED") {
        const after = balances.get(student!.id)! - total;
        balances.set(student!.id, after);
        await db.walletTxn.create({
          data: { userId: student!.id, type: "PAYMENT", amountPaise: -total, balanceAfter: after, reference: `Order #${order.token}`, createdAt: placedAt },
        });
      }
    }
  }

  for (const [id, balance] of balances) await db.user.update({ where: { id }, data: { walletBalance: balance } });

  await db.auditLog.create({ data: { actorId: admin.id, action: "system.seeded", entity: "System", detail: "Demo data loaded" } });

  console.log(`\nDone. Every demo account uses the password "${DEMO_PASSWORD}":`);
  console.log("  admin@rasoi.test     Manager");
  console.log("  kitchen@rasoi.test   Kitchen");
  console.log("  counter@rasoi.test   Counter");
  console.log("  aarav@student.test   Student (+5 more)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
