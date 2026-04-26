### api.py

Este código Python implementa uma API RESTful usando Flask que gera respostas a perguntas, utilizando um modelo de processamento de linguagem natural (PNL) e, opcionalmente, o modelo de linguagem grande Gemini do Google. Vamos analisar cada parte detalhadamente:

**1. Importações:**

```python
import os
import random
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from utils2 import load_intents
from nlu import processar_texto
import google.generativeai as genai
```

* `os`: Módulo para interação com o sistema operacional (usado para obter a porta do ambiente).
* `random`: Módulo para gerar números aleatórios (usado para selecionar respostas aleatórias de um conjunto).
* `logging`: Módulo para registrar mensagens de log (útil para debugar e monitorar a aplicação).
* `flask`: Framework web para criar a API RESTful.  `Flask`, `request`, `jsonify` são usados para lidar com requisições, dados JSON e respostas.
* `flask_cors`: Extensão Flask para habilitar CORS (Cross-Origin Resource Sharing), permitindo que requisições de diferentes origens acessem a API.
* `utils2.load_intents`: Função (em um arquivo externo) que provavelmente carrega um conjunto de intents (intenções) de um arquivo JSON.  Um intent representa uma intenção do usuário, como "pedir informações sobre o tempo".
* `nlu.processar_texto`: Função (em um arquivo externo) que provavelmente processa o texto de entrada, identificando a intenção principal e retornando a tag da intenção e a probabilidade.
* `google.generativeai`: Biblioteca para interagir com os modelos de linguagem grandes do Google, especificamente o Gemini.

**2. Inicialização do Flask e configuração do Gemini:**

```python
app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.DEBUG)

use_gemini = False  # ❗Alterar para False para desativar o Gemini

if use_gemini:
    GOOGLE_API_KEY = "" # ❗Chave API SENSÍVEL - não deve ser commitada em repositórios públicos!
    genai.configure(api_key=GOOGLE_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")
```

* `app = Flask(__name__)`: Cria uma instância do aplicativo Flask.
* `CORS(app)`: Habilita o CORS para a aplicação.
* `logging.basicConfig(level=logging.DEBUG)`: Configura o logging para exibir mensagens de debug.
* `use_gemini = False`: Variável para controlar se o Gemini será usado ou não.  **É CRUCIAL alterar isso para `False` em um ambiente de produção e nunca commitar a chave API em um repositório público.**
* O bloco `if use_gemini:` configura a API do Gemini usando a chave API e especifica o modelo `gemini-1.5-flash`.


**3. Carregamento de Intents:**

```python
intents = load_intents("../data/intents.json")
```

Carrega os intents do arquivo `intents.json` localizado no diretório '../data/'.  Este arquivo provavelmente contém um JSON com um dicionário de intents, cada um com sua tag e um conjunto de respostas possíveis.  Exemplo:

```json
{
  "intents": [
    {
      "tag": "saudação",
      "responses": ["Olá!", "Oi!", "Como posso te ajudar?"]
    },
    {
      "tag": "despedida",
      "responses": ["Até mais!", "Tchau!", "Volte sempre!"]
    }
  ]
}
```

**4. Função `gerar_resposta`:**

```python
def gerar_resposta(topic, age_group, tea_level):
    tag1, prob1, tag2, prob2 = processar_texto(topic)
    # ... (restante da função descrito abaixo)
```

Esta função é o coração da lógica de geração de respostas. Ela recebe o tópico, a faixa etária e o nível de ensino como entrada.

* `tag1, prob1, tag2, prob2 = processar_texto(topic)`: Chama a função `processar_texto` (do módulo `nlu`) para processar o tópico.  A função retorna duas tags (possíveis intents), cada uma com sua probabilidade.
* O bloco de `if` verifica a confiança das previsões e retorna uma mensagem apropriada se a confiança for baixa ou ambígua.
* `for intent in intents["intents"]:`: Itera sobre a lista de intents carregada para encontrar o intent correspondente à tag com maior probabilidade (`tag1`).
* `resposta_base = random.choice(intent["responses"])`: Seleciona uma resposta aleatória do conjunto de respostas para a tag.
* O bloco `if use_gemini:` utiliza o Gemini para reformular a resposta, tornando-a mais apropriada para a faixa etária e o nível de ensino especificados.  Um `try...except` trata possíveis erros na chamada ao Gemini.
* A função retorna a resposta, juntamente com informações adicionais (confiança, tag original, resposta original - se o Gemini for usado).

**5. Rota da API `/search`:**

```python
@app.route("/search", methods=["POST"])
def generate():
    data = request.get_json(force=True)
    topic = data.get("topic", "").strip()
    age_group = data.get("age_group", "geral")
    tea_level = data.get("tea_level", "1")

    if not topic:
        return jsonify({"error": "Tópico não fornecido"}), 400

    resposta, status = gerar_resposta(topic, age_group, tea_level)
    return jsonify(resposta), status
```

* `@app.route("/search", methods=["POST"])`: Define a rota `/search` que aceita apenas requisições POST.
* `data = request.get_json(force=True)`: Lê os dados JSON da requisição.
* `topic`, `age_group`, `tea_level`: Extrai os dados relevantes da requisição.
* Verifica se o tópico foi fornecido.
* Chama `gerar_resposta` para gerar a resposta.
* Retorna a resposta como JSON.


**6. Execução do aplicativo:**

```python
if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
```

