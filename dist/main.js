"use strict";
// main.ts — Estimation du prix d'une œuvre (Méthodes A & B)
// Compat TS ciblage ES5+ (sans Object.entries)
// Helpers
function toNum(id) {
    var el = document.getElementById(id);
    var v = parseFloat(el && el.value ? el.value.replace(',', '.') : '');
    return isFinite(v) ? v : 0;
}
function selVal(id) { return document.getElementById(id).value; }
function show(el, on) { el.style.display = on ? '' : 'none'; }
// Devise
var SYMBOLS = { EUR: '€', USD: '$', GBP: '£' };
// Calcul TVA & commission
function applyCommission(publicHTTarget, commissionRate) {
    // Ici on cherche le prix PUBLIC HT à afficher pour que votre NET HT = publicHTTarget × (1 - commission)
    // Inverse : publicHT = netHT / (1 - commission)
    if (commissionRate <= 0)
        return publicHTTarget;
    var denom = (1 - commissionRate);
    return denom > 0 ? (publicHTTarget / denom) : publicHTTarget;
}
function applyTVA(ht, tvaActive, tva) { return tvaActive ? ht * (1 + tva) : ht; }
// Format
function fmt(n, sym) { return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n) + ' ' + sym; }
// Méthode A
function calcA(dev, commission, tvaActive, tva) {
    var couts = toNum('couts');
    var multiMat = parseFloat(selVal('multiMat')) || 2;
    var taux = parseFloat(selVal('tauxHoraire')) || 25;
    var heures = toNum('heures');
    var frais = toNum('fraisFixes');
    var marge = parseFloat(selVal('marge')) || 0;
    var base = (couts * multiMat) + (taux * heures) + frais;
    var ht = base * (1 + marge);
    var publicHT = applyCommission(ht, commission);
    var publicTTC = applyTVA(publicHT, tvaActive, tva);
    return { base: base, ht: ht, publicHT: publicHT, publicTTC: publicTTC, sym: SYMBOLS[dev] };
}
// Méthode B
function calcB(dev, commission, tvaActive, tva) {
    var type = selVal('typeObjet');
    var L = toNum('longueur');
    var l = toNum('largeur');
    var coefMed = parseFloat(selVal('medium')) || 1;
    var encadrement = toNum('encadrement');
    var ht = 0;
    var details = '';
    if (type === '2d') {
        var mult = toNum('multCarriere');
        var surface = L * l; // cm²
        ht = surface * mult * coefMed + encadrement;
        details = 'Surface ' + surface.toFixed(0) + ' cm² × ' + mult + ' × coef ' + coefMed;
    }
    else {
        var P = toNum('profondeur');
        var mult3d = toNum('multCarriere3d');
        var volume = L * l * P; // cm³
        ht = volume * mult3d * coefMed + encadrement;
        details = 'Volume ' + volume.toFixed(0) + ' cm³ × ' + mult3d + ' × coef ' + coefMed;
    }
    var publicHT = applyCommission(ht, commission);
    var publicTTC = applyTVA(publicHT, tvaActive, tva);
    return { ht: ht, publicHT: publicHT, publicTTC: publicTTC, details: details, sym: SYMBOLS[dev] };
}
// Edition (facultatif)
function editionCoef() {
    var active = selVal('editionActive') === 'oui';
    if (!active)
        return 1;
    var tirage = Math.max(1, toNum('editionTirage'));
    var numero = Math.max(1, toNum('editionNumero'));
    var coef = 1 + ((tirage - numero + 1) / tirage) * 0.1; // +0% à +10%
    return coef;
}
// Rendu
function renderBreakdownA(out, a) {
    var sym = a.sym;
    out.innerHTML = '' +
        '<div class="price">' + fmt(a.publicTTC, sym) + '</div>' +
        '<div class="breakdown">' +
        'Base = (Mat.×Mult) + (Taux×Heures) + Frais\n' +
        'HT = Base × (1 + Marge)\n' +
        'Public HT = HT / (1 - Commission)\n' +
        'Public TTC = Public HT × (1 + TVA)\n' +
        '</div>';
}
function renderBreakdownB(out, b) {
    var sym = b.sym;
    out.innerHTML = '' +
        '<div class="price">' + fmt(b.publicTTC, sym) + '</div>' +
        '<div class="breakdown">' +
        b.details + '\n' +
        'Public HT = HT / (1 - Commission)\n' +
        'Public TTC = Public HT × (1 + TVA)\n' +
        '</div>';
}
function renderFinal(out, finalTTC, sym, src) {
    out.innerHTML = '<div class="price">' + fmt(finalTTC, sym) + '</div><div class="muted">Basé sur la méthode ' + src + '. Ajustez selon le contexte (demande, notoriété, série).</div>';
}
// Main
document.addEventListener('DOMContentLoaded', function () {
    var typeSel = document.getElementById('typeObjet');
    var blocProf = document.getElementById('blocProfondeur');
    var blocCarre = document.getElementById('blocCarre');
    typeSel.addEventListener('change', function () {
        var is3D = typeSel.value === '3d';
        show(blocProf, is3D);
        show(blocCarre, !is3D);
    });
    var form = document.getElementById('artprice-form');
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var dev = selVal('devise');
        var commission = parseFloat(selVal('commission')) || 0;
        var tvaActive = selVal('tvaActive') === 'oui';
        var tva = parseFloat(selVal('tvaTaux')) || 0;
        // Calculs
        var a = calcA(dev, commission, tvaActive, tva);
        var b = calcB(dev, commission, tvaActive, tva);
        // Coef édition
        var coefEd = editionCoef();
        a.publicTTC *= coefEd;
        a.publicHT *= coefEd;
        a.ht *= coefEd;
        a.base *= coefEd;
        b.publicTTC *= coefEd;
        b.publicHT *= coefEd;
        b.ht *= coefEd;
        // Choix par défaut : max(A, B)
        var final = a.publicTTC >= b.publicTTC ? a.publicTTC : b.publicTTC;
        var src = a.publicTTC >= b.publicTTC ? 'A' : 'B';
        // Rendu
        renderBreakdownA(document.getElementById('outA'), a);
        renderBreakdownB(document.getElementById('outB'), b);
        renderFinal(document.getElementById('outFinal'), final, SYMBOLS[dev], src);
        var res = document.getElementById('resultat');
        res.hidden = false;
        res.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    // Lead form (démo)
    var lead = document.getElementById('lead-form');
    lead.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = document.getElementById('lead-email').value;
        var region = document.getElementById('lead-region').value;
        var exp = document.getElementById('lead-exp').value;
        var rgpd = document.getElementById('lead-rgpd').checked;
        if (!email || !region || !exp || !rgpd)
            return;
        alert('Merci ! Un expert vous recontactera rapidement.');
    });
});
