ELU V205 - Survey / Block Chart status fix

Reported case: Blk 561 #02-277 has a Survey Register entry but remains red NR.

Rule:
- A survey recorded or updated AFTER an older NR decision is Pending Confirmation (P), not completed.
- A later explicit NR decision is kept. Existing A (completed), C (confirmed), D (opt-out) and P decisions are kept.
- New valid Survey Register saves replace an earlier NR decision with P and record the change in status history.
- Existing survey records with timestamps update the chart after reload. If an old record has no reliable timestamp, open that record in Survey Register, click Edit, then Update Survey Visit. Do not add a duplicate visit.
- No resident record or appointment is added by this code update. Project totals use the existing rebuilt unit status.

UPLOAD:
1. Extract the ZIP.
2. Upload app.js, index.html and sw.js to the ROOT of your existing elu-upgrading-app repository and Commit changes.
3. After GitHub Pages deployment finishes, reopen the ELU app and press Ctrl+F5 once. The page title should show V205.
4. Check Blk 561 #02-277. Where needed, edit and update the existing survey entry as described above.

Do not clear browser data. App data stays in the same browser storage. This ZIP changes application code only.

Validation: The stale-NR case was reproduced from the current public app source. Regression checks passed for newer surveys, survey edits, missing contacts, master rebuilds, NR-to-P audit, later NR decisions, unknown timestamps, preserved A/C/D/P, confirmed/completed appointments, other units and updated asset/cache versions. User-specific browser data was not accessed; deployment and the actual unit state must be verified in the user's app.
