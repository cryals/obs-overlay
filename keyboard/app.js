const keys=[...document.querySelectorAll('[data-key]')];
function apply(state){for(const el of keys)el.classList.toggle('pressed',Boolean(state.keys?.[el.dataset.key]));}
function connect(){const ws=new WebSocket('ws://127.0.0.1:31337');ws.onmessage=e=>apply(JSON.parse(e.data));ws.onclose=()=>setTimeout(connect,1000)}connect();
