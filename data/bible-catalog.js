(function (global) {
  "use strict";
  const BF = global.BlueFox3D = global.BlueFox3D || {};

  const T01 = Object.freeze({
    id: "T01",
    title: "Reconnaître le Site du crash",
    description: "Observer la capsule accidentée et mémoriser le point zéro.",
    pattern: "OBSERVE_TARGET",
    trigger: Object.freeze({ type: "manual", count: 1 }),
    initialState: "active",
    targetBinding: "definition",
    priority: 100,
    passivePriorityAxis: "survival",
    slots: Object.freeze({
      study: Object.freeze({
        title: "Observer la capsule",
        target: 1,
        params: Object.freeze({ objectId: "LANDMARK-CRASH-CAPSULE-001" })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "La capsule a tenu juste assez longtemps pour me déposer ici. Avant de m’éloigner, je veux regarder ce qui a survécu et mémoriser cet endroit."
      ]),
      progress: Object.freeze([
        Object.freeze({
          slot: "study",
          atCount: 1,
          text: "Je garde la capsule comme premier repère. Ce n’est pas forcément ma maison, mais c’est le seul endroit que je connais déjà."
        })
      ]),
      completed: Object.freeze([
        "D’accord. Je sais où revenir. Maintenant je peux regarder ce que cette zone peut réellement m’offrir."
      ])
    })
  });

  /*
   * Bible Catalog — BASE PROPRE.
   *
   * Les anciennes missions de preuve restent retirées du runtime.
   * La première fiche réintroduite ci-dessous correspond au chantier
   * tutoriel des rations. Son déclencheur reste manuel jusqu'au raccord
   * complet de la chaîne tutorielle ; sa recette est déjà canonique ici.
   */
  const rationDiscovery = Object.freeze({
    id: "BIBLE-TUTORIAL-RATION-DISCOVERY",
    title: "Comprendre les rations",
    description:
      "BlueFox revient au camp avec les plantes nécessaires, confirme qu'elles sont comestibles et comprend comment préparer des rations.",
    pattern: "COLLECT_THEN_REWARD",
    trigger: Object.freeze({ type: "manual" }),
    priority: 80,
    passivePriorityAxis: "survival",
    slots: Object.freeze({
      collect: Object.freeze({
        title: "Réunir les plantes nécessaires",
        requirements: Object.freeze([
          Object.freeze({
            title: "Fibres végétales",
            target: 2,
            params: Object.freeze({
              kind: "fiber"
            })
          }),
          Object.freeze({
            title: "Biomasse adaptative",
            target: 1,
            params: Object.freeze({
              kind: "adaptive_biomass"
            })
          })
        ])
      })
    }),
    completionGate: Object.freeze({
      type: "proximity.shelter",
      shelterKinds: Object.freeze(["camp", "refuge", "base"]),
      radius: 8
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Ces plantes pourraient peut-être servir à autre chose qu'à renforcer l'abri. Je veux les examiner au calme, près du camp."
      ]),
      completed: Object.freeze([
        "Ça fonctionne. C'est comestible, compact, et je peux le conserver. Je sais maintenant préparer des rations."
      ])
    }),
    rewards: Object.freeze([
      Object.freeze({
        type: "research.recipe",
        id: "ration-basic-v2",
        category: "food",
        label: "Ration de survie",
        description:
          "Une ration simple préparée à partir de fibres végétales et de biomasse adaptative.",
        requirements: Object.freeze([
          Object.freeze({
            inventoryKey: "fiber",
            quantity: 2
          }),
          Object.freeze({
            inventoryKey: "adaptive_biomass",
            quantity: 1
          })
        ]),
        output: Object.freeze({
          objectId: "ration",
          quantity: 1
        }),
        autoCraft: true,
        requiresShelter: true
      })
    ])
  });

  BF.BibleCatalog = Object.freeze([
    T01,
    rationDiscovery
  ]);

  BF.BibleRuntimeReference = Object.freeze({
    phase: "tutorial-rewards-reconnection",
    testMissionsRemoved: true,
    runtimePatternsPreserved: true,
    researchSource: "mission-rewards"
  });
})(window);
