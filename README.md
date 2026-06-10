# WorldCupBench ⚽🏆

**WorldCupBench** es un benchmark para comparar las predicciones de distintos modelos de IA de última generación (SOTA) sobre la **Copa Mundial de la FIFA 2026™** (Canadá, México y EE.UU.).

Cada modelo recibe el **mismo prompt estándar** con información del torneo y debe predecir, en formato JSON:

- Todos los partidos de la **fase de grupos** (72 partidos, 12 grupos A–L).
- Los **clasificados** de cada grupo (1°, 2° y los 8 mejores terceros).
- Los ganadores de cada ronda de la **fase eliminatoria** (Ronda de 32 → Ronda de 16 → Cuartos → Semis → 3er puesto + Final).
- Las **posiciones finales**: Campeón (1°), Subcampeón (2°), Tercer Lugar (3°) y Cuarto Lugar (4°).

El objetivo es, una vez disputado el torneo, medir qué modelo predijo mejor los resultados.

> El Mundial 2026 comienza el **11 de junio de 2026** (partido inaugural: México vs. Sudáfrica) y la final se disputa el **19 de julio de 2026**.

---

## 📁 Estructura del proyecto

```
.
├── README.md                  # Este archivo
├── .env.example               # Plantilla para OPENROUTER_API_KEY
├── .gitignore
├── requirements.txt
├── schema/
│   └── predictions_schema.json   # Esquema JSON de las predicciones
├── prompts/
│   └── prediction_prompt.txt     # Prompt estándar para TODOS los modelos
├── src/
│   ├── run_predictions.py        # Script principal (OpenRouter)
│   ├── models_config.py          # Lista de modelos y sus IDs en OpenRouter
│   └── utils.py                  # Utilidades (carga, parseo, validación, guardado)
├── predictions/                  # Aquí se guardan los JSON de cada modelo
├── data/
│   └── world_cup_2026_info.md    # Información del torneo (fuente del prompt)
└── dashboard/                    # Placeholder para visualización (futuro)
```

---

## 🤖 Modelos comparados (SOTA, junio 2026)

| Modelo | Proveedor |
| --- | --- |
| GPT-5.5 | OpenAI |
| Claude Opus 4.8 | Anthropic |
| Gemini 3.1 Ultra | Google |
| Grok 3 | xAI |
| DeepSeek V4-Pro | DeepSeek |
| Qwen 3.7 Max | Alibaba |
| Kimi K2.6 | Moonshot AI |
| GLM-5 | Zhipu AI |
| MiniMax M3 | MiniMax |
| MiMo V2.5-Pro | Xiaomi |

Los identificadores exactos de OpenRouter se definen en [`src/models_config.py`](src/models_config.py). Verifica/ajusta los `model_id` en [openrouter.ai/models](https://openrouter.ai/models) según disponibilidad.

---

## ⚙️ Configuración (setup)

1. **Clona el repositorio:**
   ```bash
   git clone https://github.com/mverab/WorldCupBench.git
   cd WorldCupBench
   ```

2. **Crea un entorno virtual e instala las dependencias:**
   ```bash
   python -m venv venv
   source venv/bin/activate   # En Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configura tu clave de OpenRouter:**
   ```bash
   cp .env.example .env
   # Edita .env y coloca tu clave, o bien exporta la variable:
   export OPENROUTER_API_KEY="tu_clave"
   ```
   Obtén tu clave en [openrouter.ai/keys](https://openrouter.ai/keys).

---

## ▶️ Uso

Ejecutar las predicciones de **todos** los modelos:
```bash
python src/run_predictions.py
```

Ejecutar solo **algunos** modelos:
```bash
python src/run_predictions.py --models GPT-5.5 Grok-3
```

Modo de prueba **sin llamar a la API** (valida configuración y prompt):
```bash
python src/run_predictions.py --dry-run
```

Las predicciones de cada modelo se guardan en:
```
predictions/{model_name}_predictions.json
```

---

## 🧩 Esquema de predicciones

El archivo [`schema/predictions_schema.json`](schema/predictions_schema.json) define la estructura esperada (JSON Schema draft-07). Cada predicción de partido incluye: `match_id`, `team_a`, `team_b`, `predicted_winner`, `predicted_score`, `confidence`, además de metadatos del modelo (`model_name`, `timestamp`). El script valida automáticamente las respuestas contra este esquema.

---

## 🛣️ Roadmap

- [x] Estructura inicial del proyecto (MVP).
- [x] Prompt estándar y esquema de predicciones.
- [x] Script de ejecución vía OpenRouter con reintentos.
- [ ] Recolección de resultados reales del torneo.
- [ ] Cálculo de métricas de acierto (accuracy, Brier score).
- [ ] Dashboard de comparación de modelos.

---

## 📄 Licencia

Proyecto con fines educativos y de investigación. Los datos del torneo provienen de fuentes oficiales de la FIFA (ver `data/world_cup_2026_info.md`).
