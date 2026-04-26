import torch
import torch.nn.functional as F
from model import LSTMClassifier, IntentClassifier  # import dos dois
from utils2 import tokenize, encode_sentence

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
checkpoint = torch.load('../data/model.pth', map_location=device)
word2idx = checkpoint['word2idx']
tag2idx = checkpoint['tag2idx']
idx2tag = {v: k for k, v in tag2idx.items()}
hidden_size = checkpoint['hidden_size']
num_layers = checkpoint.get('num_layers', 1)  # só LSTM usa
embedding_matrix = checkpoint['embedding_matrix']

# Variável para escolher o modelo
model_name = 'attention'  # ou 'attention'

if model_name == 'lstm':
    model = LSTMClassifier(
        embedding_matrix=embedding_matrix,
        hidden_size=hidden_size,
        num_layers=num_layers,
        num_classes=len(idx2tag)
    ).to(device)
elif model_name == 'attention':
    model = IntentClassifier(
        embedding_matrix=embedding_matrix,
        hidden_size=hidden_size,  # não é usado, mas mantemos
        num_classes=len(idx2tag)
    ).to(device)
else:
    raise ValueError(f"Modelo desconhecido: {model_name}")

model.load_state_dict(checkpoint['model_state'])
model.eval()

def processar_texto(texto, prob_threshold=0.7, ambig_margin=0.15):
    tokens = tokenize(texto)
    seq = encode_sentence(tokens, word2idx)
    input_tensor = torch.tensor([seq], dtype=torch.long).to(device)

    with torch.no_grad():
        outputs = model(input_tensor)
        probs = F.softmax(outputs, dim=1).cpu().numpy()[0]
        idxs = probs.argsort()[::-1][:2]
        tag1, tag2 = idx2tag[idxs[0]], idx2tag[idxs[1]]
        prob1, prob2 = float(probs[idxs[0]]), float(probs[idxs[1]])

    if prob1 < prob_threshold:
        return None, prob1, tag2, prob2
    return tag1, prob1, tag2, prob2
