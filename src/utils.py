"""
Utilidades comunes para WorldCupBench: carga de prompt, parseo de respuestas JSON,
validación contra el esquema y guardado de predicciones.
"""

import json
import os
import re
from datetime import datetime, timezone

# Rutas base del proyecto (relativas a la raíz del repositorio).
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROMPT_PATH = os.path.join(BASE_DIR, "prompts", "prediction_prompt.txt")
SCHEMA_PATH = os.path.join(BASE_DIR, "schema", "predictions_schema.json")
PREDICTIONS_DIR = os.path.join(BASE_DIR, "predictions")


def load_prompt(path: str = PROMPT_PATH) -> str:
    """Lee y devuelve el contenido del prompt estándar."""
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def load_schema(path: str = SCHEMA_PATH) -> dict:
    """Carga el esquema JSON de predicciones."""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def now_iso() -> str:
    """Devuelve la fecha-hora actual en formato ISO 8601 (UTC)."""
    return datetime.now(timezone.utc).isoformat()


def extract_json(text: str):
    """
    Extrae un objeto JSON de la respuesta de un modelo.

    Maneja casos comunes donde el modelo envuelve el JSON en bloques de código
    markdown (```json ... ```) o agrega texto antes/después.
    Devuelve el dict parseado o lanza ValueError si no se puede parsear.
    """
    if not text or not text.strip():
        raise ValueError("Respuesta vacía del modelo.")

    # 1) Intentar parsear directamente.
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 2) Quitar fences de markdown ```json ... ``` o ``` ... ```.
    fence_match = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if fence_match:
        try:
            return json.loads(fence_match.group(1))
        except json.JSONDecodeError:
            pass

    # 3) Tomar desde la primera '{' hasta la última '}'.
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        candidate = text[start:end + 1]
        return json.loads(candidate)

    raise ValueError("No se pudo extraer JSON válido de la respuesta del modelo.")


def validate_predictions(data: dict, schema: dict) -> tuple:
    """
    Valida las predicciones contra el esquema JSON.

    Devuelve (es_valido: bool, mensaje: str). Si la librería `jsonschema` no
    está instalada, hace una validación mínima de claves de nivel superior.
    """
    required_top = [
        "model_name",
        "timestamp",
        "group_stage_matches",
        "group_qualifiers",
        "knockout_stage",
        "final_standings",
    ]
    try:
        import jsonschema
        from jsonschema import Draft7Validator

        validator = Draft7Validator(schema)
        errors = sorted(validator.iter_errors(data), key=lambda e: e.path)
        if errors:
            msgs = "; ".join(
                f"{'/'.join(map(str, e.path))}: {e.message}" for e in errors[:5]
            )
            return False, f"Errores de esquema: {msgs}"
        return True, "OK"
    except ImportError:
        # Validación mínima de respaldo.
        missing = [k for k in required_top if k not in data]
        if missing:
            return False, f"Faltan claves obligatorias: {missing}"
        return True, "OK (validación mínima, instala 'jsonschema' para validación completa)"


def save_predictions(model_name: str, data: dict, predictions_dir: str = PREDICTIONS_DIR) -> str:
    """
    Guarda las predicciones de un modelo en predictions/{model_name}_predictions.json.

    Devuelve la ruta del archivo guardado.
    """
    os.makedirs(predictions_dir, exist_ok=True)
    safe_name = model_name.replace("/", "_").replace(" ", "_")
    out_path = os.path.join(predictions_dir, f"{safe_name}_predictions.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return out_path
