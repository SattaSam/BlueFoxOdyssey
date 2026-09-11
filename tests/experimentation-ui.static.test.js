const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(ROOT,'engine/ui-enhancements.js'),'utf8');
test('Recherche expose les expérimentations sans remplacer plans/recettes',()=>{
  assert.match(src,/research\.experimentationList\?\.\(\)/);
  assert.match(src,/Lancer une expérimentation/);
  assert.match(src,/research\.runExperiment\?\.\(state\.id/);
  assert.match(src,/PLANS ET RECETTES DÉBLOQUÉS/);
  assert.match(src,/research\.canCraft\?\.\(entry\.id, 1\)/);
});
