# V8.44.152 - 3D finish on the latest pearl-white Daily Planner

Preserves the intervening V151 pearl-white planner update, including its current scenery, electrical watermarks, font sizes, table widths and team-button alignment. Adds only a scoped screen stylesheet for shallow raised-panel shadows, luminous white bevel edges, satin navy headings, raised date plaques and buttons. Text remains flat and readable. Live appointment data and all existing scripts, backgrounds, storage, forms and print/export behavior are unchanged.

Validation: scoped CSS syntax and computed planner-shadow checks passed. Every pre-existing file outside index.html, sw.js and README.md is byte-identical to the latest V151 source; planner-3d.css is the only added file. Cached assets exist and ZIP integrity passed. A full browser screenshot comparison and encrypted live-record test have not been performed.

Upload the complete extracted folder at the existing app address.

# V8.44.151 - Pearl-white Daily Planner with electrical background

Retains the approved two-table layout, large calendar tiles, navy headings and live appointment data. The background is a clean, text-free electrical scene with fresh greenery. DB and meter watermarks attach to each table so they stay in place when the number of appointments changes. All dates, units and remarks remain live HTML. Print/PDF uses the same imagery and waits for images before printing. Assets are cached for offline use.

Only planner presentation and shell cache versions are updated. Booking storage, team movement, registers, forms, and other app views retain their previous behavior.

Validation: actual daily-sheet module DOM checks passed for the 12-appointment reference and 52 appointments across all six zones, selected-only team movement, date and zone filters, and seven print selections. Generated screen and print HTML/CSS were rendered and visually inspected. A full Chromium session with encrypted resident records was unavailable.

Upload the complete extracted folder at the existing app address.

# V8.44.150 - Approved Daily Planner model; IMS / KSK / ND Noor

Daily Planner follows the approved bright pearl-white working sheet, navy typography, large calendar date tiles, natural greenery, conduits, and faint DB / meter watermark. The ESS building is no longer used by Daily Planner or its print output. Its decorative frame is composed from text-free scenery regions of the approved reference; bookings, dates and headings remain live HTML, rather than baked reference appointments. Other app screens retain their existing backgrounds.

The two existing Zone 4 sections remain IMS (blocks 557-558) and KSK (blocks 559-562). Zone 5 is labelled ND Noor (blocks 537-543) and has its own single-provider schedule section. KSK Team 1 / Team 2 movement and original booked dates, units, slots, contacts and remarks are retained. No contractor ownership is guessed for other zones: their existing bookings remain visible, with an Other zones page when printing contractors separately.

Print / Save PDF remains A4 portrait. Choose All contractors for a combined page, Each contractor for individual IMS / KSK / ND Noor pages, or a specific provider. Existing Team 1 / Team 2 options remain available. Empty sections are omitted. Input data is unchanged by viewing or printing.

Validation: JavaScript syntax, original selected-only team movement regression, all/subteam/provider print filters, zone filtering, empty-team/IMS/unassigned cases, calendar date values and first-visible-row date handling passed. Captured actual module HTML/CSS rendered 52 synthetic appointments once on one A4 portrait page. A provider-only fixture rendered IMS 4, KSK 8 and ND Noor 8 once each across three A4 portrait pages; all pages were visually inspected. Full browser print-dialog and encrypted live-record tests have not been performed.

Upload the complete extracted folder at the app's existing hosted address.

# V8.44.149 — Existing ESS entrance background for Daily Planner and PDF

Daily Planner and Print / Save PDF now reuse the app's existing elu-ess-close-light-v84458.png entrance scene: the same illuminated ESS switch room, greenery and wet-ground image. No new generated worksite scene is used. Bright translucent white sheets, navy headings, clear bold units and calendar-date tiles follow the selected reference model. The date tiles are generated from the selected schedule date in Singapore time.

All appointments still use the existing booking selection, ordering and visible team assignments. The team-arrow movement handler is unchanged. Print options include all appointments on one A4 portrait page, Team 1, Team 2, IMS, and each team on separate pages. A team whose first booked slot is later retains its date tile in the correct first visible row. Date and zone filtering apply to the print output. The existing ESS image is included in the offline shell cache; the earlier unused generated planner-background asset is omitted from this update.

