ELU V206 - Direct PDF and separate block PDF ZIP

UPLOAD TO EXISTING ELU GITHUB REPOSITORY:
1. Extract this update ZIP.
2. Upload photo-report-pdf.js, index.html and sw.js to the ROOT of elu-upgrading-app. Commit changes.
3. Wait for Pages deployment, reopen ELU and press Ctrl+F5 once. The page title shows V206.

USE:
Open Photo Report. Choose Zone, Block, From and To dates.
- Download PDF: downloads one PDF for the selected block, or a combined PDF for All blocks.
- All blocks - separate PDF ZIP: downloads a ZIP containing a separate PDF for every block with photos in the selected zone/date range. As with the Word ZIP, this button covers all blocks in the zone regardless of the individual Block dropdown.
- The top zone-report area also has Download PDF.
- Existing Word and Print / PDF buttons remain available.

WORD-STYLE ALIGNMENT:
A4 portrait, the same 4 column widths and six unit-days per page as the Word layout, with visible photo/table boxes, date/unit headers, Before/After positions, aspect-fit photos and page numbers. Each new block starts a new page. A last page may contain fewer than six rows.

Photo order matches the existing Word report: up to the first three manually ordered photos per unit/day. Two-photo records keep the same blank middle cell as Word. The ZIP index separately lists stored photo counts and photos placed in reports. Blocks without photos are listed as zero in the index and do not get empty PDFs. A missing/corrupt photo stops the download with the block/unit/date; it is not silently skipped.

Photos, appointments, unit statuses and backups are not written, moved or deleted by this export module. V205 survey status fix remains in the existing app.js; this update does not replace app.js. No resident data or report photos are included in this update ZIP.

VERIFICATION:
Tested against all 1,221 photo records in the 23-Nov backup. Zone 6 generated 4 separate block PDFs / 8 pages; Zone 4 generated 5 separate block PDFs / 47 pages for 21-Oct to 22-Nov. PDF parsing, filters, missing-block index rows, error recovery and unchanged photo metadata passed. First and last actual report pages were rendered and visually inspected. Browser button downloads passed with portrait JPEG, landscape PNG and EXIF-rotated JPEG fixtures; the resulting ZIP/PDF files were parsed and verified.

This file is an application update. It has not been uploaded to your GitHub repository automatically.
