
export class PlayerController{
  constructor(camera,target){
    this.camera=camera;
    this.target=target;
    this.keys={};
    addEventListener('keydown',e=>this.keys[e.key.toLowerCase()]=true)
    addEventListener('keyup',e=>this.keys[e.key.toLowerCase()]=false)
  }
}
