(function () {
  "use strict";

  const input = document.getElementById("recoverPhotosZipInput");
  const button = document.getElementById("recoverPhotosZipBtn");
  const status = document.getElementById("recoverPhotosZipStatus");
  if (!input || !button || !status) return;

  const roles = ["Closed DB", "Before", "After"];
  let busy = false;

  const elements = (node, name) => Array.from(node.getElementsByTagNameNS("*", name));
  const children = (node, name) => Array.from(node.children).filter(child => child.localName === name);
  const text = node => elements(node, "t").map(part => part.textContent).join(" ").trim();

  function setStatus(message, failed = false) {
    status.textContent = message;
    status.style.color = failed ? "#a41525" : "#124f39";
    status.style.fontWeight = "700";
  }

  function validDate(date) {
    const value = new Date(date + "T12:00:00Z");
    return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(value.getTime())
      && value.toISOString().slice(0, 10) === date;
  }

  function reportDate(value) {
    const match = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/.exec(value);
    if (!match) throw new Error("Cannot read report date: " + value);
    const month = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(match[2].toLowerCase()) + 1;
    const date = match[3] + "-" + String(month).padStart(2, "0") + "-" + match[1].padStart(2, "0");
    if (!validDate(date)) throw new Error("Invalid report date: " + value);
    return date;
  }

  function candidate(zone, block, floor, unit, date, order, entry, source) {
    if (block === 560 && floor === 1 && unit === 243) unit = 251;
    const key = unitKey(block, floor, unit);
    if (!(ZONE_BLOCKS[zone] || []).includes(block) || !getUnit(key) || !validDate(date) || !roles[order - 1]) {
      throw new Error("Unmatched report entry: Blk " + block + " #" + floor + "-" + unit + " / " + date);
    }
    const extension = /\.(png|jpe?g)$/i.exec(entry.name)?.[1].toLowerCase();
    if (!extension) throw new Error("Unsupported report image: " + entry.name);
    const path = "Zone_" + zone + "/Block_" + block + "/" + date + "/Unit_"
      + String(floor).padStart(2, "0") + "-" + String(unit).padStart(2, "0")
      + "/Photo_" + String(order).padStart(2, "0") + "." + extension;
    return { id: "recovered-word:" + path.toLowerCase(), zone, block, floor, unit, unitKey: key,
      date, reportOrder: order, name: path.split("/").pop(), entry, source, extension };
  }

  async function xml(zip, path) {
    const entry = zip.file(path);
    if (!entry) throw new Error("Word report is missing " + path);
    const doc = new DOMParser().parseFromString(await entry.async("string"), "application/xml");
    if (elements(doc, "parsererror").length) throw new Error("Cannot read Word report XML");
    return doc;
  }

  async function wordPhotos(zip, source) {
    const doc = await xml(zip, "word/document.xml");
    const relations = await xml(zip, "word/_rels/document.xml.rels");
    const targets = new Map(elements(relations, "Relationship").filter(relation => relation.getAttribute("TargetMode") !== "External")
      .map(relation => [relation.getAttribute("Id"), relation.getAttribute("Target")]));
    const records = [];
    for (const table of elements(doc, "tbl")) {
      let address = null;
      for (const row of children(table, "tr")) {
        const cells = children(row, "tc");
        if (cells.length !== 4) continue;
        const match = /^Blk\s+(\d+)\s+#(\d+)-(\d+)$/.exec(text(cells[1]));
        if (match && text(cells[0]) === "DATE") {
          address = match.slice(1).map(Number);
          continue;
        }
        if (!address) continue;
        const [block, floor, unit] = address;
        const zone = Number(Object.keys(ZONE_BLOCKS).find(key => ZONE_BLOCKS[key].includes(block)));
        const date = reportDate(text(cells[0]));
        for (let index = 1; index < cells.length; index++) {
          const pictures = elements(cells[index], "blip");
          if (pictures.length > 1) throw new Error("More than one image in a report photo cell");
          for (const picture of pictures) {
            const ref = picture.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "embed");
            const target = targets.get(ref);
            if (!target) throw new Error("A report image reference is missing");
            const path = target.startsWith("/") ? target.slice(1) : "word/" + target;
            if (!/^word\/media\/[^/]+$/i.test(path)) throw new Error("Invalid report image location");
            const entry = zip.file(path);
            if (!entry) throw new Error("A photo is missing from the Word report");
            records.push(candidate(zone, block, floor, unit, date, index, entry, source));
          }
        }
        address = null;
      }
    }
    return records;
  }

  async function readReport(file) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    if (zip.file("word/document.xml")) return wordPhotos(zip, file.name);
    const files = Object.values(zip.files).filter(entry => !entry.dir && !/(^|\/)__MACOSX\//i.test(entry.name));
    const docs = files.filter(entry => /\.docx$/i.test(entry.name));
    if (docs.length) {
      const records = [];
      for (const doc of docs) {
        setStatus("Reading " + doc.name.split("/").pop() + "…");
        records.push(...await wordPhotos(await JSZip.loadAsync(await doc.async("uint8array")), doc.name));
      }
      return records;
    }
    const records = [];
    for (const entry of files) {
      const match = /(?:^|\/)Zone_(\d+)\/Block_(\d+)\/(\d{4}-\d{2}-\d{2})\/Unit_(\d+)-(\d+)\/Photo_(\d+)\.(?:jpe?g|png)$/i.exec(entry.name);
      if (match) records.push(candidate(Number(match[1]), Number(match[2]), Number(match[4]), Number(match[5]), match[3], Number(match[6]), entry, file.name));
    }
    return records;
  }

  async function digest(blob) {
    const bytes = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
    return Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, "0")).join("");
  }

  async function addPhoto(record) {
    const db = await photoDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("photos", "readwrite");
      const store = transaction.objectStore("photos");
      let added = false;
      store.get(record.id).onsuccess = event => {
        if (event.target.result) return;
        store.add(record);
        added = true;
      };
      transaction.oncomplete = () => { db.close(); resolve(added); };
      transaction.onabort = () => { db.close(); reject(transaction.error || new Error("Photo storage write failed")); };
      transaction.onerror = () => {};
    });
  }

  async function applyReportView(view) {
    document.getElementById("photoZone").value = String(view.zone);
    document.getElementById("photoBlockReportZone").value = String(view.zone);
    document.getElementById("photoDate").value = view.date;
    for (const id of ["photoReportFrom", "photoBlockReportFrom"]) document.getElementById(id).value = view.from;
    for (const id of ["photoReportTo", "photoBlockReportTo"]) document.getElementById(id).value = view.to;
    syncPhotoBlockReportBlocks();
    document.getElementById("photoBlockReportBlock").value = "all";
    await syncPhotoTargetUnits();
    await renderBlockPhotoSummary();
  }

  async function selectImportedDates(records, existing) {
    const zones = [...new Set(records.map(record => record.zone))].sort();
    const selected = Number(document.getElementById("photoBlockReportZone").value);
    const zone = zones.includes(selected) ? selected : zones.includes(4) ? 4 : zones[0];
    const dates = [...records, ...existing].filter(record => Number(record.zone) === zone && validDate(record.date)).map(record => record.date).sort();
    const importedDates = records.filter(record => record.zone === zone).map(record => record.date).sort();
    const view = { zone, date: importedDates[0], from: dates[0], to: dates[dates.length - 1] };
    await applyReportView(view);
    return view;
  }

  async function importReport(file, onlyIfReport = false) {
    if (busy) { toast("A photo import is already running"); return true; }
    if (!file) { setStatus("Choose report.zip or the recovered photos ZIP first.", true); return true; }
    busy = true;
    button.disabled = true;
    const previousStatus = status.textContent;
    let inserted = 0;
    let skipped = 0;
    let completed = false;
    try {
      setStatus("Reading " + file.name + "…");
      const records = await readReport(file);
      if (!records.length) {
        if (onlyIfReport) { setStatus(previousStatus); return false; }
        throw new Error("No report photos found. Select report.zip or ELU_Recovered_Photos_Block_Date_Unit.zip.");
      }
      const existing = await photoDbAll("photos");
      const ids = new Set(existing.map(photo => String(photo.id)));
      const groups = new Set(records.map(record => record.date + "|" + record.unitKey));
      const fingerprints = new Set();
      const orders = new Map();
      for (const photo of existing) {
        const group = photo.date + "|" + photo.unitKey;
        orders.set(group, Math.max(orders.get(group) || 0, Number(photo.order) || 0));
        if (groups.has(group) && photo.blob) fingerprints.add(group + "|" + (photo.contentHash || await digest(photo.blob)));
      }
      for (let index = 0; index < records.length; index++) {
        const record = records[index];
        if (ids.has(record.id)) { skipped++; continue; }
        const bytes = await record.entry.async("uint8array");
        const isPng = record.extension === "png";
        if (!(isPng ? bytes[0] === 137 && bytes[1] === 80 : bytes[0] === 255 && bytes[1] === 216)) throw new Error("Cannot read photo " + record.name);
        const blob = new Blob([bytes], { type: isPng ? "image/png" : "image/jpeg" });
        const contentHash = await digest(blob);
        const group = record.date + "|" + record.unitKey;
        const fingerprint = group + "|" + contentHash;
        if (fingerprints.has(fingerprint)) { skipped++; continue; }
        const { entry, extension, source, reportOrder, ...details } = record;
        const order = (orders.get(group) || 0) + 1;
        const added = await addPhoto({ ...details, order, blob, contentHash, cycleId: cycleForDate(record.date).id,
          unitDisplay: unitDisplay(record.floor, record.unit), team: "", slot: "",
          importedAt: new Date().toISOString(), recoveredFrom: source, reportRole: roles[reportOrder - 1] });
        if (added) { inserted++; orders.set(group, order); } else skipped++;
        ids.add(record.id);
        fingerprints.add(fingerprint);
        if (index % 10 === 0) setStatus("Importing " + (index + 1) + " / " + records.length + " photos…");
      }
      completed = true;
      const dates = records.map(record => record.date).sort();
      const result = { key: "archive-photo-import-result", source: file.name, inserted, skipped,
        photos: records.length, units: groups.size, from: dates[0], to: dates[dates.length - 1], finishedAt: new Date().toISOString() };
      setStatus("Import complete · Added " + inserted + " · Already stored " + skipped + " · " + groups.size
        + " unit/dates · " + dates[0] + " to " + dates[dates.length - 1]);
      result.view = await selectImportedDates(records, existing);
      await photoDbPut("meta", result);
      toast("Photo import complete. Block and date views are ready.");
      return true;
    } catch (error) {
      console.error("Report photo import", error);
      setStatus((completed ? "Photos saved. Final update failed: " : "Import stopped after " + inserted + " photos: ")
        + error.message + ". Select the ZIP again to retry.", true);
      return true;
    } finally {
      busy = false;
      button.disabled = false;
    }
  }

  button.removeEventListener("click", recoverArchivedBlockPhotos);
  button.addEventListener("click", () => importReport(input.files?.[0]));
  input.addEventListener("change", () => setStatus(input.files?.[0] ? "Selected " + input.files[0].name + ". Click Import report photos." : "Choose report.zip or a recovered photos ZIP."));
  window.importArchivedReportPhotos = importReport;

  const originalInit = initPhotoCenter;
  initPhotoCenter = function () {
    originalInit();
    photoDbAll("meta").then(async records => {
      const last = records.find(record => record.key === "archive-photo-import-result");
      if (!last?.view || !validDate(last.view.from) || !validDate(last.view.to)) return;
      await applyReportView(last.view);
      setStatus("Last import · " + last.photos + " report photos · " + last.from + " to " + last.to);
    }).catch(console.error);
  };
})();
