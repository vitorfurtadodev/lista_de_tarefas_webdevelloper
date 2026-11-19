/* Controlador principal: conecta eventos, regras, persistência e apresentação. */
(() => {
  "use strict";
  const S = window.OrdemStorage;
  const U = window.OrdemUI;
  const $ = id => document.getElementById(id);
  const loaded = S.load();
  let state = loaded.state;
  let filters = S.normalizeFilters();
  let activePreset = "all";
  let activePanel = "";
  let storageWarning = loaded.warning;
  let unsaved = false;
  let editorSnapshot = "";
  let editingVersion = "";
  let editorOpener = null;
  let draggedId = "";
  let pendingAction = null;

  /* Aplica o tema à raiz; todos os componentes usam as mesmas variáveis CSS. */
  function renderTheme() {
    document.documentElement.dataset.theme = state.theme;
    $("theme-label").textContent = state.theme === "dark" ? "Modo claro" : "Modo escuro";
    $("theme-icon").replaceChildren(U.icon(state.theme === "dark" ? "sun" : "moon"));
  }

  /* Mantém o DOM de campos estável e atualiza apenas partes que dependem do estado. */
  function render() {
    const panel = state.panels.find(p => p.id === activePanel);
    if (activePanel && !panel) { activePanel = ""; activePreset = "all"; filters = S.normalizeFilters(); syncFilterInputs(); }
    const title = panel?.name || ({ all: "Todas as tarefas", active: "Pendentes", done: "Concluídas" })[activePreset] || "Meu filtro";
    $("page-title").replaceChildren(document.createTextNode(title), U.element("span", "title-dot", "."));
    $("breadcrumb-title").textContent = title;
    $("page-description").textContent = panel ? "Uma perspectiva do seu trabalho, com os filtros que você escolheu." : "Organize as ideias. Defina o próximo passo. Faça acontecer.";
    document.querySelectorAll("[data-preset]").forEach(button => {
      const selected = !activePanel && button.dataset.preset === activePreset;
      button.classList.toggle("active", selected);
      if (selected) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
    });
    document.querySelectorAll("[data-view]").forEach(button => {
      button.classList.toggle("selected", button.dataset.view === state.view);
      button.setAttribute("aria-pressed", String(button.dataset.view === state.view));
    });
    U.renderMetrics(state.tasks); U.renderPanels(state.panels, state.tasks, activePanel);
    U.renderBoard(state.tasks, filters, state.view); renderTheme();
    document.querySelector(".board-tip").hidden = state.view !== "board";
    $("storage-warning").hidden = !storageWarning;
    $("storage-warning").textContent = storageWarning;
    $("save-state").textContent = unsaved ? "Alterações nesta sessão — exporte um backup" : "Seus dados ficam neste navegador";
  }

  /* Todas as mutações passam aqui: falhas de armazenamento ficam explícitas, sem travar o uso. */
  function commit(next, message) {
    state = next;
    const persisted = S.save(state);
    unsaved = !persisted;
    if (!persisted) storageWarning = "Não foi possível salvar no navegador (armazenamento bloqueado ou cheio). Suas alterações estão apenas nesta sessão. Exporte um backup antes de sair.";
    render();
    if (message) U.toast(persisted ? message : `${message} Apenas nesta sessão: exporte um backup.`, !persisted);
    return persisted;
  }

  /* Cópia de estado evita que uma operação parcialmente concluída altere o objeto anterior. */
  function copyState() { return JSON.parse(JSON.stringify(state)); }
  function syncFilterInputs() {
    $("search").value = filters.query; $("status-filter").value = filters.status;
    $("priority-filter").value = filters.priority; $("area-filter").value = filters.area;
  }

  /* Filtros são transitórios até o usuário dar nome a um painel. */
  function readFilters() {
    filters = S.normalizeFilters({ query: $("search").value, status: $("status-filter").value, priority: $("priority-filter").value, area: $("area-filter").value });
    activePanel = ""; activePreset = ""; render();
  }
  function selectPreset(name) {
    activePreset = name; activePanel = "";
    filters = S.normalizeFilters({ status: name === "all" ? "all" : name });
    syncFilterInputs(); render(); closeNav();
    if (window.matchMedia("(max-width: 800px)").matches) $("main").focus();
    else document.querySelector(`[data-preset="${name}"]`)?.focus();
  }

  /* Modal reutilizável retorna uma promessa; validação ocorre sem fechar o diálogo. */
  function ask({ title, description, input = false, confirm = "Confirmar", danger = false, validate = null }) {
    if (pendingAction) return Promise.resolve(null);
    $("action-title").textContent = title; $("action-description").textContent = description;
    $("action-input").hidden = !input; $("action-label").hidden = !input;
    $("action-input").value = ""; $("action-error").textContent = "";
    $("action-input").removeAttribute("aria-invalid");
    $("action-confirm").textContent = confirm;
    $("action-confirm").classList.toggle("button-danger", danger);
    return new Promise(resolve => {
      pendingAction = { resolve, input, validate };
      $("action-dialog").showModal();
      /* Para exclusões, o foco começa em cancelar e evita confirmações acidentais. */
      (input ? $("action-input") : $("action-cancel")).focus();
    });
  }
  function resolveAction(value) {
    const pending = pendingAction; pendingAction = null; $("action-dialog").close(); pending?.resolve(value);
  }

  /* Serializa o rascunho para detectar mudanças e impedir perda ao fechar o editor. */
  function editorValue() {
    return {
      title: $("task-title").value, description: $("task-description").value,
      status: $("task-status").value, priority: $("task-priority").value,
      area: $("task-area").value, dueDate: $("task-due").value
    };
  }
  function editorDirty() { return $("task-dialog").open && JSON.stringify(editorValue()) !== editorSnapshot; }
  function updatePreview() {
    $("title-hint").textContent = `${$("task-title").value.length} / 120`;
    $("description-counter").textContent = `${$("task-description").value.length} / 5000`;
    U.richText($("task-description").value, $("description-preview"));
  }

  /* Abre inclusão ou edição em um dialog lateral e guarda a versão original do registro. */
  function openEditor(id = "", status = "") {
    const task = id ? state.tasks.find(t => t.id === id) : null;
    if (id && !task) { U.toast("Esta tarefa já foi removida.", true); return; }
    if (!task && state.tasks.length >= 10000) { U.toast("Limite de 10.000 tarefas atingido. Exporte um backup e remova tarefas antigas.", true); return; }
    closeNav(); editorOpener = document.activeElement;
    $("task-form").reset(); $("task-id").value = task?.id || "";
    $("task-title").value = task?.title || ""; $("task-description").value = task?.description || "";
    $("task-status").value = task?.status || status || (S.STATUSES.includes(filters.status) ? filters.status : "todo");
    $("task-priority").value = task?.priority || (filters.priority !== "all" ? filters.priority : "medium");
    $("task-area").value = task?.area || (filters.area !== "all" ? filters.area : "Geral");
    $("task-due").value = task?.dueDate || "";
    $("editor-heading").textContent = task ? "Detalhes da tarefa" : "Nova tarefa";
    $("editor-kicker").textContent = task ? "CADA DETALHE IMPORTA" : "TIRE A IDEIA DO PAPEL";
    $("editor-delete").hidden = !task;
    $("editor-date").textContent = task ? `Criada em ${new Date(task.createdAt).toLocaleDateString("pt-BR")} · Alterada em ${new Date(task.updatedAt).toLocaleDateString("pt-BR")}` : "Uma ideia clara já é um bom começo.";
    $("title-error").textContent = ""; $("task-title").removeAttribute("aria-invalid");
    editingVersion = task ? JSON.stringify(task) : "";
    editorSnapshot = JSON.stringify(editorValue()); updatePreview();
    $("task-dialog").showModal(); $("task-title").focus();
  }

  /* Restaura um foco útil mesmo quando o botão anterior desapareceu após a renderização. */
  function restoreFocus(taskId = "", action = "edit") {
    const target = Array.from(document.querySelectorAll(`#task-board [data-action="${action}"]`)).find(node => node.dataset.id === taskId);
    if (target) target.focus();
    else if (editorOpener?.isConnected && !editorOpener.closest("[inert]") && editorOpener.getClientRects().length) editorOpener.focus();
    else document.querySelector('.page-heading [data-action="new"]').focus();
  }
  async function closeEditor(force = false, focusId = "") {
    if (!force && editorDirty()) {
      const discard = await ask({ title: "Descartar alterações?", description: "As alterações deste rascunho ainda não foram salvas.", confirm: "Descartar", danger: true });
      if (!discard) return;
    }
    $("task-dialog").close(); editorSnapshot = ""; restoreFocus(focusId);
  }

  /* Salva título válido e verifica conflitos com alterações recebidas de outras abas. */
  function saveTask(event) {
    event.preventDefault();
    const value = editorValue(); const title = S.cleanTitle(value.title);
    if (!title) {
      $("title-error").textContent = "Escreva um título; espaços vazios não são uma tarefa.";
      $("task-title").setAttribute("aria-invalid", "true"); $("task-title").focus(); return;
    }
    if (title.length > 120 || value.description.length > 5000) { U.toast("Respeite os limites de 120 caracteres no título e 5.000 na descrição.", true); return; }
    if (value.dueDate && !S.validDate(value.dueDate)) { U.toast("Escolha uma data de prazo válida.", true); $("task-due").focus(); return; }
    const id = $("task-id").value;
    const original = state.tasks.find(t => t.id === id);
    if (id && (!original || JSON.stringify(original) !== editingVersion)) { U.toast("Esta tarefa mudou em outra aba. Copie seu rascunho e reabra a tarefa para editar a versão atual.", true); return; }
    const now = new Date().toISOString(); const next = copyState();
    const task = { ...value, title, id: original?.id || S.uid(), createdAt: original?.createdAt || now, updatedAt: now };
    if (original) next.tasks[next.tasks.findIndex(t => t.id === id)] = task; else next.tasks.push(task);
    commit(next, `${original ? "Tarefa atualizada." : "Tarefa criada."}${S.matches(task, filters) ? "" : " Ela está fora dos filtros atuais."}`);
    closeEditor(true, task.id);
  }

  /* A formatação insere marcações no trecho selecionado e mantém cursor e foco no textarea. */
  function formatDescription(kind) {
    const field = $("task-description"); const start = field.selectionStart; const end = field.selectionEnd;
    const selected = field.value.slice(start, end);
    const marker = { bold: "**", italic: "*", underline: "__", strike: "~~" }[kind];
    let replacement; let innerStart; let innerEnd; let rangeStart = start; let rangeEnd = end;
    if (kind === "list") {
      rangeStart = field.value.lastIndexOf("\n", start - 1) + 1;
      const nextBreak = field.value.indexOf("\n", end); rangeEnd = nextBreak < 0 ? field.value.length : nextBreak;
      const lines = field.value.slice(rangeStart, rangeEnd).split("\n");
      replacement = lines.every(line => line.startsWith("- ")) ? lines.map(line => line.slice(2)).join("\n") : lines.map(line => `- ${line}`).join("\n");
      innerStart = rangeStart; innerEnd = rangeStart + replacement.length;
    } else {
      if (!marker) return;
      const isWrapped = start >= marker.length && field.value.slice(start - marker.length, start) === marker && field.value.slice(end, end + marker.length) === marker;
      if (isWrapped) { rangeStart -= marker.length; rangeEnd += marker.length; replacement = selected; innerStart = rangeStart; innerEnd = innerStart + selected.length; }
      else { const text = selected || "texto"; replacement = `${marker}${text}${marker}`; innerStart = start + marker.length; innerEnd = innerStart + text.length; }
    }
    if (field.value.length - (rangeEnd - rangeStart) + replacement.length > 5000) { U.toast("A descrição atingiu o limite de 5.000 caracteres.", true); return; }
    field.setRangeText(replacement, rangeStart, rangeEnd, "end"); field.focus(); field.setSelectionRange(innerStart, innerEnd); updatePreview();
  }

  /* Muda o status por ID; não usa a posição do cartão nem índices persistidos. */
  function changeStatus(id, status, action = "edit") {
    const next = copyState(); const task = next.tasks.find(t => t.id === id);
    if (!task || task.status === status) return;
    task.status = status; task.updatedAt = new Date().toISOString();
    commit(next, status === "done" ? "Tarefa concluída. Um passo a mais!" : `Tarefa movida para ${U.STATUS[status].toLocaleLowerCase("pt-BR")}.`);
    restoreFocus(id, action);
  }

  /* Exclusão exige confirmação explícita e remove somente o registro escolhido. */
  async function deleteTask(id) {
    const task = state.tasks.find(t => t.id === id); if (!task) return;
    const confirmed = await ask({ title: "Excluir esta tarefa?", description: `“${task.title}” será removida do seu espaço. Exporte um backup se precisar guardar uma cópia.`, confirm: "Excluir tarefa", danger: true });
    if (!confirmed) { if (!$("task-dialog").open) restoreFocus(id, "delete"); return; }
    const next = copyState(); next.tasks = next.tasks.filter(t => t.id !== id); commit(next, "Tarefa excluída.");
    if ($("task-dialog").open) closeEditor(true); else restoreFocus();
  }

  /* Salva os critérios atuais como painel nomeado e evita nomes vazios ou duplicados. */
  async function savePanel() {
    if (state.panels.length >= 100) { U.toast("O limite é de 100 painéis.", true); return; }
    const currentFilters = { ...filters };
    const name = await ask({ title: "Um painel do seu jeito.", description: "Salve a busca, status, prioridade e área atuais. As tarefas correspondentes aparecerão neste painel automaticamente.", input: true, confirm: "Criar painel", validate: value => !value ? "Dê um nome ao painel." : state.panels.some(p => p.name.toLocaleLowerCase("pt-BR") === value.toLocaleLowerCase("pt-BR")) ? "Já existe um painel com este nome." : "" });
    if (!name) return;
    const next = copyState(); const panel = { id: S.uid(), name, filters: currentFilters };
    next.panels.push(panel); activePanel = panel.id; activePreset = ""; filters = currentFilters; syncFilterInputs();
    commit(next, "Painel criado. Seus filtros já estão salvos.");
    Array.from($("panel-nav").querySelectorAll('[data-action="panel"]')).find(node => node.dataset.id === panel.id)?.focus();
  }
  async function deletePanel(id) {
    const panel = state.panels.find(p => p.id === id); if (!panel) return;
    const yes = await ask({ title: "Excluir painel?", description: `O filtro “${panel.name}” será removido. As tarefas continuarão em Todas as tarefas.`, confirm: "Excluir painel", danger: true });
    if (!yes) return;
    const next = copyState(); next.panels = next.panels.filter(p => p.id !== id); commit(next, "Painel removido. Suas tarefas foram preservadas.");
    document.querySelector('[data-preset="all"]').focus();
  }

  /* Download local independente do localStorage, útil também quando o navegador bloqueia a gravação. */
  function exportBackup() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = `ordem-backup-${U.todayISO()}.json`; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000); U.toast("Backup exportado. Guarde o arquivo em um lugar seguro.");
  }

  /* Importação valida antes de pedir substituição, sem executar conteúdo do arquivo. */
  async function importBackup(event) {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("Escolha um backup de até 10 MB.");
      const result = S.normalize(JSON.parse(await file.text()));
      const yes = await ask({ title: "Importar este backup?", description: `Serão carregadas ${result.state.tasks.length} tarefas e ${result.state.panels.length} painéis, substituindo os dados atuais. Exporte os dados atuais antes, se necessário.${result.repaired ? " Registros inválidos foram corrigidos ou ignorados." : ""}`, confirm: "Importar backup" });
      if (!yes) return;
      activePanel = ""; activePreset = "all"; filters = S.normalizeFilters(); syncFilterInputs();
      commit(result.state, "Backup importado com sucesso.");
    } catch (error) { U.toast(error instanceof SyntaxError ? "O arquivo não contém JSON válido. Seus dados atuais foram preservados." : error.message || "Não foi possível ler o arquivo.", true); }
    finally { event.target.value = ""; }
  }

  /* Exemplo é opcional e só pode ser carregado quando o espaço está vazio. */
  function loadDemo() {
    if (state.tasks.length) return;
    const examples = [
      ["Desenhar o próximo capítulo", "Reunir referências e definir a direção visual do projeto.", "todo", "high", "Trabalho"],
      ["Revisar os conceitos de JavaScript", "- Eventos e manipulação do DOM\n- Persistência com localStorage", "todo", "medium", "Estudos"],
      ["Planejar a semana com calma", "Separar o essencial e deixar espaço para imprevistos.", "todo", "low", "Pessoal"],
      ["Construir a primeira versão", "Foco na experiência: **simples**, clara e funcional.", "doing", "high", "Trabalho"],
      ["Organizar as notas de estudo", "Conectar as ideias que surgiram nas últimas aulas.", "doing", "medium", "Estudos"],
      ["Definir as prioridades", "Um objetivo claro para cada etapa.", "done", "medium", "Trabalho"],
      ["Reservar um tempo para ler", "Pequenos hábitos também merecem um lugar no quadro.", "done", "low", "Pessoal"]
    ];
    const next = copyState(); const now = new Date().toISOString();
    next.tasks = examples.map(([title, description, status, priority, area]) => ({ id: S.uid(), title, description, status, priority, area, dueDate: "", createdAt: now, updatedAt: now }));
    next.panels.push({ id: S.uid(), name: "Foco no trabalho", filters: S.normalizeFilters({ area: "Trabalho", status: "active" }) });
    activePanel = ""; activePreset = "all"; filters = S.normalizeFilters(); syncFilterInputs();
    commit(next, "Exemplo carregado. Você pode editar ou excluir qualquer tarefa."); closeNav();
  }

  /* Navegação móvel usa inert para impedir foco no conteúdo que está atrás do menu. */
  function closeNav() {
    document.body.classList.remove("nav-open"); $("nav-backdrop").hidden = true;
    $("menu-toggle").setAttribute("aria-expanded", "false"); $("sidebar").inert = window.matchMedia("(max-width: 800px)").matches;
    document.querySelector(".app-shell").inert = false;
  }
  function toggleNav() {
    if (document.body.classList.contains("nav-open")) { closeNav(); $("menu-toggle").focus(); return; }
    document.body.classList.add("nav-open"); $("sidebar").inert = false;
    $("nav-backdrop").hidden = false; $("menu-toggle").setAttribute("aria-expanded", "true");
    document.querySelector(".app-shell").inert = true; $("sidebar").querySelector("button").focus();
  }

  /* Delegação de eventos mantém os cartões recriados funcionais sem registrar listeners repetidos. */
  async function handleAction(button) {
    const { action, id, status } = button.dataset;
    switch (action) {
      case "new": openEditor("", status || ""); break;
      case "edit": openEditor(id); break;
      case "close-editor": await closeEditor(); break;
      case "delete-editing": await deleteTask($("task-id").value); break;
      case "delete": await deleteTask(id); break;
      case "toggle": { const task = state.tasks.find(t => t.id === id); if (task) changeStatus(id, task.status === "done" ? "todo" : "done", "toggle"); break; }
      case "advance": { const task = state.tasks.find(t => t.id === id); if (task) changeStatus(id, task.status === "todo" ? "doing" : "done", "advance"); break; }
      case "save-panel": await savePanel(); break;
      case "delete-panel": await deletePanel(id); break;
      case "panel": {
        const panel = state.panels.find(p => p.id === id);
        if (panel) {
          activePanel = id; activePreset = ""; filters = { ...panel.filters }; syncFilterInputs(); render(); closeNav();
          if (window.matchMedia("(max-width: 800px)").matches) $("main").focus();
          else Array.from($("panel-nav").querySelectorAll('[data-action="panel"]')).find(node => node.dataset.id === id)?.focus();
        }
        break;
      }
      case "clear-filters": selectPreset("all"); U.toast("Filtros removidos."); break;
      case "theme": { const next = copyState(); next.theme = state.theme === "dark" ? "light" : "dark"; commit(next, `Tema ${next.theme === "dark" ? "escuro" : "claro"} ativado.`); break; }
      case "export": exportBackup(); break;
      case "demo": loadDemo(); break;
    }
  }
  document.addEventListener("click", event => {
    const format = event.target.closest("[data-format]"); if (format) { formatDescription(format.dataset.format); return; }
    const preset = event.target.closest("[data-preset]"); if (preset) { selectPreset(preset.dataset.preset); return; }
    const view = event.target.closest("[data-view]");
    if (view) { const next = copyState(); next.view = view.dataset.view; commit(next); return; }
    const button = event.target.closest("[data-action]"); if (button) handleAction(button).catch(() => U.toast("Não foi possível concluir a ação. Tente novamente.", true));
  });

  /* Listeners de formulário: erros preservam os campos e devolvem o foco ao problema. */
  $("task-form").addEventListener("submit", saveTask);
  $("task-form").addEventListener("input", () => { $("title-error").textContent = ""; $("task-title").removeAttribute("aria-invalid"); updatePreview(); });
  $("action-form").addEventListener("submit", event => {
    event.preventDefault(); if (!pendingAction) return;
    const value = pendingAction.input ? S.cleanTitle($("action-input").value) : true;
    const error = pendingAction.validate?.(value) || "";
    if (error) { $("action-error").textContent = error; $("action-input").setAttribute("aria-invalid", "true"); $("action-input").focus(); return; }
    resolveAction(value);
  });
  $("action-cancel").addEventListener("click", () => resolveAction(null));
  $("action-dialog").addEventListener("cancel", event => { event.preventDefault(); resolveAction(null); });
  $("task-dialog").addEventListener("cancel", event => { event.preventDefault(); closeEditor(); });
  $("search").addEventListener("input", readFilters);
  ["status-filter", "priority-filter", "area-filter"].forEach(id => $(id).addEventListener("change", readFilters));
  $("import-file").addEventListener("change", importBackup);
  $("menu-toggle").addEventListener("click", toggleNav);
  $("nav-backdrop").addEventListener("click", () => { closeNav(); $("menu-toggle").focus(); });
  window.matchMedia("(max-width: 800px)").addEventListener("change", closeNav);

  /* Drag and drop é um complemento; editor e botões oferecem as mesmas mudanças por teclado. */
  $("task-board").addEventListener("dragstart", event => {
    if (event.target.closest("button") || state.view !== "board") { event.preventDefault(); return; }
    const card = event.target.closest(".task-card"); if (!card) return;
    draggedId = card.dataset.id; event.dataTransfer.setData("text/plain", draggedId); event.dataTransfer.effectAllowed = "move"; card.classList.add("dragging");
  });
  $("task-board").addEventListener("dragover", event => {
    const column = event.target.closest(".column"); if (!column || !draggedId) return;
    event.preventDefault(); event.dataTransfer.dropEffect = "move";
    document.querySelectorAll(".drag-over").forEach(node => node.classList.remove("drag-over")); column.classList.add("drag-over");
  });
  $("task-board").addEventListener("drop", event => {
    const column = event.target.closest(".column"); if (!column || !draggedId) return;
    event.preventDefault(); const id = draggedId; draggedId = ""; changeStatus(id, column.dataset.status);
  });
  document.addEventListener("dragend", () => { draggedId = ""; document.querySelectorAll(".dragging, .drag-over").forEach(node => node.classList.remove("dragging", "drag-over")); });

  /* Atalhos nunca interceptam digitação normal; no menu móvel Tab permanece na navegação. */
  document.addEventListener("keydown", event => {
    if (document.body.classList.contains("nav-open")) {
      if (event.key === "Escape") { closeNav(); $("menu-toggle").focus(); }
      if (event.key === "Tab") {
        const focusable = Array.from($("sidebar").querySelectorAll("a, button, input")).filter(node => !node.hidden && node.getClientRects().length && !node.disabled);
        const first = focusable[0]; const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
      return;
    }
    if (document.activeElement === $("task-description") && (event.ctrlKey || event.metaKey) && !event.altKey) {
      const kind = { b: "bold", i: "italic", u: "underline" }[event.key.toLowerCase()];
      if (kind) { event.preventDefault(); formatDescription(kind); return; }
    }
    if ($("task-dialog").open || $("action-dialog").open || event.ctrlKey || event.metaKey || event.altKey || event.target.closest("input, textarea, select, [contenteditable]")) return;
    if (event.key.toLowerCase() === "n") { event.preventDefault(); openEditor(); }
    if (event.key === "/") { event.preventDefault(); $("search").focus(); }
  });

  /* Alterações entre abas recarregam o estado; rascunhos abertos são preservados e checados ao salvar. */
  window.addEventListener("storage", event => {
    if (event.key !== S.KEY && event.key !== null) return;
    if (unsaved) { U.toast("Outra aba mudou os dados. Exporte as alterações desta sessão antes de recarregar.", true); return; }
    const latest = S.load(); state = latest.state;
    if (latest.warning) storageWarning = latest.warning;
    render(); U.toast("Painel atualizado com as alterações de outra aba.");
  });
  window.addEventListener("beforeunload", event => {
    if (unsaved || editorDirty()) { event.preventDefault(); event.returnValue = ""; }
  });

  /* Inicialização única, depois de todos os scripts e do HTML terem sido carregados. */
  U.hydrateIcons();
  $("today-label").textContent = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  syncFilterInputs(); closeNav(); render();
})();
