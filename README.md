# ELU Upgrading — Premium V7.52 Secure · Compact Zone Daily Photo Workflow

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


## V7.29 chart + PPT fix
- Fixed the **PPT engine not loaded** error by switching Manager PPT to the built-in native PPTX generator.
- Removed the missing external `pptxgen.min.js` dependency.
- Removed the long Overall Work Completion rail and old horizontal Completion-by-Block bars.
- Added a grouped vertical **Block Status % Comparison** chart.
- Per block, four side-by-side percentage columns are shown: Opt-In A+C (green), Completed (blue), Opt-Out D (yellow), and NR (red).
- Percentage values appear above each column.
- The same chart style is used in the Reports screen, Manager PDF, Block Chart PDF, and Manager PPT.
- Unit Summary privacy is unchanged: Owner Name, Contact and free-text Remarks are excluded.
- Login, encryption, secure local storage and project data are unchanged from V7.28.


## V7.30 — colourful Block Board download / print
- Added a dedicated **Download / Print Block Board** button inside the Block Board screen.
- This exports only the colourful Block Board view (not the summary report).
- The print view keeps the same status colours:
  - A / Opt-In = green
  - C / Confirmation = pink
  - D / Opt-Out = yellow
  - NR / No Response = red
- The exported view includes:
  - current Zone / Block / Floor scope
  - Block Board headline
  - colour legend
  - floor-wise unit cards
- Clicking the button opens a print window where you can:
  - print directly, or
  - choose **Save as PDF** to download it.
- V7.29 report charts, PPT fix, privacy rules, login and secure local data remain unchanged.


## V7.31 field corrections
- Appointment Register now shows **C · Confirmation** for every active user-created / Planner appointment, so confirmed appointments do not appear blank.
- Imported Excel schedule protection remains unchanged; an imported row does not automatically overwrite D / NR / blank master status.
- Block Board print was changed to **A4 Landscape · One Page**.
- The print view focuses on the actual colour board (not the large summary tiles) and keeps:
  - A green
  - C pink
  - D yellow
  - NR red
  - colour legend
  - floor labels
  - unit cards
  - appointment / done date line
- The board auto-scales to fit the selected Block / Floor on one A4 landscape sheet.
- Login, encryption, secure local storage and project data are unchanged from V7.30.


## V7.32 correction
- Appointment Register: every **Active** appointment row now displays **C · Confirmation** in Unit Status, including active imported schedule rows. Completed rows display **A · Opt-In**.
- This is a register display correction only; the protected master-data import rules remain unchanged.
- A4 Block Board print now loads the same `#blockboard` colour theme used on screen.
- Added explicit print-safe fills so A/C/D/NR cards and legend retain green / pink / yellow / red on the A4 one-page print.
- A4 Landscape one-page fit is retained.
- Login, encryption, secure local storage and encrypted project seed data are unchanged.


## V7.33 — appointment status logic
The working appointment rule is now simplified:
- **No active appointment date** → **NR · No Response** for a cancelled booking or an otherwise blank unit.
- **Active appointment date exists and has not ended** → **C · Confirmation**.
- **Appointment date / slot has passed** (or work is marked completed) → **A · Opt-In** automatically.
- **Cancel appointment** → active date/slot is cleared, history is retained, and the unit becomes **NR**.
- If a new appointment is later created for that unit, it automatically becomes **C**, then changes to **A** after the appointment ends.
- Existing explicit legacy D / A / NR seed data is preserved unless an active appointment or cancelled booking changes the appointment-driven status.
- Login, encryption, secure local storage and encrypted project data remain unchanged.


## V7.34 — simple full-unit Appointment Register
- Appointment Register now lists **every project unit** under its Zone / Block, even when no appointment exists.
- Register logic is intentionally simple:
  - **No appointment date** → **NR · No Response**
  - **Active appointment date** → **C · Confirmation**
  - **Appointment finished / completed** → **A · Opt-In**
