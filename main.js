import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const $ = (s)=>document.querySelector(s);
const canvas = $('#game');
const nameModal = $('#nameModal');
const nameInput = $('#nameInput');
const serverInput = $('#serverInput');
const joinBtn = $('#joinBtn');
const hudName = $('#playerName');
const onlineCountEl = $('#onlineCount');
const connStatus = $('#connStatus');

let socket=null,myId=null,myName=null;
let otherPlayers=new Map();

// 3D Setup
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setSize(window.innerWidth,window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x555555);
const camera=new THREE.PerspectiveCamera(70,window.innerWidth/window.innerHeight,0.1,1000);
camera.position.set(0,5,10);
const light=new THREE.HemisphereLight(0xffffff,0x444444,1);
scene.add(light);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(50,50),new THREE.MeshStandardMaterial({color:0x777777}));
ground.rotation.x=-Math.PI/2;
scene.add(ground);

function makePlayer(color=0xffcc66){
  const geo=new THREE.BoxGeometry(1,2,1);
  const mat=new THREE.MeshStandardMaterial({color});
  const mesh=new THREE.Mesh(geo,mat);
  return mesh;
}

const myPlayer=makePlayer();
scene.add(myPlayer);

let keys={};
window.addEventListener('keydown',e=>keys[e.code]=true);
window.addEventListener('keyup',e=>keys[e.code]=false);

function addOtherPlayer(id,name,x=0,z=0){
  const mesh=makePlayer(0x66ccff);
  mesh.position.set(x,1,z);
  scene.add(mesh);
  otherPlayers.set(id,mesh);
  onlineCountEl.textContent=otherPlayers.size+1;
}
function removeOtherPlayer(id){
  const p=otherPlayers.get(id);
  if(!p)return;
  scene.remove(p);
  otherPlayers.delete(id);
  onlineCountEl.textContent=otherPlayers.size+1;
}

joinBtn.addEventListener('click',()=>{
  const name=(nameInput.value||'Chef'+Math.floor(Math.random()*1000));
  const url=(serverInput.value||'').trim();
  start(name,url);
});

function start(name,serverUrl){
  myName=name;hudName.textContent=myName;
  nameModal.classList.add('hidden');
  const DEFAULT_SERVER='https://your-render-server.onrender.com';
  const ioUrl=(serverUrl&&serverUrl.startsWith('http'))?serverUrl:DEFAULT_SERVER;
  socket=io(ioUrl,{transports:['websocket']});
  socket.on('connect',()=>{
    connStatus.textContent='connected';
    myId=socket.id;
    socket.emit('join',{name:myName});
  });
  socket.on('disconnect',()=>{
    connStatus.textContent='disconnected';
  });
  socket.on('init',data=>{
    Object.values(data.players).forEach(p=>{
      if(p.id!==socket.id)addOtherPlayer(p.id,p.name,p.x,p.z);
    });
  });
  socket.on('playerJoined',p=>{
    if(p.id===socket.id)return;
    addOtherPlayer(p.id,p.name,p.x,p.z);
  });
  socket.on('playerLeft',id=>removeOtherPlayer(id));
  socket.on('playerMoved',p=>{
    const o=otherPlayers.get(p.id);
    if(!o)return;
    o.position.set(p.x,1,p.z);
  });
}

function tick(){
  const speed=0.1;
  if(keys['KeyW'])myPlayer.position.z-=speed;
  if(keys['KeyS'])myPlayer.position.z+=speed;
  if(keys['KeyA'])myPlayer.position.x-=speed;
  if(keys['KeyD'])myPlayer.position.x+=speed;
  camera.lookAt(myPlayer.position);
  if(socket&&socket.connected){
    socket.emit('move',{x:myPlayer.position.x,z:myPlayer.position.z});
  }
  renderer.render(scene,camera);
  requestAnimationFrame(tick);
}
tick();
