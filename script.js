(function () {
  var $ = function (id) { return document.getElementById(id); };
  var W = 1200, H = 757;
  var KLASSEN = ['AM', 'A1', 'A2', 'A', 'B', 'BE', 'C1', 'C', 'CE', 'D'];
  var TEXT_IDS = ['vorname', 'nachname', 'geburtsdatum', 'geburtsort', 'geschlecht', 'nationalitaet', 'groesse', 'augen', 'roblox', 'strasse', 'ort', 'ausgestellt', 'behoerde'];
  var LS_KEY = 'rp-ausweis-werkstatt-v1';

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isoToday() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fmt(iso) { if (!iso) return ''; var p = iso.split('-'); return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : ''; }
  function addYears(iso, n) { if (!iso) return ''; var p = iso.split('-').map(Number); return (p[0] + n) + '-' + pad(p[1]) + '-' + pad(p[2]); }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function code(len, chars) { var s = ''; for (var i = 0; i < len; i++) s += chars.charAt(rnd(chars.length)); return s; }
  function newIdNr() { return 'RP' + code(7, '0123456789CFGHJKLMNPRTVWXYZ'); }
  function newFsNr() { return 'HH' + code(9, '0123456789ABCDEFGHJKLMNPRTUVWXYZ'); }

  var DEFAULTS = {
    vorname: 'Max', nachname: 'Mustermann', geburtsdatum: '2000-05-14', geburtsort: 'Hamburg',
    geschlecht: 'M', nationalitaet: 'DEUTSCH', groesse: '180', augen: 'Braun', roblox: '',
    strasse: 'Beispielweg 12', ort: '20095 Hamburg', ausgestellt: isoToday(), behoerde: 'RP-Amt Hamburg',
    klassen: ['B']
  };

  var state = {};
  var photo = null;

  function load() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) {}
    state = Object.assign({}, DEFAULTS, saved || {});
    if (!state.idNr) state.idNr = newIdNr();
    if (!state.fsNr) state.fsNr = newFsNr();
  }
  function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {} }

  function toForm() {
    TEXT_IDS.forEach(function (id) { $(id).value = state[id] == null ? '' : state[id]; });
    KLASSEN.forEach(function (k) { $('k_' + k).checked = state.klassen.indexOf(k) > -1; });
  }
  function fromForm() {
    TEXT_IDS.forEach(function (id) { state[id] = $(id).value; });
    state.klassen = KLASSEN.filter(function (k) { return $('k_' + k).checked; });
    save();
    schedule();
  }

  // Klassen-Chips
  KLASSEN.forEach(function (k) {
    var l = document.createElement('label'); l.className = 'chip';
    l.innerHTML = '<input type="checkbox" id="k_' + k + '"><span>' + k + '</span>';
    $('klassen').appendChild(l);
  });

  // ---------- Zeichnen ----------
  var FAM = {
    c: '"IBM Plex Sans Condensed","Arial Narrow",sans-serif',
    s: '"IBM Plex Sans",system-ui,sans-serif',
    m: '"IBM Plex Mono",ui-monospace,monospace'
  };
  function setLS(ctx, px) { try { ctx.letterSpacing = px + 'px'; } catch (e) {} }
  function T(ctx, str, x, y, o) {
    var size = o.size || 30, w = o.w || 500, fam = FAM[o.f || 'c'];
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = o.color;
    setLS(ctx, o.ls || 0);
    ctx.font = w + ' ' + size + 'px ' + fam;
    if (o.maxW) { while (size > 14 && ctx.measureText(str).width > o.maxW) { size -= 1; ctx.font = w + ' ' + size + 'px ' + fam; } }
    ctx.fillText(str, x, y);
    setLS(ctx, 0);
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }
  function background(ctx, th) {
    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, th.bg1); g.addColorStop(1, th.bg2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.strokeStyle = th.wave; ctx.lineWidth = 1.3;
    for (var k = 0; k < 46; k++) {
      ctx.beginPath();
      for (var x = 0; x <= W; x += 8) {
        var y = 120 + k * 15 + Math.sin(x * 0.011 + k * 0.28) * 26 + Math.sin(x * 0.027 - k * 0.15) * 9;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
    // Wasserzeichen
    ctx.save();
    ctx.rotate(-0.32);
    ctx.fillStyle = th.wm; ctx.font = '700 70px ' + FAM.c; setLS(ctx, 10);
    for (var yy = 100; yy < H + 600; yy += 170) {
      for (var xx = -500 + ((yy / 170) % 2) * 260; xx < W + 300; xx += 520) ctx.fillText('SPIELKARTE', xx, yy);
    }
    setLS(ctx, 0); ctx.restore();
  }
  function header(ctx, th, title, sub, h) {
    var g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, th.head1); g.addColorStop(1, th.head2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, h);
    var cx = 62, cy = h / 2, r = h * 0.3;
    ctx.save(); ctx.beginPath();
    for (var i = 0; i < 6; i++) { var a = Math.PI / 6 + i * Math.PI / 3; var px = cx + r * Math.cos(a), py = cy + r * Math.sin(a); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
    ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    T(ctx, 'RP', cx, cy + 9, { size: 26, w: 700, color: '#fff', align: 'center', ls: 1 });
    T(ctx, title, 114, cy + 2, { size: h > 100 ? 46 : 36, w: 700, color: '#fff', ls: 3 });
    T(ctx, sub, 114, cy + (h > 100 ? 34 : 28), { size: 20, w: 500, color: 'rgba(255,255,255,.82)', ls: 3 });
    // Spielkarte-Marke
    rr(ctx, W - 258, cy - 22, 206, 44, 6); ctx.fillStyle = '#f2b84b'; ctx.fill();
    T(ctx, 'SPIELKARTE', W - 155, cy + 8, { size: 24, w: 700, color: '#3a2900', align: 'center', ls: 3 });
  }
  function footer(ctx, th) {
    ctx.fillStyle = th.foot; ctx.fillRect(0, H - 60, W, 60);
    T(ctx, 'KEIN AMTLICHES DOKUMENT  ·  NUR FÜR ROBLOX-ROLEPLAY', W / 2, H - 22, { size: 22, w: 600, color: '#fff', align: 'center', ls: 3 });
  }
  function drawPhoto(ctx, x, y, w, h) {
    ctx.save();
    rr(ctx, x, y, w, h, 14); ctx.clip();
    if (photo) {
      var s = Math.max(w / photo.width, h / photo.height);
      var dw = photo.width * s, dh = photo.height * s;
      ctx.drawImage(photo, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    } else {
      var g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, '#b7c6d0'); g.addColorStop(1, '#8fa4b2');
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath(); ctx.arc(x + w / 2, y + h * 0.38, w * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.92, w * 0.38, h * 0.3, 0, Math.PI, 0); ctx.fill();
    }
    ctx.restore();
    rr(ctx, x, y, w, h, 14); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 5; ctx.stroke();
  }
  function field(ctx, th, label, value, x, y, maxW, o) {
    o = o || {};
    T(ctx, label, x, y, { size: 18, w: 600, color: th.label, ls: 2 });
    T(ctx, value || '—', x, y + 38, { size: o.size || 38, w: o.w || 700, f: o.f || 'c', color: th.ink, maxW: maxW, ls: o.ls || 0 });
  }

  var THEME_ID = { bg1: '#e4eff2', bg2: '#bfd4de', wave: 'rgba(22,90,130,.14)', wm: 'rgba(14,60,90,.055)', head1: '#10375a', head2: '#1c5c86', foot: '#10375a', ink: '#12222d', label: '#4b6475' };
  var THEME_FS = { bg1: '#ece9f6', bg2: '#cbc6e4', wave: 'rgba(70,50,140,.13)', wm: 'rgba(50,35,110,.055)', head1: '#32286a', head2: '#5a4aa3', foot: '#32286a', ink: '#1c1932', label: '#5a5778' };

  function data() {
    var up = function (s) { return (s || '').trim().toUpperCase(); };
    return {
      nachname: up(state.nachname), vorname: up(state.vorname),
      gebdat: fmt(state.geburtsdatum), gebort: up(state.geburtsort),
      geschl: state.geschlecht, nat: up(state.nationalitaet),
      groesse: state.groesse ? state.groesse + ' cm' : '', augen: up(state.augen),
      roblox: (state.roblox || '').trim(),
      adresse: (state.strasse || '').trim() + (state.ort ? ', ' + state.ort.trim() : ''),
      ausg: fmt(state.ausgestellt), id_bis: fmt(addYears(state.ausgestellt, 10)), fs_bis: fmt(addYears(state.ausgestellt, 15)),
      behoerde: (state.behoerde || '').trim(), klassen: state.klassen
    };
  }

  function drawIdFront(ctx, d) {
    var th = THEME_ID;
    background(ctx, th);
    header(ctx, th, 'PERSONALAUSWEIS', 'NOTRUF HAMBURG  ·  ROLEPLAY', 122);
    drawPhoto(ctx, 56, 160, 300, 390);
    T(ctx, 'ROBLOX', 56, 590, { size: 18, w: 600, color: th.label, ls: 2 });
    T(ctx, d.roblox || '—', 56, 626, { size: 32, w: 700, color: th.ink, maxW: 300 });
    var x = 410;
    field(ctx, th, 'NAME', d.nachname, x, 170, 740);
    field(ctx, th, 'VORNAME', d.vorname, x, 252, 740);
    field(ctx, th, 'GEBURTSDATUM', d.gebdat, x, 334, 330);
    field(ctx, th, 'GESCHLECHT', d.geschl, x + 380, 334, 330);
    field(ctx, th, 'STAATSANGEHÖRIGKEIT', d.nat, x, 416, 330);
    field(ctx, th, 'GÜLTIG BIS', d.id_bis, x + 380, 416, 330);
    field(ctx, th, 'AUSWEISNUMMER', state.idNr, x, 498, 740, { f: 'm', size: 40, w: 500, ls: 3 });
    footer(ctx, th);
  }
  function drawIdBack(ctx, d) {
    var th = THEME_ID;
    background(ctx, th);
    header(ctx, th, 'PERSONALAUSWEIS', 'RÜCKSEITE', 100);
    var cols = [60, 330, 600, 880];
    field(ctx, th, 'GRÖSSE', d.groesse, cols[0], 170, 240);
    field(ctx, th, 'AUGENFARBE', d.augen, cols[1], 170, 240);
    field(ctx, th, 'AUSGESTELLT', d.ausg, cols[2], 170, 250);
    field(ctx, th, 'GÜLTIG BIS', d.id_bis, cols[3], 170, 260);
    field(ctx, th, 'ANSCHRIFT', d.adresse, 60, 262, 1080);
    field(ctx, th, 'AUSSTELLENDE BEHÖRDE', d.behoerde, 60, 354, 520);
    field(ctx, th, 'SPIELER', d.roblox, 640, 354, 500);
    ctx.save();
    rr(ctx, 60, 460, 1080, 180, 16); ctx.fillStyle = 'rgba(255,255,255,.62)'; ctx.fill();
    ctx.strokeStyle = 'rgba(16,55,90,.25)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    T(ctx, 'AUSWEISNUMMER', 96, 512, { size: 20, w: 600, color: th.label, ls: 3 });
    T(ctx, state.idNr, 96, 596, { size: 76, w: 500, f: 'm', color: th.ink, ls: 6, maxW: 1010 });
    footer(ctx, th);
  }
  function drawFs(ctx, d) {
    var th = THEME_FS;
    background(ctx, th);
    header(ctx, th, 'FÜHRERSCHEIN', 'NOTRUF HAMBURG  ·  ROLEPLAY', 118);
    drawPhoto(ctx, 56, 156, 300, 396);
    var x1 = 410, x2 = 800, cw = 340;
    field(ctx, th, '1.  NAME', d.nachname, x1, 166, cw, { size: 34 });
    field(ctx, th, '2.  VORNAME', d.vorname, x2, 166, cw, { size: 34 });
    field(ctx, th, '3.  GEBURTSDATUM', d.gebdat, x1, 246, cw, { size: 34 });
    field(ctx, th, 'GEBURTSORT', d.gebort, x2, 246, cw, { size: 34 });
    field(ctx, th, '4a.  AUSGESTELLT', d.ausg, x1, 326, cw, { size: 34 });
    field(ctx, th, '4b.  GÜLTIG BIS', d.fs_bis, x2, 326, cw, { size: 34 });
    field(ctx, th, '4c.  BEHÖRDE', d.behoerde, x1, 406, 730, { size: 34 });
    field(ctx, th, '5.  NUMMER', state.fsNr, x1, 486, cw, { f: 'm', size: 34, w: 500, ls: 2 });
    field(ctx, th, 'SPIELER', d.roblox, x2, 486, cw, { size: 34 });
    T(ctx, '9.  KLASSEN', x1, 568, { size: 18, w: 600, color: th.label, ls: 2 });
    var n = d.klassen.length;
    if (!n) { T(ctx, '—', x1, 618, { size: 34, w: 700, color: th.ink }); }
    else {
      var gap = 10, tw = Math.min(80, (730 - gap * (n - 1)) / n);
      d.klassen.forEach(function (k, i) {
        var tx = x1 + i * (tw + gap);
        rr(ctx, tx, 582, tw, 52, 8); ctx.fillStyle = th.head1; ctx.fill();
        T(ctx, k, tx + tw / 2, 618, { size: 28, w: 700, color: '#fff', align: 'center', ls: 1 });
      });
    }
    footer(ctx, th);
  }

  var DRAW = [drawIdFront, drawIdBack, drawFs];
  var canvases = DRAW.map(function () { var c = document.createElement('canvas'); c.width = W; c.height = H; return c; });

  var fontsReady = null;
  function ensureFonts() {
    if (fontsReady) return fontsReady;
    var specs = ['700 40px "IBM Plex Sans Condensed"', '600 20px "IBM Plex Sans Condensed"', '500 40px "IBM Plex Mono"'];
    fontsReady = Promise.all(specs.map(function (s) { return document.fonts && document.fonts.load ? document.fonts.load(s, 'ÄÖÜ0Aa') : Promise.resolve(); })).catch(function () {});
    return fontsReady;
  }
  function render() {
    ensureFonts().then(function () {
      var d = data();
      DRAW.forEach(function (fn, i) {
        var ctx = canvases[i].getContext('2d');
        ctx.clearRect(0, 0, W, H);
        fn(ctx, d);
        $('img' + i).src = canvases[i].toDataURL('image/png');
      });
    });
  }
  var timer = null;
  function schedule() { clearTimeout(timer); timer = setTimeout(render, 90); }

  // ---------- Zufällige Person ----------
  var VN_M = ['Lukas', 'Jonas', 'Finn', 'Leon', 'Tim', 'Ben', 'Noah', 'Paul', 'Emil', 'Jannik', 'Niklas', 'Moritz'];
  var VN_W = ['Mia', 'Emma', 'Lena', 'Hannah', 'Sophie', 'Lea', 'Clara', 'Nele', 'Marie', 'Greta', 'Jule', 'Anna'];
  var NN = ['Petersen', 'Brandt', 'Köhler', 'Hansen', 'Schröder', 'Lindemann', 'Voss', 'Jessen', 'Thiel', 'Carstens', 'Möller', 'Krüger', 'Ahrens', 'Stegmann'];
  var ORTE = ['Hamburg', 'Hamburg', 'Hamburg', 'Lübeck', 'Kiel', 'Bremen', 'Hannover', 'Rostock', 'Flensburg'];
  var STR = ['Hafenweg', 'Lindenallee', 'Birkenstraße', 'Mühlenkamp', 'Elbblick', 'Kirchenweg', 'Schulstraße', 'Am Markt', 'Fischerstieg'];
  var AUGEN = ['Blau', 'Braun', 'Grün', 'Grau', 'Haselnuss'];
  function randomPerson() {
    var g = pick(['M', 'W']);
    var y = new Date().getFullYear() - 18 - rnd(45);
    state.vorname = pick(g === 'M' ? VN_M : VN_W);
    state.nachname = pick(NN);
    state.geschlecht = g;
    state.geburtsdatum = y + '-' + pad(1 + rnd(12)) + '-' + pad(1 + rnd(28));
    state.geburtsort = pick(ORTE);
    state.groesse = String(158 + rnd(38));
    state.augen = pick(AUGEN);
    state.strasse = pick(STR) + ' ' + (1 + rnd(120));
    state.ort = (20095 + rnd(2600)) + ' Hamburg';
    state.idNr = newIdNr(); state.fsNr = newFsNr();
    toForm(); save(); schedule();
  }

  // ---------- Events ----------
  $('form').addEventListener('input', fromForm);
  $('form').addEventListener('change', fromForm);
  $('zufall').addEventListener('click', randomPerson);
  $('nummern').addEventListener('click', function () { state.idNr = newIdNr(); state.fsNr = newFsNr(); save(); schedule(); toast('Neue Nummern erzeugt'); });
  $('reset').addEventListener('click', function () {
    var keep = { idNr: state.idNr, fsNr: state.fsNr };
    state = Object.assign({}, DEFAULTS, keep); photo = null; $('foto').value = '';
    toForm(); save(); schedule();
  });
  $('foto').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    var fr = new FileReader();
    fr.onload = function () {
      var im = new Image();
      im.onload = function () { photo = im; schedule(); };
      im.src = fr.result;
    };
    fr.readAsDataURL(f);
  });
  $('fotoWeg').addEventListener('click', function () { photo = null; $('foto').value = ''; schedule(); });

  var toastTimer = null;
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 3800);
  }
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var c = canvases[Number(b.getAttribute('data-copy'))];
      c.toBlob(function (blob) {
        try {
          navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(
            function () { toast('Bild kopiert'); },
            function () { toast('Kopieren geht hier nicht. Rechtsklick auf die Karte, dann „Bild speichern unter“. Am Handy gedrückt halten.'); }
          );
        } catch (e) { toast('Kopieren geht hier nicht. Rechtsklick auf die Karte, dann „Bild speichern unter“. Am Handy gedrückt halten.'); }
      }, 'image/png');
    });
  });

  load(); toForm(); render();
})();