- NR rows have an **Appointment** button that opens the existing appointment form with Zone / Block / Unit preselected.
- Active C rows keep the existing **Edit / Reschedule / Cancel / Delete** controls.
- Cancel returns the unit's appointment-register status to **NR**.
- Reschedule continues to reuse the same workflow and automatically updates the new date / slot.
- Old View / Date filters were removed from Appointment Register to keep the workflow simple; Zone and Block filters remain.
- Appointment history is still retained in the underlying records.
- Login, encryption, secure local storage, Block Board A4 print and encrypted project data are unchanged.


## V7.35 — Appointment Register unit search
- Added a dedicated **Unit Search** field to Appointment Register.
- Type only the unit number, for example **01-302**, **#01-302**, or even **302**.
- The full Appointment Register filters instantly so you do not need to scroll through all units.
- Zone and Block filters can still be used together with the search.
- Existing Appointment / Edit / Reschedule / Cancel / Delete workflow is unchanged.
- Current NR / C / A status logic is unchanged.
- Login, encryption, secure local storage, reports and Block Board print are unchanged.


## V7.36 — one-source live sync
- Fixed the mismatch where Appointment Schedule could change but Block Board still showed an older status/date.
- Appointment status now has **one central source of truth** used by Appointment Register, Block Board, Unit Register, Dashboard and Reports:
  - no active appointment date → **NR**
  - active appointment date → **C**
  - appointment ended / completed → **A**
- Appointment changes from either Appointment Register or Planner are normalized, then all master units and all screens are rebuilt immediately.
- Reschedule updates the new date/slot everywhere.
- Cancel clears the active appointment and returns the unit to NR everywhere.
- Existing search, Reschedule, Cancel and A4 Block Board print remain unchanged.
- Login, encryption, encrypted seed data and secure local-storage key are unchanged.


## V7.37 — Block Board hard-sync correction
- Block Board now calculates each unit's status and appointment date **directly from the live Appointment records** every time it renders.
- It no longer relies on an older cached unit status/date.
- Opening any screen now refreshes that screen from the current master state.
- Block Board rules remain:
  - no active appointment → NR
  - active appointment → C
  - ended/completed appointment → A
- Reschedule / Cancel changes therefore appear on Block Board as soon as the screen is opened, and the A4 print uses the same refreshed status.
- Appointment Register, Unit Search, Planner controls, login, encryption and secure storage are otherwise unchanged.


## V7.38 — P · Pending Confirmation
Automatic single-source status logic:
- NR = no active date and no resident response identity
- P = resident name/contact exists in Appointment Register, but no confirmed active date
- C = active confirmed appointment date
- A = appointment ended / completed
- D = explicit historical opt-out

Cancelled / reschedule-waiting residents keep their name/contact and therefore show as P until a new date is confirmed.

P is blue with a waiting symbol and is kept separate from both NR and Opt-In A+C.

This status is synced across Dashboard, Block Board, A4 print, Appointment Register, Unit Register, Reports, Manager PDF, Manager PPT, Block Chart PDF and CSV exports.

Login, encryption, encrypted project data, secure storage key, search, Reschedule and Cancel controls are unchanged.


## V7.39 — simple Opt-Out from Appointment Schedule
- Added one **Opt-Out · D** button inside the Appointment entry form.
- Resident can be marked Opt-Out at any time: before the appointment, after booking, during reschedule waiting, or when work is about to start.
- Opt-Out does **not** require an appointment date.
- Owner Name, Contact and Appointment Note entered in the form are retained.
- An Opt-Out decision closes older appointment schedules logically while keeping their history.
- Status becomes **D · Opt-Out** and syncs immediately to Appointment Register, Block Board, Unit Register, Dashboard and Reports.
- If a genuinely newer appointment is created later, the newer appointment becomes the current status again.
- Cancel remains separate: Cancel does not mean Opt-Out; with resident details retained it returns to **P · Pending Confirmation**.
- Existing security, encryption, unit search, Reschedule, Block Board print and report exports are unchanged.


