/* Persistência e regras compartilhadas. Não depende da interface nem de bibliotecas. */
(() => {
  "use strict";
  const KEY = "ordem.workspace.v1";
  const BACKUP_KEY = `${KEY}.backup`;
  const AREAS = ["Geral", "Trabalho", "Estudos", "Pessoal"];
  const STATUSES = ["todo", "doing", "done"];
  const PRIORITIES = ["low", "medium", "high"];
  let sequence = 0;

  /* Gera IDs estáveis; a sequência protege também o fallback contra o mesmo milissegundo. */
  function uid() {
    return globalThis.crypto?.randomUUID?.() || `id-${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }

  /* Remove espaços e caracteres invisíveis de títulos, sem alterar a descrição original. */
  function cleanTitle(value) {
    return typeof value === "string" ? value.replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, " ").trim() : "";
  }

  /* Retorna um estado novo a cada chamada, evitando arrays compartilhados por referência. */
  function empty() { return { version: 1, tasks: [], panels: [], theme: "light", view: "board" }; }

  /* Aceita apenas datas de calendário reais no formato do input date. */
  function validDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
    const date = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : "";
  }

  /* Normaliza critérios vindos de filtros salvos ou de arquivos importados. */
  function normalizeFilters(value = {}) {
    const f = value && typeof value === "object" ? value : {};
    return {
      query: typeof f.query === "string" ? f.query.trim().slice(0, 120) : "",
      status: [...STATUSES, "active"].includes(f.status) ? f.status : "all",
      priority: PRIORITIES.includes(f.priority) ? f.priority : "all",
      area: AREAS.includes(f.area) ? f.area : "all"
    };
  }

  /* Busca sem diferença de acentos; todos os critérios se combinam por E lógico. */
  function matches(task, filters) {
    const fold = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
    return (!filters.query || fold(`${task.title} ${task.description}`).includes(fold(filters.query))) &&
      (filters.status === "all" || (filters.status === "active" ? task.status !== "done" : task.status === filters.status)) &&
      (filters.priority === "all" || task.priority === filters.priority) &&
      (filters.area === "all" || task.area === filters.area);
  }

  /* Valida o envelope inteiro e cada registro; corrige IDs repetidos sem usar índices. */
  function normalize(input) {
    if (!input || typeof input !== "object" || Array.isArray(input) || input.version !== 1 || !Array.isArray(input.tasks)) {
      throw new Error("Formato de backup inválido ou versão incompatível.");
    }
    if (input.tasks.length > 10000 || (Array.isArray(input.panels) && input.panels.length > 100)) throw new Error("O arquivo excede o limite de 10.000 tarefas ou 100 painéis.");
    const state = empty();
    const ids = new Set();
    let repaired = 0;
    const unique = value => {
      let id = typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value) ? value : "";
      if (!id || ids.has(id)) { do { id = uid(); } while (ids.has(id)); repaired++; }
      ids.add(id);
      return id;
    };
    /* Valores inválidos são descartados individualmente, preservando os registros aproveitáveis. */
    for (const value of input.tasks) {
      if (!value || typeof value !== "object") { repaired++; continue; }
      const title = cleanTitle(value.title);
      if (!title) { repaired++; continue; }
      const createdAt = typeof value.createdAt === "string" && Number.isFinite(Date.parse(value.createdAt)) ? new Date(value.createdAt).toISOString() : new Date().toISOString();
      const task = {
        id: unique(value.id), title: title.slice(0, 120),
        description: typeof value.description === "string" ? value.description.slice(0, 5000) : "",
        status: STATUSES.includes(value.status) ? value.status : "todo",
        priority: PRIORITIES.includes(value.priority) ? value.priority : "medium",
        area: AREAS.includes(value.area) ? value.area : "Geral",
        dueDate: validDate(value.dueDate), createdAt,
        updatedAt: typeof value.updatedAt === "string" && Number.isFinite(Date.parse(value.updatedAt)) ? new Date(value.updatedAt).toISOString() : createdAt
      };
      if (task.title !== value.title || task.status !== value.status || task.priority !== value.priority || task.description !== value.description || task.area !== value.area || task.dueDate !== value.dueDate) repaired++;
      state.tasks.push(task);
    }
    /* Painéis armazenam critérios, e não cópias de tarefas: seus resultados ficam atualizados. */
    for (const value of Array.isArray(input.panels) ? input.panels : []) {
      const name = cleanTitle(value?.name);
      if (!name) { repaired++; continue; }
      state.panels.push({ id: unique(value.id), name: name.slice(0, 40), filters: normalizeFilters(value.filters) });
    }
    state.theme = input.theme === "dark" ? "dark" : "light";
    state.view = input.view === "list" ? "list" : "board";
    return { state, repaired };
  }

  /* JSON.parse e acesso ao storage ficam protegidos; null nunca é tratado como estado válido. */
  function load() {
    let raw;
    try { raw = localStorage.getItem(KEY); }
    catch { return { state: empty(), warning: "O navegador bloqueou o armazenamento. Alterações ficam só nesta sessão; exporte um backup antes de sair." }; }
    if (raw !== null) {
      try {
        const result = normalize(JSON.parse(raw));
        return { ...result, warning: result.repaired ? "Alguns dados inválidos foram corrigidos. Os registros válidos foram preservados; exporte um backup." : "" };
      } catch { /* A cópia anterior é consultada abaixo; a falha não interrompe a aplicação. */ }
    }
    try {
      const backup = localStorage.getItem(BACKUP_KEY);
      if (backup !== null) {
        const result = normalize(JSON.parse(backup));
        /* Conserva os bytes danificados para investigação, quando houver espaço disponível. */
        if (raw !== null) { try { localStorage.setItem(`${KEY}.recovery`, raw); } catch { /* Recuperar o backup tem prioridade. */ } }
        return { ...result, warning: "A cópia de recuperação foi carregada. Confira as tarefas e exporte um backup antes de continuar." };
      }
    } catch { /* Sem cópia legível: inicia vazio e mantém os bytes originais na chave existente. */ }
    return { state: empty(), warning: raw === null ? "" : "Os dados salvos não puderam ser lidos. Nenhum registro inválido foi executado. Importe um backup para recuperar suas tarefas." };
  }

  /* Grava o estado completo de forma atômica; mantém a versão anterior como recuperação. */
  function save(state) {
    try {
      const payload = JSON.stringify(state);
      const old = localStorage.getItem(KEY);
      if (old !== null) {
        try { normalize(JSON.parse(old)); localStorage.setItem(BACKUP_KEY, old); }
        catch { /* Uma cópia boa nunca é substituída por JSON corrompido. */ }
      }
      localStorage.setItem(KEY, payload);
      /* Na primeira gravação, tenta criar também a primeira cópia de recuperação. */
      if (old === null) { try { localStorage.setItem(BACKUP_KEY, payload); } catch { /* O estado principal já foi salvo. */ } }
      return true;
    } catch { return false; }
  }

  /* Namespace global explícito evita imports de módulos, que falhariam em alguns file://. */
  window.OrdemStorage = Object.freeze({ KEY, BACKUP_KEY, AREAS, STATUSES, PRIORITIES, uid, cleanTitle, empty, validDate, normalizeFilters, matches, normalize, load, save });
})();
