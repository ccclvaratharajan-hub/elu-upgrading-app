(() => {
  const host = document.getElementById('formEHost');
  if (!host) return;
  host.insertAdjacentHTML('beforeend', `<article class="panel inspection-certificate-panel" id="inspectionCertificatePanel">
    <h3 id="certificateFormHeading">Form E</h3>
    <label>Zone <select id="certZone"></select></label>
    <label>Block <select id="certBlock"></select></label>
    <label><span id="certDateLabel">Date of Test (optional)</span> <input id="certDate" type="date"></label>
    <label>Application No. (optional) <input id="certApp"></label>
    <p id="certCount"></p>
    <button id="certCompletion" type="button" class="primary-btn" hidden>Download PDF</button>
    <button id="certFitness" type="button" class="primary-btn">Download PDF</button>
    <p id="certMsg" role="status" aria-live="polite"></p>
    <div id="certResult" hidden><p><a id="certSave" class="primary-btn">Download PDF again</a> <a id="certOpen" target="_blank" rel="noopener">Open PDF</a></p>
    <iframe id="certPreview" title="Certificate PDF preview" style="width:100%;height:75vh;min-height:400px;border:1px solid #b7c2d0;background:white"></iframe></div>
  </article>`);
  const $ = id => document.getElementById(id), z = $('certZone'), b = $('certBlock');
  let activeKind = 'form-e', busy = false, resultUrl = '', embeddedPromise;
  z.innerHTML = Object.keys(ZONE_BLOCKS).map(n => `<option value="${n}">Zone ${n}</option>`).join('');
  const controls = [z, b, $('certDate'), $('certApp'), $('certCompletion'), $('certFitness')];
  const message = value => { $('certMsg').textContent = value; };
  function clearResult() {
    $('certResult').hidden = true;
    $('certPreview').removeAttribute('src');
    $('certSave').removeAttribute('href'); $('certOpen').removeAttribute('href');
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = '';
  }
  function units() {
    return getBlockUnits(Number(b.value)).filter(u => ['A', 'C'].includes(currentUnitAppointmentState(u.key).status))
      .sort((a, c) => Number(a.floor) - Number(c.floor) || Number(a.unit) - Number(c.unit));
  }
  async function restore() {
    clearResult();
    $('certDate').value = ''; $('certApp').value = '';
    if (!b.value) { $('certCount').textContent = 'Select a block to download its PDF.'; return; }
    $('certCount').textContent = units().length + ' Opt-In units';
    const m = (await photoDbAll('meta')).find(x => x.key === 'certificates-' + activeKind + '-' + b.value) || {};
    $('certDate').value = m.date || ''; $('certApp').value = m.application || '';
  }
  async function persist() {
    if (b.value) await photoDbPut('meta', {key: 'certificates-' + activeKind + '-' + b.value, date: $('certDate').value, application: $('certApp').value});
  }
  window.renderInspectionCertificate = async view => {
    if (busy) return;
    const completion = view === 'completioncertificate';
    activeKind = completion ? 'completion' : 'form-e';
    const target = document.getElementById(completion ? 'completionCertificateHost' : 'formEHost');
    if (!target) return;
    target.replaceChildren($('inspectionCertificatePanel'));
    $('certificateFormHeading').textContent = completion ? 'Completion Certificate' : 'Form E';
    $('certDateLabel').textContent = completion ? 'Inspection date (optional)' : 'Date of Test (optional)';
    $('certCompletion').hidden = !completion; $('certFitness').hidden = completion;
    $('certApp').closest('label').hidden = completion;
    message('');
    try { await restore(); } catch (e) { message('Saved certificate settings could not be loaded. ' + e.message); }
  };
  async function loadBlocks() {
    b.innerHTML = '<option value="">Select block</option>' + (ZONE_BLOCKS[z.value] || []).map(n => `<option value="${n}">${n}</option>`).join('');
    message(''); await restore();
  }
  z.onchange = () => loadBlocks().catch(e => message(e.message));
  b.onchange = async () => {
    try { await restore(); if (b.value) await generate(activeKind); } catch (e) { message(e.message); }
  };
  for (const input of [$('certDate'), $('certApp')]) input.onchange = () => {
    clearResult(); message('Settings changed. Select Download PDF to prepare the updated certificate.');
    persist().catch(e => message('Settings could not be saved. ' + e.message));
  };
  function embeddedTemplates() {
    if (window.ELU_CERTIFICATE_TEMPLATES) return Promise.resolve(window.ELU_CERTIFICATE_TEMPLATES);
    if (!embeddedPromise) embeddedPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'certificate-template-data.js?v=8.44.143';
      script.onload = () => window.ELU_CERTIFICATE_TEMPLATES ? resolve(window.ELU_CERTIFICATE_TEMPLATES) : reject(Error('Embedded certificate forms are missing.'));
      script.onerror = () => { embeddedPromise = null; script.remove(); reject(Error('Certificate forms are missing. Extract the complete ELU folder and try again.')); };
      document.head.appendChild(script);
    });
    return embeddedPromise;
  }
  async function templateBytes(kind) {
    if (location.protocol !== 'file:') {
      try {
        const res = await fetch('./certificate-templates/' + kind + '.pdf');
        if (!res.ok) throw Error('Template unavailable');
        const bytes = new Uint8Array(await res.arrayBuffer());
        if (String.fromCharCode(...bytes.slice(0, 5)) !== '%PDF-') throw Error('Template is not a PDF');
        return bytes;
      } catch (_) { /* The bundled copy also works offline and with missing server assets. */ }
    }
    const data = (await embeddedTemplates())[kind];
    if (!data) throw Error('This certificate form is missing from the ELU folder.');
    return Uint8Array.from(atob(data), c => c.charCodeAt(0));
  }
  function text(p, t, x, y, size = 12, font = 'F2', red = false) {
    if (!t) return;
    const L = PDFLib;
    p.pushOperators(L.pushGraphicsState(), L.setFillingRgbColor(red ? 1 : 0, 0, 0), L.beginText(),
      L.setFontAndSize(L.PDFName.of(font), size), L.moveText(x, p.getHeight() - y),
      L.showText(L.PDFHexString.of([...String(t)].map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(''))), L.endText(), L.popGraphicsState());
  }
  function date() { const a = $('certDate').value.split('-'); return a.length === 3 ? a.reverse().join('/') : ''; }
  async function generate(kind) {
    if (busy) return;
    if (!b.value) { message('Select a block first.'); return; }
    busy = true; controls.forEach(e => { e.disabled = true; }); clearResult(); message('Preparing PDF…');
    try {
      if (!window.PDFLib) throw Error('The PDF component is missing. Extract the complete ELU folder and try again.');
      await persist();
      const rows = units();
      if (!rows.length) throw Error('No Opt-In units in this block.');
      const block = Number(b.value), template = await PDFLib.PDFDocument.load(await templateBytes(kind)), pdf = await PDFLib.PDFDocument.create();
      const street = Number(z.value) === 3 ? 'Pasir Ris Drive 1' : 'Pasir Ris St 51';
      if (kind === 'completion') {
        for (const u of rows) {
          const [p] = await pdf.copyPages(template, [0]); pdf.addPage(p);
          text(p, `Blk ${block} ${street} (510${block})`, 273.31, 157.22, 12, 'F1-0');
          text(p, `#${String(u.floor).padStart(2, '0')}-${u.unit}`, 252.65, 183.02);
          for (const [x, y] of [[365.95, 430.51], [260.93, 671.02], [442.30, 717.48]]) text(p, date(), x, y);
        }
      } else {
        const lines = [];
        for (const floor of [...new Set(rows.map(u => Number(u.floor)))]) {
          const list = rows.filter(u => Number(u.floor) === floor).map(u => u.unit);
          for (let start = 0; start < list.length; start += 12) lines.push(`#${String(floor).padStart(2, '0')} - ${list.slice(start, start + 12).join(', ')}`);
        }
        const pages = Math.max(1, Math.ceil(lines.length / 12));
        for (let n = 0; n < pages; n++) {
          const [p] = await pdf.copyPages(template, [0]); pdf.addPage(p);
          text(p, String(block), 171, 182.78, 8.04, 'F1'); text(p, street.toUpperCase(), 358, 182.78, 8.04, 'F1');
          text(p, '510' + block, 358.63, 204.86, 8.04, 'F1'); text(p, date(), 182, 204.86, 8.04, 'F1', true);
          text(p, $('certApp').value, 460, 84.72, 8.04, 'F1', true);
          text(p, `Residential Units / (${rows.length} Opt-In units)`, 270, 230.06, 8.04, 'F1');
          lines.slice(n * 12, n * 12 + 12).forEach((line, i) => text(p, line, 226.01, 520.27 + i * 8.88, 7.2, 'F1'));
        }
      }
      const blob = new Blob([await pdf.save()], {type: 'application/pdf'}), name = `ELU_${kind}_Blk${block}.pdf`;
      resultUrl = URL.createObjectURL(blob);
      $('certSave').href = resultUrl; $('certSave').download = name;
      $('certOpen').href = resultUrl; $('certPreview').src = resultUrl; $('certResult').hidden = false;
      $('certSave').click();
      message(`PDF ready: ${rows.length} Opt-In units, ${pdf.getPageCount()} page(s). Preview below. If the download did not start, select Download PDF again.`);
    } catch (e) { message('PDF could not be prepared: ' + (e.message || String(e))); }
    finally { busy = false; controls.forEach(e => { e.disabled = false; }); }
  }
  $('certCompletion').onclick = () => generate('completion'); $('certFitness').onclick = () => generate('form-e');
  window.addEventListener('beforeunload', () => { if (resultUrl) URL.revokeObjectURL(resultUrl); });
  loadBlocks().catch(e => message(e.message));
})();