Inicia o aplicativo Flask em modo debug, ouvindo em todas as interfaces (`host="0.0.0.0"`) na porta 5000 (ou a porta definida na variável de ambiente `PORT`).


**Em resumo:**  Este código cria uma API que recebe uma pergunta (tópico), faixa etária e nível de ensino, e retorna uma resposta gerada usando um modelo de PNL e, opcionalmente, o modelo Gemini.  A lógica inclui tratamento de erros, gerenciamento de confiança da resposta e a capacidade de gerar respostas adaptadas a diferentes públicos-alvo.  Lembre-se de manter a chave da API do Google em segredo e de não adicioná-la ao controle de versão!

### CohereNãoutilizado.py

Este código Python utiliza a API da Cohere para melhorar a "amigabilidade" de uma resposta de texto. Vamos analisar cada parte detalhadamente:

**1. `import cohere`:**

Esta linha importa o módulo `cohere`, que é a interface Python para a API da Cohere.  A API da Cohere fornece acesso a modelos de linguagem poderosos para tarefas como geração de texto, classificação de texto e sumarização.  Para usar esta biblioteca, você precisa instalá-la primeiro usando `pip install cohere`.

**2. `co = cohere.Client('COHERE_API_KEY_REMOVED')`:**

Esta linha cria uma instância de um cliente Cohere. A string  `'COHERE_API_KEY_REMOVED'` é sua chave de API da Cohere. **É crucial substituir esta chave pela sua chave de API pessoal.** Sem uma chave válida, o código não funcionará.  Esta chave autentica suas solicitações à API, permitindo que você use os modelos da Cohere.  A variável `co` armazena este objeto cliente, que será usado para fazer as chamadas à API.

**3. `def melhorar_resposta(resposta_pronta):`:**

Esta linha define uma função chamada `melhorar_resposta`.  Esta função recebe como entrada uma string `resposta_pronta`, que representa uma resposta de texto que precisa ser melhorada.

**4. `try...except Exception:`:**

Este bloco `try...except` trata possíveis erros durante a chamada à API da Cohere.  Se qualquer erro ocorrer durante a geração de texto (por exemplo, problemas de rede, limites de taxa atingidos, ou erros na API), o bloco `except` captura a exceção e retorna a `resposta_pronta` original, sem modificações.  Isso garante que o programa não pare de funcionar se houver um problema com a API.

**5. `prompt = f"Reescreva de forma mais amigável e natural: \"{resposta_pronta}\"`:**

Dentro do bloco `try`, esta linha cria uma string chamada `prompt`.  Esta string é a instrução (prompt) dada ao modelo de linguagem da Cohere.  Ela usa f-strings para incorporar a `resposta_pronta` no prompt.  O prompt instrui o modelo a reescrever a `resposta_pronta` de forma mais amigável e natural.  Exemplo: se `resposta_pronta` for "O sistema detectou um erro crítico.", o `prompt` será "Reescreva de forma mais amigável e natural: "O sistema detectou um erro crítico."".

**6. `response = co.generate(...)`:**

Esta linha é a chamada central à API da Cohere.  Ela usa o método `generate` do objeto cliente `co` para gerar texto usando o modelo especificado.  Vamos analisar os argumentos:

* `model='command-r-plus'`: Especifica o modelo de linguagem da Cohere a ser usado. `command-r-plus` é um modelo projetado para seguir instruções e gerar texto de alta qualidade. Existem outros modelos disponíveis na Cohere, cada um com suas próprias características.
* `prompt=prompt`: Passa o prompt criado anteriormente ao modelo.
* `max_tokens=60`: Limita o número máximo de tokens (palavras ou partes de palavras) na resposta gerada.  Isso ajuda a controlar o comprimento da resposta e a evitar respostas muito longas.
* `temperature=0.8`: Controla a aleatoriedade da resposta.  Um valor mais alto (próximo de 1) resulta em respostas mais criativas e imprevisíveis, enquanto um valor mais baixo (próximo de 0) resulta em respostas mais previsíveis e repetitivas.  0.8 é um valor moderado que equilibra criatividade e coerência.

A chamada `co.generate()` retorna um objeto `response` contendo a resposta do modelo.

**7. `return response.generations[0].text.strip()`:**

Esta linha extrai o texto da resposta gerada e o retorna.  `response.generations` é uma lista de gerações de texto;  neste caso, estamos assumindo que apenas uma geração é retornada, então acessamos o primeiro elemento (`[0]`).  `text` extrai o texto da geração e `strip()` remove quaisquer espaços em branco extras no início ou no final da string.


**Exemplo de Uso:**

```python
import cohere

co = cohere.Client('SUA_CHAVE_API') # Substitua pela sua chave

resposta_original = "O sistema encontrou um problema e falhou."
resposta_melhorada = melhorar_resposta(resposta_original)
print(f"Resposta original: {resposta_original}")
print(f"Resposta melhorada: {resposta_melhorada}")
```

Este exemplo mostra como usar a função `melhorar_resposta` para melhorar uma resposta de texto. A saída mostrará a resposta original e a resposta melhorada pela API da Cohere.  Lembre-se de substituir `'SUA_CHAVE_API'` pela sua chave de API real.


Em resumo, este código demonstra uma forma simples de usar a API da Cohere para melhorar a qualidade e a amigabilidade de respostas de texto geradas por outros sistemas ou processos.  A função `melhorar_resposta` encapsula a lógica de chamada à API e o tratamento de erros, tornando o código mais limpo e fácil de usar.

