import cohere

co = cohere.Client('COHERE_API_KEY_REMOVED')  # substitua pela sua chave

def melhorar_resposta(resposta_pronta):
    try:
        prompt = f"Reescreva de forma mais amigável e natural: \"{resposta_pronta}\""
        response = co.generate(
            model='command-r-plus',
            prompt=prompt,
            max_tokens=60,
            temperature=0.8
        )
        return response.generations[0].text.strip()
    except Exception:
        return resposta_pronta