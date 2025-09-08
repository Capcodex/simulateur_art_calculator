// main.ts — Estimation du prix d'une œuvre (Méthodes A & B)
// - TVA simplifiée (Oui/Non, taux moyen fixe)
// - Méthode A : coûts + (taux horaire × heures) + frais — taux horaire personnalisable
// - Méthode B 2D : tranches €/cm² “artiste estimé” + niveau (émergent/intermédiaire/établi/perso)
// - Édition simplifiée : Unique / Limitée (division du prix par exemplaire)
// Compat TS ciblage ES5+ (pas d'Object.entries)

// Helpers
function toNum(id: string): number {
  var el = document.getElementById(id) as HTMLInputElement;
  var v = parseFloat(el && el.value ? el.value.replace(',', '.') : '');
  return isFinite(v) ? v : 0;
}
function selVal(id: string): string { return (document.getElementById(id) as HTMLSelectElement).value; }
function show(el: HTMLElement, on: boolean){ el.style.display = on ? '' : 'none'; }

// Devise
var SYMBOLS: Record<string,string> = { EUR: '€', USD: '$', GBP: '£' } as any;

// Constantes
var TVA_MOY = 0.10; // taux moyen simplifié (ajuste ici si besoin)

// Commission & TVA
function applyCommission(publicHTTarget: number, commissionRate: number): number {
  if (commissionRate <= 0) return publicHTTarget;
  var denom = (1 - commissionRate);
  return denom > 0 ? (publicHTTarget / denom) : publicHTTarget;
}
function applyTVA(ht: number, tvaActive: boolean): number { return tvaActive ? ht * (1 + TVA_MOY) : ht; }

// Format
function fmt(n: number, sym: string){ return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n) + ' ' + sym; }

// ---- ÉDITION (simple) ----
function applyEditionAdjust(ht: number): number {
  var mode = selVal('edition');
  if (mode === 'limite') {
    var n = toNum('nbExemplaires');
    if (n > 1) return ht / n; // prix par exemplaire
  }
  return ht; // unique par défaut
}

// ---- MÉTHODE A : coûts + temps ----
function getTauxHoraire(): number {
  var v = selVal('tauxHoraire');
  if (v === 'perso') {
    var p = toNum('tauxHorairePerso');
    return p > 0 ? p : 0;
  }
  var f = parseFloat(v);
  return isFinite(f) ? f : 0;
}

function calcA(dev: string, commission: number, tvaActive: boolean){
  var couts = toNum('couts');
  var taux = getTauxHoraire();
  var heures = toNum('heures');
  var frais = toNum('fraisFixes');

  var base = couts + (taux * heures) + frais;
  var ht = applyEditionAdjust(base);                // édition appliquée avant commission/TVA (prix / exemplaire)
  var publicHT = applyCommission(ht, commission);
  var publicTTC = applyTVA(publicHT, tvaActive);

  return { base: base, ht: ht, publicHT: publicHT, publicTTC: publicTTC, sym: SYMBOLS[dev] };
}

// ---- MÉTHODE B : tranches €/cm² (réf “artiste estimé”) ----
// Moyennes par surface (cm²) : XS/S/M/L/XL (issues de la grille)
function bandedRateEuroPerCm2(area: number): number {
  if (area <= 500)   return 7.94; // XS
  if (area <= 1000)  return 5.99; // S
  if (area <= 3000)  return 4.54; // M
  if (area <= 7000)  return 3.45; // L
  return 3.08;                     // XL
}

// Coefficients de niveau
var LVL = {
  emergent: 0.60,
  intermediaire: 0.85,
  etabli: 1.00
};

// Récup du multiplicateur 2D final (€/cm²) selon surface + niveau
function getRate2d(area: number): number {
  var niveau = selVal('niveau2d');
  if (niveau === 'perso') return toNum('multPerso2d'); // override direct
  var base = bandedRateEuroPerCm2(area);
  if (niveau === 'emergent')       return base * LVL.emergent;
  if (niveau === 'intermediaire')  return base * LVL.intermediaire;
  return base * LVL.etabli; // établi ou vide
}

// Méthode B (2D/3D)
function calcB(dev: string, commission: number, tvaActive: boolean){
  var type = selVal('typeObjet');
  var L = toNum('longueur');
  var l = toNum('largeur');
  var encadrement = toNum('encadrement');
  var ht = 0; var details = '';

  if (type === '2d') {
    var surface = L * l; // cm²
    var rate = getRate2d(surface);                  // €/cm² ajusté par niveau
    var coefMed = parseFloat(selVal('medium')) || 1;// médium 2D

    ht = surface * rate * coefMed + encadrement;
    ht = applyEditionAdjust(ht);                    // prix par exemplaire si édition limitée
    details = 'Surface ' + surface.toFixed(0) + ' cm² × ' + rate.toFixed(2) + ' €/cm² × médium ' + coefMed;
  } else {
    var P = toNum('profondeur');
    var mult3d = toNum('multCarriere3d');          // 3D saisi directement (€/cm³)
    var volume = L * l * P; // cm³
    ht = volume * mult3d + encadrement;
    ht = applyEditionAdjust(ht);                    // prix par exemplaire si édition limitée
    details = 'Volume ' + volume.toFixed(0) + ' cm³ × mult ' + (mult3d || 0);
  }

  var publicHT = applyCommission(ht, commission);
  var publicTTC = applyTVA(publicHT, tvaActive);
  return { ht: ht, publicHT: publicHT, publicTTC: publicTTC, details: details, sym: SYMBOLS[dev] };
}

