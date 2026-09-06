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
    uiGuidance: Object.freeze([
      Object.freeze({
        id: "crash-capsule-help",
        when: "active-idle",
        message: "Observer le site du crash : cliquez sur la capsule pour interagir.",
        duration: 14000,
        dismissOnProgress: true
      })
    ]),
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

  const T02 = Object.freeze({
    id: "T02",
    title: "Prélever les premiers échantillons",
    description: "Prélever une plante, du bois et un minerai pour comparer les premières ressources locales.",
    pattern: "COLLECT_THEN_REWARD",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "T01",
      count: 1
    }),
    initialState: "active",
    prerequisites: Object.freeze(["T01"]),
    priority: 96,
    passivePriorityAxis: "collection",
    slots: Object.freeze({
      collect: Object.freeze({
        title: "Prélever trois types de ressources",
        requirements: Object.freeze([
          Object.freeze({
            title: "Prélever une plante",
            target: 1,
            params: Object.freeze({
              subject: "flora",
              excludeKinds: Object.freeze(["wood"])
            })
          }),
          Object.freeze({
            title: "Prélever du bois",
            target: 1,
            params: Object.freeze({
              kind: "wood"
            })
          }),
          Object.freeze({
            title: "Prélever un minerai",
            target: 1,
            params: Object.freeze({
              subject: "mineral"
            })
          })
        ])
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Je ne vais pas remplir mon sac au hasard. Quelques échantillons différents suffiront pour comprendre ce que cette zone peut fournir."
      ]),
      progress: Object.freeze([
        Object.freeze({
          at: 0.34,
          text: "Les matériaux ne se ressemblent pas. Tant mieux : chacun pourra servir à autre chose."
        })
      ]),
      completed: Object.freeze([
        "J’ai de quoi comparer. Le bois, surtout, pourrait me donner un point de départ très simple."
      ])
    })
  });

  const T03 = Object.freeze({
    id: "T03",
    title: "Établir le premier Camp",
    description: "Étudier le bois puis réunir dix unités pour installer un premier camp près du Site du crash.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "T02",
      count: 1
    }),
    initialState: "active",
    prerequisites: Object.freeze(["T02"]),
    priority: 94,
    passivePriorityAxis: "collection",
    sequence: Object.freeze([
      Object.freeze({
        slot: "studyWood",
        title: "Étudier un élément de bois",
        action: "observe",
        target: 1,
        params: Object.freeze({
          kind: "wood"
        })
      }),
      Object.freeze({
        slot: "collectWood",
        title: "Réunir 10 bois",
        action: "collect",
        target: 10,
        requires: Object.freeze(["studyWood"]),
        params: Object.freeze({
          kind: "wood"
        })
      })
    ]),
    activationInventoryCredits: Object.freeze([
      Object.freeze({
        slot: "collectWood",
        inventoryKey: "wood",
        maximum: 10
      })
    ]),
    effects: Object.freeze([
      Object.freeze({
        type: "inventory.consume",
        inventoryKey: "wood",
        quantity: 10
      }),
      Object.freeze({
        type: "site.establish",
        kind: "camp",
        microSceneId: "MSC-CUSTOM-CAMP",
        stage: 1,
        placement: Object.freeze({
          mode: "near-bluefox",
          anchor: "crash-capsule",
          distance: 7
        })
      })
    ]),
    uiGuidance: Object.freeze([
      Object.freeze({
        id: "camera-help",
        when: "active",
        delayMs: 90000,
        message: "Double clic : désactiver le suivi caméra. Clic simple : revenir à BlueFox.",
        duration: 14000,
        highlight: "camera",
        dismissOnProgress: false
      })
    ]),
    rewards: Object.freeze([
      Object.freeze({
        type: "research.blueprint",
        id: "camp-establish-v1",
        category: "construction",
        constructionKind: "camp",
        label: "Établir un camp",
        description: "Installer un camp sur une map qui ne possède encore aucune infrastructure locale.",
        requiresShelter: false
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Ce bois est assez régulier. Je pourrais le transformer en planches et monter quelque chose de simple près de la capsule. Dix unités devraient suffire pour commencer."
      ]),
      progress: Object.freeze([
        Object.freeze({
          slot: "collectWood",
          atCount: 1,
          text: "Je ne cherche pas une forteresse. Un feu, quelques planches, un endroit où poser mon sac : ce sera déjà un vrai point d’ancrage."
        })
      ]),
      completed: Object.freeze([
        "Voilà mon premier camp. Pour en faire un vrai refuge il faudra beaucoup plus, mais je n’ai aucune raison d’attendre ici jusque-là."
      ])
    })
  });

  const shelter = Object.freeze({
    id: "GAME-shelter",
    title: "Construire un refuge",
    description: "Projet de Refuge : accumuler les ressources et connaissances nécessaires sans bloquer les autres missions.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "T03",
      count: 1
    }),
    initialState: "active",
    prerequisites: Object.freeze(["T03"]),
    activationSource: "autonomy",
    priority: 54,
    passivePriorityAxis: "collection",
    sequence: Object.freeze([
      Object.freeze({
        slot: "fibers",
        title: "Réunir 100 plantes fibreuses",
        action: "collect",
        target: 100,
        requires: Object.freeze([]),
        params: Object.freeze({
          kind: "fiber"
        })
      }),
      Object.freeze({
        slot: "plantStudy",
        title: "Observer, inspecter ou analyser 100 plantes",
        action: "analyze",
        target: 100,
        requires: Object.freeze([]),
        params: Object.freeze({
          subject: "flora",
          excludeKinds: Object.freeze(["wood"])
        })
      }),
      Object.freeze({
        slot: "wood",
        title: "Réunir 100 bois",
        action: "collect",
        target: 100,
        requires: Object.freeze([]),
        params: Object.freeze({
          kind: "wood"
        })
      }),
    ]),
    completionGate: Object.freeze({
      type: "proximity.shelter",
      mapId: "crystal",
      shelterKinds: Object.freeze(["refuge"]),
      radius: 9999,
      scope: "current-map"
    }),
    effects: Object.freeze([
      Object.freeze({
        type: "inventory.consume",
        inventoryKey: "fiber",
        quantity: 100
      }),
      Object.freeze({
        type: "inventory.consume",
        inventoryKey: "wood",
        quantity: 100
      }),
      Object.freeze({
        type: "site.establish",
        kind: "refuge",
        microSceneId: "MSC-CUSTOM-CAMP-BASE",
        stage: 2,
        placement: Object.freeze({
          mode: "near-camp",
          referenceKind: "camp"
        })
      })
    ]),
    rewards: Object.freeze([
      Object.freeze({
        type: "research.blueprint",
        id: "refuge-build-v1",
        category: "construction",
        constructionKind: "refuge",
        label: "Construire un refuge",
        description: "Construire un refuge sur une map où un camp a déjà été établi.",
        requiresShelter: false
      })
    ])
  });

  const base = Object.freeze({
    id: "GAME-base",
    title: "Construire une base renforcée",
    description: "Projet de Base renforcée : réunir les matériaux et connaissances nécessaires puis faire évoluer automatiquement le Refuge.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "manual",
      count: 1
    }),
    initialState: "active",
    prerequisites: Object.freeze(["GAME-shelter"]),
    activationSource: "autonomy",
    priority: 52,
    passivePriorityAxis: "collection",
    sequence: Object.freeze([
      Object.freeze({
        slot: "fibers",
        title: "Réunir 500 plantes fibreuses",
        action: "collect",
        target: 500,
        requires: Object.freeze([]),
        params: Object.freeze({ kind: "fiber" })
      }),
      Object.freeze({
        slot: "minerals",
        title: "Réunir 500 minéraux ou cristaux",
        action: "extract",
        target: 500,
        requires: Object.freeze([]),
        params: Object.freeze({ subject: "mineral" })
      }),
      Object.freeze({
        slot: "rockStudy",
        title: "Observer, inspecter ou analyser 100 éléments rocheux",
        action: "analyze",
        target: 100,
        requires: Object.freeze([]),
        params: Object.freeze({ subject: "mineral" })
      })
    ]),
    activationInventoryCredits: Object.freeze([
      Object.freeze({ slot: "fibers", inventoryKey: "fiber", maximum: 500 }),
      Object.freeze({ slot: "minerals", subject: "mineral", maximum: 500 })
    ]),
    completionGate: Object.freeze({
      type: "proximity.shelter",
      mapId: "crystal",
      shelterKinds: Object.freeze(["base"]),
      radius: 9999,
      scope: "current-map"
    }),
    effects: Object.freeze([
      Object.freeze({
        type: "inventory.consume",
        inventoryKey: "fiber",
        quantity: 500
      }),
      Object.freeze({
        type: "inventory.consume",
        subject: "mineral",
        quantity: 500
      }),
      Object.freeze({
        type: "site.establish",
        kind: "base",
        microSceneId: "MSC-CUSTOM-CAMP-BASE-REINFORCED",
        stage: 3,
        placement: Object.freeze({
          mode: "near-camp",
          referenceKind: "refuge"
        })
      })
    ]),
    narrative: Object.freeze({
      completed: Object.freeze([
        "Le Refuge est devenu une Base renforcée capable de soutenir des excursions plus lointaines."
      ])
    })
  });

  const nouvelleFondation = Object.freeze({
    id: "GAME-Nouvelle fondation",
    title: "Établir un camp-relais lointain",
    description: "Après une excursion de dix nouvelles maps depuis Crystal, établir sur la zone atteinte un nouveau camp-relais.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "exploration.map_discovered",
      count: 10,
      uniqueOnly: true
    }),
    prerequisites: Object.freeze(["GAME-base"]),
    bindActivationMap: true,
    targetMapFact: "bibleActivation:GAME-Nouvelle fondation",
    targetMapField: "mapId",
    priority: 48,
    passivePriorityAxis: "survival",
    ponderation: 0.1,
    sequence: Object.freeze([
      Object.freeze({
        slot: "studyWood",
        title: "Vérifier le bois disponible sur la zone du relais",
        action: "observe",
        target: 1,
        params: Object.freeze({
          kind: "wood",
          requiredMapFact: "bibleActivation:GAME-Nouvelle fondation",
          requiredMapField: "mapId"
        })
      }),
      Object.freeze({
        slot: "collectWood",
        title: "Réunir 10 bois pour le camp-relais",
        action: "collect",
        target: 10,
        requires: Object.freeze(["studyWood"]),
        params: Object.freeze({
          kind: "wood",
          requiredMapFact: "bibleActivation:GAME-Nouvelle fondation",
          requiredMapField: "mapId"
        })
      })
    ]),
    activationInventoryCredits: Object.freeze([
      Object.freeze({ slot: "collectWood", inventoryKey: "wood", maximum: 10 })
    ]),
    completionGate: Object.freeze({
      type: "proximity.shelter",
      shelterKinds: Object.freeze(["camp"]),
      radius: 9999,
      scope: "current-map"
    }),
    effects: Object.freeze([
      Object.freeze({ type: "inventory.consume", inventoryKey: "wood", quantity: 10 }),
      Object.freeze({
        type: "site.establish",
        kind: "camp",
        microSceneId: "MSC-CUSTOM-CAMP",
        stage: 1,
        placement: Object.freeze({ mode: "near-bluefox" })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Crystal est loin derrière moi. Si je veux continuer sans transformer chaque excursion en aller-retour, il me faut un nouveau point d’ancrage."
      ]),
      completed: Object.freeze([
        "Le relais est en place. Je peux désormais déposer mes trouvailles et préparer la suite sans dépendre de chaque retour à Crystal."
      ])
    })
  });

  const foundation = Object.freeze({
    id: "GAME-foundation",
    title: "Transformer le camp-relais en Refuge",
    description: "Renforcer le camp-relais lointain en Refuge sur la même map, avec les ressources canoniques du patron Camp → Refuge.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GAME-Nouvelle fondation",
      count: 1
    }),
    prerequisites: Object.freeze(["GAME-Nouvelle fondation"]),
    targetMapFact: "bibleActivation:GAME-Nouvelle fondation",
    targetMapField: "mapId",
    priority: 46,
    passivePriorityAxis: "survival",
    ponderation: 0.1,
    sequence: Object.freeze([
      Object.freeze({
        slot: "fibers",
        title: "Réunir 100 plantes fibreuses",
        action: "collect",
        target: 100,
        params: Object.freeze({
          kind: "fiber",
          requiredMapFact: "bibleActivation:GAME-Nouvelle fondation",
          requiredMapField: "mapId"
        })
      }),
      Object.freeze({
        slot: "wood",
        title: "Réunir 100 bois",
        action: "collect",
        target: 100,
        requires: Object.freeze([]),
        params: Object.freeze({
          kind: "wood",
          requiredMapFact: "bibleActivation:GAME-Nouvelle fondation",
          requiredMapField: "mapId"
        })
      })
    ]),
    activationInventoryCredits: Object.freeze([
      Object.freeze({ slot: "fibers", inventoryKey: "fiber", maximum: 100 }),
      Object.freeze({ slot: "wood", inventoryKey: "wood", maximum: 100 })
    ]),
    completionGate: Object.freeze({
      type: "proximity.shelter",
      shelterKinds: Object.freeze(["refuge"]),
      radius: 9999,
      scope: "current-map"
    }),
    effects: Object.freeze([
      Object.freeze({ type: "inventory.consume", inventoryKey: "fiber", quantity: 100 }),
      Object.freeze({ type: "inventory.consume", inventoryKey: "wood", quantity: 100 }),
      Object.freeze({
        type: "site.establish",
        kind: "refuge",
        microSceneId: "MSC-CUSTOM-CAMP-BASE",
        stage: 2,
        placement: Object.freeze({ mode: "near-camp" })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Ce camp-relais peut devenir plus qu’une halte. Je peux le transformer en Refuge sans perdre le lien avec la zone choisie."
      ]),
      completed: Object.freeze([
        "Le camp-relais est devenu un Refuge. Cette région possède maintenant un second point d’ancrage durable."
      ])
    })
  });

  const survivalRest = Object.freeze({
    id: "GAME-survival_rest",
    title: "Repos sécurisé",
    description: "Après le retour à Crystal depuis l’expédition du relais lointain, effectuer un vrai repos au Refuge ou à la Base.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "movement.portal_crossed",
      toMapId: "crystal",
      count: 1
    }),
    prerequisites: Object.freeze(["GAME-foundation"]),
    priority: 44,
    passivePriorityAxis: "protection",
    ponderation: 0.25,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 34,
    sequence: Object.freeze([
      Object.freeze({
        slot: "returnCrystal",
        title: "Achever le retour à Crystal",
        action: "travel",
        target: 1,
        params: Object.freeze({
          eventDriven: true,
          toMapId: "crystal",
          distinctBy: "transition"
        })
      }),
      Object.freeze({
        slot: "secureRest",
        title: "Effectuer un repos sécurisé au Refuge ou à la Base",
        action: "rest",
        target: 1,
        requires: Object.freeze(["returnCrystal"]),
        params: Object.freeze({})
      })
    ]),
    completionGate: Object.freeze({
      type: "proximity.shelter",
      mapId: "crystal",
      shelterKinds: Object.freeze(["refuge", "base"]),
      radius: 8,
      scope: "any-established"
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Le trajet jusqu’au relais a changé l’échelle de mes sorties. De retour à Crystal, je veux vérifier ce que vaut réellement un repos protégé."
      ]),
      completed: Object.freeze([
        "À l’abri, le repos n’est plus seulement une pause : il redevient une vraie récupération."
      ])
    })
  });

  const survivalStable = Object.freeze({
    id: "GAME-survival_stable",
    title: "Campement stable",
    description: "Valider trois retours au camp/base réellement demandés et consommés par d’autres missions.",
    pattern: "TRAVEL_CYCLE",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GAME-survival_rest",
      count: 1
    }),
    prerequisites: Object.freeze(["GAME-survival_rest"]),
    priority: 18,
    passivePriorityAxis: "protection",
    ponderation: 0.25,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 34,
    slots: Object.freeze({
      travel: Object.freeze({
        title: "Comptabiliser 3 retours missionnels réels à Crystal",
        target: 3,
        params: Object.freeze({
          eventDriven: true,
          returnConsumedOnly: true,
          toMapId: "crystal"
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Un refuge devient un vrai point d’ancrage quand mes trajets finissent naturellement par y revenir."
      ]),
      completed: Object.freeze([
        "Trois expéditions m’ont ramené ici pour de bonnes raisons. Ce campement fait désormais partie de ma manière d’explorer."
      ])
    })
  });

  const collectionSamples = Object.freeze({
    id: "GAME-collection_samples",
    title: "Échantillons de base",
    description: "Après quatre nouvelles maps d’expédition, constituer un petit ensemble de ressources de natures différentes.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "exploration.map_discovered",
      count: 4,
      uniqueOnly: true
    }),
    prerequisites: Object.freeze(["GAME-survival_stable"]),
    priority: 28,
    passivePriorityAxis: "collection",
    ponderation: 0.25,
    sequence: Object.freeze([
      Object.freeze({
        slot: "mineral",
        title: "Collecter 3 minerais ou cristaux",
        action: "collect",
        target: 3,
        params: Object.freeze({ subject: "mineral" })
      }),
      Object.freeze({
        slot: "plant",
        title: "Collecter une plante",
        action: "collect",
        target: 1,
        params: Object.freeze({ subject: "flora", excludeKinds: Object.freeze(["wood"]) })
      }),
      Object.freeze({
        slot: "other",
        title: "Collecter une autre ressource",
        action: "collect",
        target: 1,
        params: Object.freeze({ tagsAny: Object.freeze(["resource"]) })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Je suis assez loin pour que quelques échantillons variés aient plus de valeur qu’un sac rempli au hasard."
      ]),
      completed: Object.freeze([
        "Ce lot suffit pour comparer ce que ces territoires peuvent réellement fournir."
      ])
    })
  });

  const collectionVariety = Object.freeze({
    id: "GAME-collection_variety",
    title: "Panier varié",
    description: "Sur une nouvelle map, collecter cinq familles de ressources distinctes puis revenir les déposer réellement au camp.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GAME-collection_samples",
      count: 1
    }),
    prerequisites: Object.freeze(["GAME-collection_samples"]),
    priority: 30,
    passivePriorityAxis: "collection",
    ponderation: 0.25,
    navigation: Object.freeze({
      autonomousUnknownTravel: true,
      singleUnknownTransition: true,
      autonomousKnownReturn: true
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "newMap",
        title: "Atteindre une nouvelle map",
        action: "travel",
        target: 1,
        params: Object.freeze({
          eventDriven: true,
          newOnly: true,
          distinctBy: "mapId"
        })
      }),
      Object.freeze({
        slot: "variety",
        title: "Collecter 5 familles de ressources distinctes",
        action: "collect",
        target: 5,
        requires: Object.freeze(["newMap"]),
        params: Object.freeze({
          tagsAny: Object.freeze(["resource"]),
          distinctBy: "family",
          requiredMapFact: "tutorialExcursion:GAME-collection_variety",
          requiredMapField: "generatedTargetMapId"
        })
      }),
      Object.freeze({
        slot: "returnHome",
        title: "Revenir au camp pour déposer la collecte",
        action: "travel",
        target: 1,
        requires: Object.freeze(["variety"]),
        params: Object.freeze({
          eventDriven: true,
          toMapId: "crystal",
          distinctBy: "transition"
        })
      })
    ]),
    completionGate: Object.freeze({
      type: "proximity.shelter",
      mapId: "crystal",
      shelterKinds: Object.freeze(["camp", "refuge", "base"]),
      radius: 8,
      scope: "any-established",
      requireDeposit: true
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Cette fois je veux un panier réellement varié, puis le ramener proprement au stockage."
      ]),
      completed: Object.freeze([
        "Cinq familles différentes, revenues au camp et déposées : cette collecte est enfin exploitable."
      ])
    })
  });

  const collectionReserves = Object.freeze({
    id: "GAME-collection_reserves",
    title: "Réserves sûres",
    description: "Sur une nouvelle map, collecter vingt ressources puis revenir les déposer réellement au camp.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GAME-collection_variety",
      count: 1
    }),
    prerequisites: Object.freeze(["GAME-collection_variety"]),
    priority: 30,
    passivePriorityAxis: "collection",
    ponderation: 0.25,
    navigation: Object.freeze({
      autonomousUnknownTravel: true,
      singleUnknownTransition: true,
      autonomousKnownReturn: true
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "newMap",
        title: "Atteindre une nouvelle map",
        action: "travel",
        target: 1,
        params: Object.freeze({
          eventDriven: true,
          newOnly: true,
          distinctBy: "mapId"
        })
      }),
      Object.freeze({
        slot: "reserves",
        title: "Collecter 20 ressources",
        action: "collect",
        target: 20,
        requires: Object.freeze(["newMap"]),
        params: Object.freeze({
          tagsAny: Object.freeze(["resource"]),
          requiredMapFact: "tutorialExcursion:GAME-collection_reserves",
          requiredMapField: "generatedTargetMapId"
        })
      }),
      Object.freeze({
        slot: "returnHome",
        title: "Revenir au camp pour déposer les réserves",
        action: "travel",
        target: 1,
        requires: Object.freeze(["reserves"]),
        params: Object.freeze({
          eventDriven: true,
          toMapId: "crystal",
          distinctBy: "transition"
        })
      })
    ]),
    completionGate: Object.freeze({
      type: "proximity.shelter",
      mapId: "crystal",
      shelterKinds: Object.freeze(["camp", "refuge", "base"]),
      radius: 8,
      scope: "any-established",
      requireDeposit: true
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Un stock utile n’est pas seulement ce que je ramasse : c’est ce qui revient réellement au camp."
      ]),
      completed: Object.freeze([
        "Vingt ressources ont rejoint le stockage. Cette réserve est maintenant réelle, pas seulement transportée."
      ])
    })
  });

  const explorationCartographer = Object.freeze({
    id: "GAME-exploration_cartographer",
    title: "Cartographe local",
    description: "Vers le Sud, découvrir puis explorer successivement trois nouvelles maps à au moins 80 %.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GAME-collection_reserves",
      count: 1
    }),
    prerequisites: Object.freeze(["GAME-collection_reserves"]),
    priority: 42,
    passivePriorityAxis: "exploration",
    ponderation: 0.25,
    obsessionEligible: false,
    obsessionIntensity: 2,
    navigation: Object.freeze({
      autonomousUnknownTravel: true,
      repeatUnknownTravelUntilComplete: true
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "south1",
        title: "Découvrir une première nouvelle map au Sud",
        action: "travel",
        target: 1,
        params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId", direction: "south" })
      }),
      Object.freeze({
        slot: "explore1",
        title: "Explorer cette map à 80 %",
        action: "explore-zone",
        target: 80,
        requires: Object.freeze(["south1"]),
        params: Object.freeze({
          scope: "map", metric: "surfacePercent", threshold: 80,
          requiredMapFact: "gameCartographer:map1", requiredMapField: "mapId"
        })
      }),
      Object.freeze({
        slot: "south2",
        title: "Découvrir une deuxième nouvelle map au Sud",
        action: "travel",
        target: 1,
        requires: Object.freeze(["explore1"]),
        params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId", direction: "south" })
      }),
      Object.freeze({
        slot: "explore2",
        title: "Explorer cette deuxième map à 80 %",
        action: "explore-zone",
        target: 80,
        requires: Object.freeze(["south2"]),
        params: Object.freeze({
          scope: "map", metric: "surfacePercent", threshold: 80,
          requiredMapFact: "gameCartographer:map2", requiredMapField: "mapId"
        })
      }),
      Object.freeze({
        slot: "south3",
        title: "Découvrir une troisième nouvelle map au Sud",
        action: "travel",
        target: 1,
        requires: Object.freeze(["explore2"]),
        params: Object.freeze({
          eventDriven: true, newOnly: true, distinctBy: "mapId", direction: "south",
          completionArrivalFact: "gameCartographer:map3",
          completionArrivalField: "mapId"
        })
      }),
      Object.freeze({
        slot: "explore3",
        title: "Explorer cette troisième map à 80 %",
        action: "explore-zone",
        target: 80,
        requires: Object.freeze(["south3"]),
        params: Object.freeze({
          scope: "map", metric: "surfacePercent", threshold: 80,
          requiredMapFact: "gameCartographer:map3", requiredMapField: "mapId"
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Au Sud, je veux cesser d’empiler des cartes à peine entamées : une zone, puis 80 %, avant d’aller plus loin."
      ]),
      completed: Object.freeze([
        "Trois territoires méridionaux sont maintenant reliés par une exploration réellement approfondie."
      ])
    })
  });

  const explorationComplete = Object.freeze({
    id: "GAME-exploration_complete",
    title: "Exploration approfondie",
    description: "Achever à 100 % la troisième map validée par Cartographe local.",
    pattern: "EXPLORE_SCOPE",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GAME-exploration_cartographer",
      count: 1
    }),
    prerequisites: Object.freeze(["GAME-exploration_cartographer"]),
    priority: 40,
    passivePriorityAxis: "exploration",
    ponderation: 0.25,
    obsessionEligible: false,
    obsessionIntensity: 2,
    slots: Object.freeze({
      explore: Object.freeze({
        title: "Explorer à 100 % la troisième map",
        target: 100,
        params: Object.freeze({
          scope: "map",
          metric: "surfacePercent",
          threshold: 100,
          requiredMapFact: "gameCartographer:map3",
          requiredMapField: "mapId"
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Cette troisième carte est déjà bien comprise. Je veux aller jusqu’au bout et fermer ses derniers blancs."
      ]),
      completed: Object.freeze([
        "Plus aucun secteur n’est laissé dans l’ombre sur cette carte. Je peux maintenant comparer le monde à une autre échelle."
      ])
    })
  });

  const travelBiomes = Object.freeze({
    id: "GAME-travel_biomes",
    title: "Explorateur de biomes",
    description: "Découvrir trois types de biomes distincts.",
    pattern: "EXPLORE_SCOPE",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GAME-exploration_complete",
      count: 1
    }),
    prerequisites: Object.freeze(["GAME-exploration_complete"]),
    priority: 20,
    passivePriorityAxis: "exploration",
    ponderation: 0.25,
    obsessionEligible: false,
    obsessionIntensity: 2,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 22,
    slots: Object.freeze({
      explore: Object.freeze({
        title: "Découvrir 3 biomes distincts",
        target: 3,
        params: Object.freeze({ scope: "multi-map", distinctBy: "biomeId" })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Une carte complète ne suffit pas à comprendre le monde. Je veux comparer des milieux vraiment différents."
      ]),
      completed: Object.freeze([
        "Trois biomes distincts : assez pour commencer à mesurer la diversité du monde plutôt que celle d’une seule route."
      ])
    })
  });

  const explorationTotal = Object.freeze({
    id: "GAME-exploration_total",
    title: "Exploration mondiale — 10 biomes",
    description: "Valider dix biomes distincts dont au moins une map a été explorée à 100 %, y compris dans l’historique déjà acquis.",
    pattern: "EXPLORE_SCOPE",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GAME-travel_biomes",
      count: 1
    }),
    prerequisites: Object.freeze(["GAME-travel_biomes"]),
    priority: 16,
    passivePriorityAxis: "exploration",
    ponderation: 0.25,
    obsessionEligible: false,
    obsessionIntensity: 2,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 22,
    slots: Object.freeze({
      explore: Object.freeze({
        title: "Explorer intégralement 10 biomes distincts",
        target: 10,
        params: Object.freeze({
          scope: "multi-map",
          metric: "surfacePercent",
          threshold: 100,
          distinctBy: "biomeId",
          historicalBackfill: true
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Je veux maintenant distinguer les biomes que j’ai seulement traversés de ceux que je connais réellement jusqu’au dernier secteur."
      ]),
      completed: Object.freeze([
        "Dix biomes ont été explorés intégralement. Le monde commence à avoir une structure comparable, pas seulement une suite de paysages."
      ])
    })
  });

  const explorationTotal20 = Object.freeze({
    id: "GAME-exploration_total_20",
    title: "Exploration mondiale — 20 biomes",
    description: "Étendre la cartographie complète à vingt biomes distincts, avec reprise de l’historique déjà exploré à 100 %.",
    pattern: "EXPLORE_SCOPE",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GAME-exploration_total",
      count: 1
    }),
    prerequisites: Object.freeze(["GAME-exploration_total"]),
    priority: 14,
    passivePriorityAxis: "exploration",
    ponderation: 0.25,
    obsessionEligible: false,
    obsessionIntensity: 2,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 22,
    slots: Object.freeze({
      explore: Object.freeze({
        title: "Explorer intégralement 20 biomes distincts",
        target: 20,
        params: Object.freeze({
          scope: "multi-map",
          metric: "surfacePercent",
          threshold: 100,
          distinctBy: "biomeId",
          historicalBackfill: true
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Dix biomes m’ont donné une première lecture du monde. Je veux maintenant vérifier si cette diversité tient à l’échelle planétaire."
      ]),
      completed: Object.freeze([
        "Vingt biomes distincts ont été intégralement explorés. La diversité planétaire repose maintenant sur une cartographie solide."
      ])
    })
  });

  const travelShort = Object.freeze({
    id: "GAME-travel_short",
    title: "Voyage court",
    description: "Depuis le réseau territorial connu, découvrir trois nouvelles maps vers le Nord.",
    pattern: "TRAVEL_CYCLE",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GAME-exploration_total_20",
      count: 1
    }),
    prerequisites: Object.freeze(["GAME-foundation", "GAME-exploration_total_20"]),
    priority: 38,
    passivePriorityAxis: "exploration",
    ponderation: 0.25,
    obsessionEligible: false,
    obsessionIntensity: 2,
    navigation: Object.freeze({
      autonomousUnknownTravel: true,
      repeatUnknownTravelUntilComplete: true
    }),
    slots: Object.freeze({
      travel: Object.freeze({
        title: "Découvrir 3 nouvelles maps au Nord",
        target: 3,
        params: Object.freeze({
          eventDriven: true,
          newOnly: true,
          distinctBy: "mapId",
          direction: "north"
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Le relais me permet maintenant de pousser une route courte vers le Nord sans repartir de zéro à chaque sortie."
      ]),
      completed: Object.freeze([
        "Trois nouvelles zones au Nord sont reliées au réseau connu. La route peut maintenant s’allonger."
      ])
    })
  });

  const travelLong = Object.freeze({
    id: "GAME-travel_long",
    title: "Voyage long",
    description: "À partir de son activation, découvrir huit nouvelles maps vers le Nord ; les maps du Voyage court ne comptent pas.",
    pattern: "TRAVEL_CYCLE",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GAME-travel_short",
      count: 1
    }),
    prerequisites: Object.freeze(["GAME-travel_short"]),
    priority: 40,
    passivePriorityAxis: "exploration",
    ponderation: 0.25,
    obsessionEligible: false,
    obsessionIntensity: 2,
    navigation: Object.freeze({
      autonomousUnknownTravel: true,
      repeatUnknownTravelUntilComplete: true
    }),
    slots: Object.freeze({
      travel: Object.freeze({
        title: "Découvrir 8 nouvelles maps au Nord",
        target: 8,
        params: Object.freeze({
          eventDriven: true,
          newOnly: true,
          distinctBy: "mapId",
          direction: "north"
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Trois cartes ont tracé une direction. Cette fois je veux mesurer ce que vaut vraiment cette route : huit nouvelles zones, pas les anciennes étapes déjà franchies."
      ]),
      completed: Object.freeze([
        "Huit nouvelles zones prolongent maintenant la route du Nord. Ce n’est plus une excursion courte : c’est un véritable axe d’exploration."
      ])
    })
  });

  const T04 = Object.freeze({
    id: "T04",
    title: "Comprendre qu’un projet peut progresser en parallèle",
    description: "Faire avancer le Refuge avec une ressource utile sans interrompre les autres projets actifs.",
    pattern: "COLLECT_THEN_REWARD",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "T03",
      count: 1
    }),
    initialState: "active",
    prerequisites: Object.freeze(["T03"]),
    priority: 92,
    passivePriorityAxis: "exploration",
    slots: Object.freeze({
      collect: Object.freeze({
        title: "Collecter une ressource utile au Refuge",
        requirements: Object.freeze([
          Object.freeze({
            title: "Collecter une ressource utile au Refuge",
            target: 1,
            params: Object.freeze({
              kind: "wood"
            })
          })
        ])
      })
    }),
    uiGuidance: Object.freeze([
      Object.freeze({
        id: "parallel-missions-help",
        when: "missions-active",
        missionsAll: Object.freeze(["T04", "GAME-shelter"]),
        message: "Plusieurs missions peuvent évoluer simultanément.",
        duration: 14000
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Le refuge va demander du temps. Je peux continuer à ramasser ce qui lui sera utile sans en faire mon unique préoccupation."
      ]),
      progress: Object.freeze([
        Object.freeze({
          slot: "collect",
          atCount: 1,
          text: "Cette ressource comptera pour le refuge même si, maintenant, je pars reconnaître le terrain."
        })
      ]),
      completed: Object.freeze([
        "Voilà l’idée : un projet peut continuer à avancer sans rester mon seul objectif."
      ])
    })
  });


  const T05 = Object.freeze({
    id: "T05",
    title: "Explorer réellement la map de départ",
    description: "Explorer réellement le Site du crash jusqu’à connaître au moins 60 % de sa surface.",
    pattern: "EXPLORE_SCOPE",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "T04",
      count: 1
    }),
    initialState: "active",
    prerequisites: Object.freeze(["T04"]),
    priority: 90,
    passivePriorityAxis: "exploration",
    slots: Object.freeze({
      explore: Object.freeze({
        title: "Explorer 60 % du Site du crash",
        target: 60,
        params: Object.freeze({
          scope: "map",
          mapId: "crystal",
          metric: "surfacePercent",
          threshold: 60
        })
      })
    }),
    uiGuidance: Object.freeze([
      Object.freeze({
        id: "exploration-surface-help",
        when: "active-idle",
        delayMs: 12000,
        message: "Explore réellement le terrain : éloigne-toi du Site du crash et découvre au moins 60 % de la map.",
        duration: 14000,
        dismissOnProgress: true
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Le camp me donne un point de retour. Maintenant je veux cesser de tourner autour de la capsule et comprendre vraiment cette zone."
      ]),
      progress: Object.freeze([
        Object.freeze({
          slot: "explore",
          at: 0.5,
          text: "Le terrain devient une carte plutôt qu’une collection d’objets isolés."
        })
      ]),
      completed: Object.freeze([
        "J’en connais assez pour me déplacer ici sans tout redécouvrir à chaque sortie."
      ])
    })
  });

  const T06 = Object.freeze({
    id: "T06",
    title: "Analyser avant de décider",
    description: "Analyser trois familles différentes : une plante, un minerai et une relique de type stèle ou arche.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "T05",
      count: 1
    }),
    initialState: "active",
    prerequisites: Object.freeze(["T05"]),
    priority: 88,
    passivePriorityAxis: "research",
    sequence: Object.freeze([
      Object.freeze({
        slot: "flora",
        title: "Analyser une plante",
        action: "analyze",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          subject: "flora",
          excludeObjectIds: Object.freeze(["DOC-RES-WOOD-M-001"])
        })
      }),
      Object.freeze({
        slot: "mineral",
        title: "Analyser un minerai",
        action: "analyze",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          subject: "mineral"
        })
      }),
      Object.freeze({
        slot: "relic",
        title: "Analyser une relique, une stèle ou une arche",
        action: "analyze",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          tagsAny: Object.freeze(["ruin", "arch", "stele"]),
          excludeObjectIds: Object.freeze(["LANDMARK-CRASH-CAPSULE-001"]),
          excludeKinds: Object.freeze(["debris"])
        })
      })
    ]),
    uiGuidance: Object.freeze([
      Object.freeze({
        id: "analysis-families-help",
        when: "active-idle",
        delayMs: 10000,
        message: "Analyse trois familles différentes : une plante, un minerai et une relique — stèle ou arche.",
        duration: 14000,
        dismissOnProgress: false
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Ramasser et cartographier ne suffisent pas. Je veux vérifier que je sais aussi transformer une observation en connaissance."
      ]),
      progress: Object.freeze([
        Object.freeze({
          at: 0.34,
          text: "Chaque analyse réduit un peu la part de hasard."
        })
      ]),
      completed: Object.freeze([
        "Très bien. Pour la suite, essaie de me donner une direction plutôt qu’un trajet pas à pas."
      ])
    })
  });

  const T07 = Object.freeze({
    id: "T07",
    title: "Suggérer une direction et découvrir une nouvelle map",
    description: "Choisir une direction, laisser BlueFox franchir seul un passage puis analyser la scène de reconnaissance garantie sur la map voisine.",
    pattern: "OBSERVE_TARGET",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "T06",
      count: 1
    }),
    initialState: "active",
    prerequisites: Object.freeze(["T06"]),
    priority: 86,
    passivePriorityAxis: "exploration",
    slots: Object.freeze({
      study: Object.freeze({
        title: "Étudier la scène de reconnaissance",
        target: 1,
        params: Object.freeze({})
      })
    }),
    navigation: Object.freeze({
      controlsUnknownTravel: true,
      singleUnknownTransition: true,
      autonomyModeOnArrival: "semi",
      autonomyModeOnComplete: "off",
      makePrimaryOnArrival: true,
      target: Object.freeze({
        cuoType: "stele",
        binding: "type-or-mission-scene"
      })
    }),
    mapGeneration: Object.freeze({
      requiredMicroScenes: Object.freeze([
        Object.freeze({
          id: "MSC-ANCIENT-GATEWAY-001",
          persistent: true,
          spawnOnce: true
        })
      ])
    }),
    uiGuidance: Object.freeze([
      Object.freeze({
        id: "choose-direction-help",
        when: "active",
        delayMs: 4000,
        message: "Cette fois, choisis seulement une direction. Ouvre Planète pour indiquer Nord, Sud, Est ou Ouest.",
        duration: 14000,
        highlight: "planet"
      }),
      Object.freeze({
        id: "direction-cards-help",
        when: "target-available",
        message: "Choisis une direction : Nord, Sud, Est ou Ouest.",
        duration: 14000,
        highlight: "planet-directions"
      }),
      Object.freeze({
        id: "unknown-send-help",
        when: "target-available",
        message: "Confirme ensuite avec « Envoyer BlueFox en terre inconnue ».",
        duration: 14000,
        highlight: "planet-send-unknown"
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Cette fois, ne me montre pas un point précis. Choisis simplement une direction. Je chercherai moi-même comment quitter cette zone."
      ]),
      progress: Object.freeze([
        Object.freeze({
          slot: "recognize",
          atCount: 1,
          text: "J’ai trouvé le passage. La direction vient de toi ; le chemin, de moi."
        })
      ]),
      completed: Object.freeze([
        "Nouvelle zone… quelque chose se détache du décor. Je vais aller voir sans que tu aies besoin de me le demander."
      ])
    })
  });

  const T08 = Object.freeze({
    id: "T08",
    title: "Retrouver le Site du crash",
    description: "Suggérer explicitement le retour puis laisser BlueFox retrouver le Site du crash par les passages connus.",
    pattern: "TRAVEL_CYCLE",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "T07",
      count: 1
    }),
    initialState: "active",
    prerequisites: Object.freeze(["T07"]),
    priority: 84,
    slots: Object.freeze({
      travel: Object.freeze({
        title: "Revenir au Site du crash",
        target: 1,
        params: Object.freeze({
          toMapId: "crystal",
          distinctBy: "transition"
        })
      })
    }),
    completionGate: Object.freeze({
      type: "proximity.shelter",
      mapId: "crystal",
      shelterKinds: Object.freeze(["camp", "refuge", "base"]),
      radius: 8,
      scope: "any-established"
    }),
    uiGuidance: Object.freeze([
      Object.freeze({
        id: "return-home-help",
        when: "active",
        delayMs: 4000,
        message: "Si tu veux rentrer, suggère simplement le retour au Site du crash depuis Planète.",
        duration: 14000,
        highlight: "planet"
      }),
      Object.freeze({
        id: "return-button-help",
        when: "target-available",
        message: "Utilise « Demander le retour à la base ». BlueFox retrouvera seul la route connue.",
        duration: 14000,
        highlight: "return-base"
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Je sais d’où je viens. Si tu veux rentrer, dis-le-moi simplement : je devrais pouvoir retrouver le Site du crash sans que tu reconstruises chaque étape."
      ]),
      progress: Object.freeze([
        Object.freeze({
          slot: "travel",
          atCount: 1,
          text: "Je reconnais ce passage. Je reprends la route connue."
        })
      ]),
      completed: Object.freeze([
        "Voilà le Site du crash. Je peux partir et revenir : les zones connues commencent à former un vrai territoire."
      ]),
      hesitation: Object.freeze([
        "On peut continuer à regarder autour de nous, mais si tu veux tester ma mémoire du trajet, suggère-moi simplement de rentrer au Site du crash."
      ])
    })
  });

  const T09 = Object.freeze({
    id: "T09",
    title: "Retrouver les mêmes plantes ailleurs",
    description: "Laisser BlueFox choisir seul une nouvelle destination puis vérifier la présence de deux espèces déjà connues.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "T08",
      count: 1
    }),
    initialState: "active",
    prerequisites: Object.freeze(["T08"]),
    priority: 400,
    passivePriorityAxis: "exploration",
    tutorialAutonomy: Object.freeze({
      autonomousEligibleOnAcknowledge: true
    }),
    navigation: Object.freeze({
      autonomousUnknownTravel: true,
      singleUnknownTransition: true
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "reachFourPlateauMap",
        title: "Rejoindre un nouveau territoire",
        action: "travel",
        target: 1,
        params: Object.freeze({
          eventDriven: true,
          toDiscoveryIndex: 2,
          distinctBy: "mapId"
        })
      }),
      Object.freeze({
        slot: "adaptivePlant",
        title: "Observer une plante adaptative",
        action: "observe",
        target: 1,
        requires: Object.freeze(["reachFourPlateauMap"]),
        params: Object.freeze({
          cuoType: "adaptive_plant",
          requiredMapFact: "tutorialExcursion:T09",
          requiredMapField: "generatedTargetMapId"
        })
      }),
      Object.freeze({
        slot: "fiberPlant",
        title: "Observer une plante fibreuse",
        action: "observe",
        target: 1,
        requires: Object.freeze(["reachFourPlateauMap"]),
        params: Object.freeze({
          cuoType: "fiber",
          requiredMapFact: "tutorialExcursion:T09",
          requiredMapField: "generatedTargetMapId"
        })
      })
    ]),
    mapGeneration: Object.freeze({
      size: 4,
      compatibleBiomes: Object.freeze([
        "forest",
        "aquatic"
      ])
    }),
    uiGuidance: Object.freeze([
      Object.freeze({
        id: "full-autonomy-introduction",
        when: "active",
        message: "À partir de maintenant, BlueFox est autonome dans ses décisions. Il peut choisir ses destinations et suivre une mission tout seul.",
        duration: 0,
        acknowledge: Object.freeze({
          label: "OK",
          autonomyMode: "full"
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "J’ai reconnu certaines de ces plantes dans plusieurs zones. Elles ne sont peut-être pas propres au Site du crash. Je vais partir vérifier jusqu’où elles se sont répandues."
      ]),
      progress: Object.freeze([
        Object.freeze({
          at: 0.66,
          text: "Cette espèce pousse donc aussi ici. Une seule correspondance pourrait être un hasard ; il m’en faut une seconde."
        })
      ]),
      completed: Object.freeze([
        "Deux espèces connues dans une nouvelle zone. Leur présence dépasse probablement les environs immédiats du crash.",
        "Ces plantes semblent capables d’occuper plusieurs territoires. Pour comprendre leur répartition, je dois maintenant comparer un environnement plus vaste."
      ])
    })
  });

  const T10 = Object.freeze({
    id: "T10",
    title: "Comparer les ressources d’un territoire plus vaste",
    description: "Poursuivre l’étude sur le territoire de quatre plateaux atteint pendant T09, en explorer au moins 15 % puis comparer trois familles de ressources distinctes.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "T09",
      count: 1
    }),
    initialState: "active",
    prerequisites: Object.freeze(["T09"]),
    priority: 400,
    autoPrimaryEligible: true,
    primaryOnActivation: true,
    passivePriorityAxis: "exploration",
    sequence: Object.freeze([
      Object.freeze({
        slot: "surface",
        title: "Explorer 15 % du territoire",
        action: "explore-zone",
        target: 15,
        requires: Object.freeze([]),
        params: Object.freeze({
          scope: "map",
          metric: "surfacePercent",
          threshold: 15,
          requiredMapFact: "tutorialExcursion:T09",
          requiredMapField: "generatedTargetMapId"
        })
      }),
      Object.freeze({
        slot: "resourceFamilies",
        title: "Observer 3 familles de ressources distinctes",
        action: "observe",
        target: 3,
        requires: Object.freeze([]),
        params: Object.freeze({
          tagsAny: Object.freeze(["resource"]),
          excludeCuoTypes: Object.freeze(["tree_fallen"]),
          distinctBy: "family",
          requiredMapFact: "tutorialExcursion:T09",
          requiredMapField: "generatedTargetMapId"
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Deux plantes connues dans une nouvelle zone, c’est un indice. Pour savoir si cette répétition concerne toute la planète, je dois comparer un territoire plus vaste."
      ]),
      progress: Object.freeze([
        Object.freeze({
          slot: "surface",
          atCount: 15,
          text: "Je commence à distinguer la structure de cette zone. Quinze pour cent suffiront pour une première comparaison, pas pour prétendre la connaître entièrement."
        }),
        Object.freeze({
          slot: "resourceFamilies",
          atCount: 1,
          text: "Première famille confirmée. Je cherche maintenant une ressource d’une autre nature."
        }),
        Object.freeze({
          slot: "resourceFamilies",
          atCount: 2,
          text: "Deux familles différentes apparaissent dans le même territoire. Il me manque encore un troisième point de comparaison."
        }),
        Object.freeze({
          slot: "resourceFamilies",
          atCount: 3,
          text: "Trois familles de ressources coexistent ici. La répartition du vivant et des matériaux semble suivre des règles plus larges que chaque zone isolée."
        })
      ]),
      completed: Object.freeze([
        "Je peux maintenant formuler une hypothèse : les zones diffèrent, mais certaines ressources traversent leurs frontières. Il faudra cartographier cette continuité plus précisément."
      ])
    })
  });

  const LOC01 = Object.freeze({
    id: "LOC-01",
    title: "Explorer une ruine locale",
    description: "Étudier une structure ancienne rencontrée dans une micro-scène de ruines.",
    pattern: "CONTEXT_MSC",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 28,
    passivePriorityAxis: "research",
    ponderation: 0.45,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 42,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    localMission: Object.freeze({
      activation: Object.freeze({ type: "interaction.any", persistentMicroSceneId: "MSC-CUSTOM-HABITAT-RUINE" })
    }),
    slots: Object.freeze({
      context: Object.freeze({
        title: "Étudier la ruine",
        target: 1,
        params: Object.freeze({ microSceneId: "MSC-CUSTOM-HABITAT-RUINE", distinctBy: "microSceneInstance" })
      })
    })
  });

  const LOC02 = Object.freeze({
    id: "LOC-02",
    title: "Comprendre une source d’eau locale",
    description: "Étudier une micro-scène aquatique afin de mieux comprendre les ressources du territoire.",
    pattern: "CONTEXT_MSC",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 27,
    passivePriorityAxis: "exploration",
    ponderation: 0.25,
    obsessionEligible: false,
    obsessionIntensity: 2,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 22,
    narrativeAxis: "EXPLORATEUR",
    reinforcesNarrativeAxis: Object.freeze({ axis: "EXPLORATEUR", weight: 1 }),
    localMission: Object.freeze({
      activation: Object.freeze({ type: "interaction.any", persistentMicroSceneId: "MSC-CUSTOM-RUISSEAU-MARE" })
    }),
    slots: Object.freeze({
      context: Object.freeze({
        title: "Étudier la source d’eau",
        target: 1,
        params: Object.freeze({ microSceneId: "MSC-CUSTOM-RUISSEAU-MARE", distinctBy: "microSceneInstance" })
      })
    })
  });

  const LOC03 = Object.freeze({
    id: "LOC-03",
    title: "Évaluer un secteur riche en minerais",
    description: "Étudier une ressource minérale réelle de la map sans imposer de pseudo-type documentaire.",
    pattern: "OBSERVE_TARGET",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 26,
    passivePriorityAxis: "research",
    ponderation: 0.25,
    obsessionEligible: false,
    obsessionIntensity: 2,
    localMission: Object.freeze({
      activation: Object.freeze({ type: "interaction.any", subject: "mineral" })
    }),
    slots: Object.freeze({
      study: Object.freeze({
        title: "Étudier une ressource minérale locale",
        target: 1,
        params: Object.freeze({ subject: "mineral", tagsAny: Object.freeze(["resource"]) })
      })
    })
  });

  const LOC04 = Object.freeze({
    id: "LOC-04",
    title: "Observer un nid de faune occupé",
    description: "Confirmer la présence réelle d’une créature autour d’un nid de faune.",
    pattern: "OBSERVE_TARGET",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 31,
    passivePriorityAxis: "research",
    ponderation: 0.45,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 35,
    narrativeAxis: "NATURALISTE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 1 }),
    localMission: Object.freeze({
      activation: Object.freeze({ type: "interaction.any", persistentMicroSceneId: "MSC-CUSTOM-NID-DE-FAUNE5" })
    }),
    slots: Object.freeze({
      study: Object.freeze({
        title: "Détecter et observer une créature près du nid",
        target: 1,
        params: Object.freeze({ cuoType: "brouteur", persistentMicroSceneId: "MSC-CUSTOM-NID-DE-FAUNE5" })
      })
    })
  });

  const LOC05 = Object.freeze({
    id: "LOC-05",
    title: "Cartographier 60 % du territoire actuel",
    description: "Explorer au moins 60 % de la map liée à cette mission locale.",
    pattern: "EXPLORE_SCOPE",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 35,
    passivePriorityAxis: "exploration",
    ponderation: 0.25,
    obsessionEligible: false,
    obsessionIntensity: 2,
    narrativeAxis: "EXPLORATEUR",
    reinforcesNarrativeAxis: Object.freeze({
      axis: "EXPLORATEUR",
      weight: 1
    }),
    localExploration: Object.freeze({
      unlockMissionId: "T10",
      activationThreshold: 15,
      completionThreshold: 60,
      nextMissionId: "LOC-06"
    }),
    slots: Object.freeze({
      explore: Object.freeze({
        title: "Explorer 60 % de cette map",
        target: 60,
        params: Object.freeze({
          scope: "map",
          metric: "surfacePercent",
          threshold: 60
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Quinze pour cent suffisent pour comparer, mais pas pour connaître ce territoire. Je peux poursuivre sa cartographie pendant nos autres recherches."
      ]),
      progress: Object.freeze([
        Object.freeze({
          slot: "explore",
          at: 0.5,
          text: "Les zones isolées commencent à former un ensemble cohérent."
        })
      ]),
      completed: Object.freeze([
        "J’en connais maintenant la majorité. Il reste possible d’en établir une cartographie complète."
      ])
    })
  });

  const LOC06 = Object.freeze({
    id: "LOC-06",
    title: "Cartographier 100 % du territoire actuel",
    description: "Atteindre 100 % d’exploration réelle sur la map liée à cette mission locale.",
    pattern: "EXPLORE_SCOPE",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 30,
    passivePriorityAxis: "exploration",
    ponderation: 0.25,
    obsessionEligible: false,
    obsessionIntensity: 2,
    narrativeAxis: "EXPLORATEUR",
    reinforcesNarrativeAxis: Object.freeze({
      axis: "EXPLORATEUR",
      weight: 1
    }),
    localExploration: Object.freeze({
      unlockMissionId: "T10",
      activationThreshold: 60,
      completionThreshold: 100,
      previousMissionId: "LOC-05"
    }),
    slots: Object.freeze({
      explore: Object.freeze({
        title: "Explorer 100 % de cette map",
        target: 100,
        params: Object.freeze({
          scope: "map",
          metric: "surfacePercent",
          threshold: 100
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "La plus grande partie de cette zone est connue. Il reste quelques secteurs à relier pour obtenir une carte complète."
      ]),
      completed: Object.freeze([
        "Cette map ne contient plus de territoire inconnu. Elle fait maintenant partie de notre environnement maîtrisé."
      ])
    })
  });

  const LOC07 = Object.freeze({
    id: "LOC-07",
    title: "Explorer une épave locale",
    description: "Étudier une épave réelle rencontrée sur la map.",
    pattern: "CONTEXT_MSC",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 27,
    passivePriorityAxis: "exploration",
    ponderation: 0.25,
    obsessionEligible: false,
    obsessionIntensity: 2,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 22,
    narrativeAxis: "EXPLORATEUR",
    reinforcesNarrativeAxis: Object.freeze({ axis: "EXPLORATEUR", weight: 1 }),
    localMission: Object.freeze({ activation: Object.freeze({ type: "interaction.any", persistentMicroSceneId: "MSC-CUSTOM-EPAVE-MAJEUR" }) }),
    slots: Object.freeze({ context: Object.freeze({ title: "Étudier l’épave", target: 1, params: Object.freeze({ microSceneId: "MSC-CUSTOM-EPAVE-MAJEUR", distinctBy: "microSceneInstance" }) }) })
  });

  const LOC08 = Object.freeze({
    id: "LOC-08",
    title: "Étudier une végétation rare",
    description: "Observer une forme végétale rare réellement présente sur la map.",
    pattern: "OBSERVE_TARGET",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 26,
    passivePriorityAxis: "research",
    ponderation: 0.25,
    obsessionEligible: false,
    obsessionIntensity: 2,
    localMission: Object.freeze({ activation: Object.freeze({ type: "interaction.any", subject: "flora", tagsAny: Object.freeze(["rare"]) }) }),
    slots: Object.freeze({ study: Object.freeze({ title: "Étudier une végétation rare", target: 1, params: Object.freeze({ subject: "flora", tagsAny: Object.freeze(["rare"]) }) }) })
  });

  const LOC09 = Object.freeze({
    id: "LOC-09",
    title: "Étudier une faille basaltique",
    description: "Étudier une faille géologique réelle sans créer de type moteur artificiel.",
    pattern: "CONTEXT_MSC",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 30,
    passivePriorityAxis: "research",
    ponderation: 0.45,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 32,
    narrativeAxis: "SCIENTIFIQUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "SCIENTIFIQUE", weight: 1 }),
    localMission: Object.freeze({ activation: Object.freeze({ type: "interaction.any", persistentMicroSceneId: "MSC-CUSTOM-BASALT-RIFT" }) }),
    slots: Object.freeze({ context: Object.freeze({ title: "Étudier la faille", target: 1, params: Object.freeze({ microSceneId: "MSC-CUSTOM-BASALT-RIFT", distinctBy: "microSceneInstance" }) }) })
  });

  const LOC10 = Object.freeze({
    id: "LOC-10",
    title: "Explorer un sanctuaire local",
    description: "Étudier un sanctuaire réel rencontré sur la map.",
    pattern: "CONTEXT_MSC",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 32,
    passivePriorityAxis: "research",
    ponderation: 0.45,
    obsessionEligible: true,
    obsessionIntensity: 4,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 62,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    localMission: Object.freeze({ activation: Object.freeze({ type: "interaction.any", persistentMicroSceneId: "MSC-CUSTOM-SANCTUAIRE-RING" }) }),
    slots: Object.freeze({ context: Object.freeze({ title: "Étudier le sanctuaire", target: 1, params: Object.freeze({ microSceneId: "MSC-CUSTOM-SANCTUAIRE-RING", distinctBy: "microSceneInstance" }) }) })
  });

  const LOC11 = Object.freeze({
    id: "LOC-11",
    title: "Analyser une ressource encore inconnue ici",
    description: "Choisir une cible réellement non étudiée en privilégiant la famille du contexte, puis la MSC, puis la map actuelle.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 29,
    passivePriorityAxis: "research",
    ponderation: 0.25,
    obsessionEligible: false,
    obsessionIntensity: 1,
    localMission: Object.freeze({
      captureFamily: true,
      captureMicroScene: true,
      activation: Object.freeze({ type: "interaction.any", tagsAny: Object.freeze(["resource"]) })
    }),
    sequence: Object.freeze([
      Object.freeze({ slot: "observe", title: "Repérer une ressource non étudiée", action: "observe", target: 1, params: Object.freeze({ tagsAny: Object.freeze(["resource"]), preferUnstudied: true }) }),
      Object.freeze({ slot: "analyze", title: "Analyser cette même ressource", action: "analyze", target: 1, requires: Object.freeze(["observe"]), params: Object.freeze({ tagsAny: Object.freeze(["resource"]), relation: Object.freeze({ fromSlot: "observe", sameBy: Object.freeze(["instanceId"]) }) }) })
    ])
  });

  const LOC12 = Object.freeze({
    id: "LOC-12",
    title: "Observer une espèce encore inconnue ici",
    description: "Observer une créature réelle qui n’a pas encore été étudiée dans ce contexte.",
    pattern: "OBSERVE_TARGET",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 30,
    passivePriorityAxis: "research",
    ponderation: 0.45,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 35,
    narrativeAxis: "NATURALISTE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 1 }),
    localMission: Object.freeze({ activation: Object.freeze({ type: "interaction.any", subject: "fauna" }) }),
    slots: Object.freeze({ study: Object.freeze({ title: "Observer une espèce non étudiée", target: 1, params: Object.freeze({ subject: "fauna", preferUnstudied: true }) }) })
  });

  const LOC13 = Object.freeze({
    id: "LOC-13",
    title: "Évaluer le potentiel minéral local",
    description: "Observer puis analyser une ressource minérale réelle de la map.",
    pattern: "DISCOVER_THEN_ANALYZE",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 30,
    passivePriorityAxis: "research",
    ponderation: 0.45,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 32,
    narrativeAxis: "SCIENTIFIQUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "SCIENTIFIQUE", weight: 1 }),
    localMission: Object.freeze({ activation: Object.freeze({ type: "interaction.any", subject: "mineral" }) }),
    slots: Object.freeze({
      observe: Object.freeze({ title: "Repérer un indice minéral", target: 1, params: Object.freeze({ subject: "mineral", tagsAny: Object.freeze(["resource"]) }) }),
      analyze: Object.freeze({ title: "Analyser cet indice minéral", target: 1, params: Object.freeze({ subject: "mineral", tagsAny: Object.freeze(["resource"]) }) })
    })
  });

  const LOC14 = Object.freeze({
    id: "LOC-14",
    title: "Évaluer puis établir un camp secondaire",
    description: "Laisser le BAC évaluer un site puis construire réellement un camp secondaire persistant.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 34,
    passivePriorityAxis: "survival",
    ponderation: 0.25,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 35,
    localMission: Object.freeze({
      activation: Object.freeze({ type: "interaction.any", tagsAny: Object.freeze(["resource"]) }),
      constructionKind: "camp"
    }),
    sequence: Object.freeze([
      Object.freeze({ slot: "evaluate", title: "Évaluer le potentiel du site", action: "analyze", target: 1, params: Object.freeze({ tagsAny: Object.freeze(["resource"]), siteEvaluation: true }) }),
      Object.freeze({ slot: "construct", title: "Construire réellement le camp secondaire", action: "observe", target: 1, requires: Object.freeze(["evaluate"]), params: Object.freeze({ siteProgressionKind: "camp" }) })
    ])
  });

  const LOC15 = Object.freeze({
    id: "LOC-15",
    title: "Comprendre la collecte par drone",
    description: "Collecter un composant technologique réel afin de comprendre les prérequis d’une future collecte automatisée, sans déclarer cette capacité disponible.",
    pattern: "COLLECT_THEN_REWARD",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 33,
    passivePriorityAxis: "collection",
    ponderation: 0.25,
    obsessionEligible: true,
    obsessionIntensity: 4,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 62,
    localMission: Object.freeze({ activation: Object.freeze({ type: "interaction.any", persistentMicroSceneId: "MSC-CUSTOM-BASE-DRONE-FONCTIONEL" }) }),
    slots: Object.freeze({
      collect: Object.freeze({
        title: "Collecter un composant technologique",
        requirements: Object.freeze([
          Object.freeze({ target: 1, params: Object.freeze({ persistentMicroSceneId: "MSC-CUSTOM-BASE-DRONE-FONCTIONEL", tagsAny: Object.freeze(["technology", "component"]) }) })
        ])
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze(["Ces composants peuvent m’aider à comprendre comment une collecte par drone pourrait fonctionner plus tard. Pour l’instant, je dois simplement en récupérer un et l’étudier dans nos systèmes existants."])
    })
  });

  const LOC16 = Object.freeze({
    id: "LOC-16",
    title: "Prendre une vue d’ensemble d’un nouveau territoire",
    description: "Explorer une micro-scène pertinente sur une nouvelle map afin de construire une compréhension générale du territoire.",
    pattern: "CONTEXT_MSC",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 28,
    passivePriorityAxis: "exploration",
    ponderation: 0.25,
    obsessionEligible: false,
    obsessionIntensity: 2,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 22,
    narrativeAxis: "EXPLORATEUR",
    reinforcesNarrativeAxis: Object.freeze({ axis: "EXPLORATEUR", weight: 1 }),
    localMission: Object.freeze({ newMapOnly: true, activation: Object.freeze({ type: "interaction.any", requireMicroScene: true }) }),
    slots: Object.freeze({ context: Object.freeze({ title: "Explorer une micro-scène de cette nouvelle map", target: 1, params: Object.freeze({ anyMicroScene: true, distinctBy: "microSceneInstance" }) }) })
  });

  const LOC17 = Object.freeze({
    id: "LOC-17",
    title: "Étudier un phénomène naturel inhabituel",
    description: "Découvrir ou analyser un phénomène naturel suffisamment inhabituel en utilisant uniquement les taxonomies existantes.",
    pattern: "OBSERVE_TARGET",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 31,
    passivePriorityAxis: "research",
    ponderation: 0.45,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 32,
    narrativeAxis: "SCIENTIFIQUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "SCIENTIFIQUE", weight: 1 }),
    localMission: Object.freeze({ activation: Object.freeze({ type: "interaction.any", tagsAny: Object.freeze(["phenomenon", "resonant"]) }) }),
    slots: Object.freeze({ study: Object.freeze({ title: "Étudier le phénomène", target: 1, params: Object.freeze({ tagsAny: Object.freeze(["phenomenon", "resonant"]) }) }) })
  });

  const T11 = Object.freeze({
    id: "T11",
    title: "Comprendre comment préparer une ration",
    description:
      "Rejoindre la prochaine grande map tutorielle de six plateaux, y réunir des fibres végétales et de la biomasse adaptative, puis revenir au Site du crash pour préparer une première ration.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "T10",
      count: 1
    }),
    initialState: "active",
    prerequisites: Object.freeze(["T10"]),
    priority: 390,
    autoPrimaryEligible: true,
    primaryOnActivation: true,
    passivePriorityAxis: "survival",
    navigation: Object.freeze({
      autonomousUnknownTravel: true,
      singleUnknownTransition: true,
      autonomousKnownReturn: true
    }),
    returnPolicy: Object.freeze({
      mode: "bac-discretion",
      deferForCurrentMapExclusiveMissions: true,
      maxDeferMs: 45000
    }),
    uiGuidance: Object.freeze([
      Object.freeze({
        id: "unknown-zone-help",
        when: "active",
        message: "Envoie BlueFox vers une zone non explorée.",
        duration: 14000,
        highlight: "planet"
      })
    ]),
    sequence: Object.freeze([
      Object.freeze({
        slot: "reachSixPlateauMap",
        title: "Rejoindre la prochaine grande map tutorielle",
        action: "travel",
        target: 1,
        params: Object.freeze({
          eventDriven: true,
          newOnly: true,
          toDiscoveryIndex: 3,
          distinctBy: "mapId"
        })
      }),
      Object.freeze({
        slot: "fibers",
        title: "Réunir 2 fibres végétales",
        action: "collect",
        target: 2,
        requires: Object.freeze(["reachSixPlateauMap"]),
        params: Object.freeze({
          kind: "fiber",
          requiredMapFact: "tutorialExcursion:T11",
          requiredMapField: "generatedTargetMapId"
        })
      }),
      Object.freeze({
        slot: "adaptiveBiomass",
        title: "Réunir 1 biomasse adaptative",
        action: "collect",
        target: 1,
        requires: Object.freeze(["reachSixPlateauMap"]),
        params: Object.freeze({
          kind: "adaptive_biomass",
          requiredMapFact: "tutorialExcursion:T11",
          requiredMapField: "generatedTargetMapId"
        })
      }),
      Object.freeze({
        slot: "returnHome",
        title: "Revenir au Site du crash",
        action: "travel",
        target: 1,
        requires: Object.freeze(["fibers", "adaptiveBiomass"]),
        params: Object.freeze({
          eventDriven: true,
          toMapId: "crystal",
          distinctBy: "transition"
        })
      })
    ]),
    mapGeneration: Object.freeze({
      size: 6,
      compatibleBiomes: Object.freeze([
        "forest",
        "aquatic"
      ])
    }),
    completionGate: Object.freeze({
      type: "proximity.shelter",
      mapId: "crystal",
      shelterKinds: Object.freeze(["camp", "refuge", "base"]),
      radius: 8,
      scope: "any-established"
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Ces plantes pourraient peut-être servir à autre chose qu'à renforcer l'abri. Je vais réunir ce qu'il faut, puis revenir au Site du crash pour essayer."
      ]),
      progress: Object.freeze([
        Object.freeze({
          slot: "fibers",
          atCount: 2,
          text: "J'ai assez de fibres. Il me faut encore la biomasse adaptative si je ne l'ai pas déjà trouvée."
        }),
        Object.freeze({
          slot: "adaptiveBiomass",
          atCount: 1,
          text: "J'ai la biomasse. Dès que mes collectes sont terminées, je peux rentrer au Site du crash."
        }),
        Object.freeze({
          slot: "returnHome",
          atCount: 1,
          text: "Je reconnais le territoire du crash. Il ne me reste qu'à rejoindre l'abri pour préparer ça correctement."
        })
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
          Object.freeze({ inventoryKey: "fiber", quantity: 2 }),
          Object.freeze({ inventoryKey: "adaptive_biomass", quantity: 1 })
        ]),
        output: Object.freeze({ objectId: "ration", quantity: 1 }),
        autoCraft: false,
        requiresShelter: true
      })
    ])
  });


  const T12 = Object.freeze({
    id: "T12",
    title: "Utiliser une ration pour récupérer de l’énergie",
    description:
      "Utiliser manuellement une ration lorsque les réserves ont diminué et vérifier un gain réel d’énergie.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "T11",
      count: 1
    }),
    initialState: "active",
    prerequisites: Object.freeze(["T11"]),
    priority: 410,
    autoPrimaryEligible: true,
    primaryOnActivation: true,
    passivePriorityAxis: "survival",
    tutorialSurvivalUnlocks: Object.freeze([
      "ration-craft",
      "ration-consume",
      "micro-rest",
      "autonomous-rest"
    ]),
    uiGuidance: Object.freeze([
      Object.freeze({
        id: "ration-manual-use-help",
        when: "active",
        message: "1. Placer BlueFox à proximité du camp, fabriquer une ration à partir du menu \"Recherche\". 2. Ouvrir le \"sac d’expédition\" et cliquer sur une ration pour la consommer.",
        duration: 0,
        acknowledge: Object.freeze({ label: "OK" })
      })
    ]),
    runtimeValidation: Object.freeze({
      type: "manual-ration-energy-gain",
      consumeSlot: "consumeRation",
      gainSlot: "recoverEnergy"
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "consumeRation",
        title: "Utiliser une ration depuis le sac d’expédition",
        action: "eat",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          eventDriven: true,
          automatic: false,
          proof: "ration-consumed"
        })
      }),
      Object.freeze({
        slot: "recoverEnergy",
        title: "Constater un gain réel d’énergie",
        action: "eat",
        target: 1,
        requires: Object.freeze(["consumeRation"]),
        params: Object.freeze({
          eventDriven: true,
          proof: "survival-energy-gain"
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "La recette existe. Il reste à vérifier qu’elle m’aide réellement lorsque mes réserves diminuent."
      ]),
      progress: Object.freeze([
        Object.freeze({
          slot: "consumeRation",
          atCount: 1,
          text: "J’utilise une ration. Je vais comparer mon état avant et après."
        })
      ]),
      completed: Object.freeze([
        "L’énergie revient assez vite pour poursuivre l’exploration. La ration ne remplace pas le repos, mais elle augmente clairement mon autonomie."
      ])
    })
  });

  const T13 = Object.freeze({
    id: "T13",
    title: "Préparer une excursion prolongée",
    description:
      "Préparer dix rations puis découvrir deux nouvelles maps distinctes avant d’ouvrir l’exploration du monde.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "T12",
      count: 1
    }),
    initialState: "active",
    prerequisites: Object.freeze(["T12"]),
    priority: 405,
    autoPrimaryEligible: true,
    primaryOnActivation: true,
    passivePriorityAxis: "exploration",
    allowsAutonomousRationCraft: true,
    navigation: Object.freeze({
      autonomousUnknownTravel: true,
      repeatUnknownTravelUntilComplete: true
    }),
    runtimeCounters: Object.freeze([
      Object.freeze({
        slot: "craftRations",
        source: "rations.craftedTotal",
        baselineOnActivation: true
      })
    ]),
    sequence: Object.freeze([
      Object.freeze({
        slot: "craftRations",
        title: "Fabriquer 10 rations après le début de la mission",
        action: "craft",
        target: 10,
        requires: Object.freeze([]),
        params: Object.freeze({
          eventDriven: true,
          recipeId: "ration-basic-v2"
        })
      }),
      Object.freeze({
        slot: "newMaps",
        title: "Découvrir 2 nouvelles maps distinctes",
        action: "travel",
        target: 2,
        requires: Object.freeze(["craftRations"]),
        params: Object.freeze({
          eventDriven: true,
          newOnly: true,
          distinctBy: "mapId",
          mapGenerationOnCount: Object.freeze({
            2: Object.freeze({
              size: "random",
              biome: "random",
              requiredMicroScenes: Object.freeze([
                Object.freeze({
                  id: "MSC-CUSTOM-BOSQUET-BIO",
                  persistent: true,
                  spawnOnce: true,
                  contextRole: "triggerContext"
                })
              ])
            })
          }),
          completionArrivalFact: "tutorialExcursion:FLO-01",
          completionArrivalField: "toMapId"
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Une ration m’aide à prolonger un trajet. Dix rations me permettraient de préparer une véritable excursion au-delà des territoires familiers."
      ]),
      progress: Object.freeze([
        Object.freeze({
          slot: "craftRations",
          atCount: 10,
          text: "Les réserves sont prêtes. Je peux maintenant partir assez loin pour que le retour ne soit plus la seule décision raisonnable."
        }),
        Object.freeze({
          slot: "newMaps",
          atCount: 1,
          text: "Premier territoire inconnu enregistré. Mes réserves restent suffisantes ; je peux poursuivre."
        })
      ]),
      completed: Object.freeze([
        "L’excursion est prête à devenir autre chose qu’un exercice. À partir d’ici, les découvertes pourront orienter progressivement nos prochaines missions."
      ])
    })
  });

  const FLO01 = Object.freeze({
    id: "FLO-01",
    title: "Inventaire vivant",
    description:
      "Élargir l’étude de la map de comparaison et distinguer plusieurs fonctions de sa flore.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "FLO-02",
      count: 1
    }),
    initialState: "active",
    prerequisites: Object.freeze(["FLO-02"]),
    priority: 330,
    autoPrimaryEligible: true,
    primaryOnActivation: true,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 30,
    narrativeAxis: "NATURALISTE",
    reinforcesNarrativeAxis: Object.freeze({
      axis: "NATURALISTE",
      weight: 1
    }),
    proximityContexts: Object.freeze([
      Object.freeze({
        id: "bosquet-bio-world-open",
        microSceneId: "MSC-CUSTOM-BOSQUET-BIO",
        fact: "worldContext:bosquet-bio",
        useSceneRadius: true
      })
    ]),
    sequence: Object.freeze([
      Object.freeze({
        slot: "studyFlora",
        title: "Analyser 3 espèces végétales différentes",
        action: "analyze",
        target: 3,
        requires: Object.freeze([]),
        params: Object.freeze({
          subject: "flora",
          distinctBy: "objectId",
          requiredMapFact: "tutorialExcursion:FLO-02",
          requiredMapField: "generatedTargetMapId"
        })
      }),
      Object.freeze({
        slot: "exploreBosquetMap",
        title: "Explorer au moins 40 % de cette map",
        action: "explore-zone",
        target: 40,
        requires: Object.freeze([]),
        params: Object.freeze({
          scope: "map",
          metric: "surfacePercent",
          threshold: 40,
          requiredMapFact: "tutorialExcursion:FLO-02",
          requiredMapField: "generatedTargetMapId"
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "La flore ne forme pas un décor uniforme. Chaque espèce occupe une fonction."
      ]),
      completed: Object.freeze([
        "Cette première classification me donne enfin une lecture biologique cohérente du territoire."
      ])
    })
  });

  const FLO02 = Object.freeze({
    id: "FLO-02",
    title: "Même espèce, autre monde",
    description:
      "Choisir une plante de référence puis comparer cette même espèce sur une nouvelle map.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "T13",
      count: 1
    }),
    prerequisites: Object.freeze(["T13"]),
    priority: 330,
    autoPrimaryEligible: true,
    primaryOnActivation: true,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 30,
    narrativeAxis: "NATURALISTE",
    reinforcesNarrativeAxis: Object.freeze({
      axis: "NATURALISTE",
      weight: 1
    }),
    navigation: Object.freeze({
      autonomousUnknownTravel: true,
      singleUnknownTransition: true
    }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({
          id: "MSC-FERN-CLEARING-001",
          persistent: true,
          spawnOnce: true,
          contextRole: "comparisonContext"
        }),
        Object.freeze({
          id: "MSC-CUSTOM-BOSQUET-BIO",
          persistent: true,
          spawnOnce: true,
          contextRole: "floraContext"
        })
      ]),
      requiredObjects: Object.freeze([
        Object.freeze({
          sourceSlot: "referencePlant",
          identityField: "objectId",
          count: 1,
          contextRole: "comparisonTarget"
        })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "referencePlant",
        title: "Analyser une espèce végétale de référence",
        action: "analyze",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          subject: "flora"
        })
      }),
      Object.freeze({
        slot: "reachComparisonMap",
        title: "Rejoindre une nouvelle map pour comparer cette espèce",
        action: "travel",
        target: 1,
        requires: Object.freeze(["referencePlant"]),
        params: Object.freeze({
          eventDriven: true,
          newOnly: true,
          distinctBy: "mapId"
        })
      }),
      Object.freeze({
        slot: "comparePlant",
        title: "Analyser la même espèce sur une autre map",
        action: "analyze",
        target: 1,
        requires: Object.freeze(["reachComparisonMap"]),
        params: Object.freeze({
          subject: "flora",
          relation: Object.freeze({
            fromSlot: "referencePlant",
            sameBy: Object.freeze(["objectId"]),
            differentBy: Object.freeze(["mapId"])
          })
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Je vais choisir une plante ici, puis vérifier si cette même lignée existe ailleurs et comment elle s’y adapte."
      ]),
      progress: Object.freeze([
        Object.freeze({
          slot: "referencePlant",
          atCount: 1,
          text: "J’ai ma référence. Je peux maintenant chercher cette même espèce sur un autre territoire."
        }),
        Object.freeze({
          slot: "reachComparisonMap",
          atCount: 1,
          text: "Nouveau territoire. Si la même espèce est présente ici, la comparaison devient possible."
        })
      ]),
      completed: Object.freeze([
        "Une adaptation végétale entre deux territoires est confirmée."
      ])
    })
  });


  const FLO03 = Object.freeze({
    id: "FLO-03",
    title: "Symbioses locales",
    description: "Étudier une plante et un partenaire minéral ou animal dans une même micro-scène afin d’identifier une relation écologique locale.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "FLO-01", count: 1 }),
    prerequisites: Object.freeze(["FLO-01"]),
    priority: 329,
    passivePriorityAxis: "research",
    ponderation: 1, obsessionEligible: true, obsessionIntensity: 3, souvenir: true, memoryValence: "positive", scoreTrauma: 30,
    narrativeAxis: "NATURALISTE", reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 1 }),
    sequence: Object.freeze([
      Object.freeze({ slot: "floraPartner", title: "Analyser une plante dans la clairière de comparaison", action: "analyze", target: 1, requires: Object.freeze([]), params: Object.freeze({ subject: "flora", microSceneId: "MSC-FERN-CLEARING-001", requiredMapFact: "tutorialExcursion:FLO-02", requiredMapField: "generatedTargetMapId" }) }),
      Object.freeze({ slot: "associatedPartner", title: "Analyser un partenaire minéral ou animal dans la même micro-scène", action: "analyze", target: 1, requires: Object.freeze(["floraPartner"]), params: Object.freeze({ tagsAny: Object.freeze(["mineral", "fauna", "animal", "geology"]), microSceneId: "MSC-FERN-CLEARING-001", requiredMapFact: "tutorialExcursion:FLO-02", requiredMapField: "generatedTargetMapId", relation: Object.freeze({ fromSlot: "floraPartner", sameBy: Object.freeze(["persistentMicroSceneId", "mapId"]) }) }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Cette plante ne vit pas seule. Je veux comparer ce qu’elle fait avec ce qui l’entoure avant de parler de symbiose."]),
      completed: Object.freeze(["Les deux partenaires répondent au même contexte. Cette association devient une symbiose locale plausible."])
    })
  });

  const FLO04 = Object.freeze({
    id: "FLO-04",
    title: "Lumière intérieure",
    description: "Comparer deux plantes bioluminescentes sur deux maps distinctes afin de confirmer un phénomène biologique reproductible.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "FLO-03", count: 1 }),
    prerequisites: Object.freeze(["FLO-03"]),
    priority: 328,
    passivePriorityAxis: "research",
    ponderation: 1, obsessionEligible: true, obsessionIntensity: 4, souvenir: true, memoryValence: "positive", scoreTrauma: 64,
    narrativeAxis: "NATURALISTE", reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 1 }),
    navigation: Object.freeze({ autonomousUnknownTravel: true, singleUnknownTransition: true }),
    mapGeneration: Object.freeze({ size: "random", biome: "random", requiredObjects: Object.freeze([Object.freeze({ type: "fluorescent_vegetation", count: 1, contextRole: "bioluminescentFlora" })]) }),
    sequence: Object.freeze([
      Object.freeze({ slot: "reachFirstGlowMap", title: "Rejoindre un territoire avec une plante lumineuse", action: "travel", target: 1, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" }) }),
      Object.freeze({ slot: "firstGlowPlant", title: "Analyser une première plante bioluminescente", action: "analyze", target: 1, requires: Object.freeze(["reachFirstGlowMap"]), params: Object.freeze({ subject: "flora", tagsAny: Object.freeze(["glowing", "bioluminescent"]) }) }),
      Object.freeze({ slot: "reachSecondGlowMap", title: "Rejoindre un autre territoire", action: "travel", target: 1, requires: Object.freeze(["firstGlowPlant"]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" }) }),
      Object.freeze({ slot: "secondGlowPlant", title: "Analyser une plante bioluminescente sur l’autre map", action: "analyze", target: 1, requires: Object.freeze(["reachSecondGlowMap"]), params: Object.freeze({ subject: "flora", tagsAny: Object.freeze(["glowing", "bioluminescent"]), relation: Object.freeze({ fromSlot: "firstGlowPlant", differentBy: Object.freeze(["mapId"]) }) }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Leur lumière ne ressemble pas à une simple réaction isolée. Je veux la retrouver ailleurs et l’observer comme un phénomène du vivant, surtout lorsqu’elle devient visible dans l’obscurité."]),
      completed: Object.freeze(["La même logique lumineuse réapparaît sur plusieurs territoires. La bioluminescence végétale appartient à un mécanisme partagé."])
    })
  });

  const FLO05 = Object.freeze({
    id: "FLO-05",
    title: "Racines énergétiques",
    description: "Relier l’activité d’une plante à une anomalie géologique observée dans la même micro-scène.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "FLO-04", count: 1 }),
    prerequisites: Object.freeze(["FLO-04"]),
    priority: 327,
    passivePriorityAxis: "research",
    ponderation: 1, obsessionEligible: true, obsessionIntensity: 5, souvenir: true, memoryValence: "positive", scoreTrauma: 86,
    narrativeAxis: "NATURALISTE", reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 1 }),
    navigation: Object.freeze({ autonomousUnknownTravel: true, singleUnknownTransition: true }),
    mapGeneration: Object.freeze({ size: "random", biome: "random", requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-ECO-FOSSIL-001", persistent: true, spawnOnce: true, contextRole: "energyRootContext" })]) }),
    sequence: Object.freeze([
      Object.freeze({ slot: "reachEnergyRoots", title: "Rejoindre un territoire où sol et végétation peuvent être comparés", action: "travel", target: 1, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" }) }),
      Object.freeze({ slot: "rootFlora", title: "Analyser la végétation de la micro-scène", action: "analyze", target: 1, requires: Object.freeze(["reachEnergyRoots"]), params: Object.freeze({ subject: "flora", microSceneId: "MSC-ECO-FOSSIL-001" }) }),
      Object.freeze({ slot: "groundReference", title: "Analyser une référence géologique dans la même micro-scène", action: "analyze", target: 1, requires: Object.freeze(["rootFlora"]), params: Object.freeze({ tagsAny: Object.freeze(["rock", "geology", "mineral"]), microSceneId: "MSC-ECO-FOSSIL-001", relation: Object.freeze({ fromSlot: "rootFlora", sameBy: Object.freeze(["persistentMicroSceneId", "mapId"]) }) }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Les racines suivent les mêmes lignes que certaines anomalies du sol. Je veux vérifier le lien sans rejouer les études géologiques déjà acquises."]),
      completed: Object.freeze(["La croissance végétale et l’anomalie du sol sont corrélées. Le vivant semble puiser dans une énergie que la géologie concentre."])
    })
  });

  const FLO06 = Object.freeze({
    id: "FLO-06",
    title: "Une biosphère alimentée",
    description: "Comparer trois territoires distincts afin de confirmer que la même logique énergétique traverse plusieurs milieux biologiques.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "FLO-05", count: 1 }),
    prerequisites: Object.freeze(["FLO-05"]),
    priority: 326,
    passivePriorityAxis: "research",
    ponderation: 1, obsessionEligible: true, obsessionIntensity: 5, souvenir: true, memoryValence: "positive", scoreTrauma: 96,
    narrativeAxis: "NATURALISTE", reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 1 }),
    navigation: Object.freeze({ autonomousUnknownTravel: true, singleUnknownTransition: true }),
    mapGeneration: Object.freeze({ size: "random", biome: "random", requiredObjects: Object.freeze([Object.freeze({ type: "fluorescent_vegetation", count: 1, contextRole: "energyFloraReference" })]) }),
    sequence: Object.freeze([
      Object.freeze({ slot: "firstBiome", title: "Analyser une première référence végétale énergétique", action: "analyze", target: 1, requires: Object.freeze([]), params: Object.freeze({ subject: "flora", tagsAny: Object.freeze(["glowing", "bioluminescent"]) }) }),
      Object.freeze({ slot: "reachSecondBiome", title: "Rejoindre un second territoire", action: "travel", target: 1, requires: Object.freeze(["firstBiome"]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" }) }),
      Object.freeze({ slot: "secondBiome", title: "Analyser une référence végétale énergétique sur le second territoire", action: "analyze", target: 1, requires: Object.freeze(["reachSecondBiome"]), params: Object.freeze({ subject: "flora", tagsAny: Object.freeze(["glowing", "bioluminescent"]), relation: Object.freeze({ fromSlot: "firstBiome", differentBy: Object.freeze(["mapId"]) }) }) }),
      Object.freeze({ slot: "reachThirdBiome", title: "Rejoindre un troisième territoire", action: "travel", target: 1, requires: Object.freeze(["secondBiome"]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" }) }),
      Object.freeze({ slot: "thirdBiome", title: "Analyser une référence végétale énergétique sur le troisième territoire", action: "analyze", target: 1, requires: Object.freeze(["reachThirdBiome"]), params: Object.freeze({ subject: "flora", tagsAny: Object.freeze(["glowing", "bioluminescent"]), relation: Object.freeze({ fromSlot: "secondBiome", differentBy: Object.freeze(["mapId"]) }) }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Une anomalie locale ne suffirait pas. Si la même signature traverse plusieurs territoires, alors c’est la biosphère entière qu’il faut relire."]),
      completed: Object.freeze(["Trois territoires racontent la même histoire énergétique. Cette planète n’est plus seulement un lieu à traverser : elle pourrait devenir un endroit où vivre durablement."])
    })
  });

  const FLO07 = Object.freeze({
    id: "FLO-07",
    title: "Envisager de s’installer",
    description: "Conclusion narrative de la branche FLO : BlueFox commence à envisager une installation durable sur cette planète.",
    pattern: "NARRATIVE_ONLY",
    narrativeOnly: true,
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "FLO-06", count: 1 }),
    prerequisites: Object.freeze(["FLO-06"]),
    priority: 325,
    autoPrimaryEligible: false, primaryOnActivation: false,
    passivePriorityAxis: "research",
    ponderation: 1, obsessionEligible: true, obsessionIntensity: 5, souvenir: true, memoryValence: "positive", scoreTrauma: 96,
    narrativeAxis: "NATURALISTE", reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 1 }),
    slots: Object.freeze({}),
    narrative: Object.freeze({
      revealed: Object.freeze(["Je pensais surtout en termes d’expédition, de retour et de prochaine étape. Maintenant une autre idée devient possible : rester ici assez longtemps pour appeler cet endroit chez moi."]),
      completed: Object.freeze(["Je n’ai rien décidé de définitif. Mais cette planète est devenue plus qu’un terrain d’étude : je peux réellement envisager de m’y installer durablement."])
    })
  });

  const GEO01 = Object.freeze({
    id: "GEO-01",
    title: "Lire les couches",
    description:
      "Comparer trois falaises d’une même map en observant une roche géologique sur chacune pour lire les strates du terrain.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "exploration.map_discovered",
      direction: "east",
      count: 1
    }),
    priority: 315,
    passivePriorityAxis: "collection",
    ponderation: 1,
    mapGeneration: Object.freeze({
      size: 6,
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({
          id: "MSC-CUSTOM-FALAISE1",
          instanceId: "FALAISE1-A",
          persistent: true,
          spawnOnce: true,
          contextRole: "geologyLayerA"
        }),
        Object.freeze({
          id: "MSC-CUSTOM-FALAISE2",
          instanceId: "FALAISE2",
          persistent: true,
          spawnOnce: true,
          contextRole: "geologyLayerB"
        }),
        Object.freeze({
          id: "MSC-CUSTOM-FALAISE1",
          instanceId: "FALAISE1-B",
          persistent: true,
          spawnOnce: true,
          contextRole: "geologyLayerC"
        })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "layerA",
        title: "Observer une roche de FALAISE1-A",
        action: "observe",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          family: "geology",
          persistentMicroSceneId: "FALAISE1-A",
          requiredMapFact: "tutorialExcursion:GEO-01",
          requiredMapField: "generatedTargetMapId"
        })
      }),
      Object.freeze({
        slot: "layerB",
        title: "Observer une roche de FALAISE2",
        action: "observe",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          family: "geology",
          persistentMicroSceneId: "FALAISE2",
          requiredMapFact: "tutorialExcursion:GEO-01",
          requiredMapField: "generatedTargetMapId"
        })
      }),
      Object.freeze({
        slot: "layerC",
        title: "Observer une roche de FALAISE1-B",
        action: "observe",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          family: "geology",
          persistentMicroSceneId: "FALAISE1-B",
          requiredMapFact: "tutorialExcursion:GEO-01",
          requiredMapField: "generatedTargetMapId"
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Ces parois se répondent. Chaque strate ressemble à une époque comprimée dans la pierre ; je veux les lire sans confondre les falaises."
      ]),
      progress: Object.freeze([
        Object.freeze({
          at: 0.34,
          text: "Une première couche se dessine. Il faut confronter les autres falaises avant de tirer une conclusion."
        }),
        Object.freeze({
          at: 0.67,
          text: "Deux falaises racontent déjà des histoires différentes. La troisième doit confirmer la lecture."
        })
      ]),
      completed: Object.freeze([
        "Trois falaises, trois lectures d’un même territoire : les strates forment une histoire géologique cohérente."
      ])
    })
  });


  const GEO02 = Object.freeze({
    id: "GEO-02",
    title: "Reconnaître les minerais",
    description:
      "Distinguer plusieurs minerais réels par l’analyse puis en extraire des échantillons selon leur contrat CUO.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "exploration.map_discovered",
      direction: "west",
      count: 1
    }),
    prerequisites: Object.freeze(["GEO-01"]),
    priority: 314,
    passivePriorityAxis: "collection",
    ponderation: 1,
    sequence: Object.freeze([
      Object.freeze({
        slot: "analyzeMinerals",
        title: "Analyser 3 minerais différents",
        action: "analyze",
        target: 3,
        requires: Object.freeze([]),
        params: Object.freeze({
          subject: "mineral",
          distinctBy: "objectId"
        })
      }),
      Object.freeze({
        slot: "extractMinerals",
        title: "Extraire 3 minerais différents",
        action: "extract",
        target: 3,
        requires: Object.freeze(["analyzeMinerals"]),
        params: Object.freeze({
          subject: "mineral",
          distinctBy: "objectId"
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "La couleur ne suffit pas. La densité et la structure racontent davantage ; je vais comparer plusieurs minerais avant d’en prélever des échantillons."
      ]),
      completed: Object.freeze([
        "Trois signatures minérales distinctes sont confirmées et leurs échantillons peuvent maintenant servir de références fiables."
      ])
    })
  });

  const GEO03 = Object.freeze({
    id: "GEO-03",
    title: "Failles actives",
    description:
      "Étudier un basalte résonant dans une faille puis extraire ce même spécimen pour confirmer l’activité géologique observée.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "exploration.map_discovered",
      direction: "west",
      count: 1
    }),
    prerequisites: Object.freeze(["GEO-02"]),
    priority: 313,
    passivePriorityAxis: "research",
    ponderation: 1,
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({
          id: "MSC-CUSTOM-BASALT-RIFT",
          persistent: true,
          spawnOnce: true,
          contextRole: "geologicalActivityContext"
        })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "analyzeBasalt",
        title: "Analyser le basalte résonant de la faille",
        action: "analyze",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          cuoType: "resonant_basalt"
        })
      }),
      Object.freeze({
        slot: "extractBasalt",
        title: "Extraire ce même basalte résonant",
        action: "extract",
        target: 1,
        requires: Object.freeze(["analyzeBasalt"]),
        params: Object.freeze({
          cuoType: "resonant_basalt",
          relation: Object.freeze({
            fromSlot: "analyzeBasalt",
            sameBy: Object.freeze(["instanceId"])
          })
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "La roche bouge encore, lentement mais sûrement. Le basalte de cette faille devrait conserver une signature mesurable."
      ]),
      completed: Object.freeze([
        "La résonance appartient bien au matériau de la faille : l’échantillon extrait confirme une activité géologique récente."
      ])
    })
  });

  const GEO04 = Object.freeze({
    id: "GEO-04",
    title: "Veines profondes",
    description:
      "Prendre un basalte résonant comme référence puis retrouver cette même définition minérale sur une autre map.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GEO-03",
      count: 1
    }),
    prerequisites: Object.freeze(["GEO-03"]),
    priority: 312,
    passivePriorityAxis: "research",
    ponderation: 1,
    navigation: Object.freeze({
      autonomousUnknownTravel: true,
      singleUnknownTransition: true
    }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredObjects: Object.freeze([
        Object.freeze({
          sourceSlot: "referenceBasalt",
          identityField: "objectId",
          count: 1,
          contextRole: "geologicalContinuityTarget"
        })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "referenceBasalt",
        title: "Analyser un basalte résonant de référence",
        action: "analyze",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          cuoType: "resonant_basalt"
        })
      }),
      Object.freeze({
        slot: "reachOtherMap",
        title: "Rejoindre une nouvelle map pour suivre le filon",
        action: "travel",
        target: 1,
        requires: Object.freeze(["referenceBasalt"]),
        params: Object.freeze({
          eventDriven: true,
          newOnly: true,
          distinctBy: "mapId"
        })
      }),
      Object.freeze({
        slot: "compareBasalt",
        title: "Analyser le même basalte résonant sur une autre map",
        action: "analyze",
        target: 1,
        requires: Object.freeze(["reachOtherMap"]),
        params: Object.freeze({
          cuoType: "resonant_basalt",
          relation: Object.freeze({
            fromSlot: "referenceBasalt",
            sameBy: Object.freeze(["objectId"]),
            differentBy: Object.freeze(["mapId"])
          })
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Ce filon ne s’arrête pas ici. S’il traverse le sous-sol à l’échelle régionale, je dois retrouver la même signature sur un autre territoire."
      ]),
      completed: Object.freeze([
        "La même définition de basalte résonant réapparaît sur une autre map : la continuité géologique est confirmée sans inventer de nouvel objet moteur."
      ])
    })
  });

  const GEO05 = Object.freeze({
    id: "GEO-05",
    title: "Roches en suspension",
    description:
      "Étudier les indices réels d’un secteur occidental où des îlots mobiles et des minerais magnétiques donnent un contexte aux roches en suspension ; le champ magnétique reste narratif.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "exploration.map_discovered",
      direction: "west",
      count: 1
    }),
    prerequisites: Object.freeze(["GEO-04"]),
    priority: 311,
    passivePriorityAxis: "research",
    ponderation: 1,
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({
          id: "MSC-CUSTOM-ILES-SUSPENDUES2",
          persistent: true,
          spawnOnce: true,
          contextRole: "suspendedRocksContext"
        }),
        Object.freeze({
          id: "MSC-SUSPENDED-ISLAND-001",
          persistent: true,
          spawnOnce: true,
          contextRole: "mobileIsletContext"
        })
      ]),
      requiredObjects: Object.freeze([
        Object.freeze({
          type: "magnetic_ore",
          count: 1,
          contextRole: "magneticOreContext"
        })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "analyzeMagneticOre",
        title: "Analyser un minerai magnétique",
        action: "analyze",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          cuoType: "magnetic_ore"
        })
      }),
      Object.freeze({
        slot: "analyzeMobileIslet",
        title: "Analyser un îlot mobile",
        action: "analyze",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          cuoType: "mobile_islet"
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Vers l’ouest, certaines masses rocheuses semblent suspendues. Je vais m’en tenir aux indices mesurables : minerais magnétiques et îlots réellement mobiles."
      ]),
      completed: Object.freeze([
        "Les roches en suspension ont des indices matériels cohérents. Le « champ magnétique » reste mon interprétation du phénomène, pas un nouvel objet du moteur."
      ])
    })
  });

  const GEO06 = Object.freeze({
    id: "GEO-06",
    title: "Le cœur magnétique",
    description:
      "Poursuivre deux cartes vers l’ouest, atteindre en second un territoire magnétique à cristaux chargés puis analyser ses objets et phénomènes réels.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GEO-05",
      count: 1
    }),
    prerequisites: Object.freeze(["GEO-05"]),
    priority: 310,
    passivePriorityAxis: "research",
    ponderation: 1,
    navigation: Object.freeze({
      autonomousUnknownTravel: true,
      repeatUnknownTravelUntilComplete: true
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "newMapsWest",
        title: "Découvrir 2 nouvelles maps vers l’ouest",
        action: "travel",
        target: 2,
        requires: Object.freeze([]),
        params: Object.freeze({
          eventDriven: true,
          newOnly: true,
          distinctBy: "mapId",
          direction: "west",
          mapGenerationOnCount: Object.freeze({
            2: Object.freeze({
              size: "random",
              biome: "magnetic",
              requiredMicroScenes: Object.freeze([
                Object.freeze({
                  id: "MSC-CHARGED-CRYSTALS-001",
                  persistent: true,
                  spawnOnce: true,
                  contextRole: "magneticCoreContext"
                })
              ]),
              requiredObjects: Object.freeze([
                Object.freeze({
                  type: "magnetic_ore",
                  count: 1,
                  contextRole: "magneticCoreOre"
                }),
                Object.freeze({
                  type: "electrostatic_storm",
                  count: 1,
                  contextRole: "magneticCoreStorm"
                })
              ])
            })
          })
        })
      }),
      Object.freeze({
        slot: "analyzeMagneticOre",
        title: "Analyser un minerai magnétique sur la seconde map",
        action: "analyze",
        target: 1,
        requires: Object.freeze(["newMapsWest"]),
        params: Object.freeze({
          cuoType: "magnetic_ore",
          requiredMapFact: "tutorialExcursion:GEO-06",
          requiredMapField: "generatedTargetMapId"
        })
      }),
      Object.freeze({
        slot: "analyzeEnergyCrystal",
        title: "Analyser un cristal d’énergie sur la seconde map",
        action: "analyze",
        target: 1,
        requires: Object.freeze(["newMapsWest"]),
        params: Object.freeze({
          cuoType: "energy_crystal",
          requiredMapFact: "tutorialExcursion:GEO-06",
          requiredMapField: "generatedTargetMapId"
        })
      }),
      Object.freeze({
        slot: "analyzeStorm",
        title: "Analyser une tempête électrostatique sur la seconde map",
        action: "analyze",
        target: 1,
        requires: Object.freeze(["newMapsWest"]),
        params: Object.freeze({
          cuoType: "electrostatic_storm",
          requiredMapFact: "tutorialExcursion:GEO-06",
          requiredMapField: "generatedTargetMapId"
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Les indices deviennent plus nets vers l’ouest. Deux nouvelles zones devraient suffire pour atteindre le foyer le plus chargé sans inventer un « champ magnétique » comme objet."
      ]),
      progress: Object.freeze([
        Object.freeze({
          slot: "newMapsWest",
          atCount: 1,
          text: "Première zone franchie vers l’ouest. Je poursuis : la signature la plus forte devrait être plus loin."
        }),
        Object.freeze({
          slot: "newMapsWest",
          atCount: 2,
          text: "La seconde zone est magnétique. Cristaux chargés, minerai et phénomènes électrostatiques donnent enfin des cibles mesurables."
        })
      ]),
      completed: Object.freeze([
        "Le cœur magnétique est décrit par des phénomènes réels et convergents. Le champ lui-même reste une lecture narrative de leurs effets."
      ])
    })
  });

  const GEO07 = Object.freeze({
    id: "GEO-07",
    title: "Cartographie énergétique",
    description:
      "Comparer une même signature énergétique sur trois nouvelles maps afin de relier plusieurs anomalies à un réseau énergétique planétaire ; le réseau reste une interprétation narrative.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GEO-06",
      count: 1
    }),
    prerequisites: Object.freeze(["GEO-06"]),
    priority: 309,
    passivePriorityAxis: "research",
    ponderation: 1,
    navigation: Object.freeze({
      autonomousUnknownTravel: true
    }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({
          id: "MSC-CHARGED-CRYSTALS-001",
          persistent: true,
          spawnOnce: true,
          contextRole: "energyNetworkSample"
        })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "reachEnergyMap1",
        title: "Découvrir une première nouvelle map énergétique",
        action: "travel",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          eventDriven: true,
          newOnly: true,
          distinctBy: "mapId"
        })
      }),
      Object.freeze({
        slot: "measureEnergyMap1",
        title: "Analyser le cristal chargé de la première map",
        action: "analyze",
        target: 1,
        requires: Object.freeze(["reachEnergyMap1"]),
        params: Object.freeze({
          objectId: "RES-ENER-M-001",
          requiredMapFact: "tutorialExcursion:GEO-07",
          requiredMapField: "generatedTargetMapId"
        })
      }),
      Object.freeze({
        slot: "reachEnergyMap2",
        title: "Découvrir une deuxième nouvelle map énergétique",
        action: "travel",
        target: 1,
        requires: Object.freeze(["measureEnergyMap1"]),
        params: Object.freeze({
          eventDriven: true,
          newOnly: true,
          distinctBy: "mapId"
        })
      }),
      Object.freeze({
        slot: "measureEnergyMap2",
        title: "Comparer le même cristal chargé sur la deuxième map",
        action: "analyze",
        target: 1,
        requires: Object.freeze(["reachEnergyMap2"]),
        params: Object.freeze({
          objectId: "RES-ENER-M-001",
          requiredMapFact: "tutorialExcursion:GEO-07",
          requiredMapField: "generatedTargetMapId",
          relation: Object.freeze({
            fromSlot: "measureEnergyMap1",
            sameBy: Object.freeze(["objectId"]),
            differentBy: Object.freeze(["mapId"])
          })
        })
      }),
      Object.freeze({
        slot: "reachEnergyMap3",
        title: "Découvrir une troisième nouvelle map énergétique",
        action: "travel",
        target: 1,
        requires: Object.freeze(["measureEnergyMap2"]),
        params: Object.freeze({
          eventDriven: true,
          newOnly: true,
          distinctBy: "mapId"
        })
      }),
      Object.freeze({
        slot: "measureEnergyMap3",
        title: "Comparer le même cristal chargé sur la troisième map",
        action: "analyze",
        target: 1,
        requires: Object.freeze(["reachEnergyMap3"]),
        params: Object.freeze({
          objectId: "RES-ENER-M-001",
          requiredMapFact: "tutorialExcursion:GEO-07",
          requiredMapField: "generatedTargetMapId",
          relation: Object.freeze({
            fromSlot: "measureEnergyMap2",
            sameBy: Object.freeze(["objectId"]),
            differentBy: Object.freeze(["mapId"])
          })
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Les anomalies se répondent à travers les maps. Je veux vérifier si une même signature énergétique réapparaît sur trois territoires distincts."
      ]),
      progress: Object.freeze([
        Object.freeze({
          slot: "measureEnergyMap1",
          atCount: 1,
          text: "Première mesure enregistrée. Une anomalie isolée ne suffit pas encore à dessiner un réseau."
        }),
        Object.freeze({
          slot: "measureEnergyMap2",
          atCount: 1,
          text: "Deuxième signature concordante. La répétition dépasse maintenant le simple phénomène local."
        })
      ]),
      completed: Object.freeze([
        "Trois maps portent la même signature de cristal chargé. La cartographie énergétique révèle un système planétaire interconnecté."
      ])
    })
  });

  const SUR03 = Object.freeze({
    id: "SUR-03",
    title: "Composer une ration stable",
    description:
      "Comparer plusieurs plantes du Bosquet et confirmer une préparation alimentaire stable.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "interaction.observe",
      count: 1,
      subject: "flora"
    }),
    triggerOnly: true,
    requiredFacts: Object.freeze(["worldContext:bosquet-bio"]),
    priority: 190,
    passivePriorityAxis: "survival",
    runtimeCounters: Object.freeze([
      Object.freeze({
        slot: "craftStableRation",
        source: "rations.craftedTotal",
        baselineOnActivation: true
      })
    ]),
    sequence: Object.freeze([
      Object.freeze({
        slot: "studyPlants",
        title: "Analyser 2 plantes différentes",
        action: "analyze",
        target: 2,
        requires: Object.freeze([]),
        params: Object.freeze({
          subject: "flora",
          distinctBy: "objectId"
        })
      }),
      Object.freeze({
        slot: "craftStableRation",
        title: "Fabriquer une ration stable",
        action: "craft",
        target: 1,
        requires: Object.freeze(["studyPlants"]),
        params: Object.freeze({
          eventDriven: true,
          recipeId: "ration-basic-v2"
        })
      })
    ])
  });

  const COLLECTION_FAMILIES = Object.freeze({
    WOOD: Object.freeze({
      key: "WOOD",
      label: "Bois",
      axis: "collection",
      triggerParams: Object.freeze({ kind: "wood" }),
      params: Object.freeze({ kind: "wood" }),
      description: "menuiserie et construction"
    }),
    FIBER: Object.freeze({
      key: "FIBER",
      label: "Fibres",
      axis: "collection",
      triggerParams: Object.freeze({ kind: "fiber" }),
      params: Object.freeze({ kind: "fiber" }),
      description: "tissage et conservation"
    }),
    MINERAL: Object.freeze({
      key: "MINERAL",
      label: "Minerais",
      axis: "research",
      triggerParams: Object.freeze({ subject: "mineral" }),
      params: Object.freeze({
        subject: "mineral",
        excludeKinds: Object.freeze(["crystal"])
      }),
      description: "métallurgie et ingénierie"
    }),
    CRYSTAL: Object.freeze({
      key: "CRYSTAL",
      label: "Cristaux",
      axis: "collection",
      triggerParams: Object.freeze({ kind: "crystal" }),
      params: Object.freeze({ kind: "crystal" }),
      description: "énergie et recherche"
    }),
    PLANT: Object.freeze({
      key: "PLANT",
      label: "Plantes",
      axis: "survival",
      triggerParams: Object.freeze({ subject: "flora" }),
      params: Object.freeze({
        subject: "flora",
        excludeKinds: Object.freeze(["wood"])
      }),
      description: "survie, recettes et recherche"
    })
  });

  const COLLECTION_THRESHOLDS = Object.freeze([20, 50, 100, 250, 500, 1000]);

  const collectionTitle = (threshold) =>
    threshold === 20
      ? "Premiers échantillons"
      : threshold === 50
        ? "Réserve fiable"
        : threshold === 100
          ? "Maîtrise de collecte"
          : threshold === 250
            ? "Réserve confirmée"
            : threshold === 500
              ? "Maîtrise avancée"
              : "Expertise de ressource";

  const collectionPsychology = (threshold) => {
    if (threshold === 250) return {};
    if (threshold === 500) {
      return {
        ponderation: 1,
        souvenir: true,
        memoryValence: "positive",
        scoreTrauma: 16
      };
    }
    if (threshold === 1000) {
      return {
        ponderation: 1,
        obsessionEligible: true,
        obsessionIntensity: 3,
        souvenir: true,
        memoryValence: "negative",
        scoreTrauma: 38
      };
    }
    return { ponderation: 1 };
  };

  const collectionTrigger = (family, threshold) => {
    if (threshold === 20) {
      return Object.freeze({
        type: "interaction.collect",
        count: 1,
        uniqueOnly: true,
        ...family.triggerParams
      });
    }
    const previous =
      threshold === 500
        ? 250
        : threshold === 1000
          ? 500
          : threshold === 250
            ? 100
            : threshold === 100
              ? 50
              : 20;
    return Object.freeze({
      type: "progression.mission_completed",
      missionId: `COL-${family.key}-${previous}`,
      count: 1
    });
  };

  const collectionPrerequisites = (family, threshold) => {
    if (threshold === 20) return Object.freeze([]);
    const previous =
      threshold === 500
        ? 250
        : threshold === 1000
          ? 500
          : threshold === 250
            ? 100
            : threshold === 100
              ? 50
              : 20;
    return Object.freeze([`COL-${family.key}-${previous}`]);
  };

  const createCollectionMission = (family, threshold, familyIndex) => {
    const id = `COL-${family.key}-${threshold}`;
    const psychology = collectionPsychology(threshold);
    return Object.freeze({
      id,
      title: `${collectionTitle(threshold)} — ${family.label} ${threshold}`,
      description:
        `Collecter historiquement ${threshold} unités de ${family.label.toLowerCase()} ` +
        `afin d’ouvrir les connaissances avancées liées à ${family.description}.`,
      pattern: "COLLECT_THEN_REWARD",
      trigger: collectionTrigger(family, threshold),
      triggerOnly: true,
      prerequisites: collectionPrerequisites(family, threshold),
      priority: 150 - familyIndex,
      passivePriorityAxis: family.axis,
      backgroundHud: true,
      ...psychology,
      slots: Object.freeze({
        collect: Object.freeze({
          title: `Collecter historiquement ${threshold} unités de ${family.label.toLowerCase()}`,
          requirements: Object.freeze([
            Object.freeze({
              target: threshold,
              params: Object.freeze({
                ...family.params,
                historicalCollection: true
              })
            })
          ])
        })
      }),
      narrative: Object.freeze({
        revealed: Object.freeze([
          "À ce volume, je ne collecte plus au hasard : je commence à comprendre la place de cette ressource dans mon organisation."
        ]),
        completed: Object.freeze([
          `Palier de collecte atteint : ${threshold} unités de ${family.label.toLowerCase()}.`
        ])
      })
    });
  };

  const COLLECTION_MISSIONS = Object.freeze(
    Object.values(COLLECTION_FAMILIES).flatMap((family, familyIndex) =>
      COLLECTION_THRESHOLDS.map((threshold) =>
        createCollectionMission(family, threshold, familyIndex)
      )
    )
  );


  const ENV_THRESHOLDS = Object.freeze([20, 50, 100, 250, 500, 1000]);
  const ENV_FAMILIES = Object.freeze({
    RELIC: Object.freeze({
      key: "RELIC",
      label: "vestiges",
      titles: Object.freeze({
        20: "Premiers vestiges",
        50: "Motifs récurrents",
        100: "Lecture des traces",
        250: "Géographie des vestiges",
        500: "Mémoire du paysage",
        1000: "Atlas des présences anciennes"
      }),
      revealed: Object.freeze({
        20: "Quelques formes reviennent déjà. Ce ne sont plus des accidents isolés : je veux garder la trace de chaque vestige.",
        50: "Les stèles et les arches commencent à dessiner une grammaire. Je reconnais des motifs avant même d’en comprendre l’origine.",
        100: "Les traces se répondent. Je peux commencer à distinguer les formes isolées des présences qui structurent un territoire.",
        250: "À cette échelle, les vestiges cessent d’être des points : ils dessinent une géographie.",
        500: "À cette échelle, les vestiges forment une mémoire inscrite dans le relief. Je peux comparer des régions entières.",
        1000: "Mille présences anciennes : ce relevé devient un atlas plutôt qu’une suite de découvertes."
      })
    }),
    ROCK: Object.freeze({
      key: "ROCK",
      label: "roches",
      titles: Object.freeze({
        20: "Premiers reliefs",
        50: "Formes récurrentes",
        100: "Lecture du substrat",
        250: "Variations de terrain",
        500: "Structure du monde",
        1000: "Atlas lithique"
      }),
      revealed: Object.freeze({
        20: "Vingt roches ne font pas une planète, mais elles suffisent pour arrêter de regarder le sol comme un simple décor.",
        50: "Les mêmes formes de relief reviennent. Je veux comprendre ce qui appartient au hasard et ce qui appartient au terrain.",
        100: "Le substrat commence à parler : certaines formes reviennent assez souvent pour devenir des repères.",
        250: "Les variations du terrain ne sont plus des détails. Elles dessinent des familles de paysages.",
        500: "À cette échelle, les reliefs décrivent la structure du monde bien mieux qu’une poignée d’échantillons.",
        1000: "Mille observations lithiques : je peux enfin comparer les terrains comme un atlas cohérent."
      })
    }),
    PLANT: Object.freeze({
      key: "PLANT",
      label: "plantes",
      titles: Object.freeze({
        20: "Premières silhouettes végétales",
        50: "Formes d’occupation",
        100: "Inventaire du vivant fixe",
        250: "Adaptations locales",
        500: "Architecture des biomes",
        1000: "Atlas naturaliste"
      }),
      revealed: Object.freeze({
        20: "Les plantes que je ne prélève pas comptent autant que les ressources. Elles donnent sa forme au milieu.",
        50: "Arbres, lianes, fougères : leur présence n’est pas aléatoire. Elles occupent le terrain selon des règles que je commence à voir.",
        100: "Le vivant fixe n’est plus un décor : il devient un inventaire de formes, de fonctions et d’occupations.",
        250: "Les mêmes familles changent avec le terrain. Je commence à lire leurs adaptations locales.",
        500: "Certaines absences deviennent aussi parlantes que les présences. La végétation dessine l’architecture des biomes.",
        1000: "Mille observations végétales : mon journal ressemble enfin à l’atlas d’un naturaliste plutôt qu’à une liste de trouvailles."
      })
    })
  });

  const envPreviousThreshold = (threshold) => {
    const index = ENV_THRESHOLDS.indexOf(threshold);
    return index > 0 ? ENV_THRESHOLDS[index - 1] : null;
  };

  const envPsychology = (threshold, localPercent = null, worldThreshold = null) => {
    if (worldThreshold === 10) {
      return Object.freeze({
        ponderation: 0.35,
        obsessionEligible: true,
        obsessionIntensity: 3,
        souvenir: true,
        memoryValence: "positive",
        scoreTrauma: 38,
        narrativeAxis: "NATURALISTE",
        reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 0.45 })
      });
    }
    if (worldThreshold === 20) {
      return Object.freeze({
        ponderation: 0.45,
        obsessionEligible: true,
        obsessionIntensity: 4,
        souvenir: true,
        memoryValence: "positive",
        scoreTrauma: 55,
        narrativeAxis: "NATURALISTE",
        reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 0.55 })
      });
    }
    if (localPercent === 50) {
      return Object.freeze({
        ponderation: 0.08,
        obsessionEligible: false,
        obsessionIntensity: 1,
        narrativeAxis: "NATURALISTE"
      });
    }
    if (localPercent === 100) {
      return Object.freeze({
        ponderation: 0.15,
        obsessionEligible: true,
        obsessionIntensity: 2,
        souvenir: true,
        memoryValence: "positive",
        scoreTrauma: 20,
        narrativeAxis: "NATURALISTE",
        reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 0.18 })
      });
    }
    const weights = { 20: 0.10, 50: 0.10, 100: 0.20, 250: 0.15, 500: 0.30, 1000: 0.45 };
    if (threshold === 50 || threshold === 250) {
      return Object.freeze({
        ponderation: weights[threshold],
        narrativeAxis: "NATURALISTE"
      });
    }
    const intensity = { 20: 1, 100: 2, 500: 3, 1000: 4 }[threshold] || 1;
    const score = { 20: 12, 100: 24, 500: 36, 1000: 52 }[threshold] || 0;
    return Object.freeze({
      ponderation: weights[threshold] || 0.10,
      obsessionEligible: threshold !== 20,
      obsessionIntensity: intensity,
      souvenir: true,
      memoryValence: "positive",
      scoreTrauma: score,
      narrativeAxis: "NATURALISTE",
      reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: weights[threshold] || 0.10 })
    });
  };

  const createEnvGlobalMission = (family, threshold, familyIndex) => {
    const previous = envPreviousThreshold(threshold);
    const sourceId = previous ? `ENV-${family.key}-${previous}` : "T13";
    return Object.freeze({
      id: `ENV-${family.key}-${threshold}`,
      title: `${family.titles[threshold]} — ${threshold}`,
      description: `Construire progressivement une connaissance historique de ${family.label} environnementaux en créditant les observations déjà réalisées et les nouvelles observations.`,
      pattern: "OBSERVE_TARGET",
      trigger: Object.freeze({
        type: "progression.mission_completed",
        missionId: sourceId,
        count: 1
      }),
      triggerOnly: true,
      prerequisites: Object.freeze([sourceId]),
      priority: 130 - familyIndex,
      autoPrimaryEligible: false,
      primaryOnActivation: false,
      passivePriorityAxis: "research",
      backgroundHud: true,
      ...envPsychology(threshold),
      slots: Object.freeze({
        study: Object.freeze({
          title: `Observer historiquement ${threshold} instances distinctes de ${family.label}`,
          target: threshold,
          params: Object.freeze({
            eventDriven: true,
            envHistoricalFamily: family.key,
            catalogManaged: true
          })
        })
      }),
      narrative: Object.freeze({
        revealed: Object.freeze([family.revealed[threshold]]),
        progress: Object.freeze([Object.freeze({
          text: `Mon relevé de ${family.label} s’épaissit. Ce qui semblait isolé commence à prendre place dans une lecture plus large du monde.`,
          at: 0.5
        })]),
        completed: Object.freeze([`Palier ENV ${family.key} atteint : ${threshold} instances distinctes observées et intégrées à l’historique naturaliste.`])
      })
    });
  };

  const ENV_GLOBAL_MISSIONS = Object.freeze(
    Object.values(ENV_FAMILIES).flatMap((family, familyIndex) =>
      ENV_THRESHOLDS.map((threshold) => createEnvGlobalMission(family, threshold, familyIndex))
    )
  );

  const createEnvMapMission = (family, percent, familyIndex) => Object.freeze({
    id: `ENV-MAP-${family.key}-${percent}`,
    title: percent === 50
      ? `Lecture locale — ${family.label === "vestiges" ? "Vestiges" : family.label === "roches" ? "Roches" : "Végétation"} 50 %`
      : `Inventaire local complet — ${family.label === "vestiges" ? "Vestiges" : family.label === "roches" ? "Roches" : "Végétation"} 100 %`,
    description: "La couverture est calculée sur les instances ENV éligibles réellement présentes sur la map, par identités physiques distinctes.",
    pattern: "OBSERVE_TARGET",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    autoPrimaryEligible: false,
    primaryOnActivation: false,
    priority: 120 - familyIndex,
    passivePriorityAxis: "research",
    backgroundHud: true,
    envLocal: Object.freeze({ family: family.key, targetPercent: percent }),
    ...envPsychology(null, percent),
    slots: Object.freeze({
      study: Object.freeze({
        title: `Observer ${percent} % des ${family.label} ENV de la map`,
        target: percent,
        params: Object.freeze({
          eventDriven: true,
          envLocalFamily: family.key,
          targetPercent: percent,
          catalogManaged: true
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([percent === 50
        ? `Je ne veux pas traverser ce territoire en ne regardant que ce qui se ramasse. Je vais lire au moins la moitié de ses ${family.label}.`
        : `La moitié donne une tendance ; pour prétendre connaître ce territoire, il faut aller jusqu’au bout des ${family.label} observables.`]),
      progress: Object.freeze([Object.freeze({
        text: "La carte se remplit autrement : chaque observation ajoute une pièce au portrait environnemental de cette zone.",
        at: 0.5
      })]),
      completed: Object.freeze([`Couverture ENV ${family.key} de cette map : ${percent} % des instances éligibles ont été observées.`])
    })
  });

  const ENV_MAP_MISSIONS = Object.freeze(
    Object.values(ENV_FAMILIES).flatMap((family, familyIndex) => [
      createEnvMapMission(family, 50, familyIndex),
      createEnvMapMission(family, 100, familyIndex)
    ])
  );

  const createEnvWorldMission = (threshold) => Object.freeze({
    id: `ENV-WORLD-${threshold}`,
    title: threshold === 10
      ? "Première synthèse des biomes — 10 biomes"
      : "Atlas naturaliste du monde — 20 biomes",
    description: `Valider ${threshold} types de biomes distincts dont au moins une map est à 100 % d’exploration et à 100 % de couverture ENV RELIC, ROCK et PLANT.`,
    pattern: "EXPLORE_SCOPE",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: threshold === 10 ? "T13" : "ENV-WORLD-10",
      count: 1
    }),
    triggerOnly: true,
    prerequisites: Object.freeze([threshold === 10 ? "T13" : "ENV-WORLD-10"]),
    priority: threshold === 10 ? 118 : 116,
    autoPrimaryEligible: false,
    primaryOnActivation: false,
    passivePriorityAxis: "research",
    backgroundHud: true,
    envWorld: Object.freeze({ targetBiomeTypes: threshold }),
    ...envPsychology(null, null, threshold),
    slots: Object.freeze({
      explore: Object.freeze({
        title: `Valider ${threshold} types de biomes distincts totalement étudiés`,
        target: threshold,
        params: Object.freeze({
          eventDriven: true,
          envWorldMastery: true,
          distinctBy: "biomeId",
          historicalBackfill: true,
          catalogManaged: true
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([threshold === 10
        ? "Explorer une map ne suffit plus. Je veux pouvoir dire que j’ai réellement lu dix milieux différents, jusque dans ce qu’ils montrent et pas seulement dans leurs chemins."
        : "Dix biomes forment une première synthèse. Je veux maintenant étendre cette lecture à vingt milieux réellement qualifiés." ]),
      progress: Object.freeze([Object.freeze({
        text: "Les biomes cessent d’être des cases sur une carte. Chacun devient un ensemble de formes, de vestiges, de roches et de végétation que je peux réellement comparer.",
        at: 0.5
      })]),
      completed: Object.freeze([`${threshold} types de biomes distincts sont maintenant totalement étudiés selon le protocole ENV.`])
    })
  });

  const ENV_WORLD_MISSIONS = Object.freeze([
    createEnvWorldMission(10),
    createEnvWorldMission(20)
  ]);



  BF.BibleConstructionTemplates = Object.freeze({
    camp: Object.freeze({
      title: "Établir un camp",
      description: "Réunir dix bois puis revenir sur la map choisie pour installer un camp.",
      pattern: "SEQUENCE_ACTIONS",
      priority: 58,
      passivePriorityAxis: "survival",
      sequence: Object.freeze([
        Object.freeze({
          slot: "collectWood",
          title: "Réunir 10 bois",
          action: "collect",
          target: 10,
          params: Object.freeze({ kind: "wood" })
        })
      ]),
      activationInventoryCredits: Object.freeze([
        Object.freeze({ slot: "collectWood", inventoryKey: "wood", maximum: 10 })
      ]),
      effects: Object.freeze([
        Object.freeze({ type: "inventory.consume", inventoryKey: "wood", quantity: 10 }),
        Object.freeze({
          type: "site.establish",
          kind: "camp",
          microSceneId: "MSC-CUSTOM-CAMP",
          stage: 1,
          placement: Object.freeze({ mode: "near-bluefox" })
        })
      ])
    }),
    refuge: Object.freeze({
      title: "Construire un refuge",
      description: "Réunir cent bois et cent fibres puis revenir sur la map choisie pour construire un refuge.",
      pattern: "SEQUENCE_ACTIONS",
      priority: 56,
      passivePriorityAxis: "survival",
      sequence: Object.freeze([
        Object.freeze({
          slot: "fibers",
          title: "Réunir 100 plantes fibreuses",
          action: "collect",
          target: 100,
          params: Object.freeze({ kind: "fiber" })
        }),
        Object.freeze({
          slot: "wood",
          title: "Réunir 100 bois",
          action: "collect",
          target: 100,
          requires: Object.freeze([]),
          params: Object.freeze({ kind: "wood" })
        })
      ]),
      activationInventoryCredits: Object.freeze([
        Object.freeze({ slot: "fibers", inventoryKey: "fiber", maximum: 100 }),
        Object.freeze({ slot: "wood", inventoryKey: "wood", maximum: 100 })
      ]),
      effects: Object.freeze([
        Object.freeze({ type: "inventory.consume", inventoryKey: "fiber", quantity: 100 }),
        Object.freeze({ type: "inventory.consume", inventoryKey: "wood", quantity: 100 }),
        Object.freeze({
          type: "site.establish",
          kind: "refuge",
          microSceneId: "MSC-CUSTOM-CAMP-BASE",
          stage: 2,
          placement: Object.freeze({ mode: "near-camp" })
        })
      ])
    })
  });

  BF.BibleCatalog = Object.freeze([
    T01,
    T02,
    T03,
    shelter,
    base,
    nouvelleFondation,
    foundation,
    survivalRest,
    survivalStable,
    collectionSamples,
    collectionVariety,
    collectionReserves,
    explorationCartographer,
    explorationComplete,
    travelBiomes,
    explorationTotal,
    explorationTotal20,
    travelShort,
    travelLong,
    T04,
    T05,
    T06,
    T07,
    T08,
    T09,
    T10,
    LOC01,
    LOC02,
    LOC03,
    LOC04,
    LOC05,
    LOC06,
    LOC07,
    LOC08,
    LOC09,
    LOC10,
    LOC11,
    LOC12,
    LOC13,
    LOC14,
    LOC15,
    LOC16,
    LOC17,
    T11,
    T12,
    T13,
    FLO01,
    FLO02,
    FLO03,
    FLO04,
    FLO05,
    FLO06,
    FLO07,
    GEO01,
    GEO02,
    GEO03,
    GEO04,
    GEO05,
    GEO06,
    GEO07,
    SUR03,
    ...COLLECTION_MISSIONS,
    ...ENV_GLOBAL_MISSIONS,
    ...ENV_MAP_MISSIONS,
    ...ENV_WORLD_MISSIONS
  ]);

  BF.BibleRuntimeReference = Object.freeze({
    phase: "tutorial-rewards-reconnection",
    testMissionsRemoved: true,
    runtimePatternsPreserved: true,
    researchSource: "mission-rewards"
  });
})(window);
