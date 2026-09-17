# ELU Upgrading — Premium V5

## Status logic
Only four resident/unit statuses are used:
- A = Opt-In
- C = Confirmation (appointment confirmed) — shown in pink
- D = Opt-Out
- NR = No Response

When an appointment is confirmed, the matching Unit Register status becomes C.
After the appointment time slot ends, the app automatically changes C to A and counts that unit as work completed.
If the app was closed, this check runs immediately the next time the app opens.
While the app is open, it checks every minute.

## Data architecture
- Survey / Follow-up Register: editable + deletable operational records
- Appointment Register: editable + deletable operational records
- Complaint Register: editable + deletable operational records
- Unit Register: READ ONLY master register; calculated automatically from Survey + Appointment
- Block Board: read-only visual status board; use the shortcuts to enter Survey or Appointment data
- Daily Team Board: operational work control
- Weekly Meeting Report: calculated directly from Unit Register

## Weekly Progress logic
Per block:
- Total Units
- Opt-In Agree = A + C
- Work Completed = completed appointment/work records
- Opt-Out = D
- No Response = NR
- Percentage for each metric
- TOTAL DU summary row

## Fixed appointment slots
- 9am–11am
- 11am–1pm
- 2pm–4pm
- 4pm–6pm

## GitHub update
Replace/upload:
- index.html
- styles.css
- data.js
- app.js
- README.md
