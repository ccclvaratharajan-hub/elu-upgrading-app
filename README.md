# ELU Upgrading — Premium V7.28 Secure

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


## V7.18 Classic style restored
- Restored the original clean ELU dashboard visual style from before the theme experiments.
- Removed lightning, flash effects, transformer artwork, water-photo theme and animated name treatment.
- Restored the classic blue command hero, white sidebar, clean KPI cards and original profile-name chip.
- Kept all later working corrections: Zone/Block separation, Zone-wise Team dashboard, Planner custom times in the same sheet, reschedule/history logic, Block 537 correction, Unit Register updates, blank imported Remarks and Block Board percentages.


## V7.19 source-data audit correction
- Classic V7.18 visual style retained unchanged.
- Rebuilt the PR3 Appointment source with day/month-safe date handling. Blk 564 #08-132 is correctly 12 Mar 2026, not 03 Dec 2026.
- Blocks 564–569 now have no future imported appointment; the stray Blk 566 #04-114 future row is excluded because the latest survey source records it as No Response.
- Added valid custom-time schedule rows that were previously skipped.
- Corrected imported survey response seeds so dashboard source totals align with the uploaded Progress Summary sheets.
- Schedule Excel records no longer overwrite NR / D / blank survey responses or inflate Opt-In / Completed totals.
- Imported Excel schedules remain visible in Planner/Register; future appointments entered by the user in Planner still drive C and auto C → A / Completed.
- Browser storage key moved to v11 so stale imported source rows are dropped while manual Survey / Planner / Complaint records are retained.


## V7.21 manual appointment workflow
- Direct visit appointments can be entered completely in Appointment Register: Zone → Block → Unit → Date → Slot / Custom Time → Team → Owner / Contact → Note.
- Direct Appointment automatically appears in Planner and Unit Register. No Survey entry is required.
- Survey Register has an **Appointment** button that opens the same Appointment form with Unit / Owner / Contact prefilled.
- One unit keeps one active pending appointment. A changed date / slot becomes a Reschedule; the old booking remains in history.
- Active Appointment Register rows have **Edit · Reschedule · Cancel · Delete**.
- Planner uses **Cancel** instead of destructive Remove.
- Cancelled appointments remain in History, disappear from the active Planner slot, and no longer keep the unit at C.
- Owner Name / Contact remain available after cancellation.
- V7.20 status colours and project data are preserved.


## V7.22 Survey Visit workflow
- Survey Register is now a **visit diary / reference only**.
- Survey fields: Zone → Block → Unit → optional Owner Name → Contact → Survey Visit Date → exact Visit Time → Visit Note.
- A / C / D / NR status has been removed from Survey Register.
- Survey Visit Date, Time and Note do **not** flow into the Unit Register.
- Survey Contact is used only as a fallback when the Unit Register has no contact.
- Appointment Register remains the primary operational source for Owner, Contact, Appointment Date, Slot, Team and appointment status.
- The Survey **Appointment** button still opens the same Appointment form and carries Unit / Owner / Contact only; Survey notes are not copied into Appointment remarks.
- Existing older Survey Follow-up Dates are migrated to Survey Visit Dates. Existing exact times remain blank until entered.
- Dashboard Follow-ups card is now Upcoming Survey Visits and shows exact visit time.
- V7.21 appointment / reschedule / cancel logic and V7.20 status colours are retained.


## V7.23 Secure Access
- Password login is required before the ELU workspace opens.
- Resident names, contact numbers, appointment data and the imported project dataset are encrypted with AES-256-GCM.
- The password is processed with PBKDF2-SHA256 and is **not stored** in the app.
- Existing V7.22 local data is migrated into encrypted local storage after the first successful unlock.
- Old plain ELU localStorage keys are removed after secure migration.
- Manual **Lock** button added to the top bar.
- Automatic lock after 15 minutes of inactivity; reload also requires the password again.
- Unit Register / Backup exports warn before creating a plaintext file containing resident data.
- Classic V7.22 design and working workflow are retained.

### Important
The security password is intentionally NOT written into this ZIP or README. Keep the password supplied separately in the ChatGPT conversation in a safe place.


## V7.24 Login simplification
- Username field added.
- Login is now short and clear:
  - Username: Manoharan
  - Password: supplied separately in this ChatGPT conversation.
- Encryption remains AES-256-GCM.
- PBKDF2-SHA256 iterations increased to 600,000 to strengthen the shorter password.
- V7.23 encrypted seed was re-encrypted for the new password.


## V7.25 Final secure login
- Username: Manoharan
- Permanent password is supplied separately in the ChatGPT conversation and is not stored in this package.
- Dataset remains encrypted with AES-256-GCM.
- PBKDF2-SHA256 iterations: 600,000.
- This is the recommended deployment build instead of V7.23 / V7.24.


## V7.26 Manager Report Downloads
- Reports page now has **Download PDF**, **Download PPT**, **Progress CSV** and **Unit Register CSV** in one place.
- Manager PDF / PPT are generated fully inside the browser; no report data is sent to an external service.
- Manager exports include: executive summary, zone progress, block completion chart and weekly meeting progress table.
- Manager PDF / PPT deliberately exclude resident names, contact numbers and remarks.
- Full Unit Register remains a separate CSV export with the existing privacy warning.
- Report Zone / Block filters are respected by PDF / PPT / CSV.
- Secure login, AES encrypted data, V7.25 password and secure local-storage key are unchanged, so existing encrypted browser data remains compatible.


## V7.27 Report export improvements
- Manager PPT export now uses a bundled local PptxGenJS engine instead of the previous hand-built PPTX package.
- Manager PDF now shows a large score-style horizontal completion bar with 0 / 25 / 50 / 75 / 100 milestones.
- Added separate Block Chart PDF download.
- Added Unit Summary PDF and Unit Summary CSV downloads.
- Unit Summary excludes Owner Name, Contact and free-text Remarks.
- Unit Summary includes Zone, Block, Unit, Status, Work Status, Appointment Date, Slot and Team.
- Existing secure login/encryption data and storage key are unchanged.


## V7.28 Reports layout
- Main report buttons remain together: Manager PDF, Manager PPT, Unit Summary PDF and Block Chart PDF.
- Progress CSV and Unit Summary CSV remain available in a separate **Data Export** group on the side.
- No report generation logic, login, encryption, resident data, or storage behavior changed from V7.27.
