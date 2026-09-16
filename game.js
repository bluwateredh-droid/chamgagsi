(() => {
  'use strict';
  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const startPanel = document.querySelector('#startPanel');
  const levelPanel = document.querySelector('#levelPanel');
  const gameOverPanel = document.querySelector('#gameOverPanel');
  const finalStats = document.querySelector('#finalStats');
  const choicesEl = document.querySelector('#upgradeChoices');
  const soundBtn = document.querySelector('#soundBtn');
  const W = canvas.width, H = canvas.height;
  const keys = new Set();
  let state = 'menu', last = 0, elapsed = 0, kills = 0, level = 1, xp = 0, xpNeed = 8;
  let enemies = [], shots = [], gems = [], particles = [], spawnTimer = 0, shootTimer = 0;
  let audioOn = true, audioCtx = null, touch = null, selectedCharacter = 'frog';
  let sanctuary = null, nextSanctuaryCheck = 60;
  let player;

  const upgrades = [
    { icon:'💦', title:'강한 물방울', desc:'공격력 +35%', apply:()=>player.damage*=1.35 },
    { icon:'⚡', title:'빠른 혀놀림', desc:'공격 속도 +25%', apply:()=>player.fireRate*=.8 },
    { icon:'🍃', title:'가벼운 발', desc:'이동 속도 +18%', apply:()=>player.speed*=1.18 },
    { icon:'🫧', title:'큰 물방울', desc:'투사체 크기 +30%', apply:()=>player.shotSize*=1.3 },
    { icon:'💚', title:'연잎 간식', desc:'체력 35 회복 + 최대 체력 10', apply:()=>{player.maxHp+=10;player.hp=Math.min(player.maxHp,player.hp+35);} },
    { icon:'🧲', title:'개굴 자석', desc:'경험치 획득 범위 +45%', apply:()=>player.magnet*=1.45 },
    { icon:'🌊', title:'쌍둥이 물방울', desc:'추가 물방울 발사', apply:()=>player.multishot=Math.min(4,player.multishot+1) },
    { icon:'🛡️', title:'튼튼한 점액', desc:'받는 피해 -18%', apply:()=>player.armor=Math.min(.65,player.armor+.18) }
  ];

  function reset() {
    const badger=selectedCharacter==='badger';
    player={x:W/2,y:H/2,r:badger?24:22,speed:badger?190:220,hp:badger?125:100,maxHp:badger?125:100,damage:badger?25:22,fireRate:badger?.62:.55,shotSize:badger?9:8,magnet:85,multishot:1,armor:badger?.12:0,inv:0,character:selectedCharacter,name:badger?'참서방 오소리':'참각시 개구리'};
    enemies=[]; shots=[]; gems=[]; particles=[]; elapsed=0; kills=0; level=1; xp=0; xpNeed=8; spawnTimer=0; shootTimer=.2;
    sanctuary=null;nextSanctuaryCheck=60;
    state='playing'; last=performance.now(); gameOverPanel.classList.add('hidden'); startPanel.classList.add('hidden'); levelPanel.classList.add('hidden');
    initAudio(); requestAnimationFrame(loop);
  }
  function initAudio(){ if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==='suspended') audioCtx.resume(); }
  function beep(freq=440,dur=.06,type='sine',vol=.025){ if(!audioOn||!audioCtx)return; const o=audioCtx.createOscillator(),g=audioCtx.createGain(); o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur); }
  function spawnEnemy(){
    const side=Math.floor(Math.random()*4); let x,y;
    if(side===0){x=-30;y=Math.random()*H}else if(side===1){x=W+30;y=Math.random()*H}else if(side===2){x=Math.random()*W;y=-30}else{x=Math.random()*W;y=H+30}
    const tough=Math.random()<Math.min(.32,elapsed/150), base=1+elapsed/95;
    enemies.push({x,y,r:tough?22:15,hp:(tough?70:30)*base,maxHp:(tough?70:30)*base,speed:(tough?35:55)+Math.min(45,elapsed/8),type:tough?'beetle':'fly',hit:0});
  }
  function shoot(){
    if(!enemies.length)return; let target=enemies[0],best=Infinity;
    for(const e of enemies){const d=(e.x-player.x)**2+(e.y-player.y)**2;if(d<best){best=d;target=e;}}
    const angle=Math.atan2(target.y-player.y,target.x-player.x);
    for(let i=0;i<player.multishot;i++){const spread=(i-(player.multishot-1)/2)*.17; shots.push({x:player.x,y:player.y,vx:Math.cos(angle+spread)*480,vy:Math.sin(angle+spread)*480,r:player.shotSize,life:1.3,damage:player.damage});}
    beep(360,.04,'triangle',.016);
  }
  function burst(x,y,color,n=7){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=30+Math.random()*100;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.25+Math.random()*.35,color,r:2+Math.random()*4});}}
  function update(dt){
    elapsed+=dt; player.inv=Math.max(0,player.inv-dt);
    if(elapsed>=nextSanctuaryCheck){
      nextSanctuaryCheck+=60;
      if(Math.random()<.5){sanctuary={x:120+Math.random()*(W-240),y:120+Math.random()*(H-240),r:78,time:10};burst(sanctuary.x,sanctuary.y,'#ffe879',22);beep(760,.3,'sine',.04);}
    }
    if(sanctuary){sanctuary.time-=dt;if(sanctuary.time<=0)sanctuary=null;}
    const inSanctuary=sanctuary&&Math.hypot(player.x-sanctuary.x,player.y-sanctuary.y)<=sanctuary.r-player.r*.2;
    let dx=(keys.has('ArrowRight')||keys.has('d')?1:0)-(keys.has('ArrowLeft')||keys.has('a')?1:0), dy=(keys.has('ArrowDown')||keys.has('s')?1:0)-(keys.has('ArrowUp')||keys.has('w')?1:0);
    if(touch){dx=touch.x-player.x;dy=touch.y-player.y;const l=Math.hypot(dx,dy);if(l<12){dx=dy=0}else{dx/=l;dy/=l;}}
    const len=Math.hypot(dx,dy)||1; player.x=Math.max(player.r,Math.min(W-player.r,player.x+dx/len*player.speed*dt));player.y=Math.max(player.r,Math.min(H-player.r,player.y+dy/len*player.speed*dt));
    spawnTimer-=dt; const spawnGap=Math.max(.16,.85-elapsed*.007); if(spawnTimer<=0){spawnEnemy();spawnTimer=spawnGap; if(elapsed>45&&Math.random()<.3)spawnEnemy();}
    shootTimer-=dt;if(shootTimer<=0){shoot();shootTimer=player.fireRate;}
    for(const s of shots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;}
    for(const e of enemies){const a=Math.atan2(player.y-e.y,player.x-e.x);e.x+=Math.cos(a)*e.speed*dt;e.y+=Math.sin(a)*e.speed*dt;e.hit=Math.max(0,e.hit-dt);if(Math.hypot(e.x-player.x,e.y-player.y)<e.r+player.r&&player.inv<=0){if(!inSanctuary){player.hp-=14*(1-player.armor);player.inv=.65;burst(player.x,player.y,'#ff8f78',12);beep(110,.15,'sawtooth',.04);}else{player.inv=.16;burst(player.x,player.y,'#ffe879',4);}}}
    for(let si=shots.length-1;si>=0;si--){const s=shots[si];for(let ei=enemies.length-1;ei>=0;ei--){const e=enemies[ei];if(Math.hypot(s.x-e.x,s.y-e.y)<s.r+e.r){e.hp-=s.damage;e.hit=.09;shots.splice(si,1);burst(s.x,s.y,'#a9eefa',5);if(e.hp<=0){kills++;gems.push({x:e.x,y:e.y,r:6,value:e.type==='beetle'?3:1});burst(e.x,e.y,e.type==='beetle'?'#f8ce65':'#b38bf1',10);enemies.splice(ei,1);beep(620,.04,'square',.012);}break;}}}
    for(let i=gems.length-1;i>=0;i--){const g=gems[i],d=Math.hypot(g.x-player.x,g.y-player.y);if(d<player.magnet){const a=Math.atan2(player.y-g.y,player.x-g.x),sp=220+(player.magnet-d)*3;g.x+=Math.cos(a)*sp*dt;g.y+=Math.sin(a)*sp*dt;}if(d<player.r+8){xp+=g.value;gems.splice(i,1);beep(820,.04,'sine',.018);if(xp>=xpNeed){xp-=xpNeed;xpNeed=Math.ceil(xpNeed*1.38);level++;showLevelUp();break;}}}
    for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;p.life-=dt;}
    shots=shots.filter(s=>s.life>0&&s.x>-30&&s.x<W+30&&s.y>-30&&s.y<H+30);particles=particles.filter(p=>p.life>0);
    if(player.hp<=0)endGame();
  }
  function showLevelUp(){state='levelup';choicesEl.innerHTML='';const picks=[...upgrades].sort(()=>Math.random()-.5).slice(0,3);for(const u of picks){const b=document.createElement('button');b.className='upgrade';b.innerHTML=`<span class="icon">${u.icon}</span><strong>${u.title}</strong><small>${u.desc}</small>`;b.onclick=()=>{u.apply();levelPanel.classList.add('hidden');state='playing';last=performance.now();beep(980,.15,'sine',.04);requestAnimationFrame(loop);};choicesEl.appendChild(b);}levelPanel.classList.remove('hidden');}
  function endGame(){state='over';finalStats.innerHTML=`${player.name} · <strong>${formatTime(elapsed)}</strong> 생존 · <strong>${kills}</strong>마리 처치 · 레벨 <strong>${level}</strong>`;gameOverPanel.classList.remove('hidden');beep(150,.5,'triangle',.05);}
  function formatTime(t){const m=Math.floor(t/60),s=Math.floor(t%60);return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}
  function lily(x,y,r){ctx.fillStyle='#4d9e68';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.lineTo(x,y);ctx.arc(x,y,r,Math.PI*1.7,Math.PI*2);ctx.fill();}
  function drawBg(){ctx.fillStyle='#7bc5aa';ctx.fillRect(0,0,W,H);ctx.globalAlpha=.24;for(let i=0;i<18;i++){lily((i*193+70)%W,(i*137+80)%H,18+(i%3)*7);}ctx.globalAlpha=1;ctx.strokeStyle='#b9ecd044';ctx.lineWidth=3;for(let i=0;i<5;i++){ctx.beginPath();ctx.arc((i*211+120)%W,(i*91+120)%H,32+((elapsed*13+i*21)%80),0,Math.PI*2);ctx.stroke();}}
  function drawFrog(){const p=player;ctx.save();ctx.translate(p.x,p.y);if(p.inv>0&&Math.floor(p.inv*15)%2)ctx.globalAlpha=.35;ctx.fillStyle='#315b39';ctx.beginPath();ctx.ellipse(-16,17,13,8,-.3,0,Math.PI*2);ctx.ellipse(16,17,13,8,.3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#76d35f';ctx.beginPath();ctx.arc(0,2,p.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#95e878';ctx.beginPath();ctx.arc(-13,-13,11,0,Math.PI*2);ctx.arc(13,-13,11,0,Math.PI*2);ctx.fill();ctx.fillStyle='#173f35';ctx.beginPath();ctx.arc(-13,-14,4,0,Math.PI*2);ctx.arc(13,-14,4,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#245a35';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,4,8,.15,Math.PI-.15);ctx.stroke();ctx.fillStyle='#f39a9c';ctx.beginPath();ctx.ellipse(0,11,5,3,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  function drawBadger(){const p=player;ctx.save();ctx.translate(p.x,p.y);if(p.inv>0&&Math.floor(p.inv*15)%2)ctx.globalAlpha=.35;ctx.fillStyle='#3a3738';ctx.beginPath();ctx.ellipse(0,3,p.r,p.r*.9,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ece7d8';ctx.beginPath();ctx.ellipse(0,-2,14,21,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#2b292a';ctx.beginPath();ctx.moveTo(-15,-16);ctx.lineTo(-24,-28);ctx.lineTo(-6,-21);ctx.moveTo(15,-16);ctx.lineTo(24,-28);ctx.lineTo(6,-21);ctx.fill();ctx.beginPath();ctx.ellipse(-8,-6,5,9,-.35,0,Math.PI*2);ctx.ellipse(8,-6,5,9,.35,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-8,-8,2,0,Math.PI*2);ctx.arc(8,-8,2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#282425';ctx.beginPath();ctx.ellipse(0,7,5,4,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  function drawSanctuary(){if(!sanctuary)return;const pulse=3+Math.sin(elapsed*7)*3;ctx.save();ctx.globalAlpha=.2;ctx.fillStyle='#fff3a6';ctx.beginPath();ctx.arc(sanctuary.x,sanctuary.y,sanctuary.r+pulse,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.9;ctx.strokeStyle='#ffe45e';ctx.lineWidth=5;ctx.setLineDash([12,8]);ctx.lineDashOffset=-elapsed*25;ctx.beginPath();ctx.arc(sanctuary.x,sanctuary.y,sanctuary.r,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.textAlign='center';ctx.font='900 17px system-ui';ctx.fillStyle='#4b3d16';ctx.fillText('동부센트레빌',sanctuary.x,sanctuary.y-7);ctx.font='bold 14px system-ui';ctx.fillText(`무적 ${sanctuary.time.toFixed(1)}초`,sanctuary.x,sanctuary.y+17);ctx.restore();}
  function drawEnemy(e){ctx.save();ctx.translate(e.x,e.y);ctx.fillStyle=e.hit?'#fff':e.type==='beetle'?'#e1a646':'#8064b9';ctx.beginPath();ctx.ellipse(0,0,e.r,e.r*.78,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#263d35';ctx.lineWidth=3;for(const sy of [-1,1])for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(i*8,sy*7);ctx.lineTo(i*12,sy*(e.r+7));ctx.stroke();}ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-5,-3,4,0,Math.PI*2);ctx.arc(5,-3,4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#263d35';ctx.beginPath();ctx.arc(-4,-3,2,0,Math.PI*2);ctx.arc(4,-3,2,0,Math.PI*2);ctx.fill();ctx.restore();}
  function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
  function drawHud(){ctx.fillStyle='#103d35cc';roundRect(18,16,280,44,14);ctx.fillStyle='#582e38';roundRect(72,29,210,16,8);ctx.fillStyle='#ef6f6c';roundRect(72,29,210*Math.max(0,player.hp/player.maxHp),16,8);ctx.font='bold 14px system-ui';ctx.fillStyle='#fff6d6';ctx.fillText('💚',35,44);ctx.fillText(`${Math.ceil(player.hp)} / ${player.maxHp}`,145,42);ctx.fillStyle='#103d35cc';roundRect(W/2-85,16,170,44,14);ctx.textAlign='center';ctx.font='900 22px system-ui';ctx.fillStyle='#fff6d6';ctx.fillText(formatTime(elapsed),W/2,45);ctx.textAlign='left';ctx.fillStyle='#103d35cc';roundRect(W-210,16,192,44,14);ctx.font='bold 14px system-ui';ctx.fillStyle='#fff6d6';ctx.fillText(`Lv.${level}`,W-193,43);ctx.fillText(`🐛 ${kills}`,W-92,43);ctx.fillStyle='#1d5147';roundRect(18,H-30,W-36,14,7);ctx.fillStyle='#d3f269';roundRect(18,H-30,(W-36)*Math.min(1,xp/xpNeed),14,7);ctx.font='bold 11px system-ui';ctx.fillStyle='#fff';ctx.textAlign='center';ctx.fillText(`${xp} / ${xpNeed} XP`,W/2,H-19);if(sanctuary&&Math.hypot(player.x-sanctuary.x,player.y-sanctuary.y)<=sanctuary.r-player.r*.2){ctx.font='900 18px system-ui';ctx.fillStyle='#ffe45e';ctx.fillText('🛡️ 동부센트레빌 무적',W/2,82);}ctx.textAlign='left';}
  function draw(){drawBg();drawSanctuary();for(const g of gems){ctx.fillStyle='#e8fa6e';ctx.save();ctx.translate(g.x,g.y);ctx.rotate(Math.PI/4);ctx.fillRect(-g.r,-g.r,g.r*2,g.r*2);ctx.restore();}for(const s of shots){ctx.fillStyle='#d9fbff';ctx.strokeStyle='#5cb5d1';ctx.lineWidth=2;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();ctx.stroke();}for(const e of enemies)drawEnemy(e);if(player.character==='badger')drawBadger();else drawFrog();for(const p of particles){ctx.globalAlpha=Math.max(0,p.life*2);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;if(player)drawHud();}
  function loop(now){if(state!=='playing')return;const dt=Math.min(.033,(now-last)/1000||0);last=now;update(dt);draw();if(state==='playing')requestAnimationFrame(loop);}
  function pointerPos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};}
  addEventListener('keydown',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(k)){e.preventDefault();keys.add(k);}});
  addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
  canvas.addEventListener('pointerdown',e=>{touch=pointerPos(e);canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(touch)touch=pointerPos(e);});canvas.addEventListener('pointerup',()=>touch=null);canvas.addEventListener('pointercancel',()=>touch=null);
  document.querySelector('#startBtn').onclick=reset;document.querySelector('#restartBtn').onclick=reset;
  document.querySelectorAll('.character').forEach(btn=>btn.onclick=()=>{selectedCharacter=btn.dataset.character;document.querySelectorAll('.character').forEach(b=>b.classList.toggle('active',b===btn));document.querySelector('.mascot').textContent=selectedCharacter==='badger'?'🦡':'🐸';beep(520,.06,'sine',.02);});
  soundBtn.onclick=()=>{audioOn=!audioOn;soundBtn.textContent=audioOn?'🔊':'🔇';if(audioOn)initAudio();};
  player={x:W/2,y:H/2,r:22,hp:100,maxHp:100,character:'frog'};drawBg();drawFrog();
})();
