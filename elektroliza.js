/* ── CONSTANTS & DATA ── */
  /*
    NAPOMENA: Donji katalog modela elektrolize je PRIMJER/PLACEHOLDER
    (model, naziv, proizvodnja u g/h, link u webshop) jer u zadanim
    materijalima nije bio priložen stvarni Aquachem katalog uređaja
    za elektrolizu. Zamijenite niz "aquachemElectrolysisModels" i
    objekt "productUrls" stvarnim podacima kada budu dostupni.
  */
  const aquachemElectrolysisModels = [
    {model:'AQE-10', naziv:'Aquachem Salt 10',  snaga:10},
    {model:'AQE-15', naziv:'Aquachem Salt 15',  snaga:15},
    {model:'AQE-20', naziv:'Aquachem Salt 20',  snaga:20},
    {model:'AQE-25', naziv:'Aquachem Salt 25',  snaga:25},
    {model:'AQE-30', naziv:'Aquachem Salt 30',  snaga:30},
    {model:'AQE-40', naziv:'Aquachem Salt 40',  snaga:40},
    {model:'AQE-50', naziv:'Aquachem Salt 50',  snaga:50},
    {model:'AQE-60', naziv:'Aquachem Salt 60',  snaga:60},
    {model:'AQE-80', naziv:'Aquachem Salt 80',  snaga:80},
    {model:'AQE-100',naziv:'Aquachem Salt 100', snaga:100},
  ];
  const productUrls = {
    // 'AQE-10': 'https://webshop.aquachem.hr/proizvod/...'  ← popuniti stvarnim linkovima
  };

  /* Faktori prema priloženim formulama */
  /* f_pH za 7,0 / 7,2 / 7,4 / 7,8 su izravno iz priloženih materijala.
     Vrijednosti za 7,1 / 7,3 / 7,5 / 7,6 / 7,7 su linearno interpolirane
     između najbližih poznatih točaka (proporcionalan pad). */
  const phFactorMap = {
    '7.0': 0.750,
    '7.1': 0.705,
    '7.2': 0.660,
    '7.3': 0.580,
    '7.4': 0.500,
    '7.5': 0.4575,
    '7.6': 0.415,
    '7.7': 0.3725,
    '7.8': 0.330,
  };
  const loadFactorMap = {nisko:0.4, srednje:0.5, visoko:0.7, vrlovisoko:1.1};
  const loadLabelMap  = {nisko:'Nisko', srednje:'Srednje', visoko:'Visoko', vrlovisoko:'Vrlo visoko'};
  const uvFactorMap   = {nisko:1.00, srednje:1.10, visoko:1.30};
  const uvLabelMap    = {nisko:'Nisko UV', srednje:'Srednje UV', visoko:'Visoko UV'};

  function tempFactor(t){
    if(t<=28) return 1.00;
    if(t<=30) return 1.10;
    if(t<=34) return 1.25;
    return 1.40;
  }
  function tempFactorLabel(t){
    if(t<=28) return '≤ 28 °C → f_t = 1.00';
    if(t<=30) return '28 – 30 °C → f_t = 1.10';
    if(t<=34) return '31 – 34 °C → f_t = 1.25';
    return '> 34 °C → f_t = 1.40';
  }

  const $=id=>document.getElementById(id);
  const num=id=>parseFloat($(id).value)||0;
  const val=id=>$(id).value.trim();
  const fmt=(v,d=2)=>new Intl.NumberFormat('hr-HR',{minimumFractionDigits:d,maximumFractionDigits:d}).format(v);

  /* ── LIVE FACTOR CHIPS ── */
  function updateFactorChips(){
    const fo = loadFactorMap[val('opterecenjeBazena')] ?? 0.5;
    const fpH = phFactorMap[val('phVode')] ?? 0.66;
    const t = num('temperaturaVode');
    const ft = tempFactor(t);
    const fuv = uvFactorMap[val('izlozenostSuncu')] ?? 1.0;
    $('chipFo').textContent = fmt(fo,2);
    $('chipFpH').textContent = fmt(fpH,2);
    $('chipFt').textContent = fmt(ft,2);
    $('chipFuv').textContent = fmt(fuv,2);
    $('faktorTemperature').value = fmt(ft,2);
    $('infoTemperatura').textContent = '≤28°C → 1.00 · 28–30°C → 1.10 · 31–34°C → 1.25 · >34°C → 1.40  ·  Trenutno: ' + tempFactorLabel(t);
  }

  /* ── STATUS ── */
  function setStatus(text, badge='Gotovo'){
    const el = $('statusBadge');
    if(!el) return;
    el.textContent = badge;
    el.className = 'badge';
    if(badge==='Gotovo'||badge==='Spremno') el.classList.add('ok');
    else if(badge==='Greška'||badge==='Fallback') el.classList.add('error');
    else el.classList.add('warn');
    if(badge==='Greška'){
      // surface error message near the actions area via badge title
      el.title = text;
    }
  }

  /* ── BLINK VALIDATION ── */
  function oznaciPraznaPolja(){
    let prazno=false;
    document.querySelectorAll('input:not([readonly]):not([type="hidden"]), select').forEach(el=>{
      if(el.offsetParent===null) return;
      if(!el.value||el.value.trim()===''){
        el.classList.add('blink');
        prazno=true;
        setTimeout(()=>{ el.classList.remove('blink'); },2000);
      }
    });
    return prazno;
  }

  /* ── RENDER ROWS ── */
  function renderRows(rows){ document.querySelector('#rezultatTablica tbody').innerHTML=rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join(''); }

  /* ── CHOOSE ELECTROLYSIS UNIT ── */
  function chooseElectrolysisUnit(requiredGh){
    const models=aquachemElectrolysisModels;
    const single=models.find(m=>m.snaga>=requiredGh);
    if(single) return {type:'single',units:[single],totalOutput:single.snaga};
    let bestCombo=null;
    for(let i=0;i<models.length;i++){
      for(let j=i;j<models.length;j++){
        const sum=models[i].snaga+models[j].snaga;
        if(sum>=requiredGh){
          if(!bestCombo||sum<bestCombo.totalOutput){
            bestCombo={type:'double',units:[models[i],models[j]],totalOutput:sum};
          }
        }
      }
    }
    return bestCombo;
  }

  /* ── RENDER CATALOG ── */
  function renderCatalog(requiredGh, selected){
    if(!selected){
      $('catalogBody').innerHTML = '<div style="padding:20px 8px;text-align:center;font-size:13px;color:var(--muted);">Pokrenite izračun za preporuku modela.</div>';
      return;
    }
    $('catalogBody').innerHTML = selected.units.map(m=>{
      const url = productUrls[m.model];
      const btnHtml = url
        ? `<a href="${url}" target="_blank" rel="noopener" style="
            display:inline-flex; align-items:center; gap:6px;
            background:#fff; color:#1D1D1F; text-decoration:none;
            font-size:12px; font-weight:700; padding:6px 12px;
            border-radius:999px; margin-top:10px; transition:opacity .15s;
            white-space:nowrap;"
            onmouseover="this.style.opacity='.8'" onmouseout="this.style.opacity='1'">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            Pogledaj u webshop
          </a>`
        : '';
      return `<div class="catalog-row highlighted" style="display:flex;flex-direction:column;align-items:flex-start;padding:14px 12px;">
        <div style="display:grid;grid-template-columns:90px 1fr 60px 110px;width:100%;align-items:center;">
          <span class="model-id">${m.model}</span>
          <span class="model-name" style="color:rgba(255,255,255,0.7)">${m.naziv}</span>
          <span style="text-align:right;font-weight:600;">${fmt(m.snaga,0)} g/h</span>
          <span style="text-align:right;"><span class="pill ok">Preporučeno</span></span>
        </div>
        ${btnHtml}
      </div>`;
    }).join('');
  }

  /* ── IZRAČUNAJ ── */
  function izracunaj(){ try{
    if(oznaciPraznaPolja()){ setStatus('Neka polja nisu unesena!','Greška'); return; }
    const temperaturaVode=num('temperaturaVode');
    if(temperaturaVode<=0) throw new Error('Unesi temperaturu vode.');

    const volumen=num('volumenBazena');
    if(volumen<=0) throw new Error('Unesi volumen bazena.');

    const foKey=val('opterecenjeBazena');
    const fo=loadFactorMap[foKey];
    const phKey=val('phVode');
    const fpH=phFactorMap[phKey];
    const ft=tempFactor(temperaturaVode);
    const uvKey=val('izlozenostSuncu');
    const fUV=uvFactorMap[uvKey];

    const Prequired = (volumen*0.33*(fo+0.2)/fpH)*ft*fUV;

    const selected=chooseElectrolysisUnit(Prequired);

    $('mVolumen').textContent=`${fmt(volumen,1)} m³`;
    $('mRequired').textContent=`${fmt(Prequired,2)}`;
    $('mModel').textContent=selected?(selected.type==='double'?`${selected.units[0].model} + ${selected.units[1].model}`:`${selected.units[0].model}`):'Nema modela';

    $('preporuka').innerHTML=selected?(
        selected.type==='double'
          ? `Za potrebnu proizvodnju <strong>${fmt(Prequired,2)} g/h</strong> preporučuju se uređaji <strong>${selected.units[0].model} + ${selected.units[1].model}</strong> (ukupno ${fmt(selected.totalOutput,0)} g/h).`
          : `Za potrebnu proizvodnju <strong>${fmt(Prequired,2)} g/h</strong> preporučuje se uređaj <strong>${selected.units[0].model}</strong> · ${selected.units[0].naziv} (${fmt(selected.units[0].snaga,0)} g/h).`
      ):`Potrebna proizvodnja iznosi <strong>${fmt(Prequired,2)} g/h</strong>. U trenutačnom katalogu nema dovoljno snažnog modela ni u kombinaciji 2 uređaja.`;

    $('formulaBox').innerHTML=`<strong>Primijenjena formula</strong><br><br>`
      +`P = [ V<sub>b</sub> × 0,33 × (f₀ + 0,2) / f<sub>pH</sub> ] × f<sub>t</sub> × f<sub>UV</sub><br><br>`
      +`Volumen bazena V<sub>b</sub> = <strong>${fmt(volumen,1)} m³</strong><br>`
      +`Faktor opterećenja bazena f₀ (${loadLabelMap[foKey]}) = <strong>${fmt(fo,2)} ppm/h</strong><br>`
      +`Faktor korekcije pH f<sub>pH</sub> (pH ${phKey.replace('.',',')}) = <strong>${fmt(fpH,2)}</strong><br>`
      +`Faktor temperature vode f<sub>t</sub> (${fmt(temperaturaVode,1)} °C) = <strong>${fmt(ft,2)}</strong><br>`
      +`Faktor UV zračenja f<sub>UV</sub> (${uvLabelMap[uvKey]}) = <strong>${fmt(fUV,2)}</strong><br><br>`
      +`Potrebna proizvodnja P = <strong>${fmt(Prequired,2)} g/h</strong>`;

    renderRows([
      ['Volumen bazena (V_b)',`${fmt(volumen,1)} m³`],
      ['pH vode',phKey.replace('.',',')],
      ['Faktor korekcije pH (f_pH)',`${fmt(fpH,2)}`],
      ['Opterećenje bazena',loadLabelMap[foKey]],
      ['Faktor opterećenja (f₀)',`${fmt(fo,2)} ppm/h`],
      ['Temperatura vode',`${fmt(temperaturaVode,1)} °C`],
      ['Faktor temperature (f_t)',`${fmt(ft,2)}`],
      ['Izloženost suncu / UV',uvLabelMap[uvKey]],
      ['Faktor UV zračenja (f_UV)',`${fmt(fUV,2)}`],
      ['Potrebna proizvodnja klora (P)',`${fmt(Prequired,2)} g/h`],
      ['Preporučeni model',selected?(selected.type==='double'?`${selected.units[0].model} + ${selected.units[1].model} (ukupno ${fmt(selected.totalOutput,0)} g/h)`:`${selected.units[0].model} · ${selected.units[0].naziv} (${fmt(selected.units[0].snaga,0)} g/h)`):'Nema modela u katalogu'],
    ]);

    renderCatalog(Prequired, selected);
    updateFactorChips();
    setStatus('Izračun je dovršen.','Gotovo');
  }catch(err){ setStatus(err.message||'Došlo je do pogreške.','Greška'); } }

  /* ── UČITAJ PRIMJER ── */
  function ucitajPrimjer(){
    $('volumenBazena').value=48;
    $('phVode').value='7.2';
    $('temperaturaVode').value=28;
    $('opterecenjeBazena').value='srednje';
    $('izlozenostSuncu').value='visoko';
    updateFactorChips();
    renderCatalog(null,null);
    setStatus('Učitani su primjerni podaci.','Spremno');
  }

  /* ── OČISTI SVE ── */
  function ocistiSve(){
    $('volumenBazena').value='';
    $('phVode').value='7.2';
    $('temperaturaVode').value='28';
    $('opterecenjeBazena').value='srednje';
    $('izlozenostSuncu').value='visoko';
    $('mVolumen').textContent='-'; $('mRequired').textContent='-';
    $('mModel').textContent='-'; $('preporuka').textContent='-';
    $('formulaBox').textContent='Formula će biti prikazana nakon izračuna.';
    renderRows([]);
    renderCatalog(null,null);
    updateFactorChips();
    setStatus('Polja su očišćena.','Spremno');
  }

  /* ── TOGGLE DETALJI ── */
  function toggleDetalji(){
    ['detailsNapomena','detailsTablica'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.classList.toggle('hidden');
    });
  }

  /* ── EVENT LISTENERS ── */
  $('phVode').addEventListener('change', updateFactorChips);
  $('opterecenjeBazena').addEventListener('change', updateFactorChips);
  $('izlozenostSuncu').addEventListener('change', updateFactorChips);
  $('temperaturaVode').addEventListener('input', updateFactorChips);

  /* ── INIT ── */
  updateFactorChips();
  renderCatalog(null, null);
  ucitajPrimjer();
