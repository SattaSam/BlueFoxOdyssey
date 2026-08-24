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
      Object.freeze({
        slot: "reinforce",
        title: "Transformer le camp en refuge",
        action: "analyze",
        target: 1,
        requires: Object.freeze(["fibers", "plantStudy", "wood"]),
        params: Object.freeze({
          kind: "camp"
        })
      })
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
        placement: Object.freeze({ mode: "near-camp" })
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
        }),
        Object.freeze({
          at: 1,
          text: "Deux espèces connues dans une nouvelle zone. Leur présence dépasse probablement les environs immédiats du crash."
        })
      ]),
      completed: Object.freeze([
        "Ces plantes semblent capables d’occuper plusieurs territoires. Pour comprendre leur répartition, je dois maintenant comparer un environnement plus vaste."
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
    T04,
    T05,
    T06,
    T07,
    T08,
    T09,
    rationDiscovery
  ]);

  BF.BibleRuntimeReference = Object.freeze({
    phase: "tutorial-rewards-reconnection",
    testMissionsRemoved: true,
    runtimePatternsPreserved: true,
    researchSource: "mission-rewards"
  });
})(window);
