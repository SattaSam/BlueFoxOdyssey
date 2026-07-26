
export function updateThirdPerson(camera,target){
 if(!target)return;
 camera.position.lerp({x:target.position.x,y:target.position.y+2,z:target.position.z+5},0.08);
 camera.lookAt(target.position);
}
