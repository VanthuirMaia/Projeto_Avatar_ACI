import json
import nltk
from nltk.stem.porter import PorterStemmer
import gensim.downloader as api
import torch
from torch.nn.utils.rnn import pad_sequence
import unicodedata
import re

nltk.download('punkt')
nltk.download('punkt_tab')
stemmer = PorterStemmer()
ignore_words = ['?', '!', '.', ',']

def normalizar(texto):
    texto = texto.lower()
    texto = unicodedata.normalize('NFD', texto)
    texto = ''.join(c for c in texto if unicodedata.category(c) != 'Mn')
    texto = re.sub(r'[^a-zA-Z0-9\s]', '', texto)
    texto = re.sub(r'\s+', ' ', texto).strip()
    return texto

def tokenize(sentence):
    sentence = normalizar(sentence)
    return nltk.word_tokenize(sentence)

def stem(word):
    return stemmer.stem(word.lower())

def load_intents(path='data/intents.json'):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

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

def encode_sentence(tokens, word2idx):
    return [word2idx.get(stem(w), 0) for w in tokens]

def collate_fn(batch):
    sequences = [torch.tensor(item[0], dtype=torch.long) for item in batch]
    labels = torch.tensor([item[1] for item in batch], dtype=torch.long)
    padded = pad_sequence(sequences, batch_first=True)
    return padded, labels



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

#def load_embeddings(word2idx, embedding_dim=100):
    wv = api.load(f"glove-pt-{embedding_dim}")  
    vocab_size = len(word2idx) + 1
    embedding_matrix = torch.zeros(vocab_size, embedding_dim)
    for word, idx in word2idx.items():
        if word in wv:
            embedding_matrix[idx] = torch.tensor(wv[word])
        else:
            embedding_matrix[idx] = torch.randn(embedding_dim)  
    return embedding_matrix

