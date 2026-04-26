import torch
import torch.nn.functional as F
from model import LSTMClassifier, IntentClassifier 
from utils2 import tokenize, encode_sentence

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
embedding_dim = 100
hidden_size = 128
num_layers = 2

data = torch.load('../data/model.pth', map_location=device)
word2idx = data['word2idx']
tag2idx = data['tag2idx']
idx2tag = {v: k for k, v in tag2idx.items()}
embedding_matrix = data['embedding_matrix']

model_name = 'attention'  # ou 'attention'

if model_name == 'lstm':
    model = LSTMClassifier(
        embedding_matrix=embedding_matrix,
        hidden_size=hidden_size,
        num_layers=num_layers,
        num_classes=len(tag2idx)
    ).to(device)
elif model_name == 'attention':
    model = IntentClassifier(
        embedding_matrix=embedding_matrix,
        hidden_size=hidden_size,
        num_classes=len(tag2idx)
    ).to(device)
else:
    raise ValueError(f"Modelo desconhecido: {model_name}")

model.load_state_dict(data['model_state'])
model.eval()

def predict_top_5_classes(sentence):
    tokens = tokenize(sentence)
    input_ids = encode_sentence(tokens, word2idx)
    input_tensor = torch.tensor(input_ids, dtype=torch.long).unsqueeze(0).to(device)

    with torch.no_grad():
        outputs = model(input_tensor)
        probs = F.softmax(outputs, dim=1).squeeze()
        top5_probs, top5_indices = torch.topk(probs, 5)

    return [(idx2tag[top5_indices[i].item()], top5_probs[i].item()) for i in range(5)]

print("Digite uma pergunta (ou 'sair' para encerrar):")
while True:
    msg = input("> ")
    if msg.lower() in ['sair', 'exit', 'quit']:
        break
    top5 = predict_top_5_classes(msg)
    print("\nTop 5 intenções:")
    for tag, confidence in top5:
        print(f"[{tag}] (confiança: {confidence:.2f})")
