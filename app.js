/* BTX Docs Saúde — App completo (offline + memória forte) */
(() => {
  const $ = (id) => document.getElementById(id);

  function toast(msg){
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(()=>t.classList.remove("show"), 2600);
  }

  function esc(str){
    return String(str ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#39;");
  }

  function uid(prefix="id"){
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function isoToday(){
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const dd = String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${dd}`;
  }

  function isoToBR(iso){
    if(!iso) return "";
    const [y,m,d] = iso.split("-");
    if(!y||!m||!d) return iso;
    return `${d}/${m}/${y}`;
  }

  function brNowMeta(){
    const now = new Date();
    const dt = now.toLocaleDateString("pt-BR");
    const hr = now.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" });
    return `${dt} • ${hr}`;
  }

  function v(id){
    const el = $(id);
    return el ? el.value.trim() : "";
  }

  function line(label, value){
    if(!value) return "";
    return `<p class="docLine"><strong>${esc(label)}:</strong> ${esc(value)}</p>`;
  }

  function block(title, value){
    if(!value) return "";
    return `<div><div class="docTitle">${esc(title)}</div><div class="docBlock">${esc(value)}</div></div>`;
  }

  function ensureDate(id){
    const el = $(id);
    if(el && !el.value) el.value = isoToday();
  }

  /* =========================
     LOGIN
     ========================= */
  const LOGIN_KEY = "btx007"; // simples, minúsculo, sem traço

  async function isLogged(){
    const ok = await window.BTXDB.getSetting("logged");
    return ok === true;
  }
  async function setLogged(val){
    await window.BTXDB.setSetting("logged", !!val);
  }

  async function handleLogin(){
    const key = v("loginKey").toLowerCase();
    if(key !== LOGIN_KEY){
      alert("Chave inválida.");
      return;
    }
    await setLogged(true);
    $("loginWrap").style.display = "none";
    $("appTopbar").style.display = "";
    $("appMain").style.display = "";
    toast("Bem-vindo ✅");
    await initApp();
  }

  async function handleLogout(){
    await setLogged(false);
    location.reload();
  }

  /* =========================
     PROFISSIONAL (settings)
     ========================= */
  async function loadProf(){
    return await window.BTXDB.getSetting("prof") || null;
  }

  async function saveProf(data){
    await window.BTXDB.setSetting("prof", data);
  }

  function readProfFromUI(){
    return {
      nome: $("profNome").value.trim(),
      esp: $("profEsp").value.trim(),
      conselho: $("profConselho").value.trim(),
      reg: $("profReg").value.trim(),
      end: $("profEnd").value.trim(),
      tel: $("profTel").value.trim(),
      email: $("profEmail").value.trim(),
    };
  }

  function setProfToUI(p){
    $("profNome").value = p?.nome || "";
    $("profEsp").value = p?.esp || "";
    $("profConselho").value = p?.conselho || "";
    $("profReg").value = p?.reg || "";
    $("profEnd").value = p?.end || "";
    $("profTel").value = p?.tel || "";
    $("profEmail").value = p?.email || "";
  }

  function profResumo(p){
    const a = p?.nome || "";
    const b = p?.esp || "";
    if(a && b) return `${a} — ${b}`;
    return a || b || "—";
  }

  function profConselhoReg(p){
    const c = p?.conselho || "";
    const r = p?.reg || "";
    return `${c} ${r}`.trim();
  }

  function renderDocHeaderAndFooter(prof){
    $("pvMeta").textContent = brNowMeta();
    $("pvClinicAddr").textContent = prof?.end ? prof.end : "Endereço do profissional (preencha no lado esquerdo)";

    const lines = [];
    if(prof?.nome) lines.push(`<div class="docProfLine"><b>${esc(prof.nome)}</b></div>`);
    if(prof?.esp) lines.push(`<div class="docProfLine">${esc(prof.esp)}</div>`);
    const cr = profConselhoReg(prof);
    if(cr) lines.push(`<div class="docProfLine">${esc(cr)}</div>`);
    if(prof?.tel) lines.push(`<div class="docProfLine">Tel: ${esc(prof.tel)}</div>`);
    if(prof?.email) lines.push(`<div class="docProfLine">Email: ${esc(prof.email)}</div>`);
    $("pvProfBox").innerHTML = lines.length ? lines.join("") : `<div class="docProfLine">Preencha os dados do profissional.</div>`;

    const footerLeft = prof?.end ? esc(prof.end) : "Endereço não informado";
    const footerRight = prof?.tel || prof?.email ? `${esc(prof.tel || "")}${prof?.tel && prof?.email ? " • " : ""}${esc(prof.email || "")}` : "Contato não informado";
    $("pvFooter").innerHTML = `<div><b>BTX Docs Saúde</b> • ${footerLeft}</div><div>${footerRight}</div>`;

    // assinatura
    if(prof?.nome){
      const cr2 = profConselhoReg(prof);
      $("pvSign").innerHTML = `
        <div class="sigrow">
          <div class="sig">
            <div class="line"></div>
            <div><b>${esc(prof.nome)}</b></div>
            <div style="font-size:12px;color:#334155;">${esc(cr2)}</div>
          </div>
          <div class="sig">
            <div class="line"></div>
            <div><b>Assinatura do(a) paciente / responsável</b></div>
            <div style="font-size:12px;color:#334155;">(quando aplicável)</div>
          </div>
        </div>
      `;
    } else {
      $("pvSign").innerHTML = `<div style="font-size:12px;color:#334155;">(Preencha os dados do profissional para assinatura aparecer.)</div>`;
    }
  }

  /* =========================
     RECEITAS PRESETS (clicar e vai pro corpo + imprime só corpo)
     ========================= */
  const RX_PRESETS = {
    // Hipertensão
    losartana: "Losartana 50mg\nTomar 01 comprimido ao dia, no mesmo horário (conforme prescrição).",
    enalapril: "Enalapril 10mg\nTomar 01 comprimido ao dia (conforme prescrição).",
    anlodipino: "Anlodipino 5mg\nTomar 01 comprimido ao dia (conforme prescrição).",
    hidroclorotiazida: "Hidroclorotiazida 25mg\nTomar 01 comprimido pela manhã (conforme prescrição).",

    // Diabetes
    metformina: "Metformina 500mg\nTomar 01 comprimido 2x ao dia, junto às refeições (conforme prescrição).",
    glibenclamida: "Glibenclamida 5mg\nTomar 01 comprimido ao dia (conforme prescrição).",
    gliclazida: "Gliclazida MR 30mg\nTomar 01 comprimido ao dia (conforme prescrição).",

    // Antifúngicos / Dermato
    fluconazol: "Fluconazol 150mg\nTomar 01 cápsula dose única (ou conforme prescrição).",
    cetoconazol_creme: "Cetoconazol creme 2%\nAplicar fina camada 2x ao dia por 14 dias (conforme orientação).",
    miconazol_creme: "Miconazol creme\nAplicar fina camada 2x ao dia por 14 dias (conforme orientação).",
    cetoconazol_shampoo: "Shampoo Cetoconazol 2%\nAplicar, deixar agir 3–5 min e enxaguar; usar 2–3x/semana por 2–4 semanas.",

    // Analgésicos / antiinflamatórios simples
    dipirona: "Dipirona 500mg\nTomar 01 comprimido a cada 6–8 horas, se dor ou febre, por até 3 dias.",
    paracetamol: "Paracetamol 750mg\nTomar 01 comprimido a cada 8 horas, se dor ou febre, por até 3 dias.",
    ibuprofeno: "Ibuprofeno 400mg\nTomar 01 comprimido a cada 8 horas, após alimentação, por 3 dias."
  };

  function appendRx(key){
    const ta = $("r_corpo");
    if(!ta) return;
    const txt = RX_PRESETS[key];
    if(!txt) return;
    const cur = ta.value.trim();
    ta.value = cur ? (cur + "\n\n" + txt) : txt;
    buildPreview();
  }

  /* =========================
     AGENDA + PRONTUÁRIO
     ========================= */

  async function upsertPatient({ id=null, name, birth="", phone="", address="" }){
    const now = new Date().toISOString();
    const obj = {
      id: id || uid("pt"),
      name,
      birth,
      phone,
      address,
      updatedAt: now,
      createdAt: id ? (await window.BTXDB.get(window.BTXDB.STORES.patients, id))?.createdAt || now : now
    };
    await window.BTXDB.put(window.BTXDB.STORES.patients, obj);
    return obj;
  }

  async function listPatients(){
    const all = await window.BTXDB.getAll(window.BTXDB.STORES.patients);
    all.sort((a,b)=> (a.name||"").localeCompare(b.name||""));
    return all;
  }

  async function addAgendaItem({ date, time, patientId, patientName, type, status, obs }){
    const obj = {
      id: uid("ag"),
      date,
      time,
      patientId: patientId || null,
      patientName: patientName || "",
      type: type || "consulta",
      status: status || "aguardando",
      obs: obs || "",
      createdAt: new Date().toISOString()
    };
    await window.BTXDB.put(window.BTXDB.STORES.agenda, obj);
    return obj;
  }

  async function listAgendaBetween(fromISO, toISO){
    const all = await window.BTXDB.getAll(window.BTXDB.STORES.agenda);
    const from = new Date(fromISO+"T00:00:00");
    const to = new Date(toISO+"T23:59:59");
    return all.filter(it=>{
      const d = new Date((it.date||"") + "T12:00:00");
      return d >= from && d <= to;
    }).sort((a,b)=> ((a.date||"")+ " " + (a.time||"")).localeCompare((b.date||"")+" "+(b.time||"")));
  }

  async function addNote({ patientId, date, text, procedures="" }){
    const obj = {
      id: uid("nt"),
      patientId,
      date: date || isoToday(),
      text: text || "",
      procedures: procedures || "",
      createdAt: new Date().toISOString()
    };
    await window.BTXDB.put(window.BTXDB.STORES.notes, obj);
    return obj;
  }

  async function listNotesByPatient(patientId){
    const all = await window.BTXDB.getAllByIndex(window.BTXDB.STORES.notes, "by_patientId", patientId);
    all.sort((a,b)=> (b.date||"").localeCompare(a.date||""));
    return all;
  }

  /* =========================
     TABS
     ========================= */
  let currentTab = "agenda";

  const TABS = {
    agenda: {
      title: "Agenda semanal",
      sub: "Agenda com nome do paciente + status + observação + ligação com prontuário (tudo offline).",
      renderForm: async () => {
        const start = startOfWeekISO(new Date());
        const end = endOfWeekISO(new Date());
        const patients = await listPatients();

        return `
          <div class="row">
            <div>
              <label>Semana (início)</label>
              <input id="ag_weekStart" type="date" value="${start}">
            </div>
            <div>
              <label>Semana (fim)</label>
              <input id="ag_weekEnd" type="date" value="${end}">
            </div>
          </div>

          <div class="docTitle">Novo agendamento</div>

          <label>Data</label>
          <input id="ag_date" type="date" value="${isoToday()}">

          <div class="row">
            <div>
              <label>Hora</label>
              <input id="ag_time" type="time">
            </div>
            <div>
              <label>Paciente (selecionar)</label>
              <select id="ag_patientId">
                <option value="">— selecionar —</option>
                ${patients.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("")}
              </select>
            </div>
          </div>

          <label>Ou digitar nome (se ainda não cadastrado)</label>
          <input id="ag_patientName" placeholder="Nome do paciente">

          <div class="row">
            <div>
              <label>Tipo</label>
              <select id="ag_type">
                <option value="consulta">consulta</option>
                <option value="retorno">retorno</option>
                <option value="procedimento">procedimento</option>
                <option value="avaliacao">avaliação</option>
              </select>
            </div>
            <div>
              <label>Status</label>
              <select id="ag_status">
                <option value="aguardando">aguardando</option>
                <option value="confirmado">confirmado</option>
                <option value="remarcado">remarcado</option>
                <option value="faltou">faltou</option>
                <option value="concluido">concluído</option>
              </select>
            </div>
          </div>

          <label>Observação</label>
          <input id="ag_obs" placeholder="Ex.: retorno pós-op, dor, etc.">

          <div class="actionsLeft">
            <button class="btn btnPrimary" type="button" id="btnAgSave">Salvar</button>
            <button class="btn btnGhost" type="button" id="btnAgLoadWeek">Carregar semana</button>
          </div>

          <div class="docTitle">Cadastro rápido de paciente</div>
          <label>Nome</label>
          <input id="pt_name" placeholder="Nome completo">
          <div class="row">
            <div>
              <label>Nascimento</label>
              <input id="pt_birth" type="date">
            </div>
            <div>
              <label>Telefone</label>
              <input id="pt_phone" placeholder="(00) 00000-0000">
            </div>
          </div>
          <label>Endereço</label>
          <input id="pt_address" placeholder="Rua, nº, bairro, cidade - UF">

          <div class="actionsLeft">
            <button class="btn btnGhost" type="button" id="btnPtQuick">Salvar paciente</button>
          </div>

          <p class="small" style="margin-top:10px;">
            Dica: carregue a semana para imprimir em PDF (fica perfeito pro balcão).
          </p>
        `;
      },
      build: async () => {
        const start = v("ag_weekStart") || startOfWeekISO(new Date());
        const end = v("ag_weekEnd") || endOfWeekISO(new Date());
        const list = await listAgendaBetween(start, end);

        return `
          <div class="docTitle">Agenda semanal (${esc(isoToBR(start))} → ${esc(isoToBR(end))})</div>
          ${agendaTableHTML(list)}
        `;
      },
      afterRender: async () => {
        // listeners
        $("btnAgSave").onclick = async () => {
          const date = v("ag_date") || isoToday();
          const time = v("ag_time");
          const pid = v("ag_patientId");
          const typedName = v("ag_patientName");
          const type = v("ag_type");
          const status = v("ag_status");
          const obs = v("ag_obs");

          let patientName = "";

          if(pid){
            const pt = await window.BTXDB.get(window.BTXDB.STORES.patients, pid);
            patientName = pt?.name || "";
          } else {
            patientName = typedName;
          }

          if(!patientName){
            alert("Selecione um paciente ou digite o nome.");
            return;
          }

          await addAgendaItem({
            date,
            time,
            patientId: pid || null,
            patientName,
            type,
            status,
            obs
          });

          $("ag_time").value = "";
          $("ag_patientName").value = "";
          $("ag_obs").value = "";
          toast("Agendamento salvo ✅");
          await buildPreview();
        };

        $("btnAgLoadWeek").onclick = async () => {
          await buildPreview();
          toast("Semana carregada ✅");
        };

        $("btnPtQuick").onclick = async () => {
          const name = v("pt_name");
          if(!name){ alert("Digite o nome do paciente."); return; }
          const patient = await upsertPatient({
            name,
            birth: v("pt_birth"),
            phone: v("pt_phone"),
            address: v("pt_address")
          });
          toast("Paciente salvo ✅");
          await renderTab("agenda"); // recarrega select
          // preseleciona
          const sel = $("ag_patientId");
          if(sel) sel.value = patient.id;
          $("pt_name").value = "";
          $("pt_birth").value = "";
          $("pt_phone").value = "";
          $("pt_address").value = "";
        };
      }
    },

    pacientes: {
      title: "Pacientes/Prontuário",
      sub: "Cadastre paciente e escreva evolução/procedimentos feitos na semana (fica salvo).",
      renderForm: async () => {
        const patients = await listPatients();
        return `
          <div class="docTitle">Selecionar paciente</div>
          <select id="p_sel">
            <option value="">— selecionar —</option>
            ${patients.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("")}
          </select>

          <div class="docTitle">Novo paciente</div>
          <label>Nome</label>
          <input id="p_name" placeholder="Nome completo">
          <div class="row">
            <div>
              <label>Nascimento</label>
              <input id="p_birth" type="date">
            </div>
            <div>
              <label>Telefone</label>
              <input id="p_phone" placeholder="(00) 00000-0000">
            </div>
          </div>
          <label>Endereço</label>
          <input id="p_address" placeholder="Rua, nº, bairro, cidade - UF">

          <div class="actionsLeft">
            <button class="btn btnPrimary" type="button" id="btnPSave">Salvar paciente</button>
            <button class="btn btnDanger" type="button" id="btnPDel">Excluir paciente</button>
          </div>

          <div class="docTitle">Evolução / Procedimentos (Prontuário)</div>
          <label>Data</label>
          <input id="n_date" type="date" value="${isoToday()}">

          <label>Procedimentos realizados</label>
          <textarea id="n_proc" placeholder="Ex.: restauração, exodontia, sutura, curativo..."></textarea>

          <label>Evolução / Observações clínicas</label>
          <textarea id="n_text" placeholder="Ex.: queixa, conduta, orientação, retorno..."></textarea>

          <div class="actionsLeft">
            <button class="btn btnPrimary" type="button" id="btnNSave">Salvar evolução</button>
            <button class="btn btnGhost" type="button" id="btnNLoad">Carregar prontuário</button>
          </div>

          <p class="small" style="margin-top:10px;">
            O prontuário sai no PDF bem organizado: identificação + histórico de evoluções.
          </p>
        `;
      },
      build: async () => {
        const pid = v("p_sel");
        if(!pid){
          return `<p class="docLine">Selecione um paciente para visualizar o prontuário.</p>`;
        }
        const pt = await window.BTXDB.get(window.BTXDB.STORES.patients, pid);
        const notes = await listNotesByPatient(pid);

        return `
          <div class="docTitle">Identificação do paciente</div>
          ${line("Paciente", pt?.name || "")}
          ${line("Nascimento", pt?.birth ? isoToBR(pt.birth) : "")}
          ${line("Telefone", pt?.phone || "")}
          ${line("Endereço", pt?.address || "")}

          <div class="docTitle">Prontuário (Evolução)</div>
          ${notes.length ? notes.map(n => `
            <div class="docBlock">
              <b>Data:</b> ${esc(isoToBR(n.date))}\n
              ${n.procedures ? `\n<b>Procedimentos:</b>\n${esc(n.procedures)}\n` : ""}
              ${n.text ? `\n<b>Evolução:</b>\n${esc(n.text)}\n` : ""}
            </div>
          `).join("") : `<p class="docLine">Nenhuma evolução registrada ainda.</p>`}
        `;
      },
      afterRender: async () => {
        $("btnPSave").onclick = async () => {
          const name = v("p_name");
          if(!name){ alert("Digite o nome do paciente."); return; }
          const pt = await upsertPatient({
            name,
            birth: v("p_birth"),
            phone: v("p_phone"),
            address: v("p_address")
          });
          toast("Paciente salvo ✅");
          await renderTab("pacientes");
          $("p_sel").value = pt.id;
          await buildPreview();
        };

        $("btnPDel").onclick = async () => {
          const pid = v("p_sel");
          if(!pid){ alert("Selecione um paciente."); return; }
          if(!confirm("Excluir paciente? (Não apaga agenda antiga automaticamente)")) return;
          await window.BTXDB.del(window.BTXDB.STORES.patients, pid);

          // apaga notas desse paciente
          const notes = await listNotesByPatient(pid);
          for(const n of notes) await window.BTXDB.del(window.BTXDB.STORES.notes, n.id);

          toast("Paciente excluído ✅");
          await renderTab("pacientes");
          await buildPreview();
        };

        $("btnNSave").onclick = async () => {
          const pid = v("p_sel");
          if(!pid){ alert("Selecione um paciente."); return; }
          const date = v("n_date") || isoToday();
          const proc = v("n_proc");
          const txt = v("n_text");
          if(!proc && !txt){
            alert("Digite procedimento ou evolução.");
            return;
          }
          await addNote({ patientId: pid, date, procedures: proc, text: txt });
          $("n_proc").value = "";
          $("n_text").value = "";
          toast("Evolução salva ✅");
          await buildPreview();
        };

        $("btnNLoad").onclick = async () => {
          await buildPreview();
          toast("Prontuário carregado ✅");
        };

        $("p_sel").onchange = async () => {
          await buildPreview();
        };
      }
    },

    ficha: {
      title: "Ficha clínica",
      sub: "Identificação do paciente, anamnese, planejamento e procedimentos realizados.",
      renderForm: async () => `
        <label>Paciente</label>
        <input id="f_paciente" />

        <div class="row">
          <div>
            <label>Nascimento</label>
            <input id="f_nasc" type="date" />
          </div>
          <div>
            <label>Telefone</label>
            <input id="f_tel" />
          </div>
        </div>

        <label>Endereço</label>
        <input id="f_end" />

        <label>Motivo da consulta</label>
        <textarea id="f_motivo"></textarea>

        <label>Anamnese</label>
        <textarea id="f_anamnese"></textarea>

        <label>Planejamento</label>
        <textarea id="f_plan"></textarea>

        <label>Procedimentos realizados hoje</label>
        <textarea id="f_proc"></textarea>
      `,
      build: async () => {
        return [
          line("Paciente", v("f_paciente")),
          line("Nascimento", v("f_nasc") ? isoToBR(v("f_nasc")) : ""),
          line("Telefone", v("f_tel")),
          line("Endereço", v("f_end")),
          block("Motivo da consulta", v("f_motivo")),
          block("Anamnese", v("f_anamnese")),
          block("Planejamento", v("f_plan")),
          block("Procedimentos realizados hoje", v("f_proc"))
        ].join("");
      }
    },

    receita: {
      title: "Receituário",
      sub: "Clique nas medicações e elas entram no corpo. O PDF sai apenas com dados relevantes.",
      renderForm: async () => `
        <label>Paciente</label>
        <input id="r_paciente" />

        <div class="row">
          <div>
            <label>Cidade</label>
            <input id="r_cidade" />
          </div>
          <div>
            <label>Data</label>
            <input id="r_data" type="date" />
          </div>
        </div>

        <div class="docTitle">Medicações rápidas (1 clique)</div>
        <div class="quickgrid">
          <button class="btn btnGhost" type="button" data-rx="losartana">losartana</button>
          <button class="btn btnGhost" type="button" data-rx="enalapril">enalapril</button>
          <button class="btn btnGhost" type="button" data-rx="anlodipino">anlodipino</button>

          <button class="btn btnGhost" type="button" data-rx="hidroclorotiazida">hidroclorotiazida</button>
          <button class="btn btnGhost" type="button" data-rx="metformina">metformina</button>
          <button class="btn btnGhost" type="button" data-rx="glibenclamida">glibenclamida</button>

          <button class="btn btnGhost" type="button" data-rx="gliclazida">gliclazida</button>
          <button class="btn btnGhost" type="button" data-rx="fluconazol">fluconazol</button>
          <button class="btn btnGhost" type="button" data-rx="cetoconazol_creme">cetoconazol creme</button>

          <button class="btn btnGhost" type="button" data-rx="miconazol_creme">miconazol creme</button>
          <button class="btn btnGhost" type="button" data-rx="cetoconazol_shampoo">shampoo cetoconazol</button>
          <button class="btn btnGhost" type="button" data-rx="dipirona">dipirona</button>

          <button class="btn btnGhost" type="button" data-rx="paracetamol">paracetamol</button>
          <button class="btn btnGhost" type="button" data-rx="ibuprofeno">ibuprofeno</button>
        </div>

        <p class="small">Você pode editar o texto antes de imprimir.</p>

        <label>Prescrição (corpo)</label>
        <textarea id="r_corpo" placeholder="As medicações escolhidas aparecem aqui..."></textarea>

        <label>Orientações adicionais</label>
        <textarea id="r_orient" placeholder="Ex.: retornar em 7 dias, repouso, etc."></textarea>
      `,
      build: async () => {
        const paciente = v("r_paciente");
        const cidade = v("r_cidade") || "Cidade";
        const data = v("r_data") || isoToday();
        const corpo = v("r_corpo");
        const orient = v("r_orient");

        return `
          ${line("Paciente", paciente)}
          <div class="docTitle">Prescrição</div>
          <div class="docBlock">${esc(corpo || "")}</div>
          ${orient ? block("Orientações", orient) : ""}
          <p class="docLine"><strong>${esc(cidade)}</strong>, ${esc(isoToBR(data))}</p>
        `;
      },
      afterRender: async () => {
        ensureDate("r_data");
        $("formPanel").querySelectorAll("[data-rx]").forEach(btn=>{
          btn.addEventListener("click", ()=>appendRx(btn.dataset.rx));
        });
      }
    },

    recibo: {
      title: "Recibo",
      sub: "Comprovação de pagamento / prestação de serviço.",
      renderForm: async () => `
        <label>Nome do pagador (paciente)</label>
        <input id="rc_pagador" />

        <div class="row">
          <div>
            <label>Valor recebido (R$)</label>
            <input id="rc_valor" type="number" step="0.01" placeholder="Ex.: 150.00" />
          </div>
          <div>
            <label>Forma de pagamento</label>
            <input id="rc_forma" placeholder="PIX / dinheiro / cartão" />
          </div>
        </div>

        <label>Referente a</label>
        <input id="rc_ref" placeholder="Ex.: Consulta / Procedimento..." />

        <label>Observações</label>
        <textarea id="rc_obs"></textarea>

        <div class="row">
          <div>
            <label>Cidade</label>
            <input id="rc_cidade" />
          </div>
          <div>
            <label>Data</label>
            <input id="rc_data" type="date" />
          </div>
        </div>
      `,
      build: async () => {
        ensureDate("rc_data");
        const pag = v("rc_pagador");
        const valor = v("rc_valor");
        const valorFmt = valor ? Number(valor).toFixed(2) : "";
        const cidade = v("rc_cidade") || "Cidade";
        const data = v("rc_data") || isoToday();

        return `
          <div class="docTitle">Recibo</div>
          <p class="docLine">Recebi de <strong>${esc(pag)}</strong> a quantia de <strong>R$ ${esc(valorFmt || "0,00")}</strong>.</p>
          ${v("rc_ref") ? `<p class="docLine"><strong>Referente a:</strong> ${esc(v("rc_ref"))}</p>` : ""}
          ${v("rc_forma") ? `<p class="docLine"><strong>Forma de pagamento:</strong> ${esc(v("rc_forma"))}</p>` : ""}
          ${block("Observações", v("rc_obs"))}
          <p class="docLine"><strong>${esc(cidade)}</strong>, ${esc(isoToBR(data))}</p>
        `;
      }
    },

    orcamento: {
      title: "Orçamento",
      sub: "Procedimentos e valores, pronto para impressão.",
      renderForm: async () => {
        let rows = "";
        for(let i=1;i<=10;i++){
          rows += `
            <div class="row">
              <div>
                <label>Procedimento ${i}</label>
                <input id="o_d${i}" />
              </div>
              <div>
                <label>Valor ${i} (R$)</label>
                <input id="o_v${i}" type="number" step="0.01" />
              </div>
            </div>
          `;
        }
        return `
          <label>Paciente</label>
          <input id="o_paciente" />

          <label>Observações</label>
          <textarea id="o_obs"></textarea>

          <div class="small">Até 10 itens:</div>
          ${rows}

          <div class="row">
            <div>
              <label>Cidade</label>
              <input id="o_cidade" />
            </div>
            <div>
              <label>Data</label>
              <input id="o_data" type="date" />
            </div>
          </div>
        `;
      },
      build: async () => {
        ensureDate("o_data");
        const itens = [];
        for(let i=1;i<=10;i++){
          const d = v(`o_d${i}`);
          const raw = v(`o_v${i}`);
          if(d || raw){
            itens.push({ desc: d || "", valor: raw ? Number(raw) : 0 });
          }
        }

        let table = "";
        if(itens.length){
          const total = itens.reduce((a,b)=>a+(b.valor||0),0);
          table = `
            <div class="docTitle">Procedimentos</div>
            <table>
              <thead><tr><th>Procedimento</th><th>Valor (R$)</th></tr></thead>
              <tbody>
                ${itens.map(it=>`<tr><td>${esc(it.desc)}</td><td>${(it.valor||0).toFixed(2)}</td></tr>`).join("")}
              </tbody>
              <tfoot><tr><td>Total</td><td>${total.toFixed(2)}</td></tr></tfoot>
            </table>
          `;
        } else {
          table = `<p class="docLine">Nenhum procedimento informado.</p>`;
        }

        return `
          ${line("Paciente", v("o_paciente"))}
          ${table}
          ${block("Observações", v("o_obs"))}
          <p class="docLine"><strong>${esc(v("o_cidade") || "Cidade")}</strong>, ${esc(isoToBR(v("o_data") || isoToday()))}</p>
        `;
      }
    },

    laudo: {
      title: "Laudo",
      sub: "Relatório estruturado com conclusão.",
      renderForm: async () => `
        <label>Paciente</label>
        <input id="l_paciente" />

        <label>Título</label>
        <input id="l_titulo" placeholder="Ex.: Laudo clínico / radiográfico..." />

        <label>Descrição detalhada</label>
        <textarea id="l_desc"></textarea>

        <label>Conclusão / Impressão diagnóstica</label>
        <textarea id="l_conc"></textarea>

        <div class="row">
          <div>
            <label>Cidade</label>
            <input id="l_cidade" />
          </div>
          <div>
            <label>Data</label>
            <input id="l_data" type="date" />
          </div>
        </div>
      `,
      build: async () => {
        ensureDate("l_data");
        return `
          ${line("Paciente", v("l_paciente"))}
          ${line("Título", v("l_titulo"))}
          ${block("Descrição", v("l_desc"))}
          ${block("Conclusão", v("l_conc"))}
          <p class="docLine"><strong>${esc(v("l_cidade") || "Cidade")}</strong>, ${esc(isoToBR(v("l_data") || isoToday()))}</p>
        `;
      }
    },

    atestado: {
      title: "Atestado",
      sub: "Justificativa e dias de afastamento (opcional).",
      renderForm: async () => `
        <label>Paciente</label>
        <input id="a_paciente" />

        <label>Dias de afastamento (opcional)</label>
        <input id="a_dias" type="number" min="0" step="1" placeholder="Ex.: 2" />

        <label>Justificativa</label>
        <textarea id="a_desc" placeholder="Ex.: Necessita afastamento de suas atividades por motivo de saúde."></textarea>

        <div class="row">
          <div>
            <label>Cidade</label>
            <input id="a_cidade" />
          </div>
          <div>
            <label>Data</label>
            <input id="a_data" type="date" />
          </div>
        </div>
      `,
      build: async () => {
        ensureDate("a_data");
        const diasRaw = v("a_dias");
        const dias = diasRaw ? Number(diasRaw) : null;
        const diasTxt = (dias && !Number.isNaN(dias) && dias > 0) ? `<p class="docLine"><strong>Afastamento:</strong> ${dias} dia(s).</p>` : "";

        return `
          ${line("Paciente", v("a_paciente"))}
          ${diasTxt}
          ${block("Atestado", v("a_desc"))}
          <p class="docLine"><strong>${esc(v("a_cidade") || "Cidade")}</strong>, ${esc(isoToBR(v("a_data") || isoToday()))}</p>
        `;
      }
    }
  };

  function agendaTableHTML(list){
    if(!list.length){
      return `<p class="docLine">Nenhum agendamento encontrado nesta semana.</p>`;
    }
    const rows = list.map(it => `
      <tr>
        <td>${esc(isoToBR(it.date||""))}</td>
        <td>${esc(it.time||"")}</td>
        <td>${esc(it.patientName||"")}</td>
        <td>${esc(it.type||"")}</td>
        <td>${esc(it.status||"")}</td>
        <td>${esc(it.obs||"")}</td>
      </tr>
    `).join("");
    return `
      <table>
        <thead><tr><th>Data</th><th>Hora</th><th>Paciente</th><th>Tipo</th><th>Status</th><th>Obs</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function startOfWeekISO(date){
    const d = new Date(date);
    const day = d.getDay(); // 0 dom .. 6 sab
    const diff = (day === 0 ? -6 : 1) - day; // segunda
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0,10);
  }
  function endOfWeekISO(date){
    const s = new Date(startOfWeekISO(date)+"T12:00:00");
    s.setDate(s.getDate()+6);
    return s.toISOString().slice(0,10);
  }

  async function renderTab(tab){
    currentTab = tab;

    document.querySelectorAll(".tabbtn").forEach(b=>{
      b.classList.toggle("active", b.dataset.tab === tab);
    });

    $("docTitle").textContent = TABS[tab].title;
    $("docSub").textContent = TABS[tab].sub;

    $("formPanel").innerHTML = await TABS[tab].renderForm();

    // listeners de preview (inputs)
    $("formPanel").querySelectorAll("input,textarea,select").forEach(el=>{
      el.addEventListener("input", () => buildPreview());
      el.addEventListener("change", () => buildPreview());
    });

    if(typeof TABS[tab].afterRender === "function"){
      await TABS[tab].afterRender();
    }

    await buildPreview();
  }

  async function buildPreview(){
    const prof = await loadProf();
    $("profResumo").textContent = profResumo(prof);
    renderDocHeaderAndFooter(prof);

    $("pvTitle").textContent = TABS[currentTab].title;
    $("pvSub").textContent = TABS[currentTab].sub;

    $("pvBody").innerHTML = await TABS[currentTab].build();
  }

  /* =========================
     BACKUP / RESTORE
     ========================= */
  async function doBackup(){
    const payload = await window.BTXDB.exportAll();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BTX_Docs_Backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("Backup baixado ✅");
  }

  async function doRestore(file){
    const txt = await file.text();
    const payload = JSON.parse(txt);
    await window.BTXDB.importAll(payload);
    toast("Backup restaurado ✅");
    await initApp();
  }

  /* =========================
     INIT APP
     ========================= */
  async function initApp(){
    const prof = await loadProf();
    setProfToUI(prof);

    // botões profissional
    $("btnSalvarProf").onclick = async () => {
      const p = readProfFromUI();
      if(!p.nome){ alert("Digite o nome do profissional."); return; }
      await saveProf(p);
      toast("Dados do profissional salvos ✅");
      await buildPreview();
    };

    $("btnLimparProf").onclick = async () => {
      await window.BTXDB.delSetting("prof");
      setProfToUI(null);
      toast("Dados do profissional limpos ✅");
      await buildPreview();
    };

    // limpar form
    $("btnLimparForm").onclick = async () => {
      $("formPanel").querySelectorAll("input,textarea,select").forEach(el=>{
        // não limpa selects de tab em alguns casos
        el.value = "";
      });
      toast("Formulário limpo ✅");
      await renderTab(currentTab);
    };

    // imprimir
    $("btnPrint").onclick = async () => {
      await buildPreview();
      window.print();
    };

    // reset total
    $("btnResetAll").onclick = async () => {
      if(!confirm("Tem certeza? Isso apaga tudo do aparelho (profissional, agenda, pacientes e prontuário).")) return;
      await window.BTXDB.clearAll();
      toast("Tudo zerado ✅");
      await initApp();
    };

    // tabs
    document.querySelectorAll(".tabbtn").forEach(btn=>{
      btn.onclick = () => renderTab(btn.dataset.tab);
    });

    // download/atalho
    $("btnDownloadApp").onclick = () => {
      toast("Dica: no Chrome, use 'Instalar app'. Se já estiver instalado, ignore.");
    };

    // backup/restore
    $("btnBackup").onclick = doBackup;
    $("btnRestore").onclick = () => $("restoreFile").click();
    $("restoreFile").onchange = async (e) => {
      const f = e.target.files?.[0];
      if(!f) return;
      try{
        await doRestore(f);
      }catch(err){
        alert("Falha ao restaurar. Arquivo inválido.");
      }finally{
        e.target.value = "";
      }
    };

    $("btnLogout").onclick = handleLogout;

    await renderTab("agenda");
  }

  /* =========================
     START
     ========================= */
  async function start(){
    // login
    $("btnLogin").onclick = handleLogin;
    $("loginKey").addEventListener("keydown", (e)=>{
      if(e.key === "Enter") handleLogin();
    });

    if(await isLogged()){
      $("loginWrap").style.display = "none";
      $("appTopbar").style.display = "";
      $("appMain").style.display = "";
      await initApp();
    } else {
      $("loginWrap").style.display = "";
      $("appTopbar").style.display = "none";
      $("appMain").style.display = "none";
    }
  }

  start();
})();