## V7.40 — Appointment date correction + top-floor ordering
- Manual Appointment and Planner dates are constrained to the current operating year shown by the app (currently 2026).
- A manual save with an accidental different year such as 2025 is blocked with a clear correction message.
- Existing wrong-year records are not erased automatically; completed rows now expose **Edit** and **Delete** so a mistaken date can be corrected safely.
- When a completed record is edited from a wrong old date to a valid future/current appointment date, the existing status engine recalculates it automatically (for example A → C when the corrected appointment is still upcoming).
- Appointment Register is now ordered top floor to lower floor within each block (13 → 12 → ...).
- Unit Register uses the same top-floor-to-lower-floor ordering.
- Block Board ordering is unchanged because it was already top-down.
- Existing Cancel / Reschedule / Opt-Out / P Pending logic, security and encrypted storage are unchanged.


## V7.41 — login/startup correction
- Fixed a V7.40 startup crash in Appointment Register.
- Cause: some completed A units do not have an appointment object; V7.40 tried to build Edit/Delete buttons from a missing appointment ID during initial render.
- Completed manual appointments that actually have an appointment record still show Edit/Delete for correction.
- Completed seed/master units without an appointment record simply show Completed.
- Login error handling now distinguishes an actual credential failure from an app startup or saved-state issue, so a runtime problem is no longer mislabeled as “Wrong username or password”.
- V7.40 date-year protection and 13th-floor-to-lower-floor sorting are retained.
- Encryption seed, secure storage key and project data are unchanged.


## V7.42 — Separate live response summary
- Added a separate report below the Meeting / Weekly Progress report.
- Headline follows the supplied sample: **(Summary of Opt In, Opt Out & NR Unit Details)**.
- Uses live Unit Register data for every block across all 6 zones; sample image data is not copied.
- The block column is shown as **BLOCK (ZONE)**, for example `537 (Zone 5)`, so there is no unused / blank location column.
- Columns: S/N, Block (Zone), Total Unit, Respond Unit, Opt-In, Opt-Out, Opt-Out Unit Details, Non-Respond Unit, NR Unit Details, Remarks.
- Opt-Out and NR unit numbers are listed directly per block.
- Pending Confirmation (P) remains separate from Opt-In and is shown in Remarks with its unit numbers, so Respond Unit reconciles correctly.
- Opt-In is A + C. Respond Unit is Total Unit minus NR.
- Added a Zone filter, **Print / PDF** output in A4 landscape, and **Summary CSV** export.
- Existing Weekly Meeting Report, Manager PDF/PPT, Block Board, appointment logic, security and encrypted storage are unchanged.


## V7.43 — Pending accountability in Response Summary
- Pending Confirmation (P) remains a responded unit and is included inside **Respond Unit**.
- Response accountability is therefore: **Respond = Opt-In (A+C) + Opt-Out (D) + Pending (P)**, equivalently **Total − NR**.
- Added a dedicated **Pending Confirmation** column in the separate Response Summary.
- The Pending column shows both the pending count and the pending unit numbers for each block.
- **Remarks** now shows the latest Appointment Note for each pending unit. If no note exists, it automatically shows **Awaiting confirmation**.
- This keeps status/count in the Pending column and the reason/follow-up text in Remarks.
- CSV and Print/PDF outputs use the same logic.
- Existing Meeting Report, appointment workflow, Block Board, security and encrypted storage are unchanged.


## V7.44 — Daily 3-photo Word report workflow
- Added **Photo Schedule CSV** to the Daily Appointment Planner.
- Added **Photo Report Generator** button that opens the bundled browser generator.
- The generator takes the schedule CSV plus a ZIP of downloaded WhatsApp photos.
- It auto-assigns **3 photos per scheduled unit** in filename order and shows a visual preview.
- Photos can be dragged between unit slots; unit rows can be moved up/down when WhatsApp arrival order differs from schedule order.
- Extra photos are never silently discarded; they remain visible in an Unassigned pool.
- Word output follows the supplied ELU sample structure: A4 portrait, project heading, 6 units per page, DATE + Block/Unit + 3 photo cells.
- Photos are compressed before Word generation to keep the report manageable.
- Generator runs locally in the browser; selected photos are processed on-device by the page.
- Existing ELU statuses, reports, security and encrypted storage are unchanged.


