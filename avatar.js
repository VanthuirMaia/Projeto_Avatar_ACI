// =============================================
// Avatar TEA — Lógica principal
// =============================================

// Referências DOM
const container = document.getElementById("avatarContainer");
const statusText = document.getElementById("statusText");
const avatarIcon = document.getElementById("avatarIcon");
const placeholder = document.getElementById("placeholder");
const messagesEl = document.getElementById("messages");
const userInput = document.getElementById("userInput");
const btnEnviar = document.getElementById("btnEnviar");
const voiceSelect = document.getElementById("voiceSelect");

// Vídeos por estado
const videos = {
  aguardando: document.getElementById("vidAguardando"),
  pensando: document.getElementById("vidPensando"),
  comunicando: document.getElementById("vidComunicando"),
};

// Controle de quais vídeos já foram carregados
const hasVideo = {
  aguardando: false,
  pensando: false,
  comunicando: false,
};

// Ícones e labels por estado
const icons = { aguardando: "🤖", pensando: "🤔", comunicando: "🗣️" };
const labels = {
  aguardando: "aguardando",
  pensando: "pensando...",
  comunicando: "comunicando",
};

// Estado atual
let currentState = "aguardando";

// Web Speech API
const synth = window.speechSynthesis;
let voices = [];

// =============================================
// Carrega vídeo via URL pública (pasta /videos)
// =============================================
function carregarVideosPublicos() {
  const mapa = {
    aguardando: "videos/aguardando.mp4",
    pensando: "videos/pensando.mp4",
    comunicando: "videos/comunicando.mp4",
  };

  Object.entries(mapa).forEach(([estado, caminho]) => {
    const el = videos[estado];
    el.src = caminho;
    el.load();

    el.addEventListener(
      "canplay",
      () => {
        hasVideo[estado] = true;
        // se esse for o estado atual, já mostra
        if (currentState === estado) {
          placeholder.style.display = "none";
          el.classList.add("active");
          el.play().catch(() => {});
        }
      },
      { once: true },
    );
  });
}

// =============================================
// Gerenciamento de estado do avatar
// =============================================
function setState(state) {
  currentState = state;

  // atualiza classe CSS
  container.className = "avatar-container state-" + state;

  // atualiza badge
  statusText.textContent = labels[state];
  avatarIcon.textContent = icons[state];

  // pausa todos os vídeos e ativa o correto
  Object.entries(videos).forEach(([key, el]) => {
    el.classList.remove("active");
    el.pause();
  });

  if (hasVideo[state]) {
    placeholder.style.display = "none";
    videos[state].classList.add("active");
    videos[state].play().catch(() => {});
  } else {
    placeholder.style.display = "flex";
  }
}

function setAguardando() {
  setState("aguardando");
}
function setPensando() {
  setState("pensando");
}
function setComunicando() {
  setState("comunicando");
}

// =============================================
// Web Speech API — vozes
// =============================================
function carregarVozes() {
  voices = synth.getVoices();
  const ptVoices = voices.filter((v) => v.lang.startsWith("pt"));
  const lista = ptVoices.length > 0 ? ptVoices : voices;

  voiceSelect.innerHTML = "";
  lista.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = voices.indexOf(v);
    opt.textContent = `${v.name} (${v.lang})`;
    voiceSelect.appendChild(opt);
  });
}

carregarVozes();
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = carregarVozes;
}

// =============================================
// Fala do avatar
// =============================================
function falar(texto) {
  synth.cancel();
  setComunicando();

  const utter = new SpeechSynthesisUtterance(texto);
  utter.lang = "pt-BR";
  utter.rate = 0.95;

  const idx = parseInt(voiceSelect.value);
  if (!isNaN(idx) && voices[idx]) {
    utter.voice = voices[idx];
  }

  utter.onend = () => setAguardando();
  utter.onerror = () => setAguardando();

  synth.speak(utter);
}

// Função de demonstração chamada via HTML
function demoFalar(texto) {
  adicionarMensagem(texto, "avatar");
  falar(texto);
}

// =============================================
// Chat
// =============================================

// Respostas de demonstração (substituir pela chamada ao LLM)
const respostas = [
  "Estratégias visuais como cartões de rotina ajudam muito alunos com TEA a se organizarem ao longo do dia.",
  "Ambientes previsíveis e rotinas claras são fundamentais para o aprendizado de alunos no espectro autista.",
  "Comunicação alternativa e aumentativa pode ser um recurso valioso para alunos com dificuldades na fala.",
  "Atividades sensoriais reguladoras podem ajudar o aluno a se concentrar melhor nas tarefas escolares.",
  "Dividir tarefas em etapas menores e usar reforço positivo facilita muito o aprendizado no espectro.",
  "Apoio visual com pictogramas e calendários ajuda alunos com TEA a compreenderem a rotina escolar.",
];

function adicionarMensagem(texto, tipo) {
  const div = document.createElement("div");
  div.className = "msg " + tipo;
  div.textContent = texto;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

function enviar() {
  const texto = userInput.value.trim();
  if (!texto) return;

  adicionarMensagem(texto, "user");
  userInput.value = "";
  btnEnviar.disabled = true;

  // avatar vai para "pensando" enquanto processa
  setPensando();

  const typing = adicionarMensagem("digitando...", "typing");

  // simula latência de resposta (substituir por chamada real ao LLM)
  setTimeout(() => {
    typing.remove();
    const resposta = respostas[Math.floor(Math.random() * respostas.length)];
    adicionarMensagem(resposta, "avatar");
    falar(resposta);
    btnEnviar.disabled = false;
  }, 1500);
}

btnEnviar.addEventListener("click", enviar);
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") enviar();
});

// =============================================
// Inicialização
// =============================================
carregarVideosPublicos();