### model.py

Este código Python define um classificador baseado em uma Rede Neural Recorrente LSTM (Long Short-Term Memory) usando o framework PyTorch. Vamos analisar cada parte detalhadamente:


**1. `import torch.nn as nn`**

Esta linha importa o módulo `nn` do PyTorch, que contém as classes e funções necessárias para construir redes neurais.  `nn` fornece blocos de construção como camadas (layers), funções de ativação e outras ferramentas essenciais para definir a arquitetura e o treinamento de modelos de aprendizado de máquina.


**2. `class LSTMClassifier(nn.Module):`**

Esta linha define uma classe chamada `LSTMClassifier`, que herda da classe `nn.Module` do PyTorch.  `nn.Module` é uma classe base para todos os módulos de redes neurais no PyTorch.  Isso significa que `LSTMClassifier` é um módulo neural, podendo ser usado como parte de uma rede neural maior ou como um modelo independente.


**3. `def __init__(self, embedding_matrix, hidden_size, num_layers, num_classes, dropout=0.5):`**

Este é o construtor (método `__init__`) da classe `LSTMClassifier`. Ele inicializa os atributos do classificador. Os argumentos são:

* `embedding_matrix`: Uma matriz NumPy ou PyTorch que representa as embeddings de palavras.  Cada linha representa uma palavra, e cada coluna representa uma dimensão do vetor de embedding. Essa matriz é pré-treinada e usada para representar as palavras como vetores numéricos.
* `hidden_size`: O tamanho do estado oculto da camada LSTM. Este parâmetro controla a capacidade de memória da LSTM.
* `num_layers`: O número de camadas LSTM empilhadas. Múltiplas camadas permitem que a LSTM capture padrões mais complexos na sequência de entrada.
* `num_classes`: O número de classes de saída do classificador.  Por exemplo, se for um classificador de sentimento, `num_classes` seria 2 (positivo/negativo).
* `dropout=0.5`: A taxa de dropout, usada para regularização e prevenção de overfitting.  Um valor de 0.5 significa que 50% dos neurônios são aleatoriamente desativados durante o treinamento.


Dentro do construtor:

* `num_embeddings, embedding_dim = embedding_matrix.shape`: Obtém o número de embeddings e a dimensão de cada embedding a partir da forma da matriz de embedding.
* `self.embedding = nn.Embedding.from_pretrained(embedding_matrix, freeze=False, padding_idx=0)`: Cria uma camada de embedding a partir da matriz pré-treinada.  `freeze=False` permite que os pesos da matriz de embedding sejam atualizados durante o treinamento. `padding_idx=0` especifica que o índice 0 representa padding (preenchimento).
* `self.lstm = nn.LSTM(...)`: Cria uma camada LSTM com os parâmetros especificados.  `batch_first=True` indica que a dimensão do batch será a primeira dimensão da entrada.
* `self.fc = nn.Linear(hidden_size, num_classes)`: Cria uma camada linear totalmente conectada (fully connected) que mapeia o estado oculto da LSTM para o número de classes de saída.


**4. `def forward(self, x):`**

Este é o método `forward`, que define o fluxo de dados durante a inferência (e também durante o treinamento).

* `embeds = self.embedding(x)`: Projeta a entrada `x` (que se espera ser uma sequência de índices de palavras) para um espaço de embedding usando a camada `self.embedding`.
* `_, (hn, _) = self.lstm(embeds)`: Passa os embeddings pela camada LSTM.  `hn` contém o estado oculto final da LSTM.  O `_` descarta a saída de célula da LSTM, que não é usada neste caso.
* `out = hn[-1]`: Obtém o estado oculto final da última camada LSTM.
* `return self.fc(out)`: Passa o estado oculto final pela camada linear `self.fc` para produzir a saída do classificador.


**Exemplo de Uso:**

```python
import torch
import numpy as np

# Suponha que embedding_matrix seja uma matriz de embeddings pré-treinados (exemplo simplificado)
embedding_matrix = np.random.rand(1000, 100)  # 1000 palavras, embeddings de 100 dimensões
embedding_matrix = torch.tensor(embedding_matrix, dtype=torch.float32)

# Cria uma instância do classificador
classifier = LSTMClassifier(embedding_matrix, hidden_size=128, num_layers=2, num_classes=2)

# Entrada de exemplo (sequência de índices de palavras)
input_sequence = torch.tensor([[1, 2, 3, 0, 0], [4, 5, 6, 7, 8]]) # 2 sequencias, com padding

# Passa a entrada pelo classificador
output = classifier(input_sequence)

# A saída é um tensor com as probabilidades para cada classe
print(output)
print(output.shape) # Deve ser (2,2) se a entrada tem 2 sequencias e 2 classes
```

Este exemplo demonstra como criar uma instância do classificador, fornecer uma entrada e obter a saída.  Observe que a entrada é uma matriz de índices de palavras, e a saída é uma matriz de probabilidades para cada classe,  que pode ser usada para fazer uma predição (por exemplo, tomando a classe com maior probabilidade).  Lembre-se que este é um exemplo simplificado, e um uso real necessitaria de um pré-processamento de texto e um conjunto de dados apropriado.

### nlu.py

Este código Python carrega um modelo de classificação LSTM treinado, previamente salvo em um arquivo, e o utiliza para classificar frases de entrada. Vamos analisar cada parte:

**1. Importações:**