## V7.45 — one-source schedule + photo inbox
- Added **Master Schedule**: a fast 22nd → next 21st appointment entry page using the same live appointment records as Daily Planner.
- Added **Photo Report** directly inside the ELU app; schedule CSV upload is no longer required.
- Photo workflow: select Zone + Date → choose/auto-detect scheduled unit → upload WhatsApp ZIP → photos are stored in IndexedDB.
- Recommended ZIP name: `2026-09-23_Blk537_13-302.zip`. Date + Block + Unit gives full auto matching. Date + Block alone auto-matches when only one scheduled unit exists for that block/date; otherwise choose Target Unit.
- All photos are retained until report cleanup. The first 3 remaining photos are used in the report; extras remain visible and can be deleted individually.
- Monthly output is Zone-wise for the 22 → 21 cycle as Word or Print/PDF, using the supplied ELU 3-photo sheet layout.
- Photo storage is separate from encrypted localStorage to avoid bloating the ELU data store.
- Auto-cleanup runs on/after the **25th** for an ended cycle, but **only after a Word/PDF report for that Zone/cycle has been generated**.
- Existing ELU status logic, reports, security key and encrypted project data are unchanged.


## V7.46 — cancelled appointment synchronization
- Fixed cancelled units still appearing in Photo Report / Master Schedule because an older duplicate appointment record could remain active.
- **Cancel** now applies to the full booking for the same Unit + Date, including stale duplicate records.
- Photo Report suppresses appointment records that are older than a later cancellation and keeps only one live schedule record per unit/date.
- A genuinely new appointment created after the cancellation can appear again normally.
- Cancel still means reschedule waiting / Pending Confirmation where resident identity is retained; it does not become Opt-Out.
- Existing photo storage, 22→21 cycle, Word/PDF output, security key and project data are unchanged.


## V7.47 — deleted/cancelled appointments no longer come back
- Fixed the root cause of imported/seed appointments reappearing after Delete or Cancel.
- The app always rebuilds from encrypted seed data at login; older versions could therefore re-create a deleted imported appointment, and could lose a Cancel flag on a seed appointment.
- Added **appointment tombstones**: a permanent Delete records the appointment ID so the seed copy is suppressed on every future login/reload.
- V7.47 automatically migrates older saved data: if a seeded appointment is already missing because you deleted it in V7.46 or earlier, V7.47 records that as a tombstone on first login.
- Cancel now carries an explicit user schedule override, so a cancelled imported/seed booking remains Cancelled after reload.
- Unit Register, Appointment Register, Planner, Master Schedule and Photo Report all read the same corrected appointment state.
- A new appointment created later is still allowed and will appear normally.
- Existing encrypted project data, security key, photo storage and reports are unchanged.


## V7.48 — Closed DB photo first in each unit report row
- Monthly Word and Print/PDF photo reports now place the **last photo first** by default for each unit/day.
- Default report order is: **Closed DB / final photo → BEFORE → AFTER**.
- With 3 photos, output order becomes 3 → 1 → 2.
- With 4 or more photos, the last photo is used first, followed by the earliest two; remaining photos stay as Extras.
- The Photo Report daily preview now labels the actual report roles: `First · Closed DB`, `BEFORE`, `AFTER`, and `Extra`.
- Added a small **Set First** button so the first/closed-DB photo can be manually corrected when a ZIP arrives in a different order.
- Existing schedule, security, project data, photo cleanup and storage behavior are unchanged.


## V7.49 — Zone 6 Unit Survey Excel merge
Source workbook: `PR3 551-556 Unit Survey Report.xlsx`

