(function(global){
  "use strict";
  const BF=global.BlueFox3D=global.BlueFox3D||{};
  const STATE_KEY="bluefox_tutorial_autonomy_state_v1";
  const CRASH_KEY="bluefox_tutorial_crash_observed_v1";
  const FIRST_KEY="bluefox_tutorial_first_interaction_v1";
  const FULL_UNLOCK_KEY="bluefox_tutorial_full_unlocked_v1";
  const GUIDE_RECEIPTS_KEY="bluefox_tutorial_guide_receipts_v2";
  let toast=null,toastTimer=null,missionHelpActive=false;
  let directionTimer=null,directionCards=[],directionIndex=0;
  let t03Timer=null,lastMissionState=null;

  const norm=value=>String(value||"").toLocaleLowerCase("fr")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
  const state=()=>BF.getTutorialAutonomyState?.()||
    localStorage.getItem(STATE_KEY)||"IA_OFF";
  const readSet=key=>{try{return new Set(JSON.parse(localStorage.getItem(key)||"[]"));}catch{return new Set();}};
  const writeSet=(key,set)=>{try{localStorage.setItem(key,JSON.stringify([...set]));}catch{}};

  function box(){
    if(toast?.isConnected)return toast;
    toast=document.createElement("div");
    toast.className="bluefox-tutorial-guide";
    toast.setAttribute("role","status");
    document.body.appendChild(toast);
    return toast;
  }
  function hide(){
    clearTimeout(toastTimer);toastTimer=null;
    toast?.remove();toast=null;
  }
  function journalHelp(key,message){
    const receipts=readSet(GUIDE_RECEIPTS_KEY);
    if(receipts.has(`journal:${key}`))return;
    receipts.add(`journal:${key}`);writeSet(GUIDE_RECEIPTS_KEY,receipts);
    BF.addJournalEntry?.({
      id:`tutorial-help:${key}:${Date.now()}`,
      type:"tutorial",title:"Aide",text:message,
      mapId:BF.currentEngine?.currentMapId||null,
      zoneId:BF.currentEngine?.currentZoneIndex??null,
      important:false
    });
  }
  function show(message,key="guide",ttl=10000){
    const node=box();node.textContent=message;node.hidden=false;
    journalHelp(key,message);
    clearTimeout(toastTimer);
    toastTimer=setTimeout(hide,Math.max(2500,Number(ttl)||10000));
  }
  function findByText(text,selector="button,[role=button]"){
    const wanted=norm(text);
    return [...document.querySelectorAll(selector)].find(el=>{
      const t=norm(el.textContent);
      const r=el.getBoundingClientRect?.();
      return t.includes(wanted)&&r&&r.width>0&&r.height>0;
    })||null;
  }
  function highlight(el){el?.classList?.add("bluefox-tutorial-highlight");}
  function unhighlight(el){el?.classList?.remove("bluefox-tutorial-highlight");}
  function missionHudTargets(){
    return [...document.querySelectorAll("button,[role=button],div")].filter(el=>{
      const t=norm(el.textContent),r=el.getBoundingClientRect?.();
      return r&&r.width>0&&r.height>0&&
        (t==="mission"||t==="missions"||t.includes("mission en cours"));
    }).slice(0,3);
  }
  function highlightMissionHud(){missionHudTargets().forEach(highlight);missionHelpActive=true;}
  function missionExpanded(){
    return Boolean(document.querySelector(
      ".mission-card,.mission-objectives,.mission-tree,.mission-panel.expanded,"+
      ".mission-window.open,[aria-expanded=true][aria-label*=mission i]"
    ));
  }
  function finishMissionHelp(){
    missionHelpActive=false;
    missionHudTargets().forEach(unhighlight);
  }
  function missionEntry(ms,id){
    return (ms?.missions||[]).find(entry=>(entry.missionId||entry.id)===id)||null;
  }
  function childComplete(entry,id){
    const root=entry?.tree?.root||entry?.root;
    const children=root?.children||[];
    const child=children.find(node=>node?.id===id);
    return Boolean(child&&(child.status==="completed"||child.isComplete===true));
  }
  function lifecycle(entry){return entry?.lifecycleStatus||entry?.status||"";}
  function setTutorialState(next){
    if(!next||state()===next)return;
    BF.setTutorialAutonomyState?.(next);
  }

  function syncTutorialAutonomy(ms){
    const t08=missionEntry(ms,"T08");
    if(lifecycle(t08)==="completed"){
      if(localStorage.getItem(FULL_UNLOCK_KEY)==="1")setTutorialState("IA_FULL");
      else setTutorialState("IA_GUIDED");
      return;
    }
    if(lifecycle(t08)==="active"){setTutorialState("IA_GUIDED");return;}
    const t07=missionEntry(ms,"T07");
    if(lifecycle(t07)==="completed"){setTutorialState("IA_GUIDED");return;}
    if(lifecycle(t07)==="active"){
      setTutorialState(childComplete(t07,"T07:travel")?"IA_TRANSITION":"IA_OFF");
      return;
    }
    if(["T01","T02","T03","T04","T05","T06"].some(id=>
      lifecycle(missionEntry(ms,id))==="active"
    ))setTutorialState("IA_OFF");
  }

  const originalSetAutonomy=BF.setAutonomyMode?.bind(BF);
  if(originalSetAutonomy){
    BF.setUserAutonomyMode=originalSetAutonomy;
    BF.setAutonomyMode=mode=>{
      if(state()!=="IA_FULL")return true;
      return originalSetAutonomy(mode);
    };
  }

  function refreshAutonomyLock(){
    const locked=state()!=="IA_FULL";
    const modal=document.querySelector(".bac-autonomy-modal");
    modal?.querySelectorAll(".bac-autonomy-choice").forEach(button=>{
      button.disabled=locked;
      button.classList.toggle("is-tutorial-locked",locked);
    });
    const p=modal?.querySelector("p");
    if(p&&locked)p.textContent="Autonomie visible mais verrouillée pendant cette phase tutorielle.";
    BF.autonomyMode=BF.getAutonomyMode?.()||BF.autonomyMode;
  }
  function placeAutonomy(){
    const settings=document.querySelector(".settings-content");
    const trigger=settings?.querySelector(".bac-autonomy-trigger");
    if(!settings||!trigger)return false;
    const title=[...settings.querySelectorAll("h3,h4,strong,span,div")]
      .find(el=>norm(el.textContent)==="priorites"&&el.children.length===0);
    if(!title)return false;

    // Contrat visuel : Autonomie n'appartient pas à la ligne Priorités.
    // Il reste l'élément créé/possédé par settings-ui-bridge mais sort du flux
    // et se cale sur la même horizontale, bord droit de l'encadrement Réglages.
    settings.style.position="relative";
    const row=trigger.parentElement;
    if(row)row.style.position="static";
    const sr=settings.getBoundingClientRect(),tr=title.getBoundingClientRect();
    trigger.classList.add("bluefox-autonomy-visual-anchor");
    trigger.style.position="absolute";
    trigger.style.right="8px";
    trigger.style.left="auto";
    trigger.style.margin="0";
    trigger.style.transform="none";
    trigger.style.top=`${Math.max(0,tr.top-sr.top+settings.scrollTop)}px`;
    trigger.style.zIndex="8";
    refreshAutonomyLock();
    return true;
  }

  function once(key,fn){
    const receipts=readSet(GUIDE_RECEIPTS_KEY);
    if(receipts.has(key))return false;
    receipts.add(key);writeSet(GUIDE_RECEIPTS_KEY,receipts);
    fn?.();return true;
  }
  function delayed(key,delay,fn){
    const receipts=readSet(GUIDE_RECEIPTS_KEY);
    if(receipts.has(`scheduled:${key}`))return;
    receipts.add(`scheduled:${key}`);writeSet(GUIDE_RECEIPTS_KEY,receipts);
    setTimeout(()=>fn?.(),delay);
  }

  function guideT02(){
    delayed("t02-object",10000,()=>{
      if(lifecycle(missionEntry(BF.missionState,"T02"))!=="active")return;
      show("Cliquez sur un objet pour interagir.","t02-object",10000);
      highlightMissionHud();
      setTimeout(()=>show(
        "Déployez la fenêtre Mission pour visualiser les objectifs prioritaires.",
        "t02-mission-window",10000
      ),900);
    });
  }
  function guideT03(){
    if(t03Timer)return;
    const startKey="bluefox_tutorial_t03_started_v1";
    let started=Number(localStorage.getItem(startKey)||0);
    if(!started){started=Date.now();localStorage.setItem(startKey,String(started));}
    const delay=Math.max(0,120000-(Date.now()-started));
    t03Timer=setTimeout(()=>{
      t03Timer=null;
      if(lifecycle(missionEntry(BF.missionState,"T03"))!=="active")return;
      once("t03-camera",()=>{
        const camera=document.querySelector(".bluefox-camera-button");
        highlight(camera);
        show(
          "Double clic : désactiver le suivi caméra pour observer les environs. Clic simple : revenir sur la vue BlueFox.",
          "t03-camera",14000
        );
      });
    },delay);
  }
  function guideParallel(){
    once("t04-t05-parallel",()=>{
      const button=findByText("missions");
      highlight(button);
      show(
        "Plusieurs missions peuvent évoluer simultanément. Vous pouvez suivre leur progression dans le menu Missions.",
        "t04-t05-parallel",14000
      );
    });
  }
  function planetMenuButton(){return findByText("planete")||findByText("planète");}
  function settingsMenuButton(){return findByText("reglages")||findByText("réglages");}

  function stopDirectionPulse(){
    clearInterval(directionTimer);directionTimer=null;
    directionCards.forEach(unhighlight);directionCards=[];directionIndex=0;
  }
  function beginUnknownDirectionPulse(){
    stopDirectionPulse();
    const all=[...document.querySelectorAll(".direction-card")];
    directionCards=all.filter(card=>{
      const t=norm(card.textContent);
      return card.classList.contains("unknown")||
        t.includes("non explore")||t.includes("inconnu");
    });
    if(!directionCards.length)directionCards=all;
    if(!directionCards.length)return;
    const pulse=()=>{
      directionCards.forEach(unhighlight);
      highlight(directionCards[directionIndex%directionCards.length]);
      directionIndex+=1;
    };
    pulse();
    directionTimer=setInterval(pulse,1400);
  }
  function waitFor(predicate,callback,timeout=15000){
    const started=Date.now();
    const tick=()=>{
      const value=predicate();
      if(value){callback(value);return;}
      if(Date.now()-started>=timeout)return;
      setTimeout(tick,350);
    };
    tick();
  }
  function guideUnknownButton(){
    waitFor(
      ()=>findByText("Envoyer BlueFox en terre inconnue"),
      button=>{
        stopDirectionPulse();highlight(button);
        show("Envoyez BlueFox en terre inconnue.","t07-send-unknown",10000);
      },20000
    );
  }
  function guideT07(){
    once("t07-planet-intro",()=>{
      const button=planetMenuButton();highlight(button);
      show(
        "Sélectionnez une destination encore inconnue — Zone non explorée — dans le menu Planète, puis envoyez BlueFox en terre inconnue.",
        "t07-planet-intro",14000
      );
    });
  }
  function guideT07Return(){
    once("t07-return",()=>{
      const button=planetMenuButton();highlight(button);
      show(
        "Ouvrez à nouveau le menu Planète et choisissez « Demander le retour à la base ».",
        "t07-return",14000
      );
    });
  }
  function guideT08Completed(){
    once("t08-autonomy",()=>{
      const button=settingsMenuButton();highlight(button);
      show(
        "BlueFox est désormais capable de poursuivre ses missions en autonomie. Vous pouvez lui indiquer des priorités dans le menu Missions et régler ses préférences dans le menu Réglages.",
        "t08-autonomy",16000
      );
    });
  }

  function processMissionState(ms){
    BF.missionState=ms||BF.missionState||{};
    syncTutorialAutonomy(BF.missionState);
    const previous=lastMissionState||{missions:[]};
    const prev=id=>lifecycle(missionEntry(previous,id));
    const cur=id=>lifecycle(missionEntry(BF.missionState,id));

    if(cur("T02")==="active"&&prev("T02")!=="active")guideT02();
    if(cur("T03")==="active"){guideT03();}else if(t03Timer){clearTimeout(t03Timer);t03Timer=null;}
    if(
      (cur("T04")==="active"&&prev("T04")!=="active")||
      (cur("T05")==="active"&&prev("T05")!=="active")
    )guideParallel();
    if(cur("T07")==="active"&&prev("T07")!=="active")guideT07();
    if(cur("T07")==="completed"&&prev("T07")!=="completed")guideT07Return();
    if(cur("T08")==="completed"&&prev("T08")!=="completed")guideT08Completed();

    lastMissionState=JSON.parse(JSON.stringify(BF.missionState||{}));
    refreshAutonomyLock();
  }

  function objectDefinition(event){
    return BF.ObjectLibrary?.getById?.(event?.objectId)||
      BF.ObjectLibrary?.get?.(event?.detail?.kind||event?.inventoryKey||event?.family)||
      null;
  }
  function handleObjectEvent(event){
    const e=event?.detail||event||{};
    const isCrash=norm(e.objectId).includes("crash-capsule")||
      norm(e.objectId).includes("landmark-crash-capsule");
    if(isCrash&&localStorage.getItem(CRASH_KEY)!=="1"){
      localStorage.setItem(CRASH_KEY,"1");hide();
      BF.sayNarrativeThought?.(
        "Ma navette est dans un sale état… Je suis coincé ici. Observons l’environnement."
      );
    }else if(
      !isCrash&&localStorage.getItem(CRASH_KEY)==="1"&&
      !localStorage.getItem(FIRST_KEY)
    ){
      localStorage.setItem(FIRST_KEY,String(Date.now()));hide();
      highlightMissionHud();
      show(
        "Déployez la fenêtre Mission pour visualiser les objectifs prioritaires.",
        "first-interaction-mission",10000
      );
    }

    if(state()!=="IA_FULL"){
      const definition=objectDefinition(e);
      const typeKey=norm(definition?.type||e.objectId||e.family);
      if(typeKey){
        const key="bluefox_tutorial_object_types_seen_v1";
        const seen=readSet(key);
        if(!seen.has(typeKey)){
          seen.add(typeKey);writeSet(key,seen);
          const collectable=definition?.gameplay?.collectable===true;
          const label=definition?.label||e.detail?.label||"Cet objet";
          setTimeout(()=>BF.sayNarrativeThought?.(
            collectable
              ?"Je devrais pouvoir faire quelque chose avec ça."
              :`${label} n’est pas collectable, mais son observation peut m’apprendre quelque chose.`
          ),900);
        }
      }
    }
  }

  document.addEventListener("click",event=>{
    const target=event.target?.closest?.("button,[role=button],.direction-card");
    if(!target)return;
    const text=norm(target.textContent);

    if(target.classList.contains("bluefox-camera-button"))unhighlight(target);
    if(missionHelpActive&&missionHudTargets().some(el=>el===target||el.contains(target))){
      setTimeout(()=>{if(missionExpanded())finishMissionHelp();},180);
    }
    if(text.includes("missions"))unhighlight(target);

    if(target===planetMenuButton()||text.includes("planete")){
      unhighlight(target);
      setTimeout(()=>{
        if(lifecycle(missionEntry(BF.missionState,"T07"))==="active"){
          beginUnknownDirectionPulse();
        }else if(lifecycle(missionEntry(BF.missionState,"T07"))==="completed"){
          waitFor(
            ()=>document.querySelector(".planet-return-base")||
              findByText("Demander le retour à la base"),
            button=>highlight(button),15000
          );
        }
      },250);
    }
    if(target.classList.contains("direction-card")){
      stopDirectionPulse();
      guideUnknownButton();
    }
    if(text.includes("envoyer bluefox en terre inconnue")){
      unhighlight(target);hide();
    }
    if(text.includes("demander le retour a la base")){
      unhighlight(target);hide();
    }

    if(target===settingsMenuButton()||text.includes("reglages")){
      unhighlight(target);
      setTimeout(placeAutonomy,150);
      const t08=missionEntry(BF.missionState,"T08");
      if(lifecycle(t08)==="completed"&&localStorage.getItem(FULL_UNLOCK_KEY)!=="1"){
        localStorage.setItem(FULL_UNLOCK_KEY,"1");
        BF.setTutorialAutonomyState?.("IA_FULL");
        refreshAutonomyLock();
        hide();
      }
    }
  },true);

  global.addEventListener("bluefox:object-event",handleObjectEvent);
  global.addEventListener("bluefox:mission-state",event=>
    processMissionState(event.detail||BF.getMissionState?.()||{})
  );
  global.addEventListener("bluefox:tutorial-autonomy-state",refreshAutonomyLock);
  global.addEventListener("resize",()=>setTimeout(placeAutonomy,50),{passive:true});

  global.addEventListener("bluefox:intro-end",()=>{
    setTimeout(()=>{
      if(localStorage.getItem(CRASH_KEY)!=="1"){
        show("Observez le site du crash. Cliquez sur la capsule.","crash-capsule",10000);
      }
    },18000);
  });

  function init(){
    BF.installMissionRuntimeGuards?.(BF.currentEngine);
    placeAutonomy();
    const ms=BF.getMissionState?.()||BF.missionState||{};
    if(ms?.missions?.length)processMissionState(ms);
    if(
      localStorage.getItem("bluefox_new_game_start_v1")&&
      localStorage.getItem(CRASH_KEY)!=="1"
    ){
      setTimeout(()=>show(
        "Observez le site du crash. Cliquez sur la capsule.",
        "crash-capsule",10000
      ),18000);
    }
  }
  global.addEventListener("load",()=>setTimeout(init,900),{once:true});
  setTimeout(init,1600);
  BF.refreshTutorialGuide=init;
})(window);
