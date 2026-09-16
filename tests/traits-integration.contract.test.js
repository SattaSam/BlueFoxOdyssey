const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const settings = fs.readFileSync(path.join(ROOT,'CANDIDATE/engine/settings-ui-bridge.js'),'utf8');
const core = fs.readFileSync(path.join(ROOT,'CANDIDATE/engine/behavior-arbitration-core.js'),'utf8');
const integration = fs.readFileSync(path.join(ROOT,'CANDIDATE/engine/behavior-arbitration-integration.js'),'utf8');

test('Opportuniste est un alias de gameplay sans migration de la clé de sauvegarde historique', () => {
  assert.match(settings, /"respectueux\|destructeur": 88/);
  assert.match(settings, /profile\.opportuniste = 100 - left/);
  assert.match(settings, /Opportuniste : Saisit plus volontiers une occasion locale/);
});

test('Les pensées sont bornées aux arbitrages et disposent d’un cooldown', () => {
  assert.match(integration, /TRAIT_THOUGHT_COOLDOWN_MS = 18000/);
  assert.match(integration, /Tiens… je ferais bien un détour/);
  assert.match(integration, /Je ne vais pas passer à côté de cette opportunité/);
  assert.match(integration, /speakTraitThought\(this, selected\.traitReason\)/);
  assert.doesNotMatch(integration, /onSpeak\([^\n]*objectKind/);
});

test('Opportuniste agit sur une opportunité locale bornée et Respectueux ne remplace aucune action missionnelle', () => {
  assert.match(integration, /LOCAL_OPPORTUNITY_RADIUS = 14/);
  assert.match(integration, /localOpportunityCollectables/);
  assert.match(integration, /routeCost\(this, object\) > LOCAL_OPPORTUNITY_RADIUS/);
  assert.match(integration, /"opportuniste:opportunite"/);
  assert.match(integration, /"respectueux:mesure"/);
  const baseIntegration = fs.readFileSync(path.join(ROOT,'BASE/engine/behavior-arbitration-integration.js'),'utf8');
  const newTargetBindingRefs = (integration.match(/targetBinding/g) || []).length - (baseIntegration.match(/targetBinding/g) || []).length;
  const newInstanceRefs = (integration.match(/instanceId/g) || []).length - (baseIntegration.match(/instanceId/g) || []).length;
  assert.equal(newTargetBindingRefs, 0);
  assert.equal(newInstanceRefs, 0);
});

test('La relation ne contient plus de refus absolu du joueur', () => {
  assert.doesNotMatch(core, /Non\. Cette fois, je préfère suivre mon propre jugement/);
  assert.match(core, /D’accord… mais je préfère finir ce que j’ai commencé avant de changer de cap/);
});

test('Aucun nouveau propriétaire parallèle ni scheduler de personnalité', () => {
  assert.doesNotMatch(core + integration, /setInterval\([^)]*trait/i);
  assert.doesNotMatch(core + integration, /PersonalityManager|TraitManager|personalityEngine/);
});