- Imported detailed unit-level data from block sheets **551, 552, 553, 554, 555 and 556**.
- Updated Zone 6 baseline owner names, contact numbers, Opt-In / Opt-Out / No Response state, imported schedule text, Excel remarks and explicit completed-work flags.
- Rebuilt Zone 6 imported appointment records from the detailed unit sheets.
- Existing exact imported appointments keep their original IDs and team assignments so browser-side Cancel/Delete/manual overrides can continue to match them.
- Existing manual Planner / Appointment changes remain higher priority than the refreshed Excel baseline.
- Added an upgrade guard so genuinely new Excel appointments are not mistaken for previously deleted seed records when upgrading directly from older builds.
- Includes the V7.48 Closed-DB-first photo report ordering.
- Security username/password derivation, PBKDF2 salt/iterations and encrypted browser state key compatibility are unchanged.

### Source-data note
The workbook's `Progress Summary` does not fully agree with some detailed unit rows (for example, Block 552 has two unit rows marked Opt-Out while the summary shows zero). V7.49 intentionally uses the **detailed block/unit rows** as the import source and does not silently replace them with summary totals.


## V7.50 — manual drag photo order
- Removed the automatic “last photo becomes first” rule.
- In Photo Report, each unit’s uploaded thumbnails can now be dragged left/right into the exact print order wanted.
- Print roles are always based on the saved order: **1 Closed DB → 2 BEFORE → 3 AFTER**.
- Photos after position 3 remain **Extra** and are not printed unless dragged into the first three positions.
- The chosen order is saved in IndexedDB and is used by both Monthly Word and Print/PDF outputs.
- Existing photo files, schedule, cleanup logic, security key, Zone 6 merge and project data are unchanged.


## V7.51 — Photo section separated from project records
- Added a separate **Photo Daily Register** with Date, Zone, Block, Unit, Team and Time.
- It is stored in its own IndexedDB `schedule` store and does not update Master Schedule, Appointment Planner, Unit Register, Block Board, Dashboard or resident status.
- You can prepare tomorrow / next week units in advance, like a simple Excel daily schedule.
- Photo Report Zone + Date shows only that Photo Daily Register day plus any already-stored photos for correction.
- Target Unit dropdown uses the Photo Daily Register, not the project appointment schedule.
- Add / Update and Remove are available. Remove never deletes stored photos.
- Existing stored-photo units with no daily row stay visible as `Stored photos · Daily Register row missing`.
- Monthly Word / Print-PDF reports continue to use stored photos; Photo Daily Register Team/Time is used only for report ordering when available.
- Existing V7.50 manual drag order remains: 1 Closed DB, 2 BEFORE, 3 AFTER.
- Existing photo IndexedDB data is preserved; database version is upgraded in-place and only the new schedule store is added.
- Project encrypted data, security key, Zone 6 data and all non-photo modules are unchanged.


## V7.52 — compact Zone + Date photo workflow
- Photo Daily Register now shows **only one selected Zone + one selected Date** at a time.
- Added Zone 1–6 tabs for fast switching. The top Zone dropdown and tabs stay synchronized.
- Removed the duplicate Date and Zone inputs from the entry form. The selected Zone + Date at the top are the single source for the daily photo register.
- Entry form is now compact: Block, Unit, Team, Time, Add Unit.
- The schedule table is compact and shows only that day's units; it no longer grows into a full 22→21 all-zone list.
- Daily Photo Schedule and WhatsApp ZIP upload are side-by-side on desktop, so photo work is not pushed far down the page.
- Target Unit updates immediately from the selected Zone + Date daily register.
- Remove deletes only the selected day's photo schedule line; stored photos remain untouched.
- Existing stored-photo-only units remain available for correction in Daily Check / Target Unit.
- Existing V7.51 IndexedDB schedule/photos/meta data is preserved.
- Photo section remains independent from Master Schedule, Appointment Planner, Unit Register, Block Board, Dashboard and resident status.
- Existing manual photo order remains: 1 Closed DB, 2 BEFORE, 3 AFTER.
- Security key and encrypted project state are unchanged.


