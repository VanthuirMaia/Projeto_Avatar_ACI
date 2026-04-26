import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from utils2 import load_intents, build_vocab, encode_sentence, load_embeddings, collate_fn, tokenize
from model import LSTMClassifier, IntentClassifier
from sklearn.model_selection import KFold
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score
import nltk
import matplotlib.pyplot as plt

import seaborn as sns
import numpy as np

nltk.download('punkt')

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
hidden_size = 128
num_layers = 2
embedding_dim = 100
batch_size = 8
learning_rate = 0.001
num_epochs = 20  # Por fold

model_name = 'attention'  # 'lstm' ou 'attention'
k_folds = 5

# Carregando dados
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
embedding_matrix = load_embeddings(word2idx, embedding_dim)
all_samples = dataset.samples
kf = KFold(n_splits=k_folds, shuffle=True, random_state=42)

fold_accuracies, fold_f1s, fold_top2 = [], [], []

print(f"\n🔁 Iniciando Cross-Validation com {k_folds} folds...\n")

for fold, (train_idx, val_idx) in enumerate(kf.split(all_samples)):
    print(f"\n📂 Fold {fold + 1}/{k_folds}")

    train_samples = [all_samples[i] for i in train_idx]
    val_samples = [all_samples[i] for i in val_idx]

    train_loader = DataLoader(train_samples, batch_size=batch_size, shuffle=True, collate_fn=collate_fn)
    val_loader = DataLoader(val_samples, batch_size=batch_size, shuffle=False, collate_fn=collate_fn)

    if model_name == 'lstm':
        model = LSTMClassifier(embedding_matrix, hidden_size, num_layers, len(tags)).to(device)
    else:
        model = IntentClassifier(embedding_matrix, hidden_size, len(tags)).to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)

    for epoch in range(num_epochs):
        model.train()
        for inputs, labels in train_loader:
            inputs, labels = inputs.to(device), labels.to(device)
            outputs = model(inputs)
            loss = criterion(outputs, labels)

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

    # Avaliação
    model.eval()
    all_preds, all_labels = [], []
    top2_correct, total = 0, 0

    with torch.no_grad():
        for inputs, labels in val_loader:
            inputs, labels = inputs.to(device), labels.to(device)
            outputs = model(inputs)

            _, predicted = torch.max(outputs, 1)
            _, top2 = torch.topk(outputs, 2, dim=1)

            all_preds.extend(predicted.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
            total += labels.size(0)
            top2_correct += sum([label in top for top, label in zip(top2.cpu().numpy(), labels.cpu().numpy())])

    acc = accuracy_score(all_labels, all_preds) * 100
    f1 = f1_score(all_labels, all_preds, average='macro') * 100
    top2 = 100 * top2_correct / total

    fold_accuracies.append(acc)
    fold_f1s.append(f1)
    fold_top2.append(top2)

    print(f"✅ Accuracy: {acc:.2f}% | Top-2 Accuracy: {top2:.2f}% | F1 Macro: {f1:.2f}%")
    print(classification_report(all_labels, all_preds, labels=range(len(tags)), target_names=tags, zero_division=0))


    # Matriz de confusão por fold
    plt.figure(figsize=(8, 6))
    sns.heatmap(confusion_matrix(all_labels, all_preds), annot=True, fmt='d',
                xticklabels=tags, yticklabels=tags, cmap='Blues')
    plt.title(f'Matriz de Confusão - Fold {fold + 1}')
    plt.xlabel('Predito')
    plt.ylabel('Real')
    plt.tight_layout()
    plt.show()

# Resultados finais
print("\n📊 Resultados Médios da Validação Cruzada:")
print(f"Acurácia Média: {np.mean(fold_accuracies):.2f}% ± {np.std(fold_accuracies):.2f}")
print(f"Top-2 Acurácia Média: {np.mean(fold_top2):.2f}% ± {np.std(fold_top2):.2f}")
print(f"F1-Score Macro Médio: {np.mean(fold_f1s):.2f}% ± {np.std(fold_f1s):.2f}")

# Treinamento final no conjunto completo (opcional)
print("\n💾 Salvando modelo final...")
final_loader = DataLoader(dataset, batch_size=batch_size, shuffle=True, collate_fn=collate_fn)
if model_name == 'lstm':
    final_model = LSTMClassifier(embedding_matrix, hidden_size, num_layers, len(tags)).to(device)
else:
    final_model = IntentClassifier(embedding_matrix, hidden_size, len(tags)).to(device)

optimizer = torch.optim.Adam(final_model.parameters(), lr=learning_rate)
for epoch in range(num_epochs):
    final_model.train()
    for inputs, labels in final_loader:
        inputs, labels = inputs.to(device), labels.to(device)
        outputs = final_model(inputs)
        loss = criterion(outputs, labels)
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

torch.save({
    'model_state': final_model.state_dict(),
    'word2idx': word2idx,
    'tag2idx': tag2idx,
    'hidden_size': hidden_size,
    'num_layers': num_layers,
    'embedding_matrix': embedding_matrix,
    'model_name': model_name
}, '../data/model.pth')

print("✅ Modelo salvo com sucesso.")
