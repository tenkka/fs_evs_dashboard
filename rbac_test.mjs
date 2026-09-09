import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (err) => console.log("PAGEERROR:", err.message));

// 1. Default = Manager, Overview
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.screenshot({ path: "rbac_1_manager_overview.png" });

// 2. Switch to Employee via sidebar select
await page.selectOption("aside select", { label: "Devon Brooks · Employee" });
await page.waitForTimeout(400);
await page.screenshot({ path: "rbac_2_employee_on_overview_blocked.png" });

// 3. Click "Go to Attendance"
await page.click("text=Go to Attendance");
await page.waitForURL("**/attendance");
await page.waitForTimeout(400);
await page.screenshot({ path: "rbac_3_employee_my_attendance.png" });

// 4. Check scheduling as employee (view only)
await page.click("aside >> text=Scheduling");
await page.waitForTimeout(400);
await page.screenshot({ path: "rbac_4_employee_scheduling.png" });

// 5. Switch to Admin
await page.selectOption("aside select", { label: "Jordan Lee · Admin" });
await page.waitForTimeout(400);
await page.screenshot({ path: "rbac_5_admin_scheduling.png" });

// 6. Admin switches facility to Lakeside via header select
await page.selectOption("header select", { label: "Lakeside Medical Center" });
await page.waitForTimeout(400);
await page.screenshot({ path: "rbac_6_admin_lakeside_scheduling.png" });

// 7. Admin visits KPIs with Lakeside selected -> should show no data
await page.click("aside >> text=KPIs");
await page.waitForTimeout(400);
await page.screenshot({ path: "rbac_7_admin_lakeside_kpis.png" });

// 8. Switch facility back to All Facilities, check KPIs works
await page.selectOption("header select", { label: "All Facilities" });
await page.waitForTimeout(400);
await page.screenshot({ path: "rbac_8_admin_all_kpis.png" });

await browser.close();
console.log("done");