## V7.53 — Master Schedule hidden; Appointment Planner simplified
- Master Schedule is removed from the visible sidebar/UI, but its underlying code/data is intentionally retained so no appointment/history/status data is deleted.
- Appointment Schedule remains the only visible place to add, edit, reschedule or cancel appointments.
- Appointment Planner is now display-only and reads the same live appointment records.
- Planner shows Date, Zone, Team, Time, Block, Unit, Owner/Contact, Remarks and one Open Appointment action.
- Quick views: Today, Tomorrow, Next 7 Days, plus Date and Zone filters.
- Open Appointment jumps to the matching Appointment Schedule record for correction.
- Photo workflow from V7.52 is unchanged.
- Unit Register, Block Board, Dashboard, Survey, Complaints, Meeting Report, photo IndexedDB, encryption key and saved project data are unchanged.

## V7.54 — Block-wise Photo Report
- Added **Block-wise Photo Report** under Photo Report.
- Daily photo upload workflow is unchanged.
- Select Block + From date + To date.
- The report automatically collects all stored photos for that block across the chosen date range, even when uploaded on different days.
- Output order: Date → Unit.
- Added **Block Word** and **Block Print / PDF**.
- Existing manual photo order is reused; the first three ordered photos are printed.
- Existing Zone-wise 22→21 Word / PDF remains unchanged.
- Block-wise report does not copy, move, delete or modify photos and does not trigger auto-cleanup.
- Project data, security key, appointment data, Unit Register and Block Board are unchanged.


## V7.55 — Permanent Manual Status Lock / Source of Truth
- Fixed the recurring-status problem system-wide, not only for one unit.
- **Manual confirmed Opt-Out is now a persistent locked status decision** stored separately from appointment history.
- A locked manual status has higher priority than imported seed data, old appointments, reload, auto-completion and master rebuild logic.
- V7.54 and older confirmed Opt-Out records are migrated automatically on first V7.55 login when they are still the latest decision.
- A newer legitimate appointment is respected during migration and is not incorrectly changed back to Opt-Out.
- Appointment Schedule, Planner and hidden Master Schedule cannot silently bypass a locked status. They require explicit user confirmation to re-open/change it.
- Appointment Schedule shows **Opt-Out · Locked** with a **Re-open** action for an intentional status change.
- Re-confirming the same Opt-Out is idempotent and keeps the lock instead of creating uncontrolled duplicate status behavior.
- Auto-completion and appointment normalization skip locked units.
- Added encrypted `statusOverrides`, `statusAudit`, and `statusDecisionSchema` to the saved state and backup JSON.
- Audit entries record lock, re-confirm, migration and explicit unlock actions.
- Existing status colours remain unchanged: A green, C pink/magenta, P blue, D yellow, NR red.
- Existing appointments, Unit Register, Block Board, reports, photo database, security key and production seed data are preserved.


## V7.56 — Latest User Edit Wins
- Removed the V7.55 Opt-Out **lock / re-open** workflow.
- No status is permanently locked.
- The latest explicit user action is the operational source of truth.
- If a user saves **D · Opt-Out**, old appointments, imported seed data and reload/rebuild logic cannot bring an older A/C status back.
- If the user later explicitly creates or updates an appointment, that newer edit replaces the earlier Opt-Out automatically; no separate unlock step is needed.
- Existing V7.55 Opt-Out decisions are preserved during upgrade, but their `locked` flag is discarded.
- Appointment Schedule, Planner and Master Schedule all follow the same last-edit precedence.
- Status audit history is retained so later changes can be traced.
- Existing encrypted state key, project seed data, photos, reports, complaints and unit records are unchanged.

### Example
`Blk 537 #08-54`: if the last user action is **Opt-Out**, it stays D after reload. If the user later creates a new appointment, the newer appointment becomes the current status. If Opt-Out is selected again after that, D becomes current again.
