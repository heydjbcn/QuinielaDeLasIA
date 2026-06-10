"""
Configuración de los modelos de IA (SOTA, junio 2026) que participan en WorldCupBench.

Cada entrada define:
- name: nombre legible del modelo (se usa para nombrar los archivos de predicciones).
- model_id: identificador del modelo en OpenRouter.
- provider: proveedor / laboratorio que desarrolla el modelo.

NOTA: Los `model_id` siguen la convención de OpenRouter (proveedor/modelo). Como
estos son modelos de última generación (junio 2026), verifica los identificadores
exactos disponibles en https://openrouter.ai/models y ajústalos si es necesario.
"""

# Lista de modelos State-Of-The-Art a comparar en el benchmark (junio 2026).
MODELS = [
    {
        "name": "GPT-5.5",
        "model_id": "openai/gpt-5.5",
        "provider": "OpenAI",
    },
    {
        "name": "Claude-Opus-4.8",
        "model_id": "anthropic/claude-opus-4.8",
        "provider": "Anthropic",
    },
    {
        "name": "Gemini-3.1-Ultra",
        "model_id": "google/gemini-3.1-ultra",
        "provider": "Google",
    },
    {
        "name": "Grok-3",
        "model_id": "x-ai/grok-3",
        "provider": "xAI",
    },
    {
        "name": "DeepSeek-V4-Pro",
        "model_id": "deepseek/deepseek-v4-pro",
        "provider": "DeepSeek",
    },
    {
        "name": "Qwen-3.7-Max",
        "model_id": "qwen/qwen-3.7-max",
        "provider": "Alibaba",
    },
    {
        "name": "Kimi-K2.6",
        "model_id": "moonshotai/kimi-k2.6",
        "provider": "Moonshot AI",
    },
    {
        "name": "GLM-5",
        "model_id": "zhipuai/glm-5",
        "provider": "Zhipu AI",
    },
    {
        "name": "MiniMax-M3",
        "model_id": "minimax/minimax-m3",
        "provider": "MiniMax",
    },
    {
        "name": "MiMo-V2.5-Pro",
        "model_id": "xiaomi/mimo-v2.5-pro",
        "provider": "Xiaomi",
    },
]


def get_model_by_name(name: str):
    """Devuelve la configuración de un modelo a partir de su nombre."""
    for model in MODELS:
        if model["name"].lower() == name.lower():
            return model
    return None