Validation: module syntax, all five print options, zone/empty-team/IMS/unassigned cases, date tile values, and date-rowspan handling passed in the actual module's DOM harness. Printing leaves all input appointment records unchanged. Team-movement regression checks passed in both directions with repeated moves and refresh persistence. Captured the actual print HTML/CSS and rendered a 52-booking synthetic example to one A4 portrait PDF and three individual team pages; all 52 units appeared exactly once. Every PDF page was visually inspected. Full browser print-dialog and encrypted live-record testing have not been performed.

Upload the complete extracted folder at the app's existing hosted address. Existing register records, forms and photo storage are unchanged.

# V8.44.148 — Daily Planner worksite photo background and team printing

Daily Planner uses the supplied worksite photos blended into a navy/gold paper background: rear-view KSK technician, drilling work, DB circuit breakers and meter riser. Existing appointment tables, team headings, booking data and team movement are retained. The image is bundled and cached for offline use. Light translucent table cells preserve readable text; night-theme cells keep their darker contrast.

Print / PDF offers all appointments on one A4 portrait page, Team 1 only, Team 2 only, IMS only, or each team on separate pages. Individual team sheets show only that team's current visible assignments. Empty team pages are omitted in the separate-pages option; unassigned appointments get their own page. The selected date and zone filter apply to every option. Choose Save as PDF in the browser print dialog to download a PDF. The background is a real image element, and printing waits for it and fonts to load. Each page fits its own content; printing does not change appointments.

Validation: executed the actual module in a DOM harness for all five print options, zone filtering, empty teams, IMS-only data, and an unassigned page. All 52 synthetic bookings appear once across the separate team pages; printing leaves the input records unchanged. The original booking rendering/movement code preceding the print handler is byte-identical to V147, and selected-only movement regression checks pass. Rendered the actual captured print HTML/CSS to one A4 portrait page and three separate team pages and visually checked every page. Full browser print-dialog and encrypted live-record tests have not been performed.

Keep the complete extracted folder, including assets/daily-planner-background.png, together. To update the hosted app, upload these files at the app's existing address.

# V8.44.147 — Daily Planner A4 portrait

Daily Planner Print Day now prints the selected date and zone filter on one A4 portrait page. The date appears once in the page heading; Team 1 and Team 2 remain side by side, with wider unit and remarks columns. Print-only move controls are removed. Base font is 10 pt, with bold unit numbers, 9.5 pt table headers and 9 pt times/remarks. Compact spacing and page fitting handle longer lists without omitting rows.

Print layout changes only: on-screen schedules, team movement behavior, unit records, certificate forms and data storage are preserved. Font loading and two animation frames complete before sizing and opening the print dialog; sizing runs again before printing.

Validation: rendered the actual Daily Planner module with 52 synthetic appointments across all six zones, including IMS and KSK. Rendered the print HTML/CSS into one A4 portrait PDF and visually checked it; all 52 units and all seven contractor/zone sections are present, at approximately 10 pt base font. Team movement regression checks passed. Full browser print-dialog testing with encrypted live records has not been performed.

# V8.44.146 — Keep existing teams when moving one appointment

Daily Planner shows Team 1 → under the Team 1 heading and ← Team 2 under the Team 2 heading. Each button displays the current column team; its tooltip describes the destination. Clicking moves the selected appointment and updates its label to match the destination heading.

Opening the planner leaves the existing schedule untouched. On an arrow move, the currently displayed KSK assignments for that date are saved as explicit team assignments before applying the selected move. This prevents legacy overlap balancing from also moving another appointment. Dates, slots, units, contacts, remarks and other days are preserved. Existing browser data is retained; there is no automatic migration on startup.

Verified with synthetic overlapping bookings: only the selected appointment changes displayed team, moves in both directions, repeated moves, saved refresh, unchanged unrelated fields and other dates. Full browser and encrypted live-record tests have not been run in this environment.

# V8.44.145 — Appointment team labels

