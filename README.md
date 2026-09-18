# ELU Upgrading — Premium V7.7

## Main V7 addition: Appointment Planner
A separate calendar-style daily planning page now mirrors the familiar Team 1 / Team 2 sheet:
- 2 teams
- 4 fixed slots
- Date selector with previous / next / today
- Block + Unit + Team + Slot + Remarks quick entry
- Existing imported appointments for the selected date appear under Unassigned until allocated
- Assigning an existing appointment to Team 1 or Team 2 does not create a duplicate

## One source of truth
The Planner does **not** create a second schedule database. It writes to the same Appointment records. Therefore:
- Appointment confirmed / planned = C
- Slot completed = A
- Unit Register updates automatically
- Appointment Register updates automatically
- Dashboard shows today's Team 1 / Team 2 deployment automatically

## Dashboard
The entrance Dashboard includes a new **Today · Team Schedule** panel with Team 1 and Team 2, each showing the four fixed slots.

## Data migration
V7 migrates existing V6 browser data on first open on the same GitHub Pages domain.

## Upload to GitHub
Replace the same five files only:
- index.html
- styles.css
- data.js
- app.js
- README.md


## V7.1 minor corrections
- Removed the boardroom tagline from the dashboard hero.
- Added only the name “Manoharan Varatharajan” in the top bar.
- No workflow, data, appointment, planner, dashboard logic, or V7 features were changed.

## V7.2 minor correction
- Block/Floor Board colours made stronger and easier to identify at a glance.
- A = green, C = pink, D = coral/red, NR = amber/gold.
- Larger status dots and clearer unit-card contrast.
- No workflow, data, appointment, report, planner, or dashboard logic changed.

## V7.3 colour correction
Status colours are now locked exactly as requested:
- A / Opt-In = Green
- C / Confirmation = Pink
- D / Opt-Out = Yellow
- NR / No Response = Red

No workflow, data, planner, dashboard, appointment, report, or master-register logic changed.

## V7.4 minor Block/Floor Board visual correction
- Unit boxes made more compact and square-ish instead of long rectangles.
- Removed the extra status dot inside each unit box.
- Status colours are slightly transparent / softer while staying easy to identify.
- Locked colour mapping unchanged: A = Green, C = Pink, D = Yellow, NR = Red.
- No workflow, data, dashboard, planner, appointment, report, or register logic changed.

## V7.5 Block/Floor Board fix
- Forced fresh CSS load with cache-busting so the new colours actually appear.
- Removed the long blue floor-strip feel.
- Unit cards are compact and medium square-ish.
- No status dot inside unit cards.
- A = Green, C = Pink, D = Yellow, NR = Red.
- No workflow, data, appointment, dashboard, planner, report, or register logic changed.


## V7.6 minor corrections
- Master Data / all table status colours aligned clearly:
  - A = Green
  - C = Pink
  - D / Opt-Out = Yellow
  - NR / No Response = Red
- Block/Floor Board keeps the same mapping with stronger difference between D and NR.
- Sidebar logo / nav icon styling refreshed without changing layout or workflow.
- Appointment page now shows Planner sync clearly.
- When a unit is selected in Appointment Schedule, the latest existing planner/schedule date, slot and team auto-fill automatically.
- No change to project structure, master-register logic, survey logic, reports, planner flow, or uploaded data.


## V7.7 minor workflow correction
- Appointment Planner is now the single place to set appointment Date + Time/Slot + Team.
- The four standard slots remain unchanged.
- Added **Custom Time** in Planner for exceptional timings such as 6pm–8pm.
- Appointment Schedule no longer asks for Date, Slot or Team again.
- Appointment Schedule is now only for Owner Name, Contact and appointment note.
- Planner schedule automatically sits in the read-only Master Unit Register.
- Owner Name / Contact saved in Appointment Schedule also update Master Data automatically.
- Special-time appointments are shown separately in Planner and on today's Dashboard team schedule.
- Existing C → A automatic completion logic also works with custom time because the custom end time is read from the slot label.
- No change to Survey, Complaint, Weekly Report, status colours or block/unit mapping.
