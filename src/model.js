export function videoId(input){
 if(/^[\w-]{11}$/.test(input))return input;
 try{const u=new URL(input); if(!['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.youtube-nocookie.com'].includes(u.hostname))return null;
 const id=u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v')||u.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1];return /^[\w-]{11}$/.test(id||'')?id:null;}catch{return null;}
}
export const initialState=()=>({queue:[],current:null,playing:false,position:0,at:Date.now(),messages:[]});
export function reduce(s,action){
 const n=structuredClone(s); const {type,payload:p}=action;
 if(type==='add'&&n.queue.length<100)n.queue.push(p);
 if(type==='remove')n.queue=n.queue.filter(x=>x.key!==p);
 if(type==='move'){const i=n.queue.findIndex(x=>x.key===p.key);if(i>=0){const [v]=n.queue.splice(i,1);n.queue.splice(Math.max(0,Math.min(p.to,n.queue.length)),0,v);}}
 if(type==='play'){n.current=p;n.playing=true;n.position=0;n.at=Date.now();n.queue=n.queue.filter(x=>x.key!==p.key);}
 if(type==='skip'){n.current=n.queue.shift()||null;n.position=0;n.playing=!!n.current;n.at=Date.now();}
 if(type==='transport'){n.playing=p.playing;n.position=Math.max(0,p.position);n.at=Date.now();}
 if(type==='chat')n.messages=[...n.messages,p].slice(-100);
 return n;
}
export function targetPosition(s,now=Date.now()){return s.position+(s.playing?Math.max(0,now-s.at)/1000:0);}
