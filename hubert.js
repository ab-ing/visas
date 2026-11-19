/* Logique de l'outil « Recap visas » d'Hubert Magne, reprise telle quelle par
   outils/convertir.py : seules les données (D) et l'enregistrement du suivi (API)
   passent par la base. Ne pas modifier à la main : relancer le script. */
function lanceOutil(D, API) {
const DOCS = D.DOCS;
const HIST = D.HIST;
const HMETA = D.HMETA;
const LAST = D.LAST;
const NAMES = D.NAMES;
const NCAB = D.NCAB;
const PDFC = D.PDFC;
const HCAT = D.HCAT;
const PDFF = D.PDFF;
// dossier local où se trouvent les PDF téléchargés de Karnial (à adapter si le dossier est déplacé)
// dossier des PDF de visa : dossier OneDrive du projet par défaut, modifiable par poste (bouton « Dossier des PDF »)
const PDFDEF = D.PDFDEF || "";
const PDFKEY = 'fgh-visas-pdfdir';
let PDFPATH = PDFDEF; try { PDFPATH = localStorage.getItem(PDFKEY) || PDFDEF; } catch (e) {}
const BSL = String.fromCharCode(92);
const toDir = p => { p = p.trim(); const s = p.split(BSL).join('/'); const d = s.endsWith('/') ? s : s + '/'; return p.toLowerCase().startsWith('http') ? d : 'file:///' + encodeURI(d); };
// page rangée dans le dossier OneDrive « VISAs » (à côté du dossier « Kairnial ») : liens relatifs, valables sur tous les postes ;
// page ailleurs dans un OneDrive AB : même dossier de projet, sous le profil de la personne qui ouvre la page
const OD = '/OneDrive - AB Ingénieurs SA/', ODSUB = PDFDEF.slice(PDFDEF.indexOf(OD) + OD.length) + '/';
function autoDir(){
  let here = ''; try { here = decodeURI(location.href.split('#')[0].split('?')[0]); } catch (e) {}
  const dir = here.slice(0, here.lastIndexOf('/') + 1);
  if (dir.toLowerCase().endsWith('/visas/')) return 'Kairnial/';
  const i = dir.indexOf(OD);
  return i > 0 && dir.startsWith('file:') ? encodeURI(dir.slice(0, i + OD.length) + ODSUB) : toDir(PDFDEF);
}
let PDFCUSTOM = false; try { PDFCUSTOM = !!localStorage.getItem(PDFKEY); } catch (e) {}
let PDFDIR = PDFCUSTOM ? toDir(PDFPATH) : autoDir();
const pdfLink = (f, pg) => { if (f == null) return ''; const u = API.lienPdf(PDFF[f], pg) || (location.protocol === 'file:' ? PDFDIR + encodeURIComponent(PDFF[f]) + '#page=' + (pg || 1) : '');
  return u ? `<a class="pdfl" href="${esc(u)}" target="_blank" rel="noopener" title="${esc(PDFF[f])}">Ouvrir le PDF${pg > 1 ? ' (page ' + pg + ')' : ''}</a>`
    : `<button type="button" class="pdfl" data-copy="${esc(PDFF[f])}" title="PDF pas encore déposé dans l'outil : un clic copie son nom">Copier le nom du PDF${pg > 1 ? ' (page ' + pg + ')' : ''}</button>`; };   // catégorie de chaque commentaire de l'historique Karnial, dans l'ordre de HIST   // commentaires lus dans les PDF de visa : {code: [[indice, catégorie, émetteur, visa, texte], ...]}
const BY = D.BY;
const FL = {'190':'Toiture','180':'E8','170':'E7','160':'E6','150':'E5','140':'E4','130':'E3','120':'E2','110':'E1','100':'Rez','090':'Rez inf.','080':'SS1','070':'SS2','060':'SS3','050':'SS4','000':'Général'};
const TY = {PLA:'Plan',ARM:'Armature',LIS:'Liste',ELV:'Élévation',DET:'Détail',NDC:'Note de calcul',RAP:'Rapport',CPE:'Coupe',CDC:'Cahier des charges',SCH:'Schéma',DES:'Descriptif'};
const CIR = {mo:['Visa du maître d\'ouvrage','circuit MO-AMO'], sas:['SAS mandataires','contrôle avant diffusion']};
const ST = {
  ok:{l:'Validé', s:{mo:'VSO, sans observation', sas:'tous les avis rendus sont favorables'}},
  obs:{l:'Validé avec commentaires', s:{mo:'VAO, observations à intégrer', sas:'au moins un avis avec observations'}, sl:{sas:'Commentaires'}},
  rej:{l:'Refusé / à reprendre', s:{mo:'REF ou R&R', sas:'au moins un avis REJ'}},
  att:{l:'En attente', s:{mo:'visa MO non rendu', sas:'avis non rendus'}},
};
const ORDER = ['rej','obs','att','ok','inf','nov'];
const S = {cir:'all', so:'', st:'', nm:false, q:'', t:'', f:'', z:'', fd:'', n:150, ph:'COF', tcls:'', twho:'', tcir:'', tfd:'', fr:'', tfr:'', tscope:'last', tq:'', pg:'z', po:'', pz:'', pf:[], pn:'', pt:'', pm:'', pb:'', pq:'', ps:'', pr:'', pa:'', prest:false, cq:'', csrc:'', ccl:'', corg:'', cph:'', cz:'', cf:'', cst:'', clast:true, cn:300};
const PHN = {DEM:'Démolition', COF:'Coffrage', ARM:'Armature', LIS:'Liste', NDC:'Notes et rapports'};
const phase = (t, ti) => t === 'ARM' ? 'ARM' : t === 'LIS' ? 'LIS' : /d[ée]mol|sciage/i.test(ti) ? 'DEM' : ['PLA','ELV','DET','CPE','SCH'].includes(t) ? 'COF' : 'NDC';
const hcls = v => (v === 'REJ' || v === 'REF') ? 'rej' : v === 'OBS' ? 'obs' : 'rem';
const HCL = {rej:'Refus', obs:'Observations', rem:'Remarque sur avis favorable'};
const hist = (k, i) => (HIST[k] || {})[i] || [];
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fd = iso => iso ? iso.slice(8,10)+'.'+iso.slice(5,7)+'.'+iso.slice(0,4) : '';
DOCS.forEach(d => { const w = d.rv.filter(r => r.s === 'rej' || r.s === 'obs'); d.nomotif = (d.s === 'rej' || d.s === 'obs') && !w.some(r => r.c || r.pj.length) && !hist(d.k, d.i).some(e => e[5]); });
DOCS.forEach(d => { d.search = (d.ti + ' ' + d.k + '-' + d.i + ' ' + d.rv.map(r => r.pj.join(' ') + ' ' + r.c).join(' ') + ' ' + hist(d.k, d.i).map(e => e[5]).join(' ')).toLowerCase(); });
// --- suivi « traité » : enregistré dans le navigateur, et dans le fichier quand on clique sur « Enregistrer la page »
const LSK = 'fgh-visas-traites';
let DONE = {}, DIRTY = false;
DONE = API.suivi;
Object.values(DONE).forEach(e => { if (!e.v) { if (!e.x) e.m = 1; else if (!e.n && !e.r) e.m = 1; else delete e.x; e.v = 2; } });
const dkey = (k, i) => k + '-' + i;
const isOld = (k, i) => LAST[k] != null && parseInt(i, 10) < parseInt(LAST[k], 10);
// un indice déjà remplacé est considéré comme traité, sauf si on l'a décoché à la main
const isAuto = (k, i) => { const e = DONE[dkey(k, i)]; return isOld(k, i) && !(e && ('x' in e || e.m)); };
// indice visé par le MO mais déjà réémis : le nouvel indice est au SAS, la reprise est en cours
const MOI = {}; DOCS.forEach(d => { if (d.cir === 'mo') MOI[d.k] = d.i; });
const isEncAuto = (k, i) => false;   // plus d'« en cours » d'office : un ancien indice est obsolète, donc traité
// en cours : coché à la main (p), ou d'office quand un indice plus récent est au SAS
const isEnc = (k, i) => { const e = DONE[dkey(k, i)]; return e && e.m ? !!(e.x && e.p) : isEncAuto(k, i); };
const poster = (k, i) => { const b = BY[k]; return b && b[i] != null ? NAMES[b[i]] : ''; };
const resp = (k, i) => (DONE[dkey(k, i)] || {}).w || poster(k, i);
const isDone = (k, i) => { const e = DONE[dkey(k, i)]; return e && (e.x || e.m) ? !e.x : isOld(k, i); };
const state = (k, i) => isDone(k, i) ? 'done' : isEnc(k, i) ? 'enc' : 'todo';
function upd(k, i, fn){
  const e = Object.assign({}, DONE[dkey(k, i)] || {}); fn(e); e.t = new Date().toISOString(); e.v = 2;
  DONE[dkey(k, i)] = e; DIRTY = true;
  API.enregistre(dkey(k, i), e);
}
// m = état posé à la main · x = non traité · p = en cours · w = responsable · n = commentaire AB · r = commentaire après reprise
function setDone(k, i, on){ upd(k, i, e => { e.m = 1; delete e.p; if (on) delete e.x; else e.x = 1; }); }
function setEnc(k, i, on){ upd(k, i, e => { e.m = 1; e.x = 1; if (on) e.p = 1; else delete e.p; }); }
function setResp(k, i, name){ upd(k, i, e => { name = name.trim(); if (name && name !== poster(k, i)) e.w = name; else delete e.w; }); }
const OBSOLETE = 'Plan obsolète';
const HORSAB = 'Ne concerne pas AB';
const isNc = (k, i) => (NCAB[k] || []).includes(i);
// commentaire d'office : indice remplacé, ou plan dont aucun commentaire ne s'adresse à AB
const autoNote = (k, i) => isAuto(k, i) ? OBSOLETE : isNc(k, i) ? HORSAB : '';
const note = (k, i) => { const e = DONE[dkey(k, i)]; return e && 'n' in e ? e.n : autoNote(k, i); };
const rnote = (k, i) => (DONE[dkey(k, i)] || {}).r || '';
function setNote(k, i, txt, f){ f = f || 'n'; if (f === 'n' && !('n' in (DONE[dkey(k, i)] || {})) && txt.trim() === autoNote(k, i)) return; upd(k, i, e => { txt = txt.trim(); if (txt) e[f] = txt; else if (f === 'n' && autoNote(k, i)) e.n = ''; else delete e[f]; }); }
const fdt = iso => { const d = new Date(iso); return isNaN(d) ? '' : String(d.getDate()).padStart(2,'0') + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' + d.getFullYear(); };
function renderSuivi(){
  const scope = topPlans(DOCS.filter(d => d.s === 'rej' || d.s === 'obs'));
  const nd = scope.filter(d => isDone(d.k, d.i)).length, ne = scope.filter(d => isEnc(d.k, d.i)).length, tot = scope.length || 1;
  const na = scope.filter(d => isDone(d.k, d.i) && isAuto(d.k, d.i)).length;
  const nn = Object.keys(DONE).filter(k => DONE[k].n || DONE[k].r).length;
  // graphique en secteurs : traités, en cours, à traiter (rayon 8, trait 16 : le cercle a une circonférence de 50,27)
  const nt = scope.length - nd - ne, CIRC = 2 * Math.PI * 8, pc = n => Math.round(n / tot * 100);
  let off = 0;
  const arc = (n, cls) => { const l = n / tot * CIRC, s = n ? `<circle class="${cls}" r="8" cx="16" cy="16" stroke-dasharray="${l.toFixed(3)} ${(CIRC - l).toFixed(3)}" stroke-dashoffset="${(-off).toFixed(3)}"></circle>` : ''; off += l; return s; };
  const pie = `<svg class="pie" viewBox="0 0 32 32" role="img" aria-label="${nd} traités, ${ne} en cours, ${nt} à traiter sur ${scope.length} plans">${arc(nd, 'a-done')}${arc(ne, 'a-enc')}${arc(nt, 'a-todo')}</svg>`;
  $('#suivi').innerHTML = `<div class="pg">${pie}<div class="pgl"><b>${scope.length} plans refusés ou commentés</b>
      <span class="lg"><i class="a-done"></i><b>${nd}</b> traités · ${pc(nd)} %</span><span class="lg"><i class="a-enc"></i><b>${ne}</b> en cours · ${pc(ne)} %</span><span class="lg"><i class="a-todo"></i><b>${nt}</b> à traiter · ${pc(nt)} %</span></div></div>
    <span class="st">${na ? `${na} cochés d’office (indice remplacé)` : ''}${nn ? `${na ? ' · ' : ''}${nn} commentaire(s)` : ''}${API.statut()}</span>
    <button class="btn ghost" type="button" data-act="reprises">Exporter qui reprend quoi</button>
    <button class="btn ghost" type="button" data-act="export">Exporter le suivi (Excel)</button>
    `;
}
function allNames(){ return [...new Set(NAMES.concat(Object.values(DONE).map(e => e.w).filter(Boolean)))].sort((a, b) => a.localeCompare(b, 'fr')); }
function fillNames(){
  const ns = allNames();
  $('#names').innerHTML = ns.map(n => `<option value="${esc(n)}"></option>`).join('');
  const opt = v => '<option value="">Tous les responsables</option>' + ns.map(n => `<option${n === v ? ' selected' : ''}>${esc(n)}</option>`).join('');
  $('#fr').innerHTML = opt(S.fr); $('#tfr').innerHTML = opt(S.tfr);
}
function download(name, text, mime){
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], {type:mime})); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const stamp = () => { const n = new Date(); return String(n.getFullYear()).slice(2) + String(n.getMonth()+1).padStart(2,'0') + String(n.getDate()).padStart(2,'0'); };
const stateLabel = (k, i) => isDone(k, i) ? (isAuto(k, i) ? 'Traité (indice remplacé par ' + LAST[k] + ')' : 'Traité') : isEnc(k, i) ? (isEncAuto(k, i) ? 'En cours (ind. ' + LAST[k] + ' au SAS)' : 'En cours') : 'À traiter';
const csvOut = rows => rows.map(r => r.map(v => '"' + String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"').join(';')).join('\r\n');
// export interne : qui doit reprendre quoi (tout ce qui est refusé ou commenté et pas encore traité)
function exportReprises(){
  const items = DOCS.filter(d => (d.s === 'rej' || d.s === 'obs' || (DONE[dkey(d.k, d.i)] || {}).p || (DONE[dkey(d.k, d.i)] || {}).w) && !isDone(d.k, d.i));
  if (!items.length) { toast('Rien à reprendre : tout est traité'); return; }
  const ord = {enc:0, todo:1};
  items.sort((a, b) => (resp(a.k, a.i) || 'zzz').localeCompare(resp(b.k, b.i) || 'zzz', 'fr') || ord[state(a.k, a.i)] - ord[state(b.k, b.i)] || a.k.localeCompare(b.k));
  const rows = [['Responsable de la reprise', 'État', 'Code', 'Indice', 'Titre', 'Type de plan', 'Niveau', 'Zone', 'Circuit', 'Statut', 'Visa', 'Date du visa', 'Commentaires Karnial', 'Pièces jointes des visas', 'Déposé par', 'Commentaire AB']];
  items.forEach(d => {
    const main = d.cir === 'mo' ? d.rv.find(r => r.n === 'MO') : null;
    rows.push([resp(d.k, d.i) || 'Non attribué', stateLabel(d.k, d.i), d.k, d.i, d.ti, PHN[phase(d.t, d.ti)], FL[d.f] || d.f, d.z, d.cir === 'mo' ? 'MO-AMO' : 'SAS mandataires', label(d.s, d.cir), main ? main.v : '', main && main.d ? fd(main.d) : '',
      hist(d.k, d.i).map(e => `${e[2]} ${e[3]} : ${e[5] || 'sans texte'}`).join(' | '), d.rv.flatMap(r => r.pj).join(' | '), poster(d.k, d.i), note(d.k, d.i)]);
  });
  download(`FGH_Reprises_par_responsable_${stamp()}.csv`, '﻿' + csvOut(rows), 'text/csv;charset=utf-8');
  toast(`${rows.length - 1} reprise(s) exportée(s), ${items.filter(d => isEnc(d.k, d.i)).length} en cours`);
}
function exportDone(){
  const byKey = {}; DOCS.forEach(d => { (byKey[dkey(d.k, d.i)] ||= []).push(d); });
  const rows = [['Code', 'Indice', 'Titre', 'Type', 'Type de plan', 'Niveau', 'Zone', 'Circuit', 'Statut', 'Visa', 'Date du visa', 'Avis des intervenants', 'Commentaires Karnial', 'Pièces jointes des visas', 'État', 'Responsable de la reprise', 'Déposé par', 'Date de saisie', 'Commentaire AB', 'Commentaire après reprise']];
  const keys = new Set(Object.keys(DONE).filter(k => (DONE[k].m && !DONE[k].x) || DONE[k].p || DONE[k].w || DONE[k].n || DONE[k].r));
  DOCS.forEach(d => { if (((d.s === 'rej' || d.s === 'obs') && isAuto(d.k, d.i)) || isNc(d.k, d.i)) keys.add(dkey(d.k, d.i)); });
  [...keys].sort().forEach(key => {
    const E = DONE[key] || {}, km = key.match(/^(.*)-([^-]+)$/), dn = isDone(km[1], km[2]), au = isAuto(km[1], km[2]);
    const tail = [stateLabel(km[1], km[2]), resp(km[1], km[2]), poster(km[1], km[2]), E.t ? fdt(E.t) : '', note(km[1], km[2]), E.r || ''];
    const ds = byKey[key];
    if (!ds) {   // coche posée depuis la vue par type sur un indice ancien
      const m = key.match(/^(.*)-([^-]+)$/), hm = m && HMETA[m[1]];
      rows.push([m ? m[1] : key, m ? m[2] : '', hm ? hm.ti : '', hm ? (TY[hm.t] || hm.t) : '', hm ? PHN[phase(hm.t, hm.ti)] : '', hm ? (FL[hm.f] || hm.f) : '', hm ? hm.z : '', '', 'Indice ancien', '', '', '',
        m ? hist(m[1], m[2]).map(e => `${e[2]} ${e[3]} : ${e[5] || 'sans texte'}`).join(' | ') : '', '', ...tail]);
      return;
    }
    ds.forEach(d => {
      const main = d.cir === 'mo' ? d.rv.find(r => r.n === 'MO') : null;
      rows.push([d.k, d.i, d.ti, TY[d.t] || d.t, PHN[phase(d.t, d.ti)], FL[d.f] || d.f, d.z, d.cir === 'mo' ? 'MO-AMO' : 'SAS mandataires', label(d.s, d.cir), main ? main.v : '', main && main.d ? fd(main.d) : '',
        d.rv.filter(r => r !== main).map(r => `${r.n} ${r.s === 'att' ? 'en attente' : r.v}`).join(' | '),
        hist(d.k, d.i).map(e => `${e[2]} ${e[3]} : ${e[5] || 'sans texte'}`).join(' | '),
        d.rv.flatMap(r => r.pj).join(' | '), ...tail]);
    });
  });
  if (rows.length === 1) { toast('Aucun plan coché ni commenté pour le moment'); return; }
  const csv = rows.map(r => r.map(v => '"' + String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"').join(';')).join('\r\n');
  download(`FGH_Suivi_visas_${stamp()}.csv`, '﻿' + csv, 'text/csv;charset=utf-8');
  toast(`${rows.length - 1} ligne(s) exportée(s)`);
}
function savePage(){
  document.getElementById('saved-state').textContent = JSON.stringify(DONE).replace(/</g, '\\u003c');
  $('#toast').classList.remove('show');
  const html = '<!doctype html>\n' + document.documentElement.outerHTML;
  download(`FGH_Recap_visas_Karnial_${stamp()}.html`, html, 'text/html;charset=utf-8');
  DIRTY = false; renderSuivi();
  toast('Page enregistrée avec les coches : remplacez l\'ancien fichier par celui-ci');
}
const label = (s, cir) => s === 'inf' ? 'Pour information' : s === 'nov' ? 'Sans visa demandé' : (ST[s].sl && ST[s].sl[cir]) || ST[s].l;

const pool = () => DOCS.filter(d => (S.cir === 'all' || d.cir === S.cir) && (!S.t || d.t === S.t) && (!S.f || d.f === S.f) && (!S.z || d.z === S.z) && (!S.fd || state(d.k, d.i) === S.fd) && (!S.fr || resp(d.k, d.i) === S.fr) && (!S.q || d.search.includes(S.q) || (note(d.k, d.i) + ' ' + rnote(d.k, d.i)).toLowerCase().includes(S.q)));
const wof = d => resp(d.k, d.i) || 'Non attribué';
function render(){
  const VIS = S.cir === 'all' || S.cir === 'mo' || S.cir === 'sas';
  $('#tabs').innerHTML = `<button class="tab" type="button" data-cir="all" aria-pressed="${VIS}">Visas MO et SAS mandataires<small>circuits MO-AMO et SAS · ${DOCS.length} documents</small></button>` +
    `<button class="tab" type="button" data-cir="types" aria-pressed="${S.cir === 'types'}">Commentaires par type de plan<small>${topPlans(ALLC.filter(c => cur(c))).length} plans refusés ou commentés</small></button>` +
    `<button class="tab" type="button" data-cir="proj" aria-pressed="${S.cir === 'proj'}">Vue d'ensemble du projet<small>${PLANS.length} plans · ${PLANS.filter(toVal).length} restent à valider</small></button>` +
    `<button class="tab" type="button" data-cir="com" aria-pressed="${S.cir === 'com'}">Tous les commentaires<small>${COMS.length} commentaires · PDF et Karnial</small></button>`;
  $('#vdocs').hidden = S.cir === 'types' || S.cir === 'proj' || S.cir === 'com'; $('#vtypes').hidden = S.cir !== 'types'; $('#vproj').hidden = S.cir !== 'proj'; $('#vcom').hidden = S.cir !== 'com';
  renderSuivi(); fillNames();
  if (S.cir === 'proj') { renderProj(); return; }
  if (S.cir === 'com') { renderCom(); return; }
  if (S.cir === 'types') { renderTypes(); return; }
  $('#fc').innerHTML = [['all', 'Circuits MO-AMO et SAS'], ['mo', CIR.mo[0] + ' seul (' + DOCS.filter(d => d.cir === 'mo').length + ')'], ['sas', CIR.sas[0] + ' seuls (' + DOCS.filter(d => d.cir === 'sas').length + ')']].map(o => `<option value="${o[0]}"${S.cir === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('');
  $('#fso').innerHTML = [['', 'Tri par statut du visa'], ['w', 'Tri par personne en charge']].map(o => `<option value="${o[0]}"${S.so === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('');
  const all = pool(), n = {}; ORDER.forEach(k => n[k] = 0); all.forEach(d => n[d.s]++);
  const tot = all.length || 1;
  $('#tiles').innerHTML = ['ok','obs','rej','att'].map(k => `<button class="tile ${k}" type="button" data-st="${k}" aria-pressed="${S.st === k}"><span class="n">${n[k]}</span><span class="l">${label(k, S.cir)}</span><span class="s">${Math.round(n[k]/tot*100)} %${ST[k].s[S.cir] ? ' · ' + ST[k].s[S.cir] : ''}</span></button>`).join('');
  $('#bar').innerHTML = ['ok','obs','rej','att','inf','nov'].filter(k => n[k]).map(k => `<i class="${k}" style="width:${n[k]/tot*100}%;background:var(--c)" title="${label(k, S.cir)} : ${n[k]}"></i>`).join('');
  $('#bar').setAttribute('aria-label', ORDER.map(k => label(k, S.cir) + ' ' + n[k]).join(', '));
  const mn = [];
  if (n.inf) mn.push(`<button type="button" data-st="inf">${n.inf} pour information ou non visé(s)</button>`);
  if (n.nov) mn.push(`<button type="button" data-st="nov">${n.nov} sans visa demandé</button>`);
  const nm = all.filter(d => d.nomotif).length;
  if (nm) mn.push(`<button type="button" data-nm="1">${S.nm ? 'Revenir à tous les documents' : nm + ' refusé(s) ou commenté(s) sans commentaire ni pièce jointe'}</button>`);
  if (S.st) mn.push(`<button type="button" data-st="">Tout afficher</button>`);
  $('#minor').innerHTML = mn.join(' · ');
  const list = all.filter(d => (!S.st || d.s === S.st) && (!S.nm || d.nomotif)).sort((a, b) => (S.so === 'w' ? wof(a).localeCompare(wof(b), 'fr') : 0) || ORDER.indexOf(a.s) - ORDER.indexOf(b.s) || a.k.localeCompare(b.k));
  $('#count').textContent = `${list.length} document(s)`;
  let lastW = null;
  const rowG = d => { const w = wof(d); let h = ''; if (S.so === 'w' && w !== lastW) { lastW = w; h = `<tr class="grpw"><td colspan="6">${esc(w)}<small>${list.filter(x => wof(x) === w).length} document(s)</small></td></tr>`; } return h + row(d); };
  $('#tb').innerHTML = list.length ? list.slice(0, S.n).map(rowG).join('') : `<tr><td colspan="6"><div class="empty">Aucun document ne correspond.</div></td></tr>`;
  $('#more').hidden = list.length <= S.n; $('#more').textContent = `Afficher la suite (${Math.max(0, list.length - S.n)} restants)`;
}
const pjBtns = r => r.pj.map(p => `<button type="button" data-copy="${esc(p)}" title="Copier le nom du fichier">${esc(p)}</button>`).join('');
function row(d){
  const main = d.cir === 'mo' ? d.rv.find(r => r.n === 'MO') : null;
  const code = main && main.v ? main.v : '';
  const when = main ? (main.d ? 'visa du ' + fd(main.d) : main.p ? 'attendu le ' + fd(main.p) : '') : (d.dep ? 'déposé le ' + fd(d.dep) : '');
  // motif : avis défavorables ou avec observations, avec leur commentaire ou leur pièce jointe
  const why = d.rv.filter(r => r.s === 'rej' || r.s === 'obs');
  const rest = d.rv.filter(r => !why.includes(r) && r !== main);
  const motif = why.map(r => `<div class="m ${r.s}"><div class="mh"><b>${esc(r.n)} · ${esc(r.v)}</b><span class="code">${fd(r.d)}</span></div>${r.c ? `<div class="mc">${esc(r.c)}</div>` : ''}${r.pj.length ? `<div class="pj"><span class="by">Pièce jointe du visa</span>${pjBtns(r)}</div>` : ''}${!r.c && !r.pj.length ? '<div class="none">Ni commentaire ni pièce jointe dans l\'export</div>' : ''}</div>`).join('');
  const okpj = main && !why.includes(main) && main.pj.length ? `<div class="pj"><span class="by">Pièce jointe du visa MO</span>${pjBtns(main)}</div>` : '';
  const rv = rest.map(r => `<div class="r ${r.s}"><span class="who">${esc(r.n)}</span><b>${r.s === 'att' ? 'en attente' : esc(r.v)}</b><span class="code">${r.d ? fd(r.d) : r.p ? 'attendu le ' + fd(r.p) : ''}</span>${r.pj.length ? `<div class="pj">${pjBtns(r)}</div>` : ''}</div>`).join('');
  const he = e => `<div class="he ${hcls(e[3])}"><div class="hw"><b>${esc(e[2])} · ${esc(e[3])}</b><span class="code">${fd(e[1])}${e[4] ? ' · ' + esc(e[4]) : ''}${e[0] === 'MO-AMO' ? ' · circuit MO-AMO' : ''}</span></div>${e[5] ? `<div class="tx">${esc(e[5])}</div>` : '<div class="no">avis rendu sans texte</div>'}</div>`;
  const cur = hist(d.k, d.i), olds = Object.keys(HIST[d.k] || {}).filter(i => i !== d.i).sort().reverse();
  const hc = (cur.length ? `<div class="hc"><span class="hh">Commentaires Karnial sur l'indice ${esc(d.i)}</span>${cur.map(he).join('')}</div>` : '') +
    (olds.length ? `<details class="old"><summary>Commentaires des indices précédents (${olds.reduce((s, i) => s + HIST[d.k][i].length, 0)})</summary>${olds.map(i => `<div class="ib">Indice ${esc(i)}</div>${HIST[d.k][i].map(he).join('')}`).join('')}</details>` : '');
  const nx = d.nx ? `<span class="nx ${d.nx[1]}">ind. ${esc(d.nx[0])} au SAS : ${label(d.nx[1], 'sas').toLowerCase()}</span>` : '';
  const dn = isDone(d.k, d.i), de = DONE[dkey(d.k, d.i)];
  const en = isEnc(d.k, d.i);
  return `<tr class="d ${d.s}${dn ? ' done' : en ? ' enc' : ''}"><td><span class="pill">${label(d.s, d.cir)}${code ? `<small>${esc(code)}</small>` : ''}</span><span class="when">${when}</span></td>
    <td><div class="ti">${esc(d.ti)}</div><div class="code mono">${esc(d.k)}</div><span class="cirt">${d.cir === 'mo' ? 'circuit MO-AMO' : 'SAS mandataires'}</span>${plinks(d.k, d.cir)}${nx}</td>
    <td class="ind">${esc(d.i)}</td><td><div class="rv">${motif || okpj || (hc ? '' : '<span class="code">—</span>')}</div>${hc}</td><td><div class="rv">${rv || '<span class="code">—</span>'}</div></td>
    <td class="dc"><label class="dn e"><input type="checkbox" data-enc="${esc(d.k)}" data-i="${esc(d.i)}"${en ? ' checked' : ''}><span>En cours${en && isEncAuto(d.k, d.i) ? `<small>ind. ${esc(LAST[d.k])} au SAS</small>` : ''}</span></label><label class="dn"><input type="checkbox" data-done="${esc(d.k)}" data-i="${esc(d.i)}"${dn ? ' checked' : ''}><span>Fait${dn ? `<small>${isAuto(d.k, d.i) ? 'indice remplacé (ind. ' + esc(LAST[d.k]) + ')' : fdt(de.t)}</small>` : ''}</span></label><label class="rs">Responsable de la reprise<input type="text" list="names" data-resp="${esc(d.k)}" data-i="${esc(d.i)}" value="${esc(resp(d.k, d.i))}" placeholder="Nom"></label><textarea class="nt${note(d.k, d.i) ? ' has' : ''}" rows="1" data-note="${esc(d.k)}" data-i="${esc(d.i)}" placeholder="Commentaire…" aria-label="Commentaire AB">${esc(note(d.k, d.i))}</textarea>${dn || rnote(d.k, d.i) ? `<textarea class="nt rp${rnote(d.k, d.i) ? ' has' : ''}" rows="1" data-note="${esc(d.k)}" data-i="${esc(d.i)}" data-f="r" placeholder="Après reprise : ce qui a été fait…" aria-label="Commentaire après reprise">${esc(rnote(d.k, d.i))}</textarea>` : ''}</td></tr>`;
}
// tous les commentaires et refus de l'historique, à plat
const ALLC = [];
Object.keys(HIST).forEach(k => { const m = HMETA[k]; Object.keys(HIST[k]).forEach(i => HIST[k][i].forEach(e => ALLC.push({k, i, m, ph:phase(m.t, m.ti), last:i === m.last, cir:e[0], d:e[1], who:e[2], v:e[3], by:e[4], c:e[5], cls:hcls(e[3])}))); });
const GENERIC = /(cf\.?|voir|selon|dans|en|avec)\b.*(annexe|\bpj\b|pi[èe]ce jointe|ci-joint|joint)/i;
{
  const seen = new Set(ALLC.map(c => dkey(c.k, c.i)));
  DOCS.forEach(d => {
    if ((d.s !== 'rej' && d.s !== 'obs') || seen.has(dkey(d.k, d.i))) return;
    seen.add(dkey(d.k, d.i));
    const r = (d.cir === 'mo' && d.rv.find(x => x.n === 'MO')) || d.rv.find(x => x.s === d.s) || d.rv[0] || {};
    const m = HMETA[d.k] || {t:d.t, f:d.f, z:d.z, ti:d.ti, last:LAST[d.k] || d.i};
    ALLC.push({k:d.k, i:d.i, m, ph:phase(d.t, d.ti), last:!isOld(d.k, d.i), cir:d.cir === 'mo' ? 'MO-AMO' : 'SAS', d:r.d || '', who:r.n || '', v:r.v || '', by:'', c:'', cls:d.s, syn:1, pj:d.rv.flatMap(x => x.pj)});
  });
}
const NAVIS = ALLC.filter(c => !c.syn).length;
// un plan = un code de document : s'il apparaît à plusieurs indices (MO et SAS), seul l'indice le plus récent compte
const topPlans = xs => { const m = new Map(); xs.forEach(c => { const p = m.get(c.k); if (!p || parseInt(c.i, 10) > parseInt(p.i, 10)) m.set(c.k, c); }); return [...m.values()]; };
const nplans = xs => new Set(xs.map(c => dkey(c.k, c.i))).size;
// ---------- vue d'ensemble du projet : un plan = un code, avec son visa MO et son visa BUR (Burckhardt)
const OUV = [[/noyaux?\s+([A-K])\b/i, null], [/exten[st]ion/i, 'Extension des dalles en façade'], [/socle|triangle/i, 'Façade socle'], [/patio/i, 'Patio'], [/charpente|m[ée]tallique/i, 'Charpente métallique'],
  [/piscine/i, 'Piscine'], [/radier/i, 'Radier'], [/fondation|pieu|semelle/i, 'Fondations'], [/grue/i, 'Grues'], [/escalier|vol[ée]e|palier/i, 'Escaliers'], [/carneau|rampe/i, 'Rampe et carneau'], [/gaine/i, 'Gaines'],
  [/tr[ée]mie|carottage|percement|r[ée]servation/i, 'Trémies et percements'], [/joint de dilatation/i, 'Joints de dilatation'], [/renforcement|renfort|carbone|lamelle/i, 'Renforcements'], [/poteau|colonne/i, 'Poteaux'],
  [/toiture|[ée]dicule/i, 'Toiture'], [/\bPLT\b|plantamour/i, 'Plantamour'], [/rep[ée]rage des charges/i, 'Repérage des charges'], [/suivi visa/i, 'Suivi des visas'],
  [/dalle|zone [AB]\d/i, 'Dalles par zone'], [/[ée]l[ée]vation|mur|voile/i, 'Élévations hors noyaux'], [/liste de fers/i, 'Listes de fers par secteur'], [/d[ée]mol|sciage/i, 'Démolition'],
  [/note|rapport|convention|g[ée]otechni|sismique|calcul/i, 'Notes et rapports']];
const ouv = ti => { for (const [rx, lab] of OUV) { const m = ti.match(rx); if (m) return lab || 'Noyau ' + m[1].toUpperCase(); } return 'Autres'; };
const PLANS = [];
{
  const m = new Map();
  DOCS.forEach(d => { let p = m.get(d.k); if (!p) { p = {k:d.k, t:d.t, f:d.f, z:d.z, ti:d.ti, num:d.k.split('-').pop(), o:ouv(d.ti), ph:phase(d.t, d.ti)}; m.set(d.k, p); PLANS.push(p); } p[d.cir] = d; });
  PLANS.forEach(p => {
    const rows = [p.sas, p.mo].filter(Boolean).sort((a, b) => parseInt(b.i, 10) - parseInt(a.i, 10));
    p.row = rows[0]; p.last = LAST[p.k] || p.row.i;
    const mr = p.mo && p.mo.rv.find(r => r.n === 'MO');
    p.mos = !p.mo ? 'none' : p.mo.s === 'nov' ? 'nov' : mr ? mr.s : 'none'; p.moi = p.mo ? p.mo.i : ''; p.mov = mr ? mr.v : '';
    let br = null; for (const r of rows) { const x = r.rv.find(v => v.n === 'Burckhardt'); if (x) { br = x; p.bui = r.i; break; } }
    p.bus = br ? br.s : 'none'; p.buv = br ? br.v : ''; p.bui = p.bui || '';
    // validé : visa MO favorable (ou sans visa requis) rendu sur le dernier indice déposé
    p.val = (p.mos === 'ok' || p.mos === 'inf' || p.mos === 'nov') && p.moi === p.last;
    p.search = (p.k + ' ' + p.ti + ' ' + p.o).toLowerCase();
  });
}
const PK = {}; PLANS.forEach(p => PK[p.k] = p);
const HASC = new Set(ALLC.map(c => c.k));
const GOL = {mo:'Visa MO', sas:'SAS', types:'Par type', proj:"Vue d'ensemble", com:'Tous les commentaires'};
const HASCOM = new Set();
// boutons de renvoi vers les autres vues où ce plan apparaît
const plinks = (k, here) => { const p = PK[k] || {}; return '<span class="lk">' + ['mo', 'sas', 'types', 'com', 'proj'].filter(v => v !== here && (v === 'proj' || (v === 'types' ? HASC.has(k) : v === 'com' ? HASCOM.has(k) : p[v]))).map(v => `<button class="linkb" type="button" data-go="${v}" data-code="${esc(k)}" title="Ouvrir ce plan dans « ${GOL[v]} »">${GOL[v]}</button>`).join('') + '</span>'; };
function goPlan(view, k){
  const q = k.toLowerCase(), p = PK[k];
  S.cir = view;
  if (view === 'com') { Object.assign(S, {cq:k, csrc:'', ccl:'', corg:'', cph:'', cz:'', cf:'', cst:'', cr:'', clast:false, cn:300}); $('#cq').value = k; $('#clast').checked = false; }
  else if (view === 'proj') { Object.assign(S, {po:'', pz:'', pf:[], pn:'', pt:'', pm:'', pb:'', ps:'', pr:'', pa:'', prest:false, pq:k}); $('#pq').value = k; $('#prest').checked = false; if (p) OPENP.add(S.pg + '|' + PGB[S.pg][1](p)); }
  else if (view === 'types') { Object.assign(S, {ph:p ? p.ph : S.ph, tcls:'', twho:'', tcir:'', tfd:'', tfr:'', tscope:'all', tq:q}); $('#tq').value = k; $('#tscope').value = 'all'; $('#tcir').value = ''; $('#tfd').value = ''; }
  else { Object.assign(S, {st:'', nm:false, t:'', f:'', z:'', fd:'', fr:'', n:150, q}); $('#q').value = k; $('#fd').value = ''; selects(); }
  render();
  if (typeof window.scrollTo === 'function') window.scrollTo(0, 0);
}
// catégories « à traiter par » issues de l'analyse des PDF (classement automatique par mots-clés)
const PCL = {S:'AB structure', D:'AB dessin', C:'Coordination', P:'SPVA', B:'BR', R:'Renvoi', A:'Annotation AB'};
const PCO = ['S', 'D', 'C', 'P', 'B', 'R', 'A'];
PLANS.forEach(p => {
  p.pc = (PDFC[p.k] || []).map(c => ({i:c[0], cl:c[1], org:c[2], visa:c[3], t:c[4], pf:c[5], pg:c[6]}));
  // on retient les commentaires de l'indice le plus récent qui en porte
  const mi = p.pc.reduce((m, c) => Math.max(m, parseInt(c.i, 10)), -1);
  p.pcl = p.pc.filter(c => parseInt(c.i, 10) === mi); p.pci = p.pcl.length ? p.pcl[0].i : '';
  p.pcm = PCO.slice(0, 5).find(k => p.pcl.some(c => c.cl === k)) || '';
  p.pcs = PCO.filter(k => p.pcl.some(c => c.cl === k)).map(k => p.pcl.filter(c => c.cl === k).length + ' ' + PCL[k]).join(' · ');
});
// ---------- page « Tous les commentaires » : PDF de visa + historique Karnial
PCL.N = 'Sans demande';
const COMS = [];
PLANS.forEach(p => {
  (PDFC[p.k] || []).forEach(c => COMS.push({src:'PDF', p, i:c[0], cl:c[1], org:c[2], visa:c[3], t:c[4], d:'', pf:c[5], pg:c[6]}));
  const h = HIST[p.k] || {}, hc = HCAT[p.k] || {};
  Object.keys(h).forEach(i => h[i].forEach((e, n) => { if (e[5]) COMS.push({src:'Karnial', p, i, cl:(hc[i] || [])[n] || 'N', org:e[2], visa:e[2] + ' ' + e[3], t:e[5], d:e[1]}); }));
});
COMS.forEach(c => { c.s = (c.t + ' ' + c.p.k + '-' + c.i + ' ' + c.p.ti + ' ' + c.org).toLowerCase(); c.last = c.i === c.p.last; });
COMS.forEach(c => HASCOM.add(c.p.k));
const CCO = ['S', 'D', 'C', 'P', 'B', 'R', 'A', 'N'];
const SANSP = '(déposant inconnu)';
function comList(){
  const q = S.cq.trim().toLowerCase();
  return COMS.filter(c => (!S.clast || c.last) && (!S.csrc || c.src === S.csrc) && (!S.corg || c.org === S.corg) && (!S.cph || c.p.ph === S.cph) && (!S.cz || c.p.z === S.cz) && (!S.cf || c.p.f === S.cf)
    && (!S.cst || state(c.p.k, c.i) === S.cst) && (!S.cr || (poster(c.p.k, c.i) || SANSP) === S.cr) && (!q || c.s.includes(q)));
}
function renderCom(){
  const opt = (id, all, vals, cur, lab) => { $(id).innerHTML = `<option value="">${all}</option>` + vals.map(v => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(lab ? lab(v) : v)}</option>`).join(''); };
  const u = f => [...new Set(COMS.map(f))].sort((a, b) => a.localeCompare(b, 'fr'));
  opt('#csrc', 'PDF de visa et historique Karnial', ['PDF', 'Karnial'], S.csrc, v => v === 'PDF' ? 'PDF de visa seulement' : 'Historique Karnial seulement');
  opt('#corg', 'Tous les émetteurs', u(c => c.org), S.corg);
  opt('#cph', 'Tous les types de plan', Object.keys(PHN), S.cph, v => PHN[v]);
  opt('#cz', 'Toutes les zones', u(c => c.p.z), S.cz);
  opt('#cf', 'Tous les niveaux', u(c => c.p.f), S.cf, v => FL[v] || v);
  opt('#cst', 'Tous les états de suivi', ['todo', 'enc', 'done'], S.cst, v => ({todo:'À traiter', enc:'En cours', done:'Fait'})[v]);
  opt('#cr', 'Déposé sur Kairnial par : tous', u(c => poster(c.p.k, c.i) || SANSP), S.cr || '', v => 'Déposé par ' + v);
  $('#cso').innerHTML = [['', 'Tri par code'], ['fin', 'Tri : traités à la fin'], ['deb', 'Tri : traités en premier'], ['etat', 'Tri : à traiter, en cours, traités'], ['dep', 'Tri par déposant']].map(o => `<option value="${o[0]}"${(S.cso || '') === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('');
  const base = comList();
  $('#ccl').innerHTML = `<button class="chip big" type="button" data-ccl="" aria-pressed="${!S.ccl}">Tous<small>${base.length}</small></button>` +
    CCO.map(k => { const n = base.filter(c => c.cl === k).length; return n || S.ccl === k ? `<button class="chip big c-${k}" type="button" data-ccl="${k}" aria-pressed="${S.ccl === k}">${PCL[k]}<small>${n}</small></button>` : ''; }).join('');
  const list = base.filter(c => !S.ccl || c.cl === S.ccl);
  const plans = new Map(); list.forEach(c => { const id = c.p.k + '|' + c.i; if (!plans.has(id)) plans.set(id, []); plans.get(id).push(c); });
  $('#ccount').innerHTML = `<b>${list.length} commentaire(s) sur ${plans.size} plan(s)</b><span>${list.filter(c => c.src === 'PDF').length} lus dans les PDF de visa · ${list.filter(c => c.src === 'Karnial').length} de l'historique Karnial</span><span>classement « à traiter par » automatique, par mots-clés</span>`;
  const RK = {todo: 0, enc: 1, done: 2}, stOf = id => { const c = plans.get(id)[0]; return state(c.p.k, c.i); }, depOf = id => { const c = plans.get(id)[0]; return poster(c.p.k, c.i) || SANSP; };
  const ids = [...plans.keys()].sort((a, b) => (S.cso === 'fin' ? (stOf(a) === 'done') - (stOf(b) === 'done') : S.cso === 'deb' ? (stOf(b) === 'done') - (stOf(a) === 'done') : S.cso === 'etat' ? RK[stOf(a)] - RK[stOf(b)] : S.cso === 'dep' ? depOf(a).localeCompare(depOf(b), 'fr') : 0) || a.localeCompare(b));
  let shown = 0, h = '', lastG = null;
  const GL = {todo: 'À traiter', enc: 'En cours', done: 'Traités'};
  const grp = id => S.cso === 'dep' ? depOf(id) : S.cso === 'etat' ? GL[stOf(id)] : S.cso === 'fin' || S.cso === 'deb' ? (stOf(id) === 'done' ? 'Traités' : 'Non traités') : null;
  for (const id of ids) {
    if (shown >= S.cn) break;
    const cs = plans.get(id).sort((a, b) => CCO.indexOf(a.cl) - CCO.indexOf(b.cl)), p = cs[0].p, i = cs[0].i, st = state(p.k, i); shown += cs.length;
    const g = grp(id); if (g !== null && g !== lastG) { lastG = g; h += `<h3 class="cgt">${esc(g)}<small>${ids.filter(x => grp(x) === g).length} plan(s)</small></h3>`; }
    h += `<section class="cg st-${st}"><div class="cgh"><span class="mono">${esc(p.k)}-${esc(i)}</span><b>${esc(p.ti)}</b><span class="code">${esc(FL[p.f] || p.f)} · ${esc(p.z)} · ${esc(PHN[p.ph])}${i !== p.last ? ' · indice ancien (dernier : ' + esc(p.last) + ')' : ''}${poster(p.k, i) ? ' · déposé par ' + esc(poster(p.k, i)) : ''}</span>${plinks(p.k, 'com')}
      <label class="ecl"><input type="checkbox" data-enc="${esc(p.k)}" data-i="${esc(i)}"${st === 'enc' ? ' checked' : ''}>en cours</label><label class="ecl f"><input type="checkbox" data-done="${esc(p.k)}" data-i="${esc(i)}"${st === 'done' ? ' checked' : ''}>fait</label>
      <input class="cin${note(p.k, i) ? ' has' : ''}" type="text" data-note="${esc(p.k)}" data-i="${esc(i)}" data-f="n" value="${esc(note(p.k, i))}" placeholder="Commentaire AB…" aria-label="Commentaire AB"></div>
      <ul class="pcd-l">${cs.map(c => `<li class="k-${c.cl}"><span class="pcb c-${c.cl}">${PCL[c.cl]}</span><span class="code">${esc(c.org)} · ${esc(c.visa)}${c.d ? ' · ' + fd(c.d) : ''} · ${c.src === 'PDF' ? 'PDF de visa' : 'historique Karnial'}</span>${c.src === 'PDF' ? pdfLink(c.pf, c.pg) : ''}<span class="pct">${esc(c.t)}</span></li>`).join('')}</ul></section>`;
  }
  if (shown < list.length) h += `<button class="btn ghost" type="button" id="cmore">Afficher la suite (${list.length - shown} commentaires restants)</button>`;
  $('#cout').innerHTML = h || '<div class="empty">Aucun commentaire avec ces filtres.</div>';
}
function exportCom(){
  const list = comList().filter(c => !S.ccl || c.cl === S.ccl);
  if (!list.length) { toast('Aucun commentaire à exporter'); return; }
  const rows = [['Code', 'Indice', 'Dernier indice', 'Titre', 'Type de plan', 'Niveau', 'Zone', 'À traiter par', 'Émetteur', 'Visa', 'Date', 'Source', 'Fichier PDF', 'Page', 'Commentaire', 'État du suivi', 'En charge de la reprise', 'Commentaire AB']];
  list.slice().sort((a, b) => a.p.k.localeCompare(b.p.k) || a.i.localeCompare(b.i) || CCO.indexOf(a.cl) - CCO.indexOf(b.cl)).forEach(c => rows.push([c.p.k, c.i, c.p.last, c.p.ti, PHN[c.p.ph], FL[c.p.f] || c.p.f, c.p.z, PCL[c.cl], c.org, c.visa, c.d ? fd(c.d) : '', c.src === 'PDF' ? 'PDF de visa' : 'Historique Karnial', c.pf != null ? PDFF[c.pf] : '', c.pf != null ? c.pg : '', c.t, stateLabel(c.p.k, c.i), resp(c.p.k, c.i), note(c.p.k, c.i)]));
  download(`FGH_Tous_les_commentaires_${stamp()}.csv`, '﻿' + csvOut(rows), 'text/csv;charset=utf-8');
  toast(`${rows.length - 1} commentaire(s) exporté(s)`);
}
const pcHtml = p => !p.pc.length ? '' : `<details class="pcd"><summary>${p.pcl.length} commentaire(s) dans les PDF de visa${p.pci && p.pci !== p.last ? ' (indice ' + esc(p.pci) + ')' : ''} · ${esc(p.pcs)}</summary><ul>${
  p.pc.slice().sort((a, b) => parseInt(b.i, 10) - parseInt(a.i, 10) || PCO.indexOf(a.cl) - PCO.indexOf(b.cl)).map(c => `<li><span class="pcb c-${c.cl}">${PCL[c.cl]}</span><span class="code">${esc(c.org)} · ${esc(c.visa)} · ind. ${esc(c.i)}</span>${pdfLink(c.pf, c.pg)}<span class="pct">${esc(c.t)}</span></li>`).join('')}</ul></details>`;
const PSL = {ok:'validé', obs:'commentaires', rej:'refusé', att:'en attente', inf:'pour information', nov:'sans visa demandé', none:'non soumis'};
const PGB = {z:['Zone', p => p.z], o:["Partie d'ouvrage", p => p.o], f:['Niveau', p => p.f], n:['Série de numéros', p => p.num.slice(0, 2)], w:['Personne en charge', p => resp(p.k, p.row.i) || 'Non attribué']};
const pglab = (g, v) => g === 'f' ? (FL[v] || v) : g === 'n' ? 'Numéros ' + v + 'xx' : g === 'z' ? 'Zone ' + v : v;
const OPENP = new Set(); let PGROUPS = {};
const pnote = p => note(p.k, p.row.i);
const pstate = p => state(p.k, p.row.i);
// reste à valider : pas de visa MO favorable sur le dernier indice, et pas encore coché « fait »
const toVal = p => !p.val && pstate(p) !== 'done';
const pgresp = g => { const n = resp(g[0].k, g[0].row.i); return n && g.every(p => resp(p.k, p.row.i) === n) ? n : ''; };
const pgnote = g => { const n = pnote(g[0]); return n && g.every(p => pnote(p) === n) ? n : ''; };
const pv = (who, s, v, i) => `<span class="pv s-${s}" title="Visa ${who}${i ? ' sur indice ' + i : ''}">${who} ${s === 'none' ? '–' : esc(v || PSL[s])}${i ? ' · ' + esc(i) : ''}</span>`;
function projSelects(){
  const opt = (id, all, vals, cur, lab) => { $(id).innerHTML = `<option value="">${all}</option>` + vals.map(v => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(lab ? lab(v) : v)}</option>`).join(''); };
  const u = f => [...new Set(PLANS.map(f))].sort((a, b) => a.localeCompare(b, 'fr'));
  opt('#po', "Toutes les parties d'ouvrage", u(p => p.o), S.po);
  opt('#pz', 'Toutes les zones', u(p => p.z), S.pz);
  $('#pfc').innerHTML = '<span class="lvl-l">Niveaux</span>' + `<button class="chip" type="button" data-pf="" aria-pressed="${!S.pf.length}">Tous</button>` + u(p => p.f).map(v => `<button class="chip" type="button" data-pf="${esc(v)}" aria-pressed="${S.pf.includes(v)}">${esc(FL[v] || v)}</button>`).join('') + (S.pf.length > 1 ? `<span class="lvl-l">${S.pf.length} niveaux sélectionnés</span>` : '');
  opt('#pn', 'Tous les numéros', u(p => p.num.slice(0, 2)), S.pn, v => v + 'xx');
  opt('#pt', 'Tous les types de plan', Object.keys(PHN), S.pt, v => PHN[v]);
  const st = ['rej', 'obs', 'att', 'ok', 'none'];
  opt('#pm', 'Visa MO : tous', st, S.pm, v => 'MO ' + PSL[v]);
  opt('#pb', 'Visa BUR : tous', st, S.pb, v => 'BUR ' + PSL[v]);
  opt('#pa', 'Commentaires PDF : tous', ['S', 'D', 'C', 'P', 'B', '0'], S.pa, v => v === '0' ? 'Sans commentaire PDF' : 'À traiter par : ' + PCL[v]);
  opt('#ps', 'Tous les états de suivi', ['todo', 'enc', 'done'], S.ps, v => ({todo:'Ni en cours ni fait', enc:'En cours', done:'Fait'})[v]);
  opt('#pr', 'Tous les responsables', allNames(), S.pr);
}
function renderProj(){
  projSelects();
  $('#pgrp').innerHTML = '<span style="font-size:12px;color:var(--mute);margin-right:4px">Regrouper par</span>' + Object.keys(PGB).map(g => `<button class="chip big" type="button" data-pg="${g}" aria-pressed="${S.pg === g}">${PGB[g][0]}</button>`).join('');
  $('#pleg').innerHTML = '<b>Chaque vignette : numéro du plan, visa MO à gauche, visa BUR (Burckhardt) à droite</b>' + ['ok', 'obs', 'rej', 'att', 'none'].map(s => `<span><i class="s-${s}"></i>${PSL[s]}</span>`).join('') + '<span>vignette estompée = validé par le MO au dernier indice, ou coché « fait »</span><span><i class="c-S" style="border:0"></i>bandeau du bas : commentaires des PDF, à traiter par AB structure</span><span><i class="c-D" style="border:0"></i>AB dessin</span><span><i class="c-B" style="border:0"></i>BR, SPVA ou coordination</span>';
  const q = S.pq.trim().toLowerCase();
  const list = PLANS.filter(p => (!S.po || p.o === S.po) && (!S.pz || p.z === S.pz) && (!S.pf.length || S.pf.includes(p.f)) && (!S.pn || p.num.startsWith(S.pn)) && (!S.pt || p.ph === S.pt) && (!S.pm || p.mos === S.pm) && (!S.pb || p.bus === S.pb) && (!S.prest || toVal(p)) && (!S.pa || (S.pa === '0' ? !p.pcl.length : p.pcl.some(c => c.cl === S.pa))) && (!S.ps || pstate(p) === S.ps) && (!S.pr || resp(p.k, p.row.i) === S.pr) && (!q || p.search.includes(q)));
  const get = PGB[S.pg][1], groups = new Map();
  list.forEach(p => { const v = get(p); if (!groups.has(v)) groups.set(v, []); groups.get(v).push(p); });
  PGROUPS = {};
  const bar = (g, f) => ['rej', 'obs', 'att', 'none', 'inf', 'nov', 'ok'].map(s => { const n = g.filter(p => p[f] === s).length; return n ? `<i class="s-${s}" style="width:${n / g.length * 100}%" title="${n} ${PSL[s]}"></i>` : ''; }).join('');
  const rest = list.filter(toVal).length, nval = list.filter(p => p.val).length;
  let h = `<div class="pleg" style="margin:0"><b>${list.length} plan(s) · ${rest} restent à valider · ${nval} validés par le MO · ${list.length - rest - nval} faits</b><span>visa MO : ${['rej', 'obs', 'att', 'none'].map(s => list.filter(p => p.mos === s).length + ' ' + PSL[s]).join(' · ')}</span></div>`;
  [...groups.keys()].sort((a, b) => a.localeCompare(b, 'fr')).forEach(v => {
    const g = groups.get(v).sort((a, b) => a.f.localeCompare(b.f) || a.num.localeCompare(b.num) || a.k.localeCompare(b.k)), gid = S.pg + '|' + v; PGROUPS[gid] = g;
    const r = g.filter(toVal).length, nr = g.filter(p => p.mos === 'rej').length, no = g.filter(p => p.mos === 'obs').length;
    // vignettes rangées par niveau (ou par zone quand on regroupe déjà par niveau)
    const sub = S.pg === 'f' ? (p => 'Zone ' + p.z) : (p => FL[p.f] || p.f); let lastSub = null, tiles = '';
    (S.pg === 'f' ? g.slice().sort((a, b) => a.z.localeCompare(b.z) || a.num.localeCompare(b.num)) : g).forEach(p => {
      if (sub(p) !== lastSub) { lastSub = sub(p); tiles += `<span class="ptl">${esc(lastSub)}</span>`; }
      tiles += `<span class="pt${toVal(p) ? '' : ' val'} st-${pstate(p)}" title="${esc((pstate(p) === 'enc' ? 'EN COURS · ' + resp(p.k, p.row.i) + ' · ' : pstate(p) === 'done' ? 'FAIT · ' : '') + p.k + '-' + p.last + ' · ' + p.ti + ' · MO ' + (p.mov || PSL[p.mos]) + (p.moi ? ' (ind. ' + p.moi + ')' : '') + ' · BUR ' + (p.buv || PSL[p.bus]) + (p.bui ? ' (ind. ' + p.bui + ')' : '') + (p.pcs ? ' · PDF : ' + p.pcs : ''))}"><b>${esc(p.num)}</b><i class="s-${p.mos}">MO</i><i class="s-${p.bus}">BUR</i>${p.pcm ? `<u class="c-${p.pcm}">${p.pcm === 'S' ? 'STRUCT.' : p.pcm === 'D' ? 'DESSIN' : PCL[p.pcm].toUpperCase().slice(0, 7)} ${p.pcl.filter(c => c.cl === p.pcm).length}</u>` : ''}</span>`;
    });
    h += `<section class="pg2" style="--gc:var(--${nr ? 'rej' : no ? 'obs' : r ? 'att' : 'ok'})"><h3>${esc(pglab(S.pg, v))}<small>${g.length} plan(s) · <b>${r} à valider</b> · MO : ${nr} refusé(s), ${no} avec commentaires</small></h3>
      <div class="pbar">${bar(g, 'mos')}</div><div class="pbar b">${bar(g, 'bus')}</div><div class="pbl">Barre haute : visa MO · barre fine : visa BUR</div>
      <label class="gc">Commentaire AB pour ${g.length > 1 ? 'les ' + g.length + ' plans de ce groupe' : 'ce plan'}<input class="${pgnote(g) ? 'has' : ''}" type="text" data-pnote="${esc(gid)}" value="${esc(pgnote(g))}" placeholder="${g.some(p => pnote(p)) && !pgnote(g) ? 'Commentaires différents selon les plans : une saisie ici les remplace tous' : 'Commentaire général, recopié sur chaque plan du groupe…'}"></label>
      <div class="gall"><label class="ecl"><input type="checkbox" data-pallenc="${esc(gid)}"${g.every(p => pstate(p) === 'enc') ? ' checked' : ''}>tout en cours</label><label class="ecl f"><input type="checkbox" data-palldone="${esc(gid)}"${g.every(p => pstate(p) === 'done') ? ' checked' : ''}>tout fait</label><span class="code">${g.filter(p => pstate(p) === 'enc').length} en cours · ${g.filter(p => pstate(p) === 'done').length} fait(s)</span><span class="code">Commentaires des PDF : ${['S', 'D', 'C', 'P', 'B'].map(k => g.filter(p => p.pcm === k).length + ' plan(s) ' + PCL[k]).join(' · ')}</span></div>
      <label class="gc w">En charge de la reprise pour ${g.length > 1 ? 'les ' + g.length + ' plans de ce groupe' : 'ce plan'}<input type="text" list="names" data-presp="${esc(gid)}" value="${esc(pgresp(g))}" placeholder="${pgresp(g) ? 'Nom' : 'Plusieurs personnes selon les plans : une saisie ici les remplace toutes'}"></label>
      <div class="ptiles">${tiles}</div>
      <details${OPENP.has(gid) ? ' open' : ''} data-pgid="${esc(gid)}"><summary>Voir le détail des ${g.length} plan(s) et commenter plan par plan</summary>${OPENP.has(gid) ? g.map(p => `<div class="prow st-${pstate(p)}"><label class="ecl"><input type="checkbox" data-enc="${esc(p.k)}" data-i="${esc(p.row.i)}"${pstate(p) === 'enc' ? ' checked' : ''}>en cours</label><label class="ecl f"><input type="checkbox" data-done="${esc(p.k)}" data-i="${esc(p.row.i)}"${pstate(p) === 'done' ? ' checked' : ''}>fait</label>${pv('MO', p.mos, p.mov, p.moi)}${pv('BUR', p.bus, p.buv, p.bui)}<span class="mono">${esc(p.k)}-${esc(p.last)}</span><span class="ti">${esc(p.ti)}</span><span class="code">${esc(FL[p.f] || p.f)} · ${esc(p.z)} · ${esc(PHN[p.ph])}</span>${plinks(p.k, 'proj')}<input class="rsp" type="text" list="names" data-resp="${esc(p.k)}" data-i="${esc(p.row.i)}" value="${esc(resp(p.k, p.row.i))}" placeholder="En charge" aria-label="En charge de la reprise" title="En charge de la reprise"><input class="${pnote(p) ? 'has' : ''}" type="text" data-note="${esc(p.k)}" data-i="${esc(p.row.i)}" data-f="n" value="${esc(pnote(p))}" placeholder="Commentaire AB…" aria-label="Commentaire AB">${pcHtml(p)}</div>`).join('') : ''}</details></section>`;
  });
  $('#pout').innerHTML = h || '<div class="empty">Aucun plan avec ces filtres.</div>';
}
function gkey(c){
  if (c.syn) return ['visa|' + c.v, `Visa ${c.v} sans commentaire rédigé dans Karnial : le motif est dans la pièce jointe du visa`];
  const txt = c.c.replace(/\s+/g, ' ').trim();
  if (!txt) return ['', 'Avis rendu sans texte'];
  if (txt.length < 75 && GENERIC.test(txt)) return ['~pj', 'Renvoi à la pièce jointe du visa, sans détail dans Karnial (« ' + txt + ' »)'];
  return [txt.toLowerCase().replace(/[\s.,;:]+$/, ''), c.c.trim()];
}
const cur = c => c.last || (MOI[c.k] === c.i && isOld(c.k, c.i));   // dernier indice, ou indice en cours de reprise
// commentaire commun à tous les plans d'une liste (vide s'ils diffèrent)
const gnote = (g, f) => { const get = c => (DONE[dkey(c.k, c.i)] || {})[f || 'n'] || '', n = get(g[0]); return n && g.every(c => get(c) === n) ? n : ''; };
const gresp = g => { const n = resp(g[0].k, g[0].i); return n && g.every(c => resp(c.k, c.i) === n) ? n : ''; };
const OPENG = new Set(); let GROUPS = {};
function renderTypes(){
  GROUPS = {};
  const q = S.tq;
  const base = ALLC.filter(c => (S.tscope === 'all' || (S.tscope === 'old' ? !cur(c) : cur(c))) && (!S.twho || c.who === S.twho) && (!S.tcir || c.cir === S.tcir) && (!S.tfd || state(c.k, c.i) === S.tfd) && (!S.tfr || resp(c.k, c.i) === S.tfr) && (!q || (c.c + ' ' + c.k + ' ' + c.m.ti).toLowerCase().includes(q)));
  // compteurs en direct : ce qui reste à traiter, et ce qui est déjà coché
  const cnt = xs => { xs = topPlans(xs); const d = nplans(xs.filter(c => isDone(c.k, c.i))), en = nplans(xs.filter(c => isEnc(c.k, c.i))), td = nplans(xs.filter(c => state(c.k, c.i) === 'todo')); return `<small>${td}</small>${en ? `<small class="en2">◐ ${en}</small>` : ''}${d ? `<small class="dn2">✓ ${d}</small>` : ''}`; };
  $('#tchips').innerHTML = Object.keys(PHN).map(p => { const xs = base.filter(c => c.ph === p); return `<button class="chip big${xs.length && xs.every(c => isDone(c.k, c.i)) ? ' alld' : ''}" type="button" data-ph="${p}" aria-pressed="${S.ph === p}" title="${xs.length} commentaire(s) au total">${PHN[p]}${cnt(xs)}</button>`; }).join('');
  const whos = [...new Set(ALLC.map(c => c.who))].sort();
  $('#twho').innerHTML = '<option value="">Tous les émetteurs</option>' + whos.map(w => `<option${w === S.twho ? ' selected' : ''}>${esc(w)}</option>`).join('');
  const inph = base.filter(c => c.ph === S.ph);
  $('#tclass').innerHTML = `<button class="chip" type="button" data-tcls="" aria-pressed="${!S.tcls}">Tout${cnt(inph)}</button>` +
    Object.keys(HCL).map(k => `<button class="chip ${k}" type="button" data-tcls="${k}" aria-pressed="${S.tcls === k}">${HCL[k]}${cnt(inph.filter(c => c.cls === k))}</button>`).join('');
  const list = inph.filter(c => !S.tcls || c.cls === S.tcls);
  const lt = topPlans(list), ld = nplans(lt.filter(c => isDone(c.k, c.i))), le = nplans(lt.filter(c => isEnc(c.k, c.i)));
  $('#tcount').textContent = `${nplans(lt.filter(c => state(c.k, c.i) === 'todo'))} plan(s) à traiter · ${le} en cours · ${ld} traités · ${list.filter(c => !c.syn).length} avis rédigé(s)`;
  let h = '';
  ['rej', 'obs', 'rem'].forEach(cls => {
    const items = list.filter(c => c.cls === cls); if (!items.length) return;
    const groups = new Map();
    items.forEach(c => { const [key, lab] = gkey(c); const g = cls + '|' + c.who + '|' + key; if (!groups.has(g)) groups.set(g, {who:c.who, lab, key, items:[]}); groups.get(g).items.push(c); });
    const gs = [...groups.values()].sort((a, b) => (a.key === '' || a.key === '~pj' ? 1 : 0) - (b.key === '' || b.key === '~pj' ? 1 : 0) || new Set(b.items.map(c => c.k)).size - new Set(a.items.map(c => c.k)).size);
    h += `<div class="sech ${cls}">${HCL[cls]}<span>${nplans(topPlans(items).filter(c => state(c.k, c.i) === 'todo'))} plan(s) à traiter, ${nplans(topPlans(items).filter(c => isEnc(c.k, c.i)))} en cours, ${nplans(topPlans(items).filter(c => isDone(c.k, c.i)))} traité(s) sur ${topPlans(items).length} plan(s) · ${gs.length} motif(s) distinct(s)</span></div><div class="glist">` + gs.map(g => {
      const gid = cls + '|' + g.who + '|' + g.key + '|' + S.ph;
      const uniq = [...new Map(g.items.map(c => [dkey(c.k, c.i), c])).values()], nd = uniq.filter(c => isDone(c.k, c.i)).length;
      GROUPS[gid] = uniq;
      const np = new Set(g.items.map(c => c.k)).size, vs = [...new Set(g.items.map(c => c.v))].join(' / ');
      const dates = g.items.map(c => c.d).filter(Boolean).sort();
      return `<div class="grp ${cls}"><div class="gh"><span class="pill">${esc(vs)}</span><b style="color:var(--ink)">${esc(g.who)}</b><span>${dates.length ? (dates[0] === dates[dates.length-1] ? fd(dates[0]) : 'du ' + fd(dates[0]) + ' au ' + fd(dates[dates.length-1])) : ''}</span></div>
        <div class="gn">${np}<small>plan${np > 1 ? 's' : ''}</small></div>
        <div class="gt">${esc(g.lab)}</div>
        <label class="gc">Commentaire AB pour ${np > 1 ? 'les ' + np + ' plans de cette liste' : 'ce plan'}<input class="${gnote(uniq) ? 'has' : ''}" type="text" data-gnote="${esc(gid)}" value="${esc(gnote(uniq))}" placeholder="${uniq.some(c => note(c.k, c.i)) && !gnote(uniq) ? 'Commentaires différents selon les plans : une saisie ici les remplace tous' : 'Commentaire général, recopié sur chaque plan de la liste…'}"></label>
        <label class="gc w">En charge de la reprise pour ${np > 1 ? 'les ' + np + ' plans de cette liste' : 'ce plan'}<input type="text" list="names" data-gresp="${esc(gid)}" value="${esc(gresp(uniq))}" placeholder="${gresp(uniq) ? 'Nom' : 'Plusieurs personnes selon les plans : une saisie ici les remplace toutes'}"></label>
        <div class="gall"><label class="ecl"><input type="checkbox" data-allenc="${esc(gid)}"${uniq.every(c => isEnc(c.k, c.i)) ? ' checked' : ''}>tout en cours</label><label class="ecl f"><input type="checkbox" data-alldone="${esc(gid)}"${nd === uniq.length ? ' checked' : ''}>tout fait</label></div>
        <details${OPENG.has(gid) ? ' open' : ''} data-gid="${esc(gid)}"><summary>Voir ${np > 1 ? 'les ' + np + ' plans' : 'le plan'} · ${nd} traité(s)</summary><ul>${g.items.slice().sort((a, b) => a.k.localeCompare(b.k) || a.i.localeCompare(b.i)).map(c => `<li class="${isDone(c.k, c.i) ? 'done' : isEnc(c.k, c.i) ? 'enc' : ''}"><label class="ecl"><input type="checkbox" data-enc="${esc(c.k)}" data-i="${esc(c.i)}"${isEnc(c.k, c.i) ? ' checked' : ''}>en cours</label><label class="ecl f"><input type="checkbox" data-done="${esc(c.k)}" data-i="${esc(c.i)}"${isDone(c.k, c.i) ? ' checked' : ''}>fait</label><span class="mono">${esc(c.k)}-${esc(c.i)}</span><span>${esc(c.m.ti)}</span>${plinks(c.k, 'types')}<span class="code">${fd(c.d)}${c.last ? '' : ' · indice ancien'}${isEnc(c.k, c.i) ? ' · en cours' : ''}</span>${c.pj && c.pj.length ? `<span class="code">PJ : ${c.pj.map(esc).join(', ')}</span>` : ''}<div class="lf"><label>Commentaire AB<input class="lin${note(c.k, c.i) ? ' has' : ''}" type="text" data-note="${esc(c.k)}" data-i="${esc(c.i)}" data-f="n" value="${esc(note(c.k, c.i))}" placeholder="Commentaire AB…"></label><label class="w">En charge de la reprise<input class="lin rsp" type="text" list="names" data-resp="${esc(c.k)}" data-i="${esc(c.i)}" value="${esc(resp(c.k, c.i))}" placeholder="Nom"></label>${isDone(c.k, c.i) || rnote(c.k, c.i) ? `<label>Après reprise<input class="lin rp${rnote(c.k, c.i) ? ' has' : ''}" type="text" data-note="${esc(c.k)}" data-i="${esc(c.i)}" data-f="r" value="${esc(rnote(c.k, c.i))}" placeholder="Commentaire après reprise…"></label>` : ''}</div></li>`).join('')}</ul></details></div>`;
    }).join('') + '</div>';
  });
  $('#tout').innerHTML = h || '<div class="empty">Aucun commentaire pour ce type de plan avec ces filtres.</div>';
}
function selects(){
  const ds = DOCS.filter(d => S.cir === 'all' || d.cir === S.cir), uniq = k => [...new Set(ds.map(d => d[k]))].sort();
  $('#ft').innerHTML = '<option value="">Tous les types</option>' + uniq('t').map(v => `<option value="${v}"${v === S.t ? ' selected' : ''}>${TY[v] || v}</option>`).join('');
  $('#ff').innerHTML = '<option value="">Tous les niveaux</option>' + uniq('f').sort((a, b) => b.localeCompare(a)).map(v => `<option value="${v}"${v === S.f ? ' selected' : ''}>${FL[v] || v} (${v})</option>`).join('');
  $('#fz').innerHTML = '<option value="">Toutes les zones</option>' + uniq('z').map(v => `<option${v === S.z ? ' selected' : ''}>${v}</option>`).join('');
}
function toast(m){ const t = $('#toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1800); }
document.addEventListener('click', e => {
  const t = e.target.closest('[data-cir],[data-st],[data-copy],[data-nm],[data-ph],[data-tcls],[data-act],[data-allg]'); if (!t) return;
  if (t.dataset.act === 'export') { exportDone(); return; }
  if (t.dataset.act === 'reprises') { exportReprises(); return; }
  if (t.dataset.act === 'save') { savePage(); return; }
  if (t.dataset.allg) { const g = GROUPS[t.dataset.allg] || [], on = !g.every(c => isDone(c.k, c.i)); g.forEach(c => setDone(c.k, c.i, on)); OPENG.add(t.dataset.allg); renderSuivi(); renderTypes(); return; }
  if (t.dataset.ph) { S.ph = t.dataset.ph; S.tcls = ''; renderTypes(); return; }
  if (t.dataset.tcls != null) { S.tcls = t.dataset.tcls; renderTypes(); return; }
  if (t.dataset.nm) { S.nm = !S.nm; S.st = ''; S.n = 150; render(); return; }
  if (t.dataset.cir) { S.cir = t.dataset.cir; S.st = ''; S.nm = false; S.t = S.f = S.z = ''; S.n = 150; if (S.cir !== 'types' && S.cir !== 'proj' && S.cir !== 'com') selects(); render(); }
  else if (t.dataset.st != null) { S.st = S.st === t.dataset.st ? '' : t.dataset.st; S.n = 150; render(); }
  else if (t.dataset.copy) {
    const txt = t.dataset.copy, ok = () => toast('Nom du fichier copié');
    const fb = () => { const a = document.createElement('textarea'); a.value = txt; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); ok(); } catch (err) { toast('Copie refusée par le navigateur'); } a.remove(); };
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(ok, fb); else fb();
  }
});
document.addEventListener('change', e => {
  const n = e.target.closest('textarea[data-note],input[data-note]');
  if (n) { setNote(n.dataset.note, n.dataset.i, n.value, n.dataset.f); n.classList.toggle('has', !!n.value.trim());
    document.querySelectorAll('#tout input[data-note]').forEach(x => { if (x !== n && x.dataset.note === n.dataset.note && x.dataset.i === n.dataset.i && (x.dataset.f || 'n') === (n.dataset.f || 'n')) { x.value = n.value; x.classList.toggle('has', !!n.value.trim()); } });
    renderSuivi(); return; }
  const ga = e.target.closest('input[data-allenc],input[data-alldone]');
  if (ga) {
    const en = 'allenc' in ga.dataset, g = GROUPS[en ? ga.dataset.allenc : ga.dataset.alldone] || [];
    g.forEach(c => en ? setEnc(c.k, c.i, ga.checked) : setDone(c.k, c.i, ga.checked));
    renderSuivi(); renderTypes(); return;
  }
  const pa = e.target.closest('input[data-pallenc],input[data-palldone]');
  if (pa) {
    const en = 'pallenc' in pa.dataset, g = PGROUPS[en ? pa.dataset.pallenc : pa.dataset.palldone] || [];
    g.forEach(p => en ? setEnc(p.k, p.row.i, pa.checked) : setDone(p.k, p.row.i, pa.checked));
    renderSuivi(); renderProj(); return;
  }
  const pw = e.target.closest('input[data-presp]');
  if (pw) {
    const g = PGROUPS[pw.dataset.presp] || [], v = pw.value.trim();
    if (!v) { renderProj(); return; }   // champ vidé : chaque plan garde son responsable
    g.forEach(p => setResp(p.k, p.row.i, v));
    toast(`${v} en charge de ${g.length} plan(s)`);
    renderSuivi(); fillNames(); renderProj(); return;
  }
  const pn = e.target.closest('input[data-pnote]');
  if (pn) {
    const g = PGROUPS[pn.dataset.pnote] || [], v = pn.value.trim();
    if (!g.length || (!v && !pgnote(g))) return;   // champ vide sur un groupe aux commentaires différents : on ne touche à rien
    g.forEach(p => setNote(p.k, p.row.i, v));
    toast(v ? `Commentaire appliqué à ${g.length} plan(s)` : `Commentaire retiré de ${g.length} plan(s)`);
    renderSuivi(); renderProj(); return;
  }
  const cs = e.target.closest('#csrc,#corg,#cph,#cz,#cf,#cst,#cr,#cso,#clast');
  if (cs) { if (cs.id === 'clast') S.clast = cs.checked; else S[cs.id] = cs.value; S.cn = 300; renderCom(); return; }
  const ps = e.target.closest('#pa,#po,#pz,#pn,#pt,#pm,#pb,#ps,#pr,#prest');
  if (ps) { if (ps.id === 'prest') S.prest = ps.checked; else S[ps.id] = ps.value; renderProj(); return; }
  const gw = e.target.closest('input[data-gresp]');
  if (gw) {
    const g = GROUPS[gw.dataset.gresp] || [], v = gw.value.trim();
    if (!v) { renderTypes(); return; }   // champ vidé : chaque plan garde son responsable
    g.forEach(c => setResp(c.k, c.i, v));
    toast(`${v} en charge de ${g.length} plan(s)`);
    renderSuivi(); fillNames(); renderTypes(); return;
  }
  const gn = e.target.closest('input[data-gnote]');
  if (gn) {
    const f = gn.dataset.f || 'n', v = gn.value.trim();
    const g = (GROUPS[gn.dataset.gnote] || []).filter(c => f === 'n' || isDone(c.k, c.i));   // « après reprise » : plans traités seulement
    if (!g.length || (!v && !gnote(g, f))) return;   // champ vide sur une liste aux commentaires différents : on ne touche à rien
    g.forEach(c => setNote(c.k, c.i, v, f));
    toast(v ? `Commentaire appliqué à ${g.length} plan(s)` : `Commentaire retiré de ${g.length} plan(s)`);
    renderSuivi(); renderTypes(); return;
  }
  const rr = e.target.closest('input[data-resp]');
  if (rr) { setResp(rr.dataset.resp, rr.dataset.i, rr.value);
    document.querySelectorAll('input[data-resp]').forEach(x => { if (x !== rr && x.dataset.resp === rr.dataset.resp && x.dataset.i === rr.dataset.i) x.value = rr.value; });
    renderSuivi(); fillNames(); return; }
  const ec = e.target.closest('input[data-enc]');
  if (ec) { setEnc(ec.dataset.enc, ec.dataset.i, ec.checked); if (S.cir === 'types') { renderSuivi(); renderTypes(); } else render(); return; }
  const c = e.target.closest('input[data-done]'); if (!c) return;
  setDone(c.dataset.done, c.dataset.i, c.checked);
  if (S.cir === 'types') {
    renderSuivi(); renderTypes();
    // le champ de commentaire vient d'apparaître à droite : on y place le curseur
    if (c.checked) { const f = [...document.querySelectorAll('#tout input.lin.rp')].find(x => x.dataset.note === c.dataset.done && x.dataset.i === c.dataset.i); if (f) f.focus(); }
  } else render();
});
document.addEventListener('toggle', e => { const d = e.target; if (d.dataset && d.dataset.gid) { if (d.open) OPENG.add(d.dataset.gid); else OPENG.delete(d.dataset.gid); } }, true);
let cqt; $('#cq').addEventListener('input', e => { clearTimeout(cqt); cqt = setTimeout(() => { S.cq = e.target.value; S.cn = 300; renderCom(); }, 150); });
$('#cexp').addEventListener('click', exportCom);
document.addEventListener('click', e => {
  const b = e.target.closest('[data-ccl]'); if (b) { S.ccl = b.dataset.ccl; S.cn = 300; renderCom(); return; }
  if (e.target.closest('#cmore')) { S.cn += 300; renderCom(); }
});
$('#pq').addEventListener('input', e => { S.pq = e.target.value; renderProj(); });
document.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) { e.preventDefault(); goPlan(b.dataset.go, b.dataset.code); } });
document.addEventListener('click', e => {
  const b = e.target.closest('[data-pf]'); if (!b) return;
  const v = b.dataset.pf;
  if (!v) S.pf = []; else if (S.pf.includes(v)) S.pf = S.pf.filter(x => x !== v); else S.pf = S.pf.concat(v);
  renderProj();
});
document.addEventListener('click', e => { const b = e.target.closest('[data-pg]'); if (b) { S.pg = b.dataset.pg; renderProj(); } });
document.addEventListener('toggle', e => { const d = e.target; if (!d.dataset || !d.dataset.pgid) return; if (d.open) { if (!OPENP.has(d.dataset.pgid)) { OPENP.add(d.dataset.pgid); renderProj(); } } else OPENP.delete(d.dataset.pgid); }, true);
$('#fr').addEventListener('change', e => { S.fr = e.target.value; S.n = 150; render(); });
$('#fc').addEventListener('change', e => { S.cir = e.target.value; S.st = ''; S.nm = false; S.t = S.f = S.z = ''; S.n = 150; selects(); render(); });
$('#fso').addEventListener('change', e => { S.so = e.target.value; S.n = 150; render(); });
$('#tfr').addEventListener('change', e => { S.tfr = e.target.value; renderTypes(); });
$('#fd').addEventListener('change', e => { S.fd = e.target.value; S.n = 150; render(); });
let qt; $('#q').addEventListener('input', e => { clearTimeout(qt); qt = setTimeout(() => { S.q = e.target.value.trim().toLowerCase(); S.n = 150; render(); }, 120); });
$('#ft').addEventListener('change', e => { S.t = e.target.value; S.n = 150; render(); });
$('#ff').addEventListener('change', e => { S.f = e.target.value; S.n = 150; render(); });
$('#fz').addEventListener('change', e => { S.z = e.target.value; S.n = 150; render(); });
let tqt; $('#tq').addEventListener('input', e => { clearTimeout(tqt); tqt = setTimeout(() => { S.tq = e.target.value.trim().toLowerCase(); renderTypes(); }, 120); });
$('#tscope').addEventListener('change', e => { S.tscope = e.target.value; renderTypes(); });
$('#twho').addEventListener('change', e => { S.twho = e.target.value; renderTypes(); });
$('#tcir').addEventListener('change', e => { S.tcir = e.target.value; renderTypes(); });
$('#tfd').addEventListener('change', e => { S.tfd = e.target.value; renderTypes(); });
$('#more').addEventListener('click', () => { S.n += 300; render(); });
$('#pdfdir').addEventListener('click', () => API.ajoutePdf(() => { renderCom(); renderProj(); render(); }));
selects(); render();
API.redessine = () => { renderSuivi(); render(); };

// --- dictée des commentaires (reconnaissance vocale du navigateur)
(() => {
  const SEL = 'textarea[data-note],input[data-note],input[data-gnote],input[data-pnote]';
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'mic'; b.title = 'Dicter le commentaire (Alt+D)'; b.setAttribute('aria-label', 'Dicter le commentaire');
  b.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 10.5a2.5 2.5 0 0 0 2.5-2.5V3.5a2.5 2.5 0 0 0-5 0V8A2.5 2.5 0 0 0 8 10.5Z"/><path d="M12.5 8a.75.75 0 0 0-1.5 0 3 3 0 0 1-6 0 .75.75 0 0 0-1.5 0 4.5 4.5 0 0 0 3.75 4.44V14H5.5a.75.75 0 0 0 0 1.5h5a.75.75 0 0 0 0-1.5H8.75v-1.56A4.5 4.5 0 0 0 12.5 8Z"/></svg>';
  document.body.appendChild(b);
  let tgt = null, rec = null, base = '', hideT;
  const place = () => {
    if (!tgt || !tgt.isConnected) { if (!rec) b.classList.remove('on'); return; }
    const r = tgt.getBoundingClientRect();
    b.style.left = Math.max(0, r.right - 28) + 'px'; b.style.top = (r.top + Math.max(0, (Math.min(r.height, 30) - 26) / 2)) + 'px';
  };
  const stop = () => { if (rec) { try { rec.stop(); } catch (e) {} } };
  const start = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast('Dictée non disponible dans ce navigateur : utiliser Edge ou Chrome, ou Windows + H'); return; }
    if (!tgt || !tgt.isConnected) return;
    const field = tgt; let changed = false;
    base = field.value.trim();
    const r = new SR(); r.lang = 'fr-CH'; r.continuous = true; r.interimResults = true;
    r.onresult = ev => {
      if (!field.isConnected) { stop(); return; }
      let s = ''; for (let i = 0; i < ev.results.length; i++) s += ev.results[i][0].transcript;
      s = s.replace(/\s+/g, ' ').trim();
      field.value = base && s ? base + ' ' + s : base || s; changed = true;
    };
    r.onerror = ev => {
      toast(ev.error === 'not-allowed' || ev.error === 'service-not-allowed' ? 'Micro refusé : autoriser le micro pour cette page'
        : ev.error === 'network' ? 'Dictée : connexion internet nécessaire'
        : ev.error === 'no-speech' ? 'Dictée : rien entendu' : ev.error === 'audio-capture' ? 'Dictée : aucun micro détecté' : 'Dictée interrompue (' + ev.error + ')');
    };
    r.onend = () => {
      rec = null; b.classList.remove('rec'); b.title = 'Dicter le commentaire (Alt+D)';
      if (changed && field.isConnected) field.dispatchEvent(new Event('change', {bubbles:true}));   // enregistre comme une saisie au clavier
      if (document.activeElement !== tgt) b.classList.remove('on');
    };
    try { r.start(); rec = r; b.classList.add('rec'); b.title = 'Arrêter la dictée'; } catch (e) { toast('Dictée impossible à démarrer'); }
  };
  b.addEventListener('pointerdown', e => e.preventDefault());   // le champ garde le curseur
  b.addEventListener('click', () => rec ? stop() : start());
  document.addEventListener('focusin', e => {
    const f = e.target.closest && e.target.closest(SEL);
    if (!f) return;
    if (rec && f !== tgt) stop();
    clearTimeout(hideT); tgt = f; b.classList.add('on'); place();
  });
  document.addEventListener('focusout', e => {
    if (e.target !== tgt) return;
    hideT = setTimeout(() => { if (!rec && document.activeElement !== tgt) b.classList.remove('on'); }, 150);
  });
  document.addEventListener('keydown', e => {
    if (e.altKey && (e.key === 'd' || e.key === 'D') && tgt && document.activeElement === tgt) { e.preventDefault(); rec ? stop() : start(); }
    else if (rec && (e.key === 'Escape' || e.key === 'Enter')) { e.preventDefault(); stop(); }
  });
  window.addEventListener('scroll', place, true); window.addEventListener('resize', place);
})();
}
