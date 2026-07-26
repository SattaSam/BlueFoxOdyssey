export class Camera{
constructor(){this.zoom=0;}
update(dt){this.zoom=Math.min(1,this.zoom+dt*0.1);}
}
