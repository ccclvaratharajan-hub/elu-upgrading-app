ELU V208 - Riser Progress photo fit

Upload these FOUR files to the GitHub repository root, replacing the files with the same names:
  riser-progress.js
  styles.css
  index.html
  sw.js
Commit changes. After Pages deployment finishes, press Ctrl+F5 in the ELU app.
Do not clear browsing/site data.

Riser Progress:
- Existing and new photos use Fill box by default. Photos retain their proportions and are enlarged to fill their box; edges can be cropped.
- Each placed photo has a Photo fit selector. Choose Full photo if a unit label, meter or other important edge must remain visible.
- The saved selection is used in the app and in newly downloaded Riser Progress PDFs.
- JPEG camera orientation is respected when generating the PDF.
- Original photo bytes, unit assignments, ZIP recognition and all appointment/status rules are unchanged.
- A downloaded older PDF does not change automatically: download the Riser Progress PDF again after updating.

Validation:
92 actual photos from the supplied Blk 533 PDF regenerated across the same 24 groups and 4 A4 pages. All labels, photos and missing-photo placeholders retained. First and last page visually reviewed. Portrait, landscape and square cover/contain geometry checked; per-photo preference persistence and corrupt-image failure checked. JavaScript syntax checks passed. Browser UI was not directly tested in this run.

This package contains software files only. Do not upload any Full Backup or resident/photo data to the public repository.
