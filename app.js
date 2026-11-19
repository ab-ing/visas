/* Visas Kairnial — version en ligne de l'outil d'Hubert.
   Ce fichier fait le lien avec la base Supabase : connexion, chargement du dernier
   relevé importé, suivi partagé en temps réel, import d'une nouvelle version,
   PDF de réponse (copie déposée dans la base, ou lien Kairnial).
   La logique d'affichage d'Hubert est dans hubert.js (lanceOutil). */
(function () {
  'use strict';
  const C = window.VISAS_CONFIG;
  const sb = supabase.createClient(C.url, C.cle, { auth: { persistSession: true, autoRefreshToken: true } });
  const PROJET = (new URLSearchParams(location.search).get('p') || C.projet || 'fgh').toLowerCase();
  const SEAU = 'visas-pdf';
  const DONNEES = ['DOCS', 'HIST', 'HMETA', 'LAST', 'NAMES', 'NCAB', 'PDFC', 'HCAT', 'PDFF', 'BY'];
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let moi = '', releve = null, lance = false, enLigne = 0;

  // ------------------------------------------------------------------ écran d'accueil
  function ecran(msg, quoi) {
    $('#outil').hidden = true; $('#ecran').hidden = false;
    $('#ecran-msg').textContent = msg || '';
    ['connexion', 'nouveau-mdp', 'premier-import'].forEach(id => { $('#' + id).hidden = id !== quoi; });
  }
  function progres(x) { const p = $('#prog'); p.hidden = x == null; if (x != null) p.firstElementChild.style.width = Math.round(x * 100) + '%'; }
  function toast(m, ms) {
    const t = $('#toast'); if (!t) return;
    t.textContent = m; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), ms || 2600);
  }

  $('#connexion').addEventListener('submit', async e => {
    e.preventDefault(); $('#c-err').textContent = '';
    const { error } = await sb.auth.signInWithPassword({ email: $('#c-mail').value.trim(), password: $('#c-mdp').value });
    if (error) { $('#c-err').textContent = /invalid/i.test(error.message) ? 'Adresse ou mot de passe incorrect.' : error.message; return; }
    $('#c-mdp').value = ''; demarre();
  });
  $('#nouveau-mdp').addEventListener('submit', async e => {
    e.preventDefault(); $('#n-err').textContent = '';
    const { error } = await sb.auth.updateUser({ password: $('#n-mdp').value, data: { mdp_a_changer: false } });
    if (error) { $('#n-err').textContent = error.message; return; }
    $('#n-mdp').value = '';
    if (lance) { $('#ecran').hidden = true; $('#outil').hidden = false; toast('Mot de passe changé'); } else demarre();
  });
  $('#n-annule').addEventListener('click', () => { if (lance) { $('#ecran').hidden = true; $('#outil').hidden = false; } else demarre(); });

  // ------------------------------------------------------------------ lecture de la base
  async function litTout(table, colonnes, filtre) {
    const out = [];
    for (let de = 0; ; de += 1000) {
      let q = sb.from(table).select(colonnes).range(de, de + 999);
      if (filtre) q = filtre(q);
      const { data, error } = await q;
      if (error) throw error;
      out.push(...data);
      if (data.length < 1000) return out;
    }
  }

  async function demarre() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { ecran('Connecte-toi avec ton compte du bureau.', 'connexion'); setTimeout(() => $('#c-mail').focus(), 50); return; }
    moi = session.user.email || '';
    if (session.user.user_metadata && session.user.user_metadata.mdp_a_changer) { ecran('Choisis ton mot de passe personnel.', 'nouveau-mdp'); return; }
    ecran('Chargement des données…'); progres(0.1);
    try {
      const { data, error } = await sb.from('visas_releves').select('id, importe_le, importe_par, source, meta, donnees')
        .eq('projet', PROJET).order('importe_le', { ascending: false }).limit(1);
      if (error) throw error;
      progres(0.6);
      if (!data.length) { progres(null); ecran('', 'premier-import'); return; }
      releve = data[0];
      const [suivi, liens] = await Promise.all([
        litTout('visas_suivi', 'cle, etat', q => q.eq('projet', PROJET)),
        litTout('visas_pdf_liens', 'code, url, indice, visa, date_visa, nom', q => q.eq('projet', PROJET)).catch(() => []),
        chargePdf()
      ]);
      suivi.forEach(r => { API.suivi[r.cle] = r.etat; });
      LIENS = {}; liens.forEach(x => { (LIENS[x.code] = LIENS[x.code] || []).push(x); });
      progres(null);
      ouvre();
    } catch (err) {
      progres(null);
      ecran('Impossible de lire la base : ' + (err.message || err) + '. Recharge la page ; si ça persiste, préviens Tony.');
    }
  }

  // ------------------------------------------------------------------ PDF de réponse
  // 1. copie déposée dans le seau visas-pdf (lien signé, valable 12 h)
  // 2. sinon lien Kairnial de la pièce jointe (table visas_pdf_liens, même logique
  //    que visas_pj dans /fgh/vis/ : posé depuis Kairnial)
  let SIGNE = {}, LIENS = {};
  const nomSeau = n => String(n).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 200);
  async function chargePdf() {
    SIGNE = {};
    const noms = [];
    for (let de = 0; ; de += 1000) {
      const { data, error } = await sb.storage.from(SEAU).list(PROJET, { limit: 1000, offset: de });
      if (error || !data) break;
      data.forEach(o => { if (o.name && /\.pdf$/i.test(o.name)) noms.push(o.name); });
      if (data.length < 1000) break;
    }
    for (let i = 0; i < noms.length; i += 200) {
      const lot = noms.slice(i, i + 200);
      const { data } = await sb.storage.from(SEAU).createSignedUrls(lot.map(n => PROJET + '/' + n), 12 * 3600);
      (data || []).forEach((x, j) => { if (x.signedUrl) SIGNE[lot[j]] = x.signedUrl; });
    }
  }
  // Nom d'un PDF dans le relevé d'Hubert : « CODE-IND__VISA__horodatage__CODE-IND_reponse.pdf »
  function lienKairnial(nom) {
    const m = String(nom).match(/^(.+)-(\d{2,3})__.*?__(\d{9,11})__/);
    if (!m || !LIENS[m[1]]) return '';
    const ind = parseInt(m[2], 10), quand = parseInt(m[3], 10) * 1000;
    const l = LIENS[m[1]].filter(x => x.indice === null || x.indice === ind);
    if (!l.length) return '';
    l.sort((a, b) => Math.abs((a.date_visa ? Date.parse(a.date_visa) : 0) - quand) - Math.abs((b.date_visa ? Date.parse(b.date_visa) : 0) - quand));
    return l[0].url;
  }
  function lienPdf(nom, page) {
    const s = SIGNE[nomSeau(nom)];
    const u = s || lienKairnial(nom);
    return u ? u + '#page=' + (page || 1) : '';
  }
  function ajoutePdf(apres) {
    const f = $('#f-pdf');
    f.onchange = async () => {
      const l = [...f.files].filter(x => /\.pdf$/i.test(x.name)); f.value = '';
      if (!l.length) return;
      let ok = 0, ko = 0;
      for (let i = 0; i < l.length; i += 4) {
        await Promise.all(l.slice(i, i + 4).map(x => sb.storage.from(SEAU)
          .upload(PROJET + '/' + nomSeau(x.name), x, { upsert: true, contentType: 'application/pdf' })
          .then(r => { if (r.error) ko++; else ok++; }, () => { ko++; })));
        toast(`Dépôt des PDF : ${ok + ko} / ${l.length}…`, 60000);
      }
      await chargePdf();
      toast(`${ok} PDF déposé(s)${ko ? `, ${ko} refusé(s)` : ''}. Les liens « Ouvrir le PDF » marchent pour tout le monde.`, 4000);
      if (apres) apres();
    };
    f.click();
  }

  // Liens Kairnial envoyés depuis la page Kairnial (même message que /fgh/vis/ :
  // la page Kairnial ouvre cet outil avec #kairnial-pj et lui passe les lignes)
  const ORIGINE_KAIRNIAL = 'https://front-eu-1.kairnial.com';
  if (window.opener && /kairnial-pj/.test(location.hash)) {
    addEventListener('message', async e => {
      if (e.origin !== ORIGINE_KAIRNIAL || !e.data || e.data.type !== 'visas-pj' || !Array.isArray(e.data.lignes)) return;
      const ok = e.data.lignes.filter(x => x && typeof x.code === 'string' && /^[A-Z0-9-]{10,60}$/.test(x.code) && typeof x.url === 'string' && x.url.indexOf('https://ws-eu-1.kairnial.com/') === 0 && x.url.length < 500)
        .map(x => ({ projet: PROJET, code: x.code, url: x.url, indice: /^\d{1,3}$/.test(String(x.indice)) ? +x.indice : null, visa: String(x.visa || '').slice(0, 100),
          date_visa: x.date_visa && !isNaN(new Date(x.date_visa)) ? new Date(x.date_visa).toISOString() : null, nom: String(x.nom || '').slice(0, 300) }));
      try {
        for (let i = 0; i < ok.length; i += 200) {
          const { error } = await sb.from('visas_pdf_liens').upsert(ok.slice(i, i + 200), { onConflict: 'projet,url' });
          if (error) throw error;
        }
        ok.forEach(x => { (LIENS[x.code] = LIENS[x.code] || []).push(x); });
        toast(ok.length + ' liens de réponses Kairnial enregistrés.');
        try { e.source.postMessage({ type: 'visas-pj-ok', n: ok.length }, ORIGINE_KAIRNIAL); } catch (x) {}
        if (API.redessine) API.redessine();
      } catch (er) {
        toast('Liens Kairnial non enregistrés : ' + (er.message || er));
        try { e.source.postMessage({ type: 'visas-pj-ko', msg: String(er.message || er) }, ORIGINE_KAIRNIAL); } catch (x) {}
      }
    });
    window.opener.postMessage({ type: 'visas-pret' }, ORIGINE_KAIRNIAL);
  }

  // ------------------------------------------------------------------ suivi partagé
  // Chaque saisie part en base (une ligne par plan et indice) après 400 ms ; la base
  // signe la ligne (auteur, heure) et la garde au journal. Les saisies des autres
  // arrivent en temps réel et ne remplacent une saisie locale que si elles sont plus récentes.
  const attente = {}; let erreurs = 0;
  function enregistre(cle, e) {
    clearTimeout(attente[cle]);
    attente[cle] = setTimeout(() => envoie(cle), 400);
    barre();
  }
  async function envoie(cle) {
    const e = API.suivi[cle];
    const { error } = await sb.from('visas_suivi').upsert({ projet: PROJET, cle, etat: e }, { onConflict: 'projet,cle' });
    if (error) {
      erreurs++; toast('Saisie non enregistrée (' + error.message + '). Nouvel essai dans 10 s.', 4000);
      attente[cle] = setTimeout(() => envoie(cle), 10000);
    } else { delete attente[cle]; erreurs = 0; }
    barre();
  }
  const enCours = () => Object.keys(attente).length;
  addEventListener('beforeunload', e => { if (enCours()) { e.preventDefault(); e.returnValue = ''; } });

  let aRedessiner = false;
  function redessineQuandLibre() {
    // on ne redessine pas sous les doigts de quelqu'un qui écrit
    const a = document.activeElement;
    if (a && a.closest && a.closest('#outil') && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== 'checkbox') { aRedessiner = true; return; }
    aRedessiner = false;
    clearTimeout(redessineQuandLibre.t);
    redessineQuandLibre.t = setTimeout(() => { if (API.redessine) API.redessine(); }, 250);
  }
  document.addEventListener('focusout', () => { if (aRedessiner) setTimeout(redessineQuandLibre, 300); });

  function ecoute() {
    const canal = sb.channel('visas-' + PROJET, { config: { presence: { key: moi } } });
    canal.on('postgres_changes', { event: '*', schema: 'public', table: 'visas_suivi', filter: 'projet=eq.' + PROJET }, p => {
      const r = p.new; if (!r || !r.cle) return;
      if (attente[r.cle]) return;                                   // ma saisie part, elle fait foi
      const loc = API.suivi[r.cle];
      if (loc && (loc.t || '') >= ((r.etat || {}).t || '')) return;  // déjà à jour (mon propre écho)
      API.suivi[r.cle] = r.etat;
      if (r.maj_par && r.maj_par !== moi) toast(nomCourt(r.maj_par) + ' a mis à jour ' + r.cle, 2200);
      redessineQuandLibre();
    });
    canal.on('presence', { event: 'sync' }, () => { enLigne = Object.keys(canal.presenceState()).length; barre(); });
    canal.subscribe(async s => {
      if (s === 'SUBSCRIBED') { connecte = true; await canal.track({ depuis: new Date().toISOString() }); }
      else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') connecte = false;
      barre();
    });
    ecoute.canal = canal;
  }
  let connecte = false;
  const nomCourt = m => String(m).split('@')[0].replace(/[._]/g, ' ');

  function statut() {
    return enCours() ? ' · enregistrement…' : erreurs ? ' · saisie non enregistrée' : '';
  }

  // ------------------------------------------------------------------ barre du haut
  const dateCH = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('fr-CH') + ' à ' + d.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' }); };
  function barre() {
    const b = $('#barre'); if (!b) return;
    const autres = Math.max(0, enLigne - 1);
    b.innerHTML = `<span class="${connecte ? 'enligne' : 'enligne hors'}"><i></i>${connecte ? 'Suivi partagé en direct' : 'Connexion temps réel perdue : recharge la page'}${autres ? ` · <b>${autres}</b> autre${autres > 1 ? 's' : ''} personne${autres > 1 ? 's' : ''} sur la page` : ''}${enCours() ? ' · enregistrement…' : ''}</span>
      <span>Données importées le ${esc(dateCH(releve.importe_le))} par ${esc(nomCourt(releve.importe_par))}${releve.source ? ` (<span class="mono">${esc(releve.source)}</span>)` : ''}</span>
      <span class="act"><span>${esc(moi)}</span>
        <button class="btn ghost" type="button" data-import title="Importe un nouveau fichier « Recap visas » d'Hubert : ses données remplacent les actuelles, le suivi de chacun est gardé">Importer une version…</button>
        <button class="btn ghost" type="button" id="b-mdp">Mot de passe</button>
        <button class="btn ghost" type="button" id="b-sortie">Déconnexion</button></span>`;
  }
  document.addEventListener('click', async e => {
    if (e.target.closest('[data-import]')) { $('#f-import').click(); return; }
    if (e.target.closest('#b-sortie')) { await sb.auth.signOut(); location.reload(); return; }
    if (e.target.closest('#b-mdp')) { ecran('Choisis un nouveau mot de passe.', 'nouveau-mdp'); }
  });

  function ouvre() {
    const D = releve.donnees, M = releve.meta || {};
    $('#ecran').hidden = true; $('#outil').hidden = false;
    const w = document.querySelector('#outil .wrap');
    if (w && !$('#barre')) w.insertAdjacentHTML('afterbegin', '<div class="barre" id="barre"></div>');
    if (M.titre) document.title = M.titre;
    if (M.eyebrow && $('header .eyebrow')) $('header .eyebrow').textContent = M.eyebrow;
    if (M.intro && $('header p')) $('header p').textContent = M.intro;
    barre();
    if (lance) { location.reload(); return; }   // nouveau relevé : la logique d'Hubert repart de zéro
    lance = true;
    lanceOutil(D, API);
    ecoute();
  }

  // ------------------------------------------------------------------ import d'une version
  // Le fichier HTML d'Hubert porte ses données en dur (const DOCS = …) et ses coches
  // (script saved-state). On en tire les données, qui deviennent le nouveau relevé, et
  // les coches, versées dans le suivi commun quand elles sont plus récentes.
  function tireDonnees(texte) {
    const D = {};
    texte.split('\n').forEach(l => {
      const m = l.match(/^const ([A-Z]+) = (.*)$/);
      if (!m || !DONNEES.includes(m[1]) || D[m[1]] !== undefined) return;
      let s = m[2];
      for (let i = s.lastIndexOf(';'); i > 0; i = s.lastIndexOf(';', i - 1)) {
        try { D[m[1]] = JSON.parse(s.slice(0, i)); return; } catch (e) {}
      }
    });
    const manque = DONNEES.filter(n => D[n] === undefined);
    if (manque.length) throw new Error('ce fichier n\'est pas un « Recap visas » complet (manque ' + manque.join(', ') + ')');
    const p = texte.match(/const PDFDEF = "([^"\n]*)"/); D.PDFDEF = p ? p[1] : '';
    const doc = new DOMParser().parseFromString(texte.replace(/<script[\s\S]*?<\/script>/gi, ''), 'text/html');
    const t = s => (doc.querySelector(s) || {}).textContent || '';
    const M = { titre: t('title').trim(), eyebrow: t('header .eyebrow').trim(), intro: t('header p').trim().replace(/\s+/g, ' ') };
    let coches = {};
    const sv = texte.match(/<script id="saved-state" type="application\/json">([\s\S]*?)<\/script>/);
    if (sv) { try { coches = JSON.parse(sv[1]) || {}; } catch (e) {} }
    return { D, M, coches };
  }
  $('#f-import').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    const montre = m => { if (lance) toast(m, 60000); else $('#ecran-msg').textContent = m; };
    try {
      montre('Lecture de ' + f.name + '…');
      const { D, M, coches } = tireDonnees(await f.text());
      // coches du fichier : versées si plus récentes que celles de la base
      const base = {};
      (await litTout('visas_suivi', 'cle, etat', q => q.eq('projet', PROJET))).forEach(r => { base[r.cle] = r.etat; });
      const lignes = Object.keys(coches).filter(k => k.length >= 3 && k.length <= 120 && coches[k] && typeof coches[k] === 'object' && (!base[k] || (coches[k].t || '') > (base[k].t || '')))
        .map(k => ({ projet: PROJET, cle: k, etat: coches[k] }));
      for (let i = 0; i < lignes.length; i += 300) {
        montre(`Coches du fichier : ${i} / ${lignes.length}…`);
        const { error } = await sb.from('visas_suivi').upsert(lignes.slice(i, i + 300), { onConflict: 'projet,cle' });
        if (error) throw error;
      }
      montre('Envoi des données (' + D.DOCS.length + ' documents)…');
      const { error } = await sb.from('visas_releves').insert({ projet: PROJET, source: f.name.slice(0, 300), meta: M, donnees: D, nb_docs: D.DOCS.length });
      if (error) throw error;
      montre(`Import terminé : ${D.DOCS.length} documents, ${lignes.length} coche(s) reprise(s) du fichier.`);
      setTimeout(() => location.reload(), 1200);
    } catch (err) {
      montre('Import impossible : ' + (err.message || err));
    }
  });

  // ------------------------------------------------------------------ objet passé à hubert.js
  const API = { suivi: {}, enregistre, statut, lienPdf, ajoutePdf, redessine: null };
  window.VISAS_API = API;

  sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT' && lance) location.reload(); });
  demarre();
})();
