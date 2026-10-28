(() => {
  const host = document.getElementById('singleLineHost');
  if (!host) return;
  host.insertAdjacentHTML('beforeend', `<article class="panel">
    <label>Zone <select id="sldZone"></select></label>
    <label>Block <select id="sldBlock"></select></label>
    <button type="button" id="sldDownload" class="primary-btn">Download PDF</button>
    <p>Unit Type is left blank until the room-type details are provided.</p>
    <p id="sldMessage" role="status" aria-live="polite"></p>
    <div id="sldLists"></div>
    <div id="sldResult" hidden><p><a id="sldSave" class="primary-btn">Download PDF again</a> <a id="sldOpen" target="_blank" rel="noopener">Open PDF</a></p>
    <iframe id="sldPreview" title="Unit Single Line Diagram PDF preview" style="width:100%;height:75vh;min-height:400px;border:1px solid #b7c2d0;background:white"></iframe></div>
  </article>`);
  const $ = id => document.getElementById(id), zone = $('sldZone'), block = $('sldBlock');
  const labels = {A: 'Opt-In', D: 'Opt-Out', NR: 'No Response', C: 'Confirmation', P: 'Pending Confirmation'};
  let busy = false, resultUrl = '', templatePromise;
  zone.innerHTML = Object.keys(ZONE_BLOCKS).map(n => `<option value="${n}">Zone ${n}</option>`).join('');
  function message(t) { $('sldMessage').textContent = t; }
  function clearResult() {
    $('sldResult').hidden = true; $('sldPreview').removeAttribute('src');
    $('sldSave').removeAttribute('href'); $('sldOpen').removeAttribute('href');
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = '';
  }
  function records() {
    if (!block.value) return {withUpgrade: [], withoutUpgrade: []};
    const all = getBlockUnits(Number(block.value)).map(u => ({...u, status: currentUnitAppointmentState(u.key).status}))
      .sort((a, b) => Number(a.floor) - Number(b.floor) || Number(a.unit) - Number(b.unit));
    return {withUpgrade: all.filter(u => u.status === 'A'), withoutUpgrade: all.filter(u => u.status !== 'A')};
  }
  function groupRows(units, includeStatus) {
    const groups = [];
    for (const u of units) {
      const floor = Number(u.floor), status = includeStatus ? u.status : 'A';
      let g = groups.find(g => g.floor === floor && g.status === status);
      if (!g) { g = {floor, status, units: []}; groups.push(g); }
      g.units.push(Number(u.unit));
    }
    const rows = [];
    // Six units per line leaves room for the unclassified Unit Type column.
    for (const g of groups) for (let i = 0; i < g.units.length; i += 6) {
      rows.push({text: `#${String(g.floor).padStart(2, '0')} - ${g.units.slice(i, i + 6).join(', ')}`, status: labels[g.status] || 'Not recorded'});
    }
    return rows;
  }
  function table(title, units, includeStatus) {
    const rows = groupRows(units, includeStatus);
    return `<section><h3>${title} — ${units.length} units</h3><div style="overflow:auto"><table style="width:100%;border-collapse:collapse" class="data-table"><thead><tr><th>Floor / Unit Nos.</th><th>Unit Type</th>${includeStatus ? '<th>Register Status</th>' : ''}</tr></thead><tbody>${rows.length ? rows.map(r => `<tr><td>${r.text}</td><td></td>${includeStatus ? `<td>${r.status}</td>` : ''}</tr>`).join('') : `<tr><td colspan="${includeStatus ? 3 : 2}">No units</td></tr>`}</tbody></table></div></section>`;
  }
  function render() {
    if (busy) return;
    clearResult(); message('');
    if (!block.value) { $('sldLists').innerHTML = '<p>Select a block to view its unit lists and download the diagram PDF.</p>'; return; }
    const data = records();
    $('sldLists').innerHTML = table('With Upgrading of Sub Main Cable · Opt-In', data.withUpgrade, false)
      + table('Without Upgrading of Sub Main Cable · Opt-Out / NR / Confirmation', data.withoutUpgrade, true);
  }
  window.renderSingleLineDiagram = render;
  function loadBlocks() {
    block.innerHTML = '<option value="">Select block</option>' + (ZONE_BLOCKS[zone.value] || []).map(n => `<option value="${n}">${n}</option>`).join('');
    render();
  }
  async function templateBytes() {
    if (location.protocol !== 'file:') {
      try {
        const response = await fetch('./certificate-templates/single-line.pdf');
        if (!response.ok) throw Error('Missing diagram');
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (String.fromCharCode(...bytes.slice(0, 5)) !== '%PDF-') throw Error('Invalid diagram');
        return bytes;
      } catch (_) { /* Use the complete bundled copy. */ }
    }
    if (!window.ELU_CERTIFICATE_TEMPLATES?.['single-line']) {
      if (!templatePromise) templatePromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'certificate-template-data.js?v=8.44.144';
        script.onload = () => resolve();
        script.onerror = () => { templatePromise = null; script.remove(); reject(Error('Diagram template is missing. Extract the complete ELU folder.')); };
        document.head.appendChild(script);
      });
      await templatePromise;
    }
    const data = window.ELU_CERTIFICATE_TEMPLATES?.['single-line'];
    if (!data) throw Error('The Unit Single Line Diagram template is missing.');
    return Uint8Array.from(atob(data), c => c.charCodeAt(0));
  }
  async function generate() {
    if (busy) return;
    if (!block.value) { message('Select a block first.'); return; }
    render();
    const data = records();
    if (!data.withUpgrade.length && !data.withoutUpgrade.length) { message('No unit records in this block.'); return; }
    busy = true; [zone, block, $('sldDownload')].forEach(e => { e.disabled = true; }); message('Preparing PDF…');
    try {
      if (!window.PDFLib) throw Error('The PDF component is missing. Extract the complete ELU folder.');
      const L = PDFLib, template = await L.PDFDocument.load(await templateBytes()), pdf = await L.PDFDocument.create();
      const regular = await pdf.embedFont(L.StandardFonts.Helvetica), bold = await pdf.embedFont(L.StandardFonts.HelveticaBold);
      const blk = Number(block.value), street = Number(zone.value) === 3 ? 'PASIR RIS DRIVE 1' : 'PASIR RIS STREET 51';
      const ink = L.rgb(0, 0, 0);
      function text(page, value, x, top, size = 9, heavy = false) {
        page.drawText(String(value), {x, y: page.getHeight() - top - size, size, font: heavy ? bold : regular, color: ink});
      }
      function line(page, x1, y1, x2, y2) {
        page.drawLine({start: {x: x1, y: page.getHeight() - y1}, end: {x: x2, y: page.getHeight() - y2}, thickness: .6, color: ink});
      }
      for (const [index, units, includeStatus] of [[0, data.withUpgrade, false], [1, data.withoutUpgrade, true]]) {
        const rows = groupRows(units, includeStatus), top = index ? 458 : 366, rowHeight = 17;
        const capacity = Math.floor((792 - top - 28 - 22) / rowHeight), chunks = Math.max(1, Math.ceil(rows.length / capacity));
        for (let n = 0; n < chunks; n++) {
          const [page] = await pdf.copyPages(template, [index]); pdf.addPage(page);
          page.pushOperators(L.pushGraphicsState(), L.beginText(), L.setCharacterSpacing(0), L.setWordSpacing(0), L.setCharacterSqueeze(100), L.setTextRenderingMode(0), L.endText());
          const left = 36, right = 559, typeX = includeStatus ? 317 : 430, statusX = 405;
          text(page, `BLK ${blk} ${street}`, left, top - 24, 11, true);
          const heading = index ? 'Residential Unit Without Upgrading of Sub Main Cable' : 'Residential Unit With Upgrading of Sub Main Cable';
          text(page, heading, left + 6, top + 6, includeStatus ? 8.3 : 9, true);
          // Header occupies two lines in the narrower first column.
          if (includeStatus) {
            page.drawRectangle({x: left + 2, y: page.getHeight() - top - 27, width: typeX - left - 4, height: 26, color: L.rgb(1, 1, 1)});
            text(page, 'Residential Unit Without Upgrading', left + 6, top + 3, 8.3, true);
            text(page, 'of Sub Main Cable', left + 6, top + 14, 8.3, true);
          }
          text(page, 'Unit Type', typeX + 7, top + 8, 9, true);
          if (includeStatus) text(page, 'Register Status', statusX + 7, top + 8, 9, true);
          const chunk = rows.slice(n * capacity, (n + 1) * capacity), shown = chunk.length ? chunk : [{text: 'No units', status: ''}];
          let y = top + 28;
          line(page, left, top, right, top); line(page, left, y, right, y);
          for (const row of shown) {
            text(page, row.text, left + 6, y + 4, 8.8);
            if (includeStatus) text(page, row.status, statusX + 7, y + 4, 8.1);
            y += rowHeight; line(page, left, y, right, y);
          }
          for (const x of [left, typeX, ...(includeStatus ? [statusX] : []), right]) line(page, x, top, x, y);
          text(page, `TOTAL ${units.length} UNITS${chunks > 1 ? ` | Part ${n + 1}/${chunks}` : ''}`, left + 6, y + 6, 9.5, true);
          line(page, left, y + 22, right, y + 22); line(page, left, y, left, y + 22); line(page, right, y, right, y + 22);
          text(page, 'Unit Type left blank pending verified room-type details.', left, 810, 8);
          page.pushOperators(L.popGraphicsState());
        }
      }
      const blob = new Blob([await pdf.save()], {type: 'application/pdf'}), name = `ELU_Unit_Single_Line_Diagram_Blk${blk}.pdf`;
      resultUrl = URL.createObjectURL(blob);
      $('sldSave').href = resultUrl; $('sldSave').download = name;
      $('sldOpen').href = resultUrl; $('sldPreview').src = resultUrl; $('sldResult').hidden = false;
      $('sldSave').click();
      message(`PDF ready: ${data.withUpgrade.length} Opt-In units first; ${data.withoutUpgrade.length} Opt-Out / NR / Confirmation units after. ${pdf.getPageCount()} page(s). Unit Type is blank.`);
    } catch (e) { message('PDF could not be prepared: ' + (e.message || String(e))); }
    finally { busy = false; [zone, block, $('sldDownload')].forEach(e => { e.disabled = false; }); }
  }
  zone.onchange = loadBlocks;
  block.onchange = async () => { render(); if (block.value) await generate(); };
  $('sldDownload').onclick = generate;
  window.addEventListener('beforeunload', () => { if (resultUrl) URL.revokeObjectURL(resultUrl); });
  loadBlocks();
})();
