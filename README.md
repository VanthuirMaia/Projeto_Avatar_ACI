# Avatar TEA — Professores do Espectro Autista

Protótipo de avatar animado com 3 estados e voz via Web Speech API.

## Estrutura

```
avatar-tea/
├── index.html
├── style.css
├── avatar.js
└── videos/
    ├── aguardando.mp4
    ├── pensando.mp4
    └── comunicando.mp4
```

## Como usar

### Localmente

Abra `index.html` no navegador. Coloque seus vídeos na pasta `videos/` com os nomes corretos.

> Atenção: por segurança do browser, abra via servidor local e não clicando direto no arquivo.
> Use a extensão **Live Server** no VS Code, ou rode:
>
> ```bash
> python -m http.server 8000
> ```
>
> Depois acesse `http://localhost:8000`

### GitHub Pages

1. Faça o push do projeto para um repositório no GitHub
2. Vá em **Settings > Pages**
3. Em **Source**, selecione a branch `main` e pasta `/ (root)`
4. Acesse via `https://<seu-usuario>.github.io/<nome-do-repo>/`

> Os vídeos precisam estar commitados na pasta `videos/` junto com o código.

## Estados do avatar

| Estado      | Arquivo                  | Quando ativa          |
| ----------- | ------------------------ | --------------------- |
| Aguardando  | `videos/aguardando.mp4`  | Idle, esperando input |
| Pensando    | `videos/pensando.mp4`    | Processando resposta  |
| Comunicando | `videos/comunicando.mp4` | Falando com TTS       |

## Integração com LLM

No `avatar.js`, localize o bloco `setTimeout` dentro da função `enviar()` e substitua pela chamada real:

```javascript
// Substituir isso:
setTimeout(() => {
  const resposta = respostas[Math.floor(Math.random() * respostas.length)];
  adicionarMensagem(resposta, "avatar");
  falar(resposta);
  btnEnviar.disabled = false;
}, 1500);

// Por isso (exemplo com fetch):
const res = await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ mensagem: texto }),
});
const { resposta } = await res.json();
adicionarMensagem(resposta, "avatar");
falar(resposta);
btnEnviar.disabled = false;
```

## Integração com ElevenLabs (próxima etapa)

Substitua a função `falar()` no `avatar.js`:

```javascript
async function falar(texto) {
  setComunicando();

  const res = await fetch(
    "https://api.elevenlabs.io/v1/text-to-speech/<voice_id>",
    {
      method: "POST",
      headers: {
        "xi-api-key": "SUA_KEY",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: texto, model_id: "eleven_multilingual_v2" }),
    },
  );

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);

  audio.onplay = () => setComunicando();
  audio.onended = () => setAguardando();
  audio.play();
}
```
# Projeto_Avatar_ACI
