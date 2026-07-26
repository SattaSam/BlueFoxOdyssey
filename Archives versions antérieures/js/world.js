export class World{
constructor(){
this.biome={name:"Alien Prairie", exits:["N","E","S","W"]};
}
draw(ctx,w,h){
ctx.strokeStyle="#55ff88";
ctx.strokeRect(80,80,w-160,h-160);
ctx.fillStyle="#fff";
ctx.fillText(this.biome.name,100,110);
}
}