```python
import torch
import torch.nn.functional as F
from model import LSTMClassifier
from utils2 import tokenize, encode_sentence
```

* `import torch`: Importa a biblioteca PyTorch, essencial para computação numérica e construção de modelos de aprendizado de máquina.
* `import torch.nn.functional as F`: Importa funções neurais de PyTorch, como `F.softmax`, usada para normalizar as saídas do modelo em probabilidades.
* `from model import LSTMClassifier`: Importa a classe `LSTMClassifier` definida em um arquivo chamado `model.py`.  Essa classe representa a arquitetura da Rede Neural Recorrente (RNN) LSTM usada para classificação.  Presume-se que este arquivo contenha a definição da arquitetura da LSTM.
* `from utils2 import tokenize, encode_sentence`: Importa as funções `tokenize` e `encode_sentence` do arquivo `utils2.py`.  `tokenize` provavelmente divide o texto de entrada em tokens (palavras ou sub-palavras), enquanto `encode_sentence` converte esses tokens em uma representação numérica que o modelo LSTM pode processar (usando o dicionário `word2idx`).


**2. Carregamento do Modelo e Dados:**

```python
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
checkpoint = torch.load('../data/model.pth', map_location=device)
word2idx = checkpoint['word2idx']
tag2idx = checkpoint['tag2idx']
idx2tag = {v:k for k,v in tag2idx.items()}
hidden_size = checkpoint['hidden_size']
num_layers = checkpoint['num_layers']
embedding_matrix = checkpoint['embedding_matrix']
```

* `device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')`: Define o dispositivo para execução do modelo. Se uma GPU CUDA estiver disponível, o modelo será executado nela; caso contrário, será executado na CPU.
* `checkpoint = torch.load('../data/model.pth', map_location=device)`: Carrega o estado do modelo treinado a partir do arquivo `../data/model.pth`.  `map_location` garante que o modelo seja carregado no dispositivo correto (CPU ou GPU).  Este arquivo `model.pth` contém os pesos e parâmetros do modelo treinado.
* `word2idx`, `tag2idx`, `idx2tag`, `hidden_size`, `num_layers`, `embedding_matrix`:  Estas variáveis extraem informações importantes do `checkpoint`.
    * `word2idx`:  Um dicionário que mapeia palavras para seus índices numéricos.
    * `tag2idx`: Um dicionário que mapeia as classes de saída (tags ou rótulos) para seus índices numéricos.
    * `idx2tag`: O dicionário inverso de `tag2idx`, mapeando índices para tags.
    * `hidden_size`: O tamanho da camada oculta da LSTM.
    * `num_layers`: O número de camadas na LSTM.
    * `embedding_matrix`: A matriz de embeddings de palavras usada pela LSTM.


**3. Instanciação e Carregamento do Modelo:**

```python
model = LSTMClassifier(
    embedding_matrix=embedding_matrix,
    hidden_size=hidden_size,
    num_layers=num_layers,
    num_classes=len(idx2tag)
).to(device)
model.load_state_dict(checkpoint['model_state'])
model.eval()
```

* `model = LSTMClassifier(...)`: Cria uma instância do modelo `LSTMClassifier`, passando os parâmetros carregados do `checkpoint`. `num_classes` é o número de classes de saída (tamanho do dicionário `idx2tag`).
* `model.to(device)`: Move o modelo para o dispositivo especificado (CPU ou GPU).
* `model.load_state_dict(checkpoint['model_state'])`: Carrega os pesos e parâmetros do modelo treinado no objeto `model`.
* `model.eval()`: Define o modelo para o modo de avaliação. Isso desativa o dropout e outras operações de treinamento, assegurando que as previsões sejam consistentes.


**4. Função `processar_texto`:**

```python
def processar_texto(texto, prob_threshold=0.7, ambig_margin=0.15):
    """
    Retorna uma tupla:
      (tag1, prob1, tag2, prob2)
    Onde tag1 é a intenção mais provável, prob1 a confiança,
    tag2 e prob2 a segunda melhor. Se prob1 < prob_threshold, devolve tudo com tag1=None.
    """
    tokens = tokenize(texto)
    seq = encode_sentence(tokens, word2idx)
    input_tensor = torch.tensor([seq], dtype=torch.long).to(device)

    with torch.no_grad():
        outputs = model(input_tensor)
        probs = F.softmax(outputs, dim=1).cpu().numpy()[0]
        # top 2 classes
        idxs = probs.argsort()[::-1][:2]
        tag1, tag2 = idx2tag[idxs[0]], idx2tag[idxs[1]]
        prob1, prob2 = float(probs[idxs[0]]), float(probs[idxs[1]])

    if prob1 < prob_threshold:
        return None, prob1, tag2, prob2
    return tag1, prob1, tag2, prob2
```

Esta função é o ponto principal de entrada para classificar um novo texto.

* `tokens = tokenize(texto)`: Tokeniza a entrada de texto.
* `seq = encode_sentence(tokens, word2idx)`: Converte os tokens em sua representação numérica usando `word2idx`.
* `input_tensor = torch.tensor([seq], dtype=torch.long).to(device)`: Cria um tensor PyTorch a partir da sequência numérica e move-o para o dispositivo correto.
* `with torch.no_grad(): ...`: Desativa o cálculo do gradiente, pois não estamos treinando o modelo.  Isso otimiza a inferência.
* `outputs = model(input_tensor)`: Passa o tensor de entrada pelo modelo para obter as saídas brutas.
* `probs = F.softmax(outputs, dim=1).cpu().numpy()[0]`: Aplica a função softmax para obter as probabilidades de cada classe, move as probabilidades para a CPU e converte-as para um array NumPy.
* `idxs = probs.argsort()[::-1][:2]`: Encontra os índices das duas classes com maior probabilidade.
* `tag1, tag2 = idx2tag[idxs[0]], idx2tag[idxs[1]]`: Obtém as tags correspondentes aos índices.
* `prob1, prob2 = float(probs[idxs[0]]), float(probs[idxs[1]])`: Obtém as probabilidades correspondentes.
* O bloco `if prob1 < prob_threshold:` verifica se a probabilidade da classe mais provável é menor que um determinado limite. Se for, retorna `None` para `tag1`, indicando baixa confiança na classificação.


**Exemplo de Uso:**

```python
texto = "Qual o saldo da minha conta?"
tag1, prob1, tag2, prob2 = processar_texto(texto)
print(f"Intenção principal: {tag1}, Probabilidade: {prob1:.2f}")
print(f"Segunda intenção: {tag2}, Probabilidade: {prob2:.2f}")
```

Este código chamaria a função `processar_texto` com uma frase de exemplo e imprimiria as duas classes mais prováveis ​​e suas probabilidades.  A saída dependerá do modelo treinado e do seu conteúdo.


Em resumo, o código carrega um modelo de classificação LSTM treinado e fornece uma função para classificar novas frases de texto, retornando a classe mais provável e a segunda mais provável, juntamente com suas probabilidades.  A função inclui um mecanismo para lidar com casos de baixa confiança na previsão.  O código é bem estruturado e utiliza as melhores práticas de PyTorch para carregamento de modelos e inferência eficiente.

### predict.py

Este código Python implementa um sistema de classificação de sentenças usando uma rede neural recorrente (RNN) LSTM treinada previamente. Vamos analisar cada parte:

**1. Importações:**

```python
import torch
import torch.nn.functional as F
from model import LSTMClassifier
from utils2 import tokenize, encode_sentence, load_intents, build_vocab, load_embeddings
```

* `import torch`: Importa a biblioteca PyTorch, fundamental para computação numérica e construção de redes neurais.
* `import torch.nn.functional as F`: Importa funções neurais úteis, como `F.softmax`, usada para calcular probabilidades.
* `from model import LSTMClassifier`: Importa a classe `LSTMClassifier` de um arquivo chamado `model.py`.  Esta classe provavelmente define a arquitetura da rede LSTM.
* `from utils2 import tokenize, encode_sentence, load_intents, build_vocab, load_embeddings`: Importa funções utilitárias de `utils2.py`.  Estas funções provavelmente lidam com pré-processamento de texto (tokenização, codificação), carregamento de dados e construção de vocabulário.

**2. Configurações:**

```python
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
embedding_dim = 100
hidden_size = 128
num_layers = 2
```

* `device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')`: Define o dispositivo para execução do modelo (GPU se disponível, caso contrário, CPU).
* `embedding_dim = 100`: Define a dimensionalidade dos embeddings de palavras (representações vetoriais de palavras).
* `hidden_size = 128`: Define o tamanho do estado oculto da camada LSTM.
* `num_layers = 2`: Define o número de camadas na rede LSTM.

**3. Carregamento de Dados e Modelo:**

```python
data = torch.load('../data/model.pth', map_location=device)
word2idx = data['word2idx']
tag2idx = data['tag2idx']
idx2tag = {v: k for k, v in tag2idx.items()}
embedding_matrix = data['embedding_matrix']

model = LSTMClassifier(
    embedding_matrix=embedding_matrix,
    hidden_size=hidden_size,
    num_layers=num_layers,
    num_classes=len(tag2idx)
).to(device)
model.load_state_dict(data['model_state'])
model.eval()
```

* `data = torch.load('../data/model.pth', map_location=device)`: Carrega um arquivo contendo o modelo treinado e dados associados (provavelmente um dicionário). `map_location` garante que o modelo seja carregado no dispositivo correto.
* `word2idx`, `tag2idx`: Dicionários que mapeiam palavras e tags (classes) para índices numéricos. Essas representações numéricas são necessárias para o processamento da rede neural.
* `idx2tag`: Dicionário inverso de `tag2idx`, mapeando índices para tags.
* `embedding_matrix`: Matriz contendo os vetores de embeddings para as palavras no vocabulário.
* `model = LSTMClassifier(...)`: Cria uma instância da classe `LSTMClassifier`, passando a matriz de embeddings, o tamanho do estado oculto, o número de camadas e o número de classes (número de tags).
* `.to(device)`: Move o modelo para o dispositivo especificado (GPU ou CPU).
* `model.load_state_dict(data['model_state'])`: Carrega os pesos do modelo treinado a partir do arquivo salvo.
* `model.eval()`: Define o modelo para o modo de avaliação (desativa o dropout e outras operações específicas para treinamento).

**4. Função `predict_class`:**

```python
def predict_class(sentence):
    tokens = tokenize(sentence)
    input_ids = encode_sentence(tokens, word2idx)
    input_tensor = torch.tensor(input_ids, dtype=torch.long).unsqueeze(0).to(device)
    with torch.no_grad():
        outputs = model(input_tensor)
        probs = F.softmax(outputs, dim=1)
        conf, predicted = torch.max(probs, dim=1)
    return idx2tag[predicted.item()], conf.item()
```

