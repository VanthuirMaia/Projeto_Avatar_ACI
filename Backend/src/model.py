import torch
import torch.nn as nn
import torch.nn.functional as F

# LSTM Classifier
class LSTMClassifier(nn.Module):
    def __init__(self, embedding_matrix, hidden_size, num_layers, num_classes, dropout=0.5):
        super(LSTMClassifier, self).__init__()
        num_embeddings, embedding_dim = embedding_matrix.shape
        self.embedding = nn.Embedding.from_pretrained(embedding_matrix, freeze=False, padding_idx=0)
        self.lstm = nn.LSTM(
            input_size=embedding_dim,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout
        )
        self.fc = nn.Linear(hidden_size, num_classes)

    def forward(self, x):
        embeds = self.embedding(x)
        _, (hn, _) = self.lstm(embeds)
        out = hn[-1]
        return self.fc(out)

# Self-Attention Classifier
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
