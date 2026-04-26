import os
import random
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS

from utils2 import load_intents
from nlu import processar_texto

# Gemini a
import google.generativeai as genai

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.DEBUG)

# Ativa ou desativa Gemini
use_gemini = False  # ❗Alterar para False para desativar o Gemini

if use_gemini:
    GOOGLE_API_KEY = ""
    genai.configure(api_key=GOOGLE_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")

# Carrega intents
intents = load_intents("../data/intents.json")

def gerar_resposta(topic, age_group, tea_level):
    tag1, prob1, tag2, prob2 = processar_texto(topic)

    if not tag1:
        return {"content": "Desculpe, não entendi. Pode reformular?", "confidence": prob1}, 200

    if (prob1 - prob2) < 0.15:
        return {
            "content": "Ambíguo. Não tenho certeza entre duas respostas.",
            "options": [tag1, tag2],
            "confidences": [prob1, prob2]
        }, 200

    if prob1 < 0.49:
        return {"content": "Desculpe, não tenho certeza sobre isso. Pode tentar outra pergunta?", "confidence": prob1}, 200

    resposta_base = None
    for intent in intents["intents"]:
        if intent["tag"] == tag1:
            resposta_base = random.choice(intent["responses"])
            break

    if not resposta_base:
        return {"content": "Desculpe, não encontrei uma resposta."}, 200

    if use_gemini:
        prompt = f"Explique isso de forma clara e acessível para a faixa etária {age_group}, nível de ensino {tea_level}: {resposta_base}"
        try:
            response = model.generate_content({'text': prompt})
            resposta_gemini = response.candidates[0].content.parts[0].text.strip() if response.candidates else resposta_base
        except Exception:
            logging.exception("Erro ao chamar Gemini")
            resposta_gemini = resposta_base

        return {"content": resposta_gemini, "original": resposta_base, "tag": tag1, "confidence": prob1}, 200

    else:
        return {"content": resposta_base, "tag": tag1, "confidence": prob1}, 200

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

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT", 5022)))