Esta função realiza a predição de classe para uma sentença de entrada:

* `tokens = tokenize(sentence)`: Tokeniza a sentença em uma lista de palavras.
* `input_ids = encode_sentence(tokens, word2idx)`: Converte os tokens em índices numéricos usando o dicionário `word2idx`.
* `input_tensor = torch.tensor(...)`: Converte a lista de índices em um tensor PyTorch, adiciona uma dimensão extra (batch size 1) e move-o para o dispositivo.
* `with torch.no_grad():`: Desativa o cálculo do gradiente, necessário apenas para inferência (predição).
* `outputs = model(input_tensor)`: Passa o tensor de entrada pelo modelo LSTM para obter as saídas.
* `probs = F.softmax(outputs, dim=1)`: Aplica a função softmax para normalizar as saídas em probabilidades.
* `conf, predicted = torch.max(probs, dim=1)`: Encontra a classe com a maior probabilidade e a sua confiança.
* `return idx2tag[predicted.item()], conf.item()`: Retorna a tag predita (convertendo o índice para a tag correspondente) e a confiança.

**5. Teste Interativo:**

```python
print("Digite uma pergunta (ou 'sair' para encerrar):")
while True:
    msg = input("> ")
    if msg.lower() in ['sair', 'exit', 'quit']:
        break
    tag, confidence = predict_class(msg)
    print(f"[{tag}] (confiança: {confidence:.2f})")
```

Este trecho de código permite interagir com o modelo, inserindo sentenças e obtendo as predições.


**Exemplo de Uso (hipotético):**

Supondo que o modelo esteja treinado para classificar a intenção do usuário em "saudação" ou "despedida":

```
Digite uma pergunta (ou 'sair' para encerrar):
> Olá, como vai?
[saudação] (confiança: 0.95)
> Adeus!
[despedida] (confiança: 0.88)
> sair
```

Este código demonstra uma aplicação completa de um modelo LSTM para classificação de texto, mostrando como carregar um modelo pré-treinado, realizar previsões e interagir com o usuário.  A clareza do código depende dos detalhes das funções importadas de `model.py` e `utils2.py`, que não foram fornecidos.

### train.py

Este código implementa um classificador de intenção baseado em LSTM usando PyTorch. Vamos analisar cada parte:

**1. Importações:**

```python
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from utils2 import load_intents, build_vocab, encode_sentence, load_embeddings, collate_fn, tokenize
from model import LSTMClassifier
from sklearn.metrics import classification_report, confusion_matrix
import nltk
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
```

* **`torch` e `torch.nn`:**  Bibliotecas essenciais do PyTorch para construção e treinamento de modelos de aprendizado de máquina.
* **`torch.utils.data`:**  Fornece classes para manipulação eficiente de dados, como `Dataset` (para representar o conjunto de dados) e `DataLoader` (para carregar os dados em batches).
* **`utils2.py`:** Um arquivo (não mostrado) contendo funções auxiliares:
    * `load_intents`: Carrega os dados de intenção de um arquivo JSON.
    * `build_vocab`: Cria um vocabulário (mapeamento de palavras para índices).
    * `encode_sentence`: Converte uma frase em uma sequência de índices usando o vocabulário.
    * `load_embeddings`: Carrega matrizes de embeddings pré-treinadas.
    * `collate_fn`: Função para agrupar amostras em batches (essencial para o DataLoader).
    * `tokenize`: Função para tokenizar (separar em palavras) uma frase.
* **`model.py`:** Um arquivo (não mostrado) contendo a definição da classe `LSTMClassifier`.
* **`sklearn.metrics`:**  Importa funções para avaliação do modelo, como `classification_report` e `confusion_matrix`.
* **`nltk`:** Biblioteca para processamento de linguagem natural, usada aqui para tokenização (através de `nltk.download('punkt')`).
* **`matplotlib.pyplot`, `seaborn`, `numpy`:**  Bibliotecas para visualização de gráficos e manipulação de arrays.


**2. Hiperparâmetros:**

```python
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
hidden_size = 128
num_layers = 2
embedding_dim = 100
batch_size = 8
num_epochs = 100
learning_rate = 0.001
```

* **`device`:** Define se o modelo será executado na GPU ('cuda') ou na CPU ('cpu').
* Os outros parâmetros controlam o tamanho da camada oculta da LSTM, o número de camadas, a dimensão dos embeddings, o tamanho do batch, o número de épocas de treinamento e a taxa de aprendizado do otimizador.


**3. Carregamento de Dados e Pré-processamento:**

```python
targets = load_intents('../data/intents.json')
intents = targets['intents']
word2idx = build_vocab(targets)
tags = sorted({intent['tag'] for intent in intents})
tag2idx = {tag: idx for idx, tag in enumerate(tags)}
idx2tag = {idx: tag for tag, idx in tag2idx.items()}
```

* `load_intents` carrega os dados de um arquivo JSON (provavelmente contendo frases e suas intenções correspondentes).
* `build_vocab` cria um dicionário que mapeia cada palavra única para um índice numérico.
* `tags` extrai todas as tags de intenção únicas.
* `tag2idx` e `idx2tag` criam dicionários para converter entre tags de intenção e seus índices numéricos (necessário para o treinamento do modelo).


**4. Classe `IntentDataset`:**

```python
class IntentDataset(Dataset):
    def __init__(self, intents):
        self.samples = []
        for intent in intents:
            tag_idx = tag2idx[intent['tag']]
            for pattern in intent['patterns']:
                tokens = tokenize(pattern)
                seq = encode_sentence(tokens, word2idx)
                self.samples.append((seq, tag_idx))
    def __len__(self): return len(self.samples)
    def __getitem__(idx): return self.samples[idx]
```

Esta classe herda de `torch.utils.data.Dataset` e prepara os dados para o treinamento.

* `__init__`: Itera pelas intenções e padrões, tokeniza cada padrão, codifica-o usando `word2idx`, e cria uma lista de pares (sequência codificada, índice da tag).
* `__len__`: Retorna o número de amostras no conjunto de dados.
* `__getitem__`: Retorna uma amostra (sequência, tag) pelo seu índice.


**5. DataLoader:**

```python
dataset = IntentDataset(intents)
dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True, collate_fn=collate_fn)
```

Cria um `DataLoader` para carregar os dados em batches durante o treinamento.  `shuffle=True` embaralha os dados a cada época. `collate_fn` é uma função que agrupa os batches (provavelmente para lidar com sequências de comprimentos diferentes).


**6. Carregamento de Embeddings e Inicialização do Modelo:**

```python
embedding_matrix = load_embeddings(word2idx, embedding_dim)
model = LSTMClassifier(embedding_matrix, hidden_size, num_layers, len(tags)).to(device)
```

* `load_embeddings` carrega uma matriz de embeddings pré-treinadas (ex: Word2Vec, GloVe).
* Uma instância da classe `LSTMClassifier` é criada, passando a matriz de embeddings, o tamanho da camada oculta, o número de camadas e o número de tags como parâmetros. `.to(device)` move o modelo para a GPU se disponível.


**7. Treinamento:**

```python
criterion = nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)

train_losses, train_accuracies = [], []

for epoch in range(num_epochs):
    # ... (loop de treinamento) ...
```

* `criterion`: Define a função de perda (CrossEntropyLoss é apropriada para classificação multiclasse).
* `optimizer`: Define o otimizador (Adam neste caso).
* O loop principal itera pelas épocas, processa os batches, calcula a perda, realiza backpropagation e atualiza os pesos do modelo.  A acurácia e a perda são rastreadas para monitorar o progresso.


**8. Avaliação e Visualização:**

```python
# ... (loop de treinamento) ...

plt.figure(figsize=(12, 5))
plt.subplot(1, 2, 1)
plt.plot(train_losses)
plt.title("Loss")
plt.subplot(1, 2, 2)
plt.plot(train_accuracies)
plt.title("Acurácia")
plt.tight_layout()
plt.show()

conf_mat = confusion_matrix(all_labels, all_preds)
plt.figure(figsize=(10, 8))
sns.heatmap(conf_mat, annot=True, fmt='d', cmap='Blues', xticklabels=tags, yticklabels=tags)
plt.xlabel('Predito')
plt.ylabel('Real')
plt.title('Matriz de Confusão Final')
plt.show()
```

Após o treinamento, o código plota gráficos de perda e acurácia ao longo das épocas e gera uma matriz de confusão para visualizar o desempenho do modelo.


**9. Salvamento do Modelo:**

```python
torch.save({
    'model_state': model.state_dict(),
    'word2idx': word2idx,
    'tag2idx': tag2idx,
    'hidden_size': hidden_size,
    'num_layers': num_layers,
    'embedding_matrix': embedding_matrix
}, '../data/model.pth')
```

Salva o modelo treinado, o vocabulário e os hiperparâmetros em um arquivo para uso posterior.


Em resumo, este código demonstra um pipeline completo para construir e treinar um classificador de intenção usando uma rede LSTM.  Ele carrega dados, pré-processa, treina o modelo, avalia seu desempenho e salva os resultados.  A clareza do código seria melhorada com comentários mais detalhados dentro das funções em `utils2.py` e `model.py`.

### utils2.py

Este código Python implementa várias funções para pré-processamento de texto e construção de um vocabulário e matrizes de embeddings para treinamento de um modelo de processamento de linguagem natural (PLN), provavelmente um chatbot. Vamos analisar cada parte:

**1. Importações:**

```python
import json
import nltk
from nltk.stem.porter import PorterStemmer
import gensim.downloader as api
import torch
from torch.nn.utils.rnn import pad_sequence
import unicodedata
import re
```

* `json`:  Para carregar dados de um arquivo JSON (provavelmente contendo os intents do chatbot).
* `nltk`: Biblioteca para processamento de linguagem natural.  Usada aqui para tokenização (`word_tokenize`).
* `PorterStemmer`:  Do NLTK, para redução de palavras a sua raiz (stemming).
* `gensim.downloader`: Para baixar embeddings pré-treinados (GloVe nesse caso).
* `torch`: Biblioteca PyTorch para computação tensorial (essencial para modelos de deep learning).
* `pad_sequence`: Função do PyTorch para preencher sequências com zeros, tornando-as do mesmo tamanho.  Necessário para processar batches de frases de diferentes comprimentos.
* `unicodedata`: Para normalizar texto e remover caracteres acentuados.
* `re`: Para expressões regulares, usadas para limpar o texto.

**2. Inicializações do NLTK:**

```python
nltk.download('punkt')
stemmer = PorterStemmer()
ignore_words = ['?', '!', '.', ',']
```

