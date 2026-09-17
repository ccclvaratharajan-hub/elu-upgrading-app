# ELU Upgrading App — First Version

This is a static browser-based first version of the ELU Upgrading App.

## Included modules
- Dashboard — overall progress across 6 zones
- Zone View — Zones 1–6
- Block View — zone/block status, progress %, remarks
- Work Status — Not Started / In Progress / Completed / Hold
- Daily Update — date, manpower, work done, remarks
- Photo Upload — before / during / after photo records
- Issues — site issue, pending item, responsible person, status
- Progress % — block-wise and zone-wise
- Reports — CSV export for blocks, daily updates, issues

## Zone mapping
- Zone 1: Blk 564–569
- Zone 2: Blk 544–550
- Zone 3: Blk 531–536
- Zone 4: Blk 557–562
- Zone 5: Blk 537–543
- Zone 6: Blk 551–556

## How to run
Open `index.html` in a web browser.

## Important
This first version stores data using browser `localStorage`.
Photos are stored as browser data URLs, so it is suitable for testing/demo use.
A future production version should use a real database and file storage.
