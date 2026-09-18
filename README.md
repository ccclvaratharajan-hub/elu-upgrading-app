# ELU Upgrading — Premium V7.16

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


## V7.8 minor Block/Floor Board visual refinement
- Confirmation (C) and No Response (NR) colours are now more clearly different.
- Added a glossy / watery / bubble-like surface effect to unit cards.
- Reduced empty-looking gaps by making the unit grid fuller and the cards slightly richer.
- Improved the board row itself with a better 3D premium-card look.
- No workflow, planner logic, report logic, or data structure was changed.


## V7.9 minor Planner correction
- Each saved planner appointment now has **Edit** and **Remove** directly in the Planner.
- Edit keeps you inside the Planner and lets you correct Date, Block, Unit, Team, Slot, Custom Time and Remarks.
- **Update Planner** changes the existing record instead of creating a duplicate.
- **Remove** asks for confirmation, then clears the mistaken appointment and recalculates Master Data automatically.
- Cancel Edit returns the Planner form to normal Add mode.
- No Survey, Complaint, Meeting Report, status-colour, block-board or master-data structure changes.


## V7.10 minor Planner safety correction
- Rule added: **one unit can have only one appointment slot per date**.
- Example: if a unit was mistakenly saved at 9am–11am and then entered again at 4pm–6pm on the same date, the app asks whether to move it.
- When confirmed, the old 9am–11am entry is cleared and the same appointment moves to 4pm–6pm.
- Existing accidental duplicates for the same unit/date are cleaned when the booking is updated.
- Direct **Edit** and **Remove** from V7.9 remain available.
- No changes to Survey, Complaint, Meeting Report, Block Board, status colours, or master-data structure.


## V7.11 minor Block Board date display
- A / Opt-In units with an appointment now show a tiny **Done · DD/MM/YY** line.
- C / Confirmation units show a tiny **Appt · DD/MM/YY** line.
- D / Opt-Out and NR / No Response show no date line.
- Existing automatic C → A conversion remains unchanged.
- No workflow, Planner, Master Data, Report, Complaint, Survey or colour logic changed.


## V7.12 latest Excel refresh + reschedule safety
- Latest uploaded Unit Survey files for Blocks 531–536, 544–550 and 564–569 refreshed into the master seed.
- Owner Name and Contact values from those sheets are prefilled into Master Data where available.
- Latest PR3 appointment schedule was converted into Planner source records with Team 1 / Team 2 where available.
- Current Survey schedule is treated as the source of truth for those refreshed blocks; older mismatched bookings are marked Rescheduled history.
- Four obvious block-number/unit mismatches in the schedule source were corrected using the sheet's block range and exact project unit layout.
- Planner now allows only one pending active appointment per unit across dates. Rescheduling moves the old booking to history instead of leaving it active.
- Appointment Register has Active / Completed / Rescheduled / History schedule state.
- Unit Register now shows Appointment Date + Slot before Remarks, with Remarks last.
- Added a light-dark Electrical Steel visual theme without changing the status-colour mapping.
- Existing browser data migrates from V7 storage into the refreshed source while retaining manual Planner / Survey / Complaint work.


## V7.13 correction after field review
- Restored the V7.11 visual design. The Electrical Steel theme from V7.12 was removed.
- Latest uploaded Unit Survey data is retained for Owner Name, Contact, status and Remarks.
- Appointment Planner is now seeded from **PR3_Appointments.xlsx only**; survey-sheet dates are not used to create competing Planner bookings.
- The app now rebuilds Excel-source records from `data.js` every time it loads, then merges your saved manual Survey / Planner / Complaint work. This prevents stale browser storage from hiding a newly uploaded Excel refresh.
- Resident details saved against an existing appointment are preserved when the source schedule refreshes.
- Unit Register keeps Remarks as the last column.
- Rescheduling in Planner keeps only the current booking active; the old booking goes to Rescheduled history.


## V7.14 Zone-first separation + Block 537 correction
- Corrected Block 537 exact floor/unit layout from the supplied Pasir Ris Street 51 screenshot. Grey cells are treated as non-units; white cells are the actual units.
- Planner now has View Zone + View Block and renders each Zone separately, with Team 1 / Team 2 kept inside that Zone section.
- Planner Quick Entry, Appointment Details and Complaint entry use Zone → Block → Unit.
- Appointment Register / History, Unit Register and Complaint Register have Zone + Block filters. All-Zones results are physically split into Zone sections.
- Weekly Report also supports Zone + Block filtering.
- Imported Excel Remarks are cleared. Remarks start blank and only user-entered working remarks can populate the master.
- Unit Register layout is rebalanced and Remarks remains the final column.
- Existing V7.13 Owner Name, Contact, appointment/reschedule logic, Block Board status mapping and V7.11 visual design are retained.


## V7.15 selected clean-light electrical theme + consolidated corrections
- Applied the selected bright Theme 1 direction: clean water/reflection feel, transparent electrical sparks and subtle transformer artwork.
- Manoharan Varatharajan remains the only profile text; the name has a restrained electrical-flash treatment.
- Added project wording: “Powering Safer Homes · Brighter Tomorrows”, “People · Projects · Progress”, and “Reliable upgrades. Brighter living.”
- Dashboard Today Team Schedule is Zone-first. Each Zone contains its own Team 1 and Team 2 schedule; zones are no longer mixed under one team column.
- Appointment Planner keeps every standard and custom time inside the same Zone/Team daily sheet. The old separate Special Time section is hidden.
- Planner dynamically includes any custom Excel time (8am–10am, 10am–12pm, 1pm–3pm, 3pm–5pm, etc.) in chronological order alongside the four standard slots.
- Block Board summary is redesigned with Total Units plus A/C/D/NR counts and percentages.
- Current appointment lookup ignores stale Rescheduled history where a live appointment exists.
- Dashboard upcoming list ignores inactive history and sorts custom time slots by actual time.
- V7.14 Zone/Block filters, Block 537 corrected layout, blank imported Remarks, Owner/Contact data, reschedule history and locked status colours are retained.


## V7.16 Theme 1 visual trial
- Kept all V7.15 data, Planner, Zone/Block, reschedule, Block 537 and register logic unchanged.
- Reworked only the visual layer toward the selected Clean Light / water-glass reference.
- Removed transformer artwork and the oversized background effect.
- Tightened the top spacing and hero height.
- Added eight glass quick-launch dashboard icon tiles linked to the existing modules.
- Kept Manoharan Varatharajan as the only profile name and gave it a restrained electric highlight.