* `nltk.download('punkt')`: Baixa o recurso de tokenização "punkt" do NLTK, necessário para a função `word_tokenize`.
* `stemmer = PorterStemmer()`: Cria um objeto `PorterStemmer` para realizar stemming.
* `ignore_words`: Lista de palavras que serão ignoradas durante o pré-processamento.


**3. Função `normalizar(texto)`:**

```python
def normalizar(texto):
    texto = texto.lower()
    texto = unicodedata.normalize('NFD', texto)
    texto = ''.join(c for c in texto if unicodedata.category(c) != 'Mn')
    texto = re.sub(r'[^a-zA-Z0-9\s]', '', texto)
    texto = re.sub(r'\s+', ' ', texto).strip()
    return texto
```

Esta função limpa e normaliza o texto de entrada:

* `texto.lower()`: Converte o texto para minúsculas.
* `unicodedata.normalize('NFD', texto)`: Decompõe os caracteres, separando os acentos das letras base.
* `''.join(c for c in texto if unicodedata.category(c) != 'Mn')`: Remove os caracteres de marcação de acento (`Mn`).
* `re.sub(r'[^a-zA-Z0-9\s]', '', texto)`: Remove todos os caracteres que não são letras, números ou espaços em branco.
* `re.sub(r'\s+', ' ', texto).strip()`: Remove espaços em branco extras e espaços no início e no final da string.

**Exemplo:**

```python
texto = "Olá, Mundo!  Este é um TESTE."
texto_normalizado = normalizar(texto)
print(texto_normalizado)  # Saída: ola mundo este e um teste
```

**4. Função `tokenize(sentence)`:**

```python
def tokenize(sentence):
    sentence = normalizar(sentence)
    return nltk.word_tokenize(sentence)
```

Esta função tokeniza uma frase, ou seja, divide-a em uma lista de palavras individuais.  Ela primeiro normaliza o texto usando a função `normalizar`.

**Exemplo:**

```python
frase = "Olá, Mundo!  Este é um TESTE."
tokens = tokenize(frase)
print(tokens) # Saída: ['ola', 'mundo', 'este', 'e', 'um', 'teste']
```

**5. Função `stem(word)`:**

```python
def stem(word):
    return stemmer.stem(word.lower())
```

Esta função realiza stemming em uma palavra, reduzindo-a à sua raiz.

**Exemplo:**

```python
palavra = "correndo"
raiz = stem(palavra)
print(raiz)  # Saída: corren
```

**6. Função `load_intents(path='../data/intents.json')`:**

```python
def load_intents(path='../data/intents.json'):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)
```

Carrega os dados de intents de um arquivo JSON.  Este arquivo provavelmente contém informações sobre as diferentes intenções que o chatbot deve reconhecer e como responder a elas.

**7. Função `build_vocab(intents)`:**

```python
def build_vocab(intents):
    words = []
    for intent in intents['intents']:
        for pattern in intent['patterns']:
            tokens = tokenize(pattern)
            for w in tokens:
                w_stem = stem(w)
                if w_stem not in ignore_words:
                    words.append(w_stem)
    words = sorted(set(words))
    word2idx = {w: idx+1 for idx, w in enumerate(words)}  # 0 é padding
    return word2idx
```

Esta função constrói o vocabulário do chatbot a partir dos dados de intents.  Ela itera sobre os padrões de cada intent, tokeniza, aplica stemming e cria um dicionário `word2idx` que mapeia cada palavra a um índice numérico. O índice 0 é reservado para padding.

**8. Função `encode_sentence(tokens, word2idx)`:**

```python
def encode_sentence(tokens, word2idx):
    return [word2idx.get(stem(w), 0) for w in tokens]
```

Codifica uma frase em uma sequência de índices numéricos usando o dicionário `word2idx`.  Palavras desconhecidas recebem o índice 0 (padding).

**9. Função `collate_fn(batch)`:**

```python
def collate_fn(batch):
    sequences = [torch.tensor(item[0], dtype=torch.long) for item in batch]
    labels = torch.tensor([item[1] for item in batch], dtype=torch.long)
    padded = pad_sequence(sequences, batch_first=True)
    return padded, labels
```

Esta função é uma função de *collate* para o PyTorch.  Ela recebe um batch de dados (provavelmente frases e seus rótulos) e os prepara para o treinamento, preenchendo as sequências com padding para que todas tenham o mesmo comprimento.

**10. Função `load_embeddings(word2idx, embedding_dim=100)`:**

```python
def load_embeddings(word2idx, embedding_dim=100):
    wv = api.load(f"glove-wiki-gigaword-{embedding_dim}")
    vocab_size = len(word2idx) + 1
    embedding_matrix = torch.zeros(vocab_size, embedding_dim)
    for word, idx in word2idx.items():
        if word in wv:
            embedding_matrix[idx] = torch.tensor(wv[word])
        else:
            embedding_matrix[idx] = torch.randn(embedding_dim)
    return embedding_matrix
```

Carrega embeddings pré-treinados GloVe.  Para palavras no vocabulário que não estão presentes no conjunto de embeddings GloVe, são gerados vetores aleatórios.

Em resumo, este código prepara os dados de texto para treinamento de um modelo de PLN, provavelmente um modelo de classificação de intenção ou geração de resposta para um chatbot.  Ele realiza pré-processamento de texto, cria um vocabulário, e carrega embeddings pré-treinados para uso em uma arquitetura de rede neural.  A função `collate_fn` é crucial para lidar com batches de dados de tamanhos variáveis ​​em PyTorch.

