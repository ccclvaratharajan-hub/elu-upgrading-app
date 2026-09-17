# ELU Upgrading — Premium V7.4

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
