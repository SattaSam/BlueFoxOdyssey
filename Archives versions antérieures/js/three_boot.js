export async function initThree(){
 const panel=document.createElement('div');
 panel.id='threeStatus';
 panel.innerHTML='<b>BlueFox Odyssey V0.8</b><br>BlueFoxMODEL.glb détecté.<br>Three.js sera branché au prochain sprint.';
 Object.assign(panel.style,{position:'absolute',top:'8px',right:'8px',background:'#123',color:'#fff',padding:'10px',borderRadius:'8px'});
 document.body.appendChild(panel);
 try{
   const r=await fetch('./models/BlueFoxMODEL.glb');
   if(r.ok){panel.innerHTML+='<br>✔ Modèle trouvé';}
   else{panel.innerHTML+='<br>✖ Modèle absent';}
 }catch(e){panel.innerHTML+='<br>✖ Erreur accès modèle';}
}
