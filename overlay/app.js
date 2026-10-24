const stage=document.querySelector('#stage'), mouse=document.querySelector('#mouse'), trail=document.querySelector('#trail');
const target={x:256,y:256}, pos={x:256,y:256};
// Mouse box is 220×330; include the 12 px outer glow so no part can cross 512×512.
// Extra vertical headroom deliberately favours a smaller travel range over clipping.
const bounds={left:128,right:384,top:192,bottom:320};
function edgeMap(unit,min,max){
  // Finite at both extremes, yet eases as it approaches either edge.
  const t=Math.tanh((unit-.5)*2.6)/Math.tanh(1.3);
  return min+(max-min)*(t+1)/2;
}
function draw(){
  pos.x+=(target.x-pos.x)*.13;pos.y+=(target.y-pos.y)*.13;
  // Final invariant: even a malformed WebSocket payload or a future skin resize
  // cannot push the rendered mouse beyond its safe rectangle.
  pos.x=Math.min(bounds.right,Math.max(bounds.left,pos.x));
  pos.y=Math.min(bounds.bottom,Math.max(bounds.top,pos.y));
  mouse.style.left=`${pos.x}px`;mouse.style.top=`${pos.y}px`;trail.style.left=`${pos.x}px`;trail.style.top=`${pos.y}px`;requestAnimationFrame(draw)
}draw();
function apply(s){target.x=edgeMap(s.x,bounds.left,bounds.right);target.y=edgeMap(s.y,bounds.top,bounds.bottom);mouse.classList.toggle('left',s.left);mouse.classList.toggle('right',s.right);mouse.classList.toggle('middle',s.middle);stage.classList.toggle('moving',s.moving)}
function connect(){const ws=new WebSocket('ws://127.0.0.1:31337');ws.onmessage=e=>apply(JSON.parse(e.data));ws.onclose=()=>setTimeout(connect,1000)}connect();
