
# Treinamento do Chatbot - Entendendo o Funcionamento

## Introdução

Neste documento, vamos entender o processo de treinamento de um chatbot que utiliza aprendizado de máquina para classificar intenções ("intents") em linguagem natural. O treinamento é baseado em um arquivo JSON contendo padrões de perguntas e respostas, além de técnicas de processamento de texto e aprendizado profundo (deep learning) com PyTorch.

## Tecnologias e Bibliotecas  

| Tecnologia         | Finalidade                                                      |
|--------------------|-----------------------------------------------------------------|
| **Python 3.x**     | Linguagem principal                                             |
| **PyTorch**        | Framework de Deep Learning — cria, treina e executa o LSTM      |
| **NLTK**           | Pré-processamento — tokenização e stemming                      |
| **gensim (GloVe)** | Carregamento de embeddings pré-treinados do GloVe               |
| **scikit-learn**   | Métricas de avaliação (classification_report, confusion_matrix) |
| **Matplotlib / Seaborn** | Visualização de gráficos de loss, acurácia e confusão   |

---

## O JSON de Intenções

O arquivo `intents.json` é o ponto de partida para o treinamento do chatbot. Ele contém diferentes "intents" (intenções) organizadas em uma estrutura JSON com os seguintes campos:

```json
{
    "intents": [
        {
            "tag": "introducao_pc",
            "patterns": [
                "O que é pensamento computacional?",
                "Explique o pensamento computacional."
            ],
            "responses": [
                "Pensamento computacional é uma abordagem para resolver problemas..."
            ]
        }
    ]
}
```

- **tag**: Um identificador para a intenção (ex: `introducao_pc`).
- **patterns**: Exemplos de perguntas que representam essa intenção.
- **responses**: Respostas que o chatbot pode usar ao reconhecer essa intenção.

## Pré-processamento de Texto

- **Normalização**: O texto é convertido para minúsculas e caracteres especiais são removidos:

```python
texto = texto.lower()
texto = re.sub(r'[^a-zA-Z0-9\s]', '', texto)
```

- **Tokenização**: As frases são divididas em palavras (tokens):

```python
from nltk.tokenize import word_tokenize
sentence = "O que é pensamento computacional?"
tokens = word_tokenize(sentence)
```

- **Stemming**: As palavras são reduzidas às suas raízes:

```python
from nltk.stem import PorterStemmer
stemmer = PorterStemmer()
stemmed_word = stemmer.stem("pensando")  # Saída: 'pens'
```

## Construção do Vocabulário

As palavras dos padrões são extraídas e transformadas em um dicionário (`word2idx`) que mapeia cada palavra a um índice numérico:

```python
word2idx = {"pensamento": 1, "computacional": 2, "que": 3}
```

## Codificação de Sentenças

As frases são convertidas em sequências numéricas com base no `word2idx`:

```python
sentence = "O que é pensamento computacional?"
tokens = tokenize(sentence)
encoded_sentence = [word2idx.get(stem(w), 0) for w in tokens]
```

## Como o Self-Attention Aprende as Tags

Cada frase codificada é associada à tag correspondente (ex: `introducao_pc`).

O modelo Self-Attention processa essas sequências de palavras, capturando o contexto por meio de suas camadas recorrentes.

A última saída do Self-Attention representa o contexto completo da frase, que é usada pela camada totalmente conectada para prever a tag correspondente.

```python
outputs = model(inputs)
loss = criterion(outputs, labels)
```

O modelo aprende a diferenciar padrões de frases que pertencem a diferentes tags, ajustando seus pesos para mapear corretamente os padrões às tags.

## Construção do Modelo (Self-Attention)

O modelo é composto por:

- Uma camada de embedding que converte as palavras em vetores de dimensão fixa.
- Uma camada Self-Attention que processa esses vetores ao longo da sequência.
- Uma camada linear que gera a previsão da tag:

```python
class IntentClassifier(nn.Module):
    def __init__(self, embedding_matrix, hidden_size, num_classes):
        super(IntentClassifier, self).__init__()
        num_embeddings, embedding_dim = embedding_matrix.shape
        self.embedding = nn.Embedding.from_pretrained(embedding_matrix, freeze=False, padding_idx=0)
        self.attention = nn.MultiheadAttention(embed_dim=embedding_dim, num_heads=4, batch_first=True)
        self.fc = nn.Linear(embedding_dim, num_classes)

    def forward(self, x):
        embeds = self.embedding(x)
        attn_output, _ = self.attention(embeds, embeds, embeds)
        pooled = attn_output.mean(dim=1)
        return self.fc(pooled)

```

## Treinamento

As frases são alimentadas no modelo como tensores.

O modelo aprende a associar essas frases aos rótulos (tags).

A função de perda (CrossEntropy) e o otimizador (Adam) são usados para ajustar os pesos:

```python
loss = criterion(outputs, labels)
optimizer.zero_grad()
loss.backward()
optimizer.step()
```

## Avaliação e Salvamento

Durante o treinamento, o modelo é avaliado usando métricas como precisão e matriz de confusão.

Após o treinamento, o modelo é salvo:

```python
torch.save({
    'model_state': model.state_dict(),
    'word2idx': word2idx,
    'tag2idx': tag2idx
}, '../data/model.pth')
```

## Fluxo Completo do Treinamento

1. Carregar o JSON de intenções.
2. Pré-processar os textos (normalizar, tokenizar, stemming).
3. Construir o vocabulário (`word2idx`).
4. Codificar as frases.
5. Configurar o modelo Self-Attention.
6. Treinar o modelo com as frases codificadas e seus respectivos rótulos.
7. Avaliar o modelo durante o treinamento.
8. Salvar o modelo treinado.

Pronto! O chatbot está treinado e pronto para responder perguntas de forma precisa com base nas intenções definidas no JSON.
