import {Camera} from './camera.js';
import {World} from './world.js';
import {Fox} from './fox.js';
import {initThree} from './three_boot.js';

initThree();

const c=document.getElementById('world');
const ctx=c.getContext('2d');
const cam=new Camera();
const world=new World();
const fox=new Fox();

function resize(){c.width=innerWidth;c.height=innerHeight*0.9;}
addEventListener('resize',resize);resize();

addEventListener('wheel',e=>{
 cam.zoom=Math.max(0,Math.min(1,cam.zoom-e.deltaY*0.001));
});

let last=performance.now();
function loop(t){
 const dt=(t-last)/1000;last=t;
 cam.update(0);
 ctx.fillStyle='#081522';
 ctx.fillRect(0,0,c.width,c.height);
 world.draw(ctx,c.width,c.height);
 fox.draw(ctx,c.width,c.height);
 ctx.fillStyle='white';
 ctx.fillText('Zoom stratégique <-> TPS : '+cam.zoom.toFixed(2),20,25);
 ctx.fillText('Molette : zoom',20,45);
 requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