// ---- Rendu ----
function renderBreakdownA(out: HTMLElement, a: ReturnType<typeof calcA>){
  var sym = a.sym;
  out.innerHTML = ''+
    '<div class="price">'+fmt(a.publicTTC, sym)+'</div>'+
    '<div class="breakdown">'+
    'Base = Matériaux + (Taux×Heures) + Frais\n'+
    'Édition : prix par exemplaire (si limitée)\n'+
    'Public HT = HT / (1 - Commission)\n'+
    'Public TTC = Public HT × (1 + TVA moyenne)\n'+
    '</div>';
}
function renderBreakdownB(out: HTMLElement, b: ReturnType<typeof calcB>){
  var sym = b.sym;
  out.innerHTML = ''+
    '<div class="price">'+fmt(b.publicTTC, sym)+'</div>'+
    '<div class="breakdown">'+
    b.details + '\n'+
    'Édition : prix par exemplaire (si limitée)\n'+
    'Public HT = HT / (1 - Commission)\n'+
    'Public TTC = Public HT × (1 + TVA moyenne)\n'+
    '</div>';
}
function renderFinal(out: HTMLElement, finalTTC: number, sym: string, src: 'A'|'B'){
  out.innerHTML = '<div class="price">'+fmt(finalTTC, sym)+'</div><div class="muted">Basé sur la méthode '+src+'. Ajustez selon le contexte (demande, notoriété, série).</div>';
}

// ---- Main ----
document.addEventListener('DOMContentLoaded', function(){
  var typeSel = document.getElementById('typeObjet') as HTMLSelectElement;
  var blocProf = document.getElementById('blocProfondeur') as HTMLDivElement;
  var bloc2d = document.getElementById('bloc2d') as HTMLDivElement;

  function syncType(){
    var is3D = typeSel.value === '3d';
    show(blocProf, is3D);
    show(bloc2d, !is3D);
  }
  typeSel.addEventListener('change', syncType);
  syncType();

  // 2D : multiplicateur perso
  var niveau2dSel = document.getElementById('niveau2d') as HTMLSelectElement;
  var blocMultPerso2d = document.getElementById('blocMultPerso2d') as HTMLDivElement;
  function syncMultPerso(){ show(blocMultPerso2d, niveau2dSel.value === 'perso'); }
  niveau2dSel.addEventListener('change', syncMultPerso);
  syncMultPerso();

  // A : taux horaire personnalisé
  var tauxSel = document.getElementById('tauxHoraire') as HTMLSelectElement;
  var blocTauxPerso = document.getElementById('blocTauxPerso') as HTMLDivElement;
  function syncTauxPerso(){ show(blocTauxPerso, tauxSel.value === 'perso'); }
  tauxSel.addEventListener('change', syncTauxPerso);
  syncTauxPerso();

  // Édition : affichage nb d’exemplaires
  var edSel = document.getElementById('edition') as HTMLSelectElement;
  var edCount = document.getElementById('editionCountBlock') as HTMLDivElement;
  function syncEdition(){ show(edCount, edSel.value === 'limite'); }
  edSel.addEventListener('change', syncEdition);
  syncEdition();

  // Submit
  var form = document.getElementById('artprice-form') as HTMLFormElement;
  form.addEventListener('submit', function(e){
    e.preventDefault();

    var dev = selVal('devise');
    var commission = parseFloat(selVal('commission')) || 0;
    var tvaActive = selVal('tvaActive') === 'oui';

    // Calculs
    var a = calcA(dev, commission, tvaActive);
    var b = calcB(dev, commission, tvaActive);

    // Choix par défaut : max(A, B)
    var final = a.publicTTC >= b.publicTTC ? a.publicTTC : b.publicTTC;
    var src: 'A'|'B' = a.publicTTC >= b.publicTTC ? 'A' : 'B';

    // Rendu
    renderBreakdownA(document.getElementById('outA')!, a);
    renderBreakdownB(document.getElementById('outB')!, b);
    renderFinal(document.getElementById('outFinal')!, final, SYMBOLS[dev], src);

    var res = document.getElementById('resultat') as HTMLDivElement;
    res.hidden = false;
    res.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Lead form (démo)
  var lead = document.getElementById('lead-form') as HTMLFormElement;
  lead.addEventListener('submit', function(e){
    e.preventDefault();
    var email = (document.getElementById('lead-email') as HTMLInputElement).value;
    var region = (document.getElementById('lead-region') as HTMLSelectElement).value;
    var exp = (document.getElementById('lead-exp') as HTMLSelectElement).value;
    var rgpd = (document.getElementById('lead-rgpd') as HTMLInputElement).checked;
    if (!email || !region || !exp || !rgpd) return;
    alert('Merci ! Un expert vous recontactera rapidement.');
  });
});
