export class Fox{
constructor(){this.x=0;this.y=0;}
update(){}
draw(ctx,w,h){
ctx.fillStyle="#4db8ff";
ctx.beginPath();
ctx.arc(w/2,h/2,14,0,Math.PI*2);
ctx.fill();
}
}