Daily Planner appointment buttons now show the current column team: Team 1 under Team 1, Team 2 under Team 2. Clicking the button still moves the appointment to the other team; its tooltip states the destination. Existing assignments and appointment data are unchanged.

# V8.44.144 — Unit Single Line Diagram

Added a dedicated Unit Single Line Diagram sidebar item after Completion Certificate. Select zone and block to view current register lists and automatically download a PDF, with a persistent PDF preview and re-download link.

The first section uses Detail M and includes A (Opt-In). The following section uses Detail M1 and includes D (Opt-Out), NR, C (Confirmation), P (Pending Confirmation), and any unrecorded status with its label. This grouping applies only to this diagram and does not edit unit or appointment records. Unit Type is deliberately blank throughout, pending the user's verified room-type mapping. Unit lists sort by numeric floor and unit; long lists continue on additional pages.

The supplied diagrams and source seals/signatures are retained; source block 566 lists and totals are removed and replaced with selected-block live records. Existing Completion Certificate and Form E scripts and templates are unchanged. Browser data keys are unchanged. When updating an existing app, keep its existing address/location.

Validation: generated PDFs using synthetic A/D/NR/C/P records through normal asset loading, missing-asset fallback, and local-file loading paths. Checked status grouping, blank room types, ordering, totals, pagination, live status changes, and empty blocks; rendered the resulting PDF pages for visual review. Full browser interaction and the user's encrypted live records have not been tested in this environment.

# V8.44.143 — Certificate PDF download repair

The complete certificate templates are included. Select Form E or Completion Certificate, then zone and block. A PDF downloads automatically and remains visible in the page preview; Download PDF again and Open PDF remain available. Date and Application No. are optional and stored per form and block. Only current A/C Opt-In units are included, sorted by floor and unit.

An embedded copy of the templates supports opening index.html directly on Windows and handles missing/offline PDF asset requests. Keep the complete extracted folder together. When updating an existing hosted app, update the files at its existing address to retain access to its browser data; no register data or storage keys are changed by this repair.

# V8.44.138 — Riser ZIP automatic photo placement

Upload the block photo ZIP in Riser Progress Photos. Unit plaques and filenames are read automatically to place overview/link photos on the left and unit photos on the right, using the supplied Zone 3 block/floor pairing reference. No save or position selection is required for recognized photos. Unreadable photos are retained in a separate collapsed section.

Each report position has Add or Replace, and each placed photo has Delete. Missing images retain an empty position in the sample report layout. PDF download supports partially complete groups. Original register data and existing photo storage are preserved. ZIP duplicates are identified by file content. The automatic reader uses bundled local files.

V8.44.138: recognises compound filenames such as 02-326-332 and 02-330-328 as the two-meter overview; (l) as link; single-unit filenames as the individual unit photo. Both unit orders map to the supplied pairing reference. Each floor in the supplied 532 ZIP has two groups with four photos per group.

V8.44.139: Site Report Files > Inspection Certificates. Completion PDF: live Opt-In units only, ascending floor/unit, one original-template A4 page per unit. Optional inspection date fills all three date positions. Date and Application No. are stored separately for each block in the existing backed-up meta store. Original source seals/signatures and fixed content retained. Form E: source template retained; block 566 room mapping comes from supplied sample; other blocks require verified flat-type data before Form E export.

V8.44.140: Form E and Completion Certificate now have separate sidebar entries immediately after Unit Register. Each opens its own certificate view directly. Certificate scripts and original PDF templates are included in the service-worker cache. Verified visible controls, repeated navigation, and sorted Opt-In certificate PDF output.

V8.44.141: block selection starts PDF download. Explicit Download PDF button supports reprints after editing optional fields. Form E Date of Test and Application No. remain blank unless entered. Completion date remains blank in all three positions unless entered. Each form/block stores its own settings. Both use live A/C Opt-In records only, sorted numerically. Other-block Form E still requires verified flat-type data, as noted for V139.

V8.44.142: both certificate downloads operate on current block Opt-In records. Form E shows the combined Opt-In unit list and total; no room-type lookup or dependency. Optional fields remain blank when unentered; Completion date fills all three locations when entered.
