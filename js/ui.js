/* Camada de apresentação: constrói DOM seguro e não modifica o estado da aplicação. */
(() => {
  "use strict";
  const STATUS = { todo: "A fazer", doing: "Em andamento", done: "Concluídas" };
  const PRIORITY = { high: "Alta", medium: "Média", low: "Baixa" };
  const rank = { high: 0, medium: 1, low: 2 };
  const paths = {
    plus: '<path d="M12 5v14M5 12h14"/>', close: '<path d="m6 6 12 12M6 18 18 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>', circle: '<circle cx="12" cy="12" r="8"/>',
    "check-circle": '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    board: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M9 4v16m6-16v16"/>',
    list: '<path d="M9 6h12M9 12h12M9 18h12M3 6h1m-1 6h1m-1 6h1"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>', reset: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
    moon: '<path d="M20 14A8.5 8.5 0 0 1 10 4 8.5 8.5 0 1 0 20 14Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
    trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M7 3v4m10-4v4M3 11h18"/>',
    shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    move: '<path d="M12 3v18M3 12h18m-12-6 3-3 3 3m-6 12 3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3"/>',
    spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>',
    folder: '<path d="M3 6h7l2 3h9v11H3z"/>'
  };

  /* Somente estes desenhos estáticos internos usam innerHTML; dados do usuário usam textContent. */
  function icon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none"); svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.6"); svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round"); svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = paths[name] || paths.circle;
    return svg;
  }

  /* Pequenos construtores mantêm renderização e rótulos acessíveis consistentes. */
  function element(tag, className = "", text = "") {
    const node = document.createElement(tag); node.className = className; node.textContent = text; return node;
  }
  function hydrateIcons(root = document) { root.querySelectorAll("[data-icon]").forEach(node => node.replaceChildren(icon(node.dataset.icon))); }
  function actionButton(action, label, symbol, taskId, className = "icon-button") {
    const button = element("button", className); button.type = "button";
    button.dataset.action = action; if (taskId) button.dataset.id = taskId;
    button.setAttribute("aria-label", label); button.title = label; button.append(icon(symbol)); return button;
  }

  /* Formata marcações conhecidas sem executar HTML, URLs, scripts ou atributos importados. */
  function inline(text, container, depth = 0) {
    if (depth > 6) { container.append(document.createTextNode(text)); return; }
    const pattern = /\*\*(.+?)\*\*|__(.+?)__|~~(.+?)~~|\*([^*]+)\*/g;
    let match; let start = 0;
    while ((match = pattern.exec(text))) {
      container.append(document.createTextNode(text.slice(start, match.index)));
      const index = match.slice(1).findIndex(value => value !== undefined);
      const tag = ["strong", "u", "s", "em"][index];
      const node = document.createElement(tag); inline(match[index + 1], node, depth + 1); container.append(node);
      start = pattern.lastIndex;
    }
    container.append(document.createTextNode(text.slice(start)));
  }
  function richText(text, container) {
    container.replaceChildren();
    if (!text.trim()) { container.append(element("p", "empty-preview", "Os detalhes da sua tarefa aparecem aqui.")); return; }
    let list = null;
    for (const line of text.split("\n")) {
      if (/^\s*- /.test(line)) {
        if (!list) { list = document.createElement("ul"); container.append(list); }
        const item = document.createElement("li"); inline(line.replace(/^\s*- /, ""), item); list.append(item);
      } else { list = null; const paragraph = document.createElement("p"); inline(line, paragraph); container.append(paragraph); }
    }
  }

  /* Datas são interpretadas no meio-dia local para evitar mudanças de dia por fuso horário. */
  function localDate(value, options = { day: "2-digit", month: "short" }) {
    return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", options);
  }
  function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }

  /* Monta um cartão com abrir/editar, concluir, avançar etapa e excluir sempre acessíveis. */
  function card(task, listView = false) {
    const article = element("article", `task-card${task.status === "done" ? " completed" : ""}`);
    article.dataset.id = task.id; article.draggable = !listView;
    const top = element("div", "card-top");
    const badge = element("span", `priority-badge ${task.priority}`);
    badge.append(element("i", "priority-dot"), document.createTextNode(`${PRIORITY[task.priority]} prioridade`));
    top.append(badge, actionButton("edit", `Editar: ${task.title}`, "menu", task.id));
    if (listView) { const wrapper = element("div"); wrapper.append(top, element("span", "card-status", STATUS[task.status])); article.append(wrapper); } else article.append(top);
    const content = actionButton("edit", `Abrir tarefa: ${task.title}`, "circle", task.id, "card-content");
    content.replaceChildren(element("h3", "", task.title));
    if (task.description) content.append(element("p", "", task.description.replace(/\*\*|__|~~|\*/g, "").slice(0, 125) + (task.description.length > 125 ? "…" : "")));
    article.append(content);
    const bottom = element("div", "card-bottom"); const tags = element("div", "card-tags");
    tags.append(element("span", "area-tag", task.area));
    if (task.dueDate) {
      const overdue = task.dueDate < todayISO() && task.status !== "done";
      const date = element("span", `due-label${overdue ? " overdue" : ""}`);
      date.title = `${overdue ? "Prazo vencido: " : "Prazo: "}${localDate(task.dueDate, { dateStyle: "long" })}`;
      date.append(icon("calendar"), document.createTextNode(`${overdue ? "Vencida · " : ""}${localDate(task.dueDate)}`)); tags.append(date);
    }
    const actions = element("div", "card-actions");
    if (task.status !== "done") actions.append(actionButton("advance", `Mover para ${task.status === "todo" ? "Em andamento" : "Concluídas"}: ${task.title}`, "arrow", task.id));
    actions.append(actionButton("toggle", `${task.status === "done" ? "Reabrir" : "Concluir"}: ${task.title}`, "check", task.id, "icon-button complete-button"), actionButton("delete", `Excluir: ${task.title}`, "trash", task.id));
    bottom.append(tags, actions); article.append(bottom); return article;
  }

  /* Recria apenas o painel; pesquisa, filtros e foco dos campos não são substituídos. */
  function renderBoard(tasks, filters, view) {
    const board = document.getElementById("task-board"); board.replaceChildren(); board.classList.toggle("list-view", view === "list");
    board.classList.toggle("single-status", ["todo", "doing", "done"].includes(filters.status));
    board.classList.toggle("active-status", filters.status === "active");
    const visible = tasks.filter(task => OrdemStorage.matches(task, filters)).sort((a, b) => rank[a.priority] - rank[b.priority] || b.createdAt.localeCompare(a.createdAt));
    document.getElementById("result-count").textContent = `${visible.length} ${visible.length === 1 ? "tarefa neste painel" : "tarefas neste painel"}`;
    const noResults = visible.length === 0 && tasks.length > 0;
    document.getElementById("no-results").hidden = !noResults; board.hidden = noResults;
    if (noResults) return;
    if (view === "list" && visible.length) { visible.forEach(task => board.append(card(task, true))); return; }
    /* No primeiro uso, mantém as três etapas visíveis para ensinar a organização do quadro. */
    for (const [status, title] of Object.entries(STATUS)) {
      if (filters.status !== "all" && filters.status !== "active" && status !== filters.status) continue;
      if (filters.status === "active" && status === "done") continue;
      const column = element("section", "column"); column.dataset.status = status; column.setAttribute("aria-label", title);
      const subset = visible.filter(task => task.status === status);
      const header = element("header", "column-header"); const add = actionButton("new", `Adicionar tarefa em ${title}`, "plus"); add.dataset.status = status;
      header.append(element("i", `status-dot ${status}`), element("h2", "", title), element("span", "column-count", String(subset.length).padStart(2, "0")), add);
      const cards = element("div", "column-tasks"); subset.forEach(task => cards.append(card(task)));
      if (!subset.length) {
        const empty = element("div", "empty-column");
        empty.append(element("span", "empty-mark", status === "todo" ? "01" : status === "doing" ? "02" : "03"), document.createTextNode(status === "todo" ? "Toda ideia começa aqui." : status === "doing" ? "Dê espaço ao próximo passo." : "O próximo feito é seu."), element("small", "", "Adicione uma tarefa nesta etapa.")); cards.append(empty);
      }
      const addBottom = actionButton("new", `Adicionar tarefa em ${title}`, "plus", null, "column-add"); addBottom.dataset.status = status; addBottom.append(document.createTextNode("Adicionar tarefa"));
      column.append(header, cards, addBottom); board.append(column);
    }
  }

  /* Atualiza números globais e o progresso; a contagem dos filtros fica separada. */
  function renderMetrics(tasks) {
    const done = tasks.filter(t => t.status === "done").length;
    const doing = tasks.filter(t => t.status === "doing").length;
    const percent = tasks.length ? Math.round(done / tasks.length * 100) : 0;
    for (const [id, value] of Object.entries({ "metric-total": tasks.length, "metric-doing": doing, "metric-done": done })) document.getElementById(id).textContent = String(value).padStart(2, "0");
    document.getElementById("count-all").textContent = tasks.length;
    document.getElementById("count-active").textContent = tasks.length - done;
    document.getElementById("count-done").textContent = done;
    document.getElementById("progress").value = percent; document.getElementById("progress").textContent = `${percent}%`;
    document.getElementById("progress-label").textContent = `${percent}%`;
    document.getElementById("progress-caption").textContent = tasks.length ? `${done} de ${tasks.length} ${tasks.length === 1 ? "tarefa concluída" : "tarefas concluídas"}` : "Cada começo conta.";
    document.getElementById("demo-button").hidden = tasks.length > 0;
  }

  /* Painéis salvos exibem resultados ao vivo, sem duplicar registros do armazenamento. */
  function renderPanels(panels, tasks, active) {
    const nav = document.getElementById("panel-nav"); nav.replaceChildren();
    document.getElementById("panel-hint").hidden = panels.length > 0;
    panels.forEach(panel => {
      const row = element("div", "panel-row");
      const button = actionButton("panel", panel.name, "folder", panel.id, `nav-item${active === panel.id ? " active" : ""}`);
      if (active === panel.id) button.setAttribute("aria-current", "page");
      button.append(element("span", "panel-name", panel.name), element("span", "nav-count", String(tasks.filter(t => OrdemStorage.matches(t, panel.filters)).length)));
      row.append(button, actionButton("delete-panel", `Excluir painel ${panel.name}`, "close", panel.id)); nav.append(row);
    });
  }

  /* Mensagens não dependem de alert(); um timer único impede notificações sobrepostas. */
  let toastTimer;
  function toast(message, error = false) {
    const region = document.getElementById("toast-region"); clearTimeout(toastTimer);
    region.replaceChildren(element("div", `toast${error ? " error" : ""}`, message));
    toastTimer = setTimeout(() => region.replaceChildren(), error ? 8000 : 4500);
  }
  window.OrdemUI = Object.freeze({ STATUS, PRIORITY, icon, element, hydrateIcons, richText, localDate, todayISO, renderBoard, renderMetrics, renderPanels, toast });
})();
