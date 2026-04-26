# Usa uma imagem base com Python
FROM python:3.10-slim

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Instala dependências do sistema necessárias para nltk, torch e gensim
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Copia os arquivos da aplicação para o container
COPY src/ /app/
COPY data/ /app/data/

# Atualiza o pip
RUN pip install --upgrade pip

# Instala as dependências Python
RUN pip install \
    flask \
    flask-cors \
    torch \
    gensim \
    google-generativeai \
    grpcio \
    nltk

# Baixa o recurso necessário do NLTK (AGORA COM 'punkt_tab')
RUN python3 -c "import nltk; nltk.download('punkt_tab')"

# Expõe a porta usada pelo Flask (ajustável)
EXPOSE 5000

# Define o comando para iniciar o app
CMD ["python", "apiv2.py"]