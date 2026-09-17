# ELU Upgrading — Premium V6

This version keeps the V5 workflow and upgrades two areas requested after live testing: visual impact and existing-data import.

## Imported source data
- 6 uploaded PR3 workbooks
- 38 blocks
- 2,341 exact units
- A / C / D / NR status is read from the block charts (C is preserved as Confirmation)
- Existing dated appointment schedules are preloaded into Appointment Register
- Existing completed work is retained
- Existing Excel remarks and the available contact numbers are retained

## Status rules
- A = Opt-In
- C = Confirmation (pink)
- D = Opt-Out
- NR = No Response
- Appointment confirmation sets C
- When the appointment slot ends, C automatically returns to A and the work is counted as completed

## Unit Register
Read-only master register. Operational edits happen in Survey / Appointment / Complaint registers.

## Weekly Progress
Aligned report columns:
- Total Units
- Opt-In Agree = A + C
- Work Completed
- Opt-Out = D
- No Response = NR
- percentage columns and TOTAL DU

## Design upgrade
The dashboard now has stronger presentation contrast while staying in the requested light-blue family: command-centre hero, completion ring, richer KPI cards, pink C status, improved zone cards, and presentation-aligned weekly report tables.
