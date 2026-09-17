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
  let W = canvas.width, H = canvas.height;
  const keys = new Set();
  let state = 'menu', last = 0, elapsed = 0, kills = 0, level = 1, xp = 0, xpNeed = 8;
  let enemies = [], shots = [], gems = [], items = [], particles = [], waves = [], notices = [], spawnTimer = 0, shootTimer = 0;
  let audioOn = true, audioCtx = null, bgmTimer = null, bgmStep = 0, touch = null, touchOrigin = null, selectedCharacter = 'frog';
  let sanctuary = null, nextSanctuaryCheck = 60, harlem = null, nextHarlemCheck = 60;
  let nextBossStage = 1, nextBossTime = 180;
  let dangerBeat = 0;
  let player;
  const bossNames=['아기 둘기','어른 둘기','윤석열','탄핵 윤석열','호중','음주 호중','갬돌이','웹툰부장','지구온난화','CM'];
  const missions={
    frog:{title:'🐸 게임 목표 · 참각시 개구리',text:'연꽃 증식으로 개구리각시가 집을 잃어가고 있습니다. 연꽃을 파괴하고 끝까지 생존하여 생태계를 지켜주세요. 끝까지 생존하면 보상이 있습니다!'},
    badger:{title:'🦡 게임 목표 · 참서방 오소리',text:'서방오소리는 어서 은퇴하여 꿀을 빨고 싶습니다. 하지만 꿀벌들이 꿀을 다 빼앗아가고 있어요. 꿀벌들을 처치하며 끝까지 살아남아 개꿀 오소리가 되세요. 끝까지 생존하면 보상이 있습니다!'}
  };

  const upgrades = [
    {id:'power',icon:'💥',title:'파워 코어',desc:'직접·스플래시 공격력 +22%',max:5,category:'공격',apply:()=>player.damage*=1.22},
    {id:'speed',icon:'⚡',title:'연속 공격',desc:'공격 주기 12% 단축',max:5,category:'공격',apply:()=>player.fireRate*=.88},
    {id:'move',icon:'🍃',title:'민첩한 발',desc:'이동속도 +12%',max:4,category:'생존',apply:()=>player.speed*=1.12},
    {id:'size',icon:'🫧',title:'거대 탄환',desc:'투사체 +18%, 폭발 반경 +10',max:4,category:'범위',apply:()=>{player.shotSize*=1.18;player.splashRadius+=10;}},
    {id:'splash',icon:'🌊',title:'파동 증폭',desc:'폭발 반경 +16, 주변 피해 +7%',max:5,category:'범위',apply:()=>{player.splashRadius+=16;player.splashFactor+=.07;}},
    {id:'multi',icon:'🔱',title:'다중 발사',desc:'투사체 +1',max:4,category:'공격',apply:()=>player.multishot=Math.min(5,player.multishot+1)},
    {id:'crit',icon:'🎯',title:'급소 감각',desc:'치명타 확률 +6%, 치명타 피해 +10%',max:4,category:'공격',apply:()=>{player.critChance+=.06;player.critMult+=.1;}},
    {id:'hp',icon:'💚',title:'생명력',desc:'최대 체력 +18, 체력 30 회복',max:4,category:'생존',apply:()=>{player.maxHp+=18;player.hp=Math.min(player.maxHp,player.hp+30);}},
    {id:'armor',icon:'🛡️',title:'수호막',desc:'받는 피해 10% 감소',max:4,category:'생존',apply:()=>player.armor=Math.min(.65,player.armor+.1)},
    {id:'regen',icon:'🌱',title:'재생력',desc:'초당 체력 0.35 회복',max:3,category:'생존',apply:()=>player.regen+=.35},
    {id:'magnet',icon:'🧲',title:'경험치 자석',desc:'획득 범위 +35%',max:4,category:'성장',apply:()=>player.magnet*=1.35},
    {id:'tidal',icon:'🌪️',title:'진화: 대홍수',desc:'폭발 반경 +55, 주변 피해 +25%',max:1,category:'진화',unlock:()=>rankOf('power')>=3&&rankOf('splash')>=3,apply:()=>{player.splashRadius+=55;player.splashFactor+=.25;}},
    {id:'storm',icon:'☄️',title:'진화: 탄막 폭풍',desc:'투사체 +2, 공격속도 +18%',max:1,category:'진화',unlock:()=>rankOf('speed')>=3&&rankOf('multi')>=2,apply:()=>{player.multishot=Math.min(7,player.multishot+2);player.fireRate*=.82;}},
    {id:'fortress',icon:'💖',title:'진화: 불굴의 심장',desc:'최대 체력 +45, 재생 +0.7',max:1,category:'진화',unlock:()=>rankOf('hp')>=3&&rankOf('armor')>=2,apply:()=>{player.maxHp+=45;player.hp+=45;player.regen+=.7;}}
  ];
  function rankOf(id){return upgrades.find(u=>u.id===id)?.rank||0;}

  function reset() {
    const badger=selectedCharacter==='badger';
    player={x:0,y:0,r:badger?24:22,speed:badger?190:220,hp:badger?125:100,maxHp:badger?125:100,damage:badger?25:22,fireRate:badger?.62:.55,shotSize:badger?9:8,splashRadius:70,splashFactor:.45,critChance:.05,critMult:1.75,regen:0,magnet:85,multishot:1,armor:badger?.12:0,inv:0,character:selectedCharacter,name:badger?'참서방 오소리':'참각시 개구리'};
    upgrades.forEach(u=>u.rank=0);
    enemies=[]; shots=[]; gems=[]; items=[]; particles=[]; waves=[]; notices=[]; elapsed=0; kills=0; level=1; xp=0; xpNeed=8; spawnTimer=0; shootTimer=.2;
    sanctuary=null;nextSanctuaryCheck=60;harlem=null;nextHarlemCheck=60;nextBossStage=1;nextBossTime=180;dangerBeat=0;player.aquaInv=0;
    state='playing'; last=performance.now(); gameOverPanel.classList.add('hidden'); startPanel.classList.add('hidden'); levelPanel.classList.add('hidden');
    document.querySelector('#victoryPanel').classList.add('hidden');
    document.body.classList.add('game-active');fitGameToViewport();initAudio(); startMusic(); requestAnimationFrame(loop);
  }
  function initAudio(){ if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==='suspended') audioCtx.resume(); }
  function beep(freq=440,dur=.06,type='sine',vol=.025){ if(!audioOn||!audioCtx)return; const o=audioCtx.createOscillator(),g=audioCtx.createGain(); o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur); }
  function startMusic(){
    if(bgmTimer)clearInterval(bgmTimer);bgmStep=0;
    const frogTune=[523,659,784,659,587,698,784,0,523,587,659,784,698,659,587,0];
    const forestTune=[392,494,587,494,440,523,659,0,392,440,494,587,523,494,440,0];
    bgmTimer=setInterval(()=>{if(audioOn&&(state==='playing'||state==='levelup')){const tune=player.character==='badger'?forestTune:frogTune,n=tune[bgmStep++%tune.length];if(n)beep(n,.18,'triangle',.012);}},240);
  }
  function spawnEnemy(){
    const side=Math.floor(Math.random()*4),margin=45; let x,y;
    if(side===0){x=player.x-W/2-margin;y=player.y-H/2+Math.random()*H}else if(side===1){x=player.x+W/2+margin;y=player.y-H/2+Math.random()*H}else if(side===2){x=player.x-W/2+Math.random()*W;y=player.y-H/2-margin}else{x=player.x-W/2+Math.random()*W;y=player.y+H/2+margin}
    const tough=Math.random()<Math.min(.38,elapsed/240), base=1+elapsed/240+Math.floor(elapsed/180)*.18;
    enemies.push({x,y,r:tough?22:15,hp:(tough?70:30)*base,maxHp:(tough?70:30)*base,speed:(tough?35:55)+Math.min(45,elapsed/8),type:tough?'beetle':'fly',hit:0});
  }
  function announce(text,color='#ffe45e',duration=2.4){notices.push({text,color,life:duration,max:duration});}
  function spawnBoss(stage){
    const side=Math.floor(Math.random()*4),margin=55;let x,y;
    if(side===0){x=player.x-W/2-margin;y=player.y}else if(side===1){x=player.x+W/2+margin;y=player.y}else if(side===2){x=player.x;y=player.y-H/2-margin}else{x=player.x;y=player.y+H/2+margin}
    const hp=Math.round(800*Math.pow(stage,1.48));
    enemies.push({x,y,r:52+stage*3.6,hp,maxHp:hp,speed:90+stage*5,type:'boss',bossStage:stage,name:bossNames[stage-1],hit:0});
    announce(`⚠️ ${stage}차 보스 등장 · ${bossNames[stage-1]}`,'#ffcc57',3.5);beep(95,.7,'sawtooth',.055);
  }
  function shoot(){
    if(!enemies.length)return; let target=enemies[0],best=Infinity;
    for(const e of enemies){const d=(e.x-player.x)**2+(e.y-player.y)**2;if(d<best){best=d;target=e;}}
    const angle=Math.atan2(target.y-player.y,target.x-player.x);
    for(let i=0;i<player.multishot;i++){const spread=(i-(player.multishot-1)/2)*.17,crit=Math.random()<player.critChance,aquaBoost=player.aquaInv>0?1.5:1;shots.push({x:player.x,y:player.y,vx:Math.cos(angle+spread)*480,vy:Math.sin(angle+spread)*480,r:player.shotSize,life:1.3,damage:player.damage*(crit?player.critMult:1),splashRadius:player.splashRadius*aquaBoost,splashFactor:player.splashFactor*(player.aquaInv>0?1.5:1),crit});}
    beep(360,.04,'triangle',.016);
  }
  function burst(x,y,color,n=7){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=30+Math.random()*100;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.25+Math.random()*.35,color,r:2+Math.random()*4});}}
  function defeatEnemyAt(index,e){
    kills++;const wasBoss=e.type==='boss';gems.push({x:e.x,y:e.y,r:wasBoss?10:6,value:wasBoss?15+e.bossStage*4:e.type==='beetle'?3:1});
    const ix=Math.max(player.x-W/2+35,Math.min(player.x+W/2-35,e.x+18)),iy=Math.max(player.y-H/2+35,Math.min(player.y+H/2-35,e.y));
    if(wasBoss||Math.random()<.035)items.push({x:ix,y:iy,type:'aqua',r:13,life:20});
    if(wasBoss||Math.random()<.018)items.push({x:ix-28,y:iy+18,type:'power',r:13,life:22});
    burst(e.x,e.y,wasBoss?'#ffcc57':player.character==='frog'?'#ff9ac9':'#ffd34e',wasBoss?28:10);enemies.splice(index,1);beep(wasBoss?880:620,wasBoss?.3:.04,'square',wasBoss?.04:.012);
    if(wasBoss){announce(`🏆 ${e.name} 격파!`,'#ffe45e',2.8);if(e.bossStage===10)winGame();}
  }
  function aquaBlast(){
    const radius=285;waves.push({x:player.x,y:player.y,max:radius,life:.7,total:.7,color:'#75eaff'});burst(player.x,player.y,'#75eaff',45);
    for(let i=enemies.length-1;i>=0;i--){const e=enemies[i];if(Math.hypot(e.x-player.x,e.y-player.y)>radius)continue;if(e.type==='boss'||e.type==='beetle')e.hp-=e.maxHp/3;else e.hp=0;e.hit=.25;burst(e.x,e.y,'#baf7ff',8);if(e.hp<=0)defeatEnemyAt(i,e);}
  }
  function centervilleBlast(){
    const radius=310;waves.push({x:player.x,y:player.y,max:radius,life:.8,total:.8,color:'#fff07a'});burst(player.x,player.y,'#fff07a',55);
    for(let i=enemies.length-1;i>=0;i--){const e=enemies[i];if(Math.hypot(e.x-player.x,e.y-player.y)>radius)continue;if(e.type==='boss'||e.type==='beetle')e.hp-=e.maxHp*.3;else e.hp=0;e.hit=.3;burst(e.x,e.y,'#fff3a6',10);if(e.hp<=0)defeatEnemyAt(i,e);}
    announce('✨ 동부센트레빌 정화! · 일반 적 즉사 · 강적 체력 30% 감소','#fff07a',3.2);beep(1180,.45,'sine',.055);
  }
  function update(dt){
    elapsed+=dt; player.inv=Math.max(0,player.inv-dt);player.aquaInv=Math.max(0,player.aquaInv-dt);player.hp=Math.min(player.maxHp,player.hp+player.regen*dt);
    if(elapsed>=nextSanctuaryCheck){
      nextSanctuaryCheck+=60;
      if(Math.random()<.5){sanctuary={x:player.x-W/2+120+Math.random()*(W-240),y:player.y-H/2+120+Math.random()*(H-240),r:78,time:10,triggered:false};announce('✨ 동부센트레빌 등장 · 무적 + 정화 충격파','#ffe45e',2.7);burst(sanctuary.x,sanctuary.y,'#ffe879',22);beep(760,.3,'sine',.04);}
    }
    if(sanctuary){sanctuary.time-=dt;if(sanctuary.time<=0)sanctuary=null;}
    const inSanctuary=sanctuary&&Math.hypot(player.x-sanctuary.x,player.y-sanctuary.y)<=sanctuary.r-player.r*.2;
    if(inSanctuary&&!sanctuary.triggered){sanctuary.triggered=true;centervilleBlast();}
    if(elapsed>=nextHarlemCheck){nextHarlemCheck+=60;if(Math.random()<.2){harlem={x:player.x-W/2+110+Math.random()*(W-220),y:player.y-H/2+110+Math.random()*(H-220),r:82,time:3};announce('⚠️ 할램 발생 · 이동속도 25% 감소','#ff8dc7',2.2);}}
    if(harlem){harlem.time-=dt;if(harlem.time<=0)harlem=null;}
    const inHarlem=harlem&&Math.hypot(player.x-harlem.x,player.y-harlem.y)<=harlem.r;
    while(nextBossStage<=10&&elapsed>=nextBossTime){spawnBoss(nextBossStage);nextBossStage++;nextBossTime+=180;}
    const livingBoss=enemies.find(e=>e.type==='boss');if(livingBoss){dangerBeat-=dt;if(dangerBeat<=0){beep(livingBoss.hp/livingBoss.maxHp<.5?68:58,.11,'sawtooth',.018);dangerBeat=livingBoss.hp/livingBoss.maxHp<.5?.55:.9;}}else dangerBeat=0;
    let dx=(keys.has('ArrowRight')||keys.has('d')?1:0)-(keys.has('ArrowLeft')||keys.has('a')?1:0), dy=(keys.has('ArrowDown')||keys.has('s')?1:0)-(keys.has('ArrowUp')||keys.has('w')?1:0);
    if(touch&&touchOrigin){dx=touch.x-touchOrigin.x;dy=touch.y-touchOrigin.y;const l=Math.hypot(dx,dy);if(l<10){dx=dy=0}else{dx/=l;dy/=l;}}
    const len=Math.hypot(dx,dy)||1,speedFactor=inHarlem?.75:1; player.x+=dx/len*player.speed*speedFactor*dt;player.y+=dy/len*player.speed*speedFactor*dt;
    spawnTimer-=dt; const spawnGap=Math.max(.16,.85-elapsed*.007); if(spawnTimer<=0&&enemies.length<180){spawnEnemy();spawnTimer=spawnGap; if(elapsed>45&&Math.random()<.3&&enemies.length<180)spawnEnemy();}
    shootTimer-=dt;if(shootTimer<=0){shoot();shootTimer=player.fireRate;}
    for(const s of shots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;}
    for(const e of enemies){const a=Math.atan2(player.y-e.y,player.x-e.x),distance=Math.hypot(e.x-player.x,e.y-player.y),bossBoost=e.type==='boss'?(distance>W*.65?1.38:1)*(e.hp/e.maxHp<.5?1.18:1):1;e.x+=Math.cos(a)*e.speed*bossBoost*dt;e.y+=Math.sin(a)*e.speed*bossBoost*dt;e.hit=Math.max(0,e.hit-dt);if(distance<e.r+player.r&&player.inv<=0){if(!inSanctuary&&player.aquaInv<=0){player.hp-=(e.type==='boss'?26:14)*(1-player.armor);player.inv=.65;burst(player.x,player.y,'#ff8f78',12);beep(110,.15,'sawtooth',.04);}else{player.inv=.16;burst(player.x,player.y,'#ffe879',4);}}}
    for(let si=shots.length-1;si>=0;si--){const s=shots[si];for(let ei=enemies.length-1;ei>=0;ei--){const e=enemies[ei];if(Math.hypot(s.x-e.x,s.y-e.y)<s.r+e.r){const splash=s.splashRadius;e.hp-=s.damage;e.hit=.09;for(const other of enemies){if(other!==e&&Math.hypot(other.x-s.x,other.y-s.y)<=splash){other.hp-=s.damage*s.splashFactor;other.hit=.09;}}shots.splice(si,1);waves.push({x:s.x,y:s.y,max:splash,life:.3,total:.3,color:player.character==='frog'?'#c9f7ff':'#ffe27a'});burst(s.x,s.y,player.character==='frog'?'#a9eefa':'#ffe27a',14);for(let k=enemies.length-1;k>=0;k--)if(enemies[k].hp<=0)defeatEnemyAt(k,enemies[k]);break;}}}
    for(let i=gems.length-1;i>=0;i--){const g=gems[i],d=Math.hypot(g.x-player.x,g.y-player.y);if(d<player.magnet){const a=Math.atan2(player.y-g.y,player.x-g.x),sp=220+(player.magnet-d)*3;g.x+=Math.cos(a)*sp*dt;g.y+=Math.sin(a)*sp*dt;}if(d<player.r+8){xp+=g.value;gems.splice(i,1);beep(820,.04,'sine',.018);if(xp>=xpNeed){xp-=xpNeed;level++;xpNeed=Math.ceil(8+level*4.5+Math.pow(level,1.25));showLevelUp();break;}}}
    for(let i=items.length-1;i>=0;i--){const it=items[i];it.life-=dt;if(Math.hypot(it.x-player.x,it.y-player.y)<it.r+player.r){if(it.type==='aqua'){player.aquaInv=10;announce('👟 아쿠아 슈즈 · 10초 무적 + 공격 파동 강화!','#75eaff',3);aquaBlast();beep(1050,.3,'sine',.045);}else{player.damage*=1.06;player.splashRadius+=5;player.splashFactor+=.02;announce('✨ 파워 씨앗 · 공격력 +6% · 폭발 범위 강화!','#ffe56b',3);burst(it.x,it.y,'#ffe56b',18);beep(920,.25,'triangle',.04);}items.splice(i,1);}else if(it.life<=0)items.splice(i,1);}
    for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;p.life-=dt;}
    for(const w of waves)w.life-=dt;waves=waves.filter(w=>w.life>0);
    for(const n of notices)n.life-=dt;notices=notices.filter(n=>n.life>0);
    shots=shots.filter(s=>s.life>0);particles=particles.filter(p=>p.life>0);enemies=enemies.filter(e=>e.type==='boss'||Math.hypot(e.x-player.x,e.y-player.y)<1900);
    if(player.hp<=0)endGame();
  }
  function showLevelUp(){state='levelup';choicesEl.innerHTML='';let pool=upgrades.filter(u=>u.rank<u.max&&(!u.unlock||u.unlock()));if(!pool.length)pool=[{id:'fallback',icon:'🍀',title:'끝없는 성장',desc:'공격력 +8%, 체력 20 회복',max:999,rank:0,category:'보너스',apply:()=>{player.damage*=1.08;player.hp=Math.min(player.maxHp,player.hp+20);}}];const picks=[...pool].sort(()=>Math.random()-.5).slice(0,3);for(const u of picks){const b=document.createElement('button');b.className='upgrade';b.dataset.category=u.category;b.innerHTML=`<span class="icon">${u.icon}</span><strong>${u.title}</strong><small>${u.category} · ${u.id==='fallback'?'반복 가능':`단계 ${u.rank+1}/${u.max}`}<br>${u.desc}</small>`;b.onclick=()=>{u.apply();if(u.id!=='fallback')u.rank++;levelPanel.classList.add('hidden');state='playing';last=performance.now();beep(u.category==='진화'?1200:980,.18,'sine',.04);requestAnimationFrame(loop);};choicesEl.appendChild(b);}levelPanel.classList.remove('hidden');}
  function endGame(){state='over';finalStats.innerHTML=`${player.name} · <strong>${formatTime(elapsed)}</strong> 생존 · <strong>${kills}</strong>마리 처치 · 레벨 <strong>${level}</strong>`;gameOverPanel.classList.remove('hidden');beep(150,.5,'triangle',.05);}
  function winGame(){state='victory';document.querySelector('#victoryStats').innerHTML=`<strong>당신은 생존하였습니다.</strong><br>보상으로 종아리 마사지 쿠폰을 받아가세요.<br><small>${player.name} · 최종 보스 CM 격파 · ${formatTime(elapsed)} · ${kills}마리 처치 · 레벨 ${level}</small>`;document.querySelector('#victoryPanel').classList.remove('hidden');beep(1040,.8,'sine',.06);}
  function formatTime(t){const m=Math.floor(t/60),s=Math.floor(t%60);return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}
  function screenX(x){return x-player.x+W/2;}
  function screenY(y){return y-player.y+H/2;}
  function worldHash(x,y){const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);}
  function lily(x,y,r){ctx.fillStyle='#4d9e68';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.lineTo(x,y);ctx.arc(x,y,r,Math.PI*1.7,Math.PI*2);ctx.fill();}
  function drawBg(){
    const forest=player.character==='badger',spacing=175,startX=Math.floor((player.x-W/2)/spacing)*spacing,startY=Math.floor((player.y-H/2)/spacing)*spacing;
    ctx.fillStyle=forest?'#b9dfa1':'#8edcf0';ctx.fillRect(0,0,W,H);
    for(let wx=startX;wx<player.x+W/2+spacing;wx+=spacing)for(let wy=startY;wy<player.y+H/2+spacing;wy+=spacing){const h=worldHash(wx,wy),x=screenX(wx+(h-.5)*80),y=screenY(wy+(worldHash(wy,wx)-.5)*80);if(h<=.28)continue;if(forest){ctx.globalAlpha=.22;ctx.fillStyle=h>.7?'#347c43':'#62a958';ctx.beginPath();ctx.arc(x,y,24+Math.floor(h*3)*8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#275f39';ctx.fillRect(x-3,y+18,6,18);ctx.globalAlpha=1;}else{ctx.globalAlpha=.45;lily(x,y,15+Math.floor(h*3)*6);ctx.globalAlpha=1;}}
    if(!forest){ctx.strokeStyle='#d8f7ff66';ctx.lineWidth=3;for(let wx=startX;wx<player.x+W/2+spacing*2;wx+=spacing*2)for(let wy=startY;wy<player.y+H/2+spacing*2;wy+=spacing*2){const phase=worldHash(wx+9,wy+4)*80;ctx.beginPath();ctx.arc(screenX(wx),screenY(wy),25+((elapsed*13+phase)%75),0,Math.PI*2);ctx.stroke();}}
    else{ctx.globalAlpha=.18;ctx.strokeStyle='#4f8b49';ctx.lineWidth=2;for(let i=-2;i<9;i++){ctx.beginPath();ctx.moveTo(0,(i*95-screenY(0)%95+H)%H);ctx.lineTo(W,(i*95-screenY(0)%95+H)%H+55);ctx.stroke();}ctx.globalAlpha=1;}
  }
  function drawFrog(){const p=player;ctx.save();ctx.translate(W/2,H/2);if(p.inv>0&&Math.floor(p.inv*15)%2)ctx.globalAlpha=.35;ctx.fillStyle='#315b39';ctx.beginPath();ctx.ellipse(-16,17,13,8,-.3,0,Math.PI*2);ctx.ellipse(16,17,13,8,.3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#76d35f';ctx.beginPath();ctx.arc(0,2,p.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#95e878';ctx.beginPath();ctx.arc(-13,-13,11,0,Math.PI*2);ctx.arc(13,-13,11,0,Math.PI*2);ctx.fill();ctx.fillStyle='#173f35';ctx.beginPath();ctx.arc(-13,-14,4,0,Math.PI*2);ctx.arc(13,-14,4,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#245a35';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,4,8,.15,Math.PI-.15);ctx.stroke();ctx.fillStyle='#f39a9c';ctx.beginPath();ctx.ellipse(0,11,5,3,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  function drawBadger(){const p=player;ctx.save();ctx.translate(W/2,H/2);if(p.inv>0&&Math.floor(p.inv*15)%2)ctx.globalAlpha=.35;ctx.fillStyle='#3a3738';ctx.beginPath();ctx.ellipse(0,3,p.r,p.r*.9,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ece7d8';ctx.beginPath();ctx.ellipse(0,-2,14,21,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#2b292a';ctx.beginPath();ctx.moveTo(-15,-16);ctx.lineTo(-24,-28);ctx.lineTo(-6,-21);ctx.moveTo(15,-16);ctx.lineTo(24,-28);ctx.lineTo(6,-21);ctx.fill();ctx.beginPath();ctx.ellipse(-8,-6,5,9,-.35,0,Math.PI*2);ctx.ellipse(8,-6,5,9,.35,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-8,-8,2,0,Math.PI*2);ctx.arc(8,-8,2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#282425';ctx.beginPath();ctx.ellipse(0,7,5,4,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  function drawSanctuary(){if(!sanctuary)return;const x=screenX(sanctuary.x),y=screenY(sanctuary.y),pulse=3+Math.sin(elapsed*7)*3;ctx.save();ctx.globalAlpha=.2;ctx.fillStyle='#fff3a6';ctx.beginPath();ctx.arc(x,y,sanctuary.r+pulse,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.9;ctx.strokeStyle='#ffe45e';ctx.lineWidth=5;ctx.setLineDash([12,8]);ctx.lineDashOffset=-elapsed*25;ctx.beginPath();ctx.arc(x,y,sanctuary.r,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.textAlign='center';ctx.font='900 17px system-ui';ctx.fillStyle='#4b3d16';ctx.fillText('동부센트레빌',x,y-12);ctx.font='bold 13px system-ui';ctx.fillText(`무적 ${sanctuary.time.toFixed(1)}초`,x,y+8);ctx.fillText(sanctuary.triggered?'정화 사용 완료':'진입 시 정화 충격파',x,y+27);ctx.restore();}
  function drawHarlem(){if(!harlem)return;const x=screenX(harlem.x),y=screenY(harlem.y);ctx.save();ctx.globalAlpha=.28;ctx.fillStyle='#8b276b';ctx.beginPath();ctx.arc(x,y,harlem.r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.95;ctx.strokeStyle='#ff72bd';ctx.lineWidth=5;ctx.setLineDash([5,8]);ctx.lineDashOffset=elapsed*35;ctx.beginPath();ctx.arc(x,y,harlem.r,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='900 18px system-ui';ctx.fillText('할램',x,y-6);ctx.font='bold 13px system-ui';ctx.fillText(`이동속도 -25% · ${harlem.time.toFixed(1)}초`,x,y+17);ctx.restore();}
  function drawEnemy(e){
    ctx.save();ctx.translate(screenX(e.x),screenY(e.y));const boss=e.type==='boss',tough=e.type==='beetle';
    if(boss){const pulse=8+Math.sin(elapsed*6)*6,rage=e.hp/e.maxHp<.5;ctx.globalAlpha=.18;ctx.fillStyle=rage?'#ff304f':'#ff9c3b';ctx.beginPath();ctx.arc(0,0,e.r+pulse+22,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.85;ctx.strokeStyle=rage?'#ff304f':'#ffe45e';ctx.lineWidth=rage?8:5;ctx.beginPath();ctx.arc(0,0,e.r+pulse,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;ctx.shadowColor=rage?'#ff304f':'#ffb43b';ctx.shadowBlur=rage?28:18;}
    if(player.character==='frog'){
      const petals=boss?10:tough?8:6;ctx.rotate(elapsed*.35*(boss?-1:1));for(let i=0;i<petals;i++){ctx.rotate(Math.PI*2/petals);ctx.fillStyle=e.hit?'#fff':boss?`hsl(${(e.bossStage*31+310)%360} 82% 68%)`:tough?'#df70b4':'#ffacd5';ctx.beginPath();ctx.ellipse(0,-e.r*.58,e.r*.38,e.r*.72,0,0,Math.PI*2);ctx.fill();}ctx.fillStyle=boss?'#ffdd4a':'#ffe77a';ctx.beginPath();ctx.arc(0,0,e.r*.38,0,Math.PI*2);ctx.fill();ctx.rotate(-elapsed*.35*(boss?-1:1));
    }else{
      ctx.fillStyle='#dff7ffbb';ctx.beginPath();ctx.ellipse(-e.r*.55,-e.r*.4,e.r*.55,e.r*.32,-.45,0,Math.PI*2);ctx.ellipse(e.r*.55,-e.r*.4,e.r*.55,e.r*.32,.45,0,Math.PI*2);ctx.fill();ctx.fillStyle=e.hit?'#fff':boss?'#ff9e31':'#ffd43f';ctx.beginPath();ctx.ellipse(0,0,e.r,e.r*.72,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#322c21';ctx.lineWidth=boss?7:4;for(let x=-e.r*.45;x<=e.r*.45;x+=e.r*.45){ctx.beginPath();ctx.moveTo(x,-e.r*.62);ctx.lineTo(x,e.r*.62);ctx.stroke();}ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-e.r*.35,-4,boss?7:4,0,Math.PI*2);ctx.arc(e.r*.35,-4,boss?7:4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#28231d';ctx.beginPath();ctx.arc(-e.r*.32,-3,boss?3:2,0,Math.PI*2);ctx.arc(e.r*.32,-3,boss?3:2,0,Math.PI*2);ctx.fill();
    }
    if(boss){ctx.textAlign='center';ctx.font='900 15px system-ui';ctx.strokeStyle='#102e2b';ctx.lineWidth=4;ctx.strokeText(`${e.bossStage}차 · ${e.name}`,0,-e.r-18);ctx.fillStyle='#fff6d6';ctx.fillText(`${e.bossStage}차 · ${e.name}`,0,-e.r-18);}ctx.restore();
  }
  function drawBossIndicators(){for(const e of enemies){if(e.type!=='boss')continue;const sx=screenX(e.x),sy=screenY(e.y);if(sx>-e.r&&sx<W+e.r&&sy>-e.r&&sy<H+e.r)continue;const angle=Math.atan2(sy-H/2,sx-W/2),x=Math.max(52,Math.min(W-52,W/2+Math.cos(angle)*(W/2-48))),y=Math.max(120,Math.min(H-62,H/2+Math.sin(angle)*(H/2-52)));ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle=e.hp/e.maxHp<.5?'#ff304f':'#ffb13b';ctx.strokeStyle='#381b20';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(22,0);ctx.lineTo(-14,-15);ctx.lineTo(-14,15);ctx.closePath();ctx.fill();ctx.stroke();ctx.rotate(-angle);ctx.textAlign='center';ctx.font='900 13px system-ui';ctx.lineWidth=4;ctx.strokeStyle='#102e2b';ctx.strokeText(e.name,0,34);ctx.fillStyle='#fff';ctx.fillText(e.name,0,34);ctx.restore();}}
  function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
  function drawHud(){
    const narrow=W<620,margin=14,top=12,healthW=narrow?W-margin*2:Math.min(300,W*.32),barX=narrow?58:70,barW=healthW-(barX-margin)-12;
    ctx.fillStyle='#103d35e8';roundRect(margin,top,healthW,40,12);ctx.fillStyle='#582e38';roundRect(barX,top+12,barW,16,8);ctx.fillStyle='#ef6f6c';roundRect(barX,top+12,barW*Math.max(0,player.hp/player.maxHp),16,8);ctx.font='bold 13px system-ui';ctx.fillStyle='#fff6d6';ctx.fillText('💚',margin+13,top+27);ctx.textAlign='center';ctx.fillText(`${Math.ceil(player.hp)} / ${player.maxHp}`,barX+barW/2,top+25);
    if(!narrow){ctx.fillStyle='#103d35e8';roundRect(W/2-78,top,156,40,12);ctx.font='900 21px system-ui';ctx.fillStyle='#fff6d6';ctx.fillText(formatTime(elapsed),W/2,top+27);ctx.fillStyle='#103d35e8';roundRect(W-190,top,176,40,12);ctx.font='bold 14px system-ui';ctx.fillStyle='#fff6d6';ctx.fillText(`Lv.${level}   🐛 ${kills}`,W-102,top+26);}else{ctx.font='900 17px system-ui';ctx.fillStyle='#fff6d6';ctx.fillText(formatTime(elapsed),W/2,top+62);ctx.font='bold 12px system-ui';ctx.fillText(`Lv.${level} · 🐛 ${kills}`,W/2,top+79);}
    const activeBoss=enemies.find(e=>e.type==='boss'),bossY=narrow?top+91:62,bossW=Math.min(W-28,480);if(activeBoss){ctx.fillStyle='#291b26e8';roundRect(W/2-bossW/2,bossY,bossW,35,10);ctx.fillStyle='#6b253e';roundRect(W/2-bossW/2+12,bossY+20,bossW-24,9,5);ctx.fillStyle='#ff626f';roundRect(W/2-bossW/2+12,bossY+20,(bossW-24)*Math.max(0,activeBoss.hp/activeBoss.maxHp),9,5);ctx.font='900 13px system-ui';ctx.fillStyle='#fff6d6';ctx.fillText(`${activeBoss.bossStage}차 보스 · ${activeBoss.name}`,W/2,bossY+15);}else if(sanctuary&&Math.hypot(player.x-sanctuary.x,player.y-sanctuary.y)<=sanctuary.r-player.r*.2){ctx.font='900 16px system-ui';ctx.fillStyle='#ffe45e';ctx.fillText('🛡️ 동부센트레빌 무적',W/2,bossY+18);}
    const xpX=margin,xpY=H-24,xpW=W-margin*2;ctx.fillStyle='#103d35e8';roundRect(xpX,xpY,xpW,14,7);ctx.fillStyle='#d3f269';roundRect(xpX,xpY,xpW*Math.min(1,xp/xpNeed),14,7);ctx.font='bold 10px system-ui';ctx.fillStyle='#fff';ctx.fillText(`${xp} / ${xpNeed} XP`,W/2,xpY+11);if(player.aquaInv>0){ctx.font='900 15px system-ui';ctx.fillStyle='#75eaff';ctx.fillText(`👟 무적 ${player.aquaInv.toFixed(1)}초`,W/2,H-36);}ctx.textAlign='left';
  }
  function drawMobileJoystick(){if(!touch||!touchOrigin||!matchMedia('(pointer:coarse)').matches)return;const dx=touch.x-touchOrigin.x,dy=touch.y-touchOrigin.y,len=Math.hypot(dx,dy),scale=len>42?42/len:1;ctx.save();ctx.globalAlpha=.42;ctx.fillStyle='#092a25';ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(touchOrigin.x,touchOrigin.y,48,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.globalAlpha=.7;ctx.fillStyle='#d9f96f';ctx.beginPath();ctx.arc(touchOrigin.x+dx*scale,touchOrigin.y+dy*scale,22,0,Math.PI*2);ctx.fill();ctx.restore();}
  function drawNotices(){ctx.save();ctx.textAlign='center';for(let i=0;i<notices.length;i++){const n=notices[i],fade=Math.min(1,n.life*2,(n.max-n.life)*3),fontSize=Math.max(15,Math.min(29,W/(Math.max(8,n.text.length)*.62)));ctx.globalAlpha=fade;ctx.font=`1000 ${fontSize}px system-ui`;ctx.lineWidth=fontSize>22?7:4;ctx.strokeStyle='#102e2b';ctx.strokeText(n.text,W/2,145+i*(fontSize+9));ctx.fillStyle=n.color;ctx.fillText(n.text,W/2,145+i*(fontSize+9));}ctx.restore();}
  function draw(){drawBg();drawSanctuary();drawHarlem();for(const g of gems){ctx.fillStyle='#e8fa6e';ctx.save();ctx.translate(screenX(g.x),screenY(g.y));ctx.rotate(Math.PI/4);ctx.fillRect(-g.r,-g.r,g.r*2,g.r*2);ctx.restore();}for(const it of items){const aqua=it.type==='aqua';ctx.save();ctx.translate(screenX(it.x),screenY(it.y));ctx.shadowColor=aqua?'#75eaff':'#ffe56b';ctx.shadowBlur=16;ctx.font='28px system-ui';ctx.textAlign='center';ctx.fillText(aqua?'👟':'✨',0,9);ctx.shadowBlur=0;ctx.font='900 11px system-ui';ctx.fillStyle=aqua?'#e5fcff':'#fff4ad';ctx.fillText(aqua?'아쿠아 슈즈':'파워 씨앗',0,25);ctx.restore();}for(const s of shots){ctx.fillStyle=s.crit?'#fff27a':player.character==='frog'?'#d9fbff':'#ffe27a';ctx.strokeStyle=s.crit?'#ff784e':player.character==='frog'?'#5cb5d1':'#b98524';ctx.lineWidth=s.crit?4:2;ctx.beginPath();ctx.arc(screenX(s.x),screenY(s.y),s.r*(s.crit?1.2:1),0,Math.PI*2);ctx.fill();ctx.stroke();}for(const e of enemies)drawEnemy(e);if(player.character==='badger')drawBadger();else drawFrog();drawBossIndicators();for(const w of waves){ctx.globalAlpha=Math.max(0,w.life/w.total);ctx.strokeStyle=w.color;ctx.lineWidth=6;ctx.beginPath();ctx.arc(screenX(w.x),screenY(w.y),w.max*(1-w.life/w.total),0,Math.PI*2);ctx.stroke();}for(const p of particles){ctx.globalAlpha=Math.max(0,p.life*2);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(screenX(p.x),screenY(p.y),p.r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;drawMobileJoystick();if(player)drawHud();drawNotices();}
  function loop(now){if(state!=='playing')return;const dt=Math.min(.033,(now-last)/1000||0);last=now;update(dt);draw();if(state==='playing')requestAnimationFrame(loop);}
  function pointerPos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};}
  function fitGameToViewport(){
    const vv=window.visualViewport,vw=Math.floor(vv?.width||window.innerWidth),vh=Math.floor(vv?.height||window.innerHeight),shell=document.querySelector('.game-shell'),wrap=document.querySelector('.canvas-wrap'),header=document.querySelector('header'),footer=document.querySelector('footer'),coarse=matchMedia('(pointer:coarse)').matches;
    document.body.classList.toggle('viewport-compact',coarse&&vh<430);
    document.body.style.height=`${vh}px`;document.body.style.minHeight='0';
    const bodyStyle=getComputedStyle(document.body),safeX=(parseFloat(bodyStyle.paddingLeft)||0)+(parseFloat(bodyStyle.paddingRight)||0),safeY=(parseFloat(bodyStyle.paddingTop)||0)+(parseFloat(bodyStyle.paddingBottom)||0),active=document.body.classList.contains('game-active'),headerH=header.getBoundingClientRect().height,footerH=coarse?0:footer.getBoundingClientRect().height,safeGap=active?0:coarse?6:18,maxW=Math.max(220,vw-safeX-safeGap),maxH=Math.max(150,vh-safeY-headerH-footerH-safeGap);
    let gameW=Math.floor(active?maxW:Math.min(maxW,1100)),gameH=Math.floor(active?maxH:Math.min(maxH,gameW/1.6));if(!active&&gameH<gameW/1.6)gameW=Math.floor(gameH*1.6);
    shell.style.width=`${gameW}px`;wrap.style.width=`${gameW}px`;wrap.style.height=`${gameH}px`;
    const logicalH=600,logicalW=Math.max(240,Math.round(logicalH*gameW/gameH));if(canvas.width!==logicalW||canvas.height!==logicalH){canvas.width=logicalW;canvas.height=logicalH;W=logicalW;H=logicalH;}
    if(player)draw();
  }
  addEventListener('keydown',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(k)){e.preventDefault();keys.add(k);}});
  addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
  canvas.addEventListener('pointerdown',e=>{touch=pointerPos(e);touchOrigin={...touch};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(touch)touch=pointerPos(e);});canvas.addEventListener('pointerup',()=>{touch=null;touchOrigin=null;});canvas.addEventListener('pointercancel',()=>{touch=null;touchOrigin=null;});
  document.querySelector('#startBtn').onclick=reset;document.querySelector('#restartBtn').onclick=reset;document.querySelector('#victoryRestartBtn').onclick=reset;
  document.querySelectorAll('.character').forEach(btn=>btn.onclick=()=>{selectedCharacter=btn.dataset.character;document.querySelectorAll('.character').forEach(b=>b.classList.toggle('active',b===btn));document.querySelector('.mascot').textContent=selectedCharacter==='badger'?'🦡':'🐸';const mission=missions[selectedCharacter],box=document.querySelector('#missionBox');box.innerHTML=`<strong>${mission.title}</strong><p>${mission.text}</p>`;beep(520,.06,'sine',.02);});
  soundBtn.onclick=()=>{audioOn=!audioOn;soundBtn.textContent=audioOn?'🔊':'🔇';if(audioOn)initAudio();};
  addEventListener('resize',fitGameToViewport);addEventListener('orientationchange',()=>{fitGameToViewport();setTimeout(fitGameToViewport,250);setTimeout(fitGameToViewport,700);});if(window.visualViewport){window.visualViewport.addEventListener('resize',fitGameToViewport);window.visualViewport.addEventListener('scroll',fitGameToViewport);}
  player={x:0,y:0,r:22,hp:100,maxHp:100,character:'frog'};fitGameToViewport();drawBg();drawFrog();
})();
