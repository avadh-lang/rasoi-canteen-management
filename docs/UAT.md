# User acceptance test scenarios

Run against a fresh `npm run db:reset`. Record Pass/Fail and the tester's name for each.

| ID | Role | Scenario | Steps | Expected result |
|---|---|---|---|---|
| UAT-01 | Student | Register | Create account with name, email, roll no. | Lands on menu; wallet shows ₹0 |
| UAT-02 | Student | Sign in with wrong password 6 times | Enter a wrong password repeatedly | After 5 failures: "Too many attempts" |
| UAT-03 | Student | Build a tray | Add 2 items, change quantity, refresh page | Tray keeps items and quantities |
| UAT-04 | Student | Veg filter and search | Tick "Veg only", search "biryani" | Only veg items; empty-state message for no match |
| UAT-05 | Student | Pay by wallet | Checkout, pick a slot, pay by wallet | Token page appears; wallet reduced by total incl. GST |
| UAT-06 | Student | Insufficient wallet | Tray costing more than wallet balance | Wallet option warns; pay button blocked until UPI chosen or topped up |
| UAT-07 | Student | Pay by UPI, decline | Choose UPI, press Decline | "Payment declined… Nothing was charged"; no order created |
| UAT-08 | Student | Cancel before cooking | Cancel a just-placed order | Status Cancelled; full amount back in wallet; stock restored |
| UAT-09 | Student | Cancel after cooking starts | Kitchen starts cooking, then student opens order | Cancel button no longer shown |
| UAT-10 | Student | Slot capacity | Manager sets 1 order per slot; two students pick the same slot | Second student sees the slot as Full |
| UAT-11 | Kitchen | Work an order | Start cooking → Mark ready | Student's token page turns green within seconds; board moves the ticket |
| UAT-12 | Kitchen | Two screens, same order | Open board on two tabs, act on both | Second action shows "Someone else just updated this order" |
| UAT-13 | Counter | Walk-in cash bill | Add items, enter cash given, Charge | Token issued; change shown; order appears on kitchen board |
| UAT-14 | Counter | Packaged-only bill | Bill only water + chips | Marked handed over immediately; not on kitchen board |
| UAT-15 | Counter | Wallet bill by roll no. | Wallet → find `22CE1002` → Charge | Student's wallet debited; ledger shows the order |
| UAT-16 | Counter | Hand over | Pickup → Handed over on a ready token | Token leaves the "Now serving" board |
| UAT-17 | Counter | Cash top-up | Wallet top-up → find student → ₹200 | Balance increases; student sees "Top-up" in history |
| UAT-18 | Manager | Add a dish | Menu → Add a dish with limited quantity | Appears on student menu and counter with "N left" |
| UAT-19 | Manager | Take a dish off | Toggle availability off | Student menu shows "Sold out"; can't be ordered |
| UAT-20 | Manager | Pause orders | Settings → untick "Take online orders" | Student menu shows the paused notice; checkout has no slots |
| UAT-21 | Manager | Role change | People → change a student to Kitchen | That user's next click lands them on the kitchen board |
| UAT-22 | Manager | Export | Overview → Download 7-day CSV | CSV opens in Excel with one row per order line |
| UAT-23 | Any | Access control | Student visits `/admin` or `/api/admin/export` | Redirected to menu / 403 |
