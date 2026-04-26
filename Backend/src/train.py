import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from utils2 import load_intents, build_vocab, encode_sentence, load_embeddings, collate_fn, tokenize
from model import LSTMClassifier, IntentClassifier  # importe os dois
from sklearn.metrics import classification_report, confusion_matrix
import nltk
import matplotlib.pyplot as plt
import seaborn as sns

nltk.download('punkt')

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
hidden_size = 128
num_layers = 2
embedding_dim = 100
batch_size = 8
num_epochs = 100
learning_rate = 0.001

targets = load_intents('../data/intents.json')
intents = targets['intents']
word2idx = build_vocab(targets)
tags = sorted({intent['tag'] for intent in intents})
tag2idx = {tag: idx for idx, tag in enumerate(tags)}

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
    def __getitem__(self, idx): return self.samples[idx]

dataset = IntentDataset(intents)
dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True, collate_fn=collate_fn)
embedding_matrix = load_embeddings(word2idx, embedding_dim)

model_name = 'attention'  # 'lstm' ou 'attention'

if model_name == 'lstm':
    model = LSTMClassifier(embedding_matrix, hidden_size, num_layers, len(tags)).to(device)
elif model_name == 'attention':
    model = IntentClassifier(embedding_matrix, hidden_size, len(tags)).to(device)
else:
    raise ValueError("Modelo desconhecido")

criterion = nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)

train_losses, train_accuracies = [], []

for epoch in range(num_epochs):
    total, correct = 0, 0
    all_preds, all_labels = [], []

    for inputs, labels in dataloader:
        inputs, labels = inputs.to(device), labels.to(device)
        outputs = model(inputs)
        loss = criterion(outputs, labels)

        _, predicted = torch.max(outputs, 1)
        total += labels.size(0)
        correct += (predicted == labels).sum().item()
        all_preds.extend(predicted.cpu().numpy())
        all_labels.extend(labels.cpu().numpy())

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

    acc = 100 * correct / total
    train_losses.append(loss.item())
    train_accuracies.append(acc)

    if (epoch + 1) % 10 == 0:
        print(f"\nEpoch {epoch+1}/{num_epochs}, Loss: {loss.item():.4f}, Acurácia: {acc:.2f}%")
        print(classification_report(all_labels, all_preds, target_names=tags, zero_division=0))
        print(confusion_matrix(all_labels, all_preds))

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

# Salvando checkpoint com o nome do modelo para referência
torch.save({
    'model_state': model.state_dict(),
    'word2idx': word2idx,
    'tag2idx': tag2idx,
    'hidden_size': hidden_size,
    'num_layers': num_layers,
    'embedding_matrix': embedding_matrix,
    'model_name': model_name
}, '../data/model.pth')

print("\nTreinamento concluído.")
