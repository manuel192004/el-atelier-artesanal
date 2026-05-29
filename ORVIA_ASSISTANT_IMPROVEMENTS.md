# Orvia Assistant v2 — Plan de Mejoras y Roadmap

**Proyecto:** Orviane  
**Componente:** Asistente conversacional "Orvia" (assistant-v2)  
**Fecha de análisis:** Mayo 2026  
**Estado actual:** Después de refuerzo fuerte de manejo de moneda (pesos colombianos)

---

## 1. Resumen Ejecutivo

El asistente Orvia tiene una base técnica sólida, especialmente en el motor de valoración de joyas. Sin embargo, su calidad percibida sigue limitada por varias debilidades estructurales:

- Alta dependencia de que los modelos LLM (OpenAI / Gemini) "no se equivoquen".
- Manejo débil de restricciones importantes (presupuesto, preferencias negativas).
- Poca transparencia hacia el usuario sobre cómo y por qué toma decisiones.
- Inconsistencia entre el camino de **reglas** (confiable) y los caminos de **LLM** (variables).

El trabajo reciente de endurecimiento de moneda fue un buen paso, pero representa solo una de varias áreas que necesitan atención seria para que Orvia se sienta como un asistente de alta joyería premium.

---

## 2. Estado Actual (Fortalezas vs Debilidades)

### Fortalezas actuales

- Motor de valoración (`valuation.js`) es maduro, con rangos realistas en COP, manejo de quilates, purezas y perfiles de gemas.
- Buena separación entre path de reglas puras y paths con LLM.
- El sistema de memoria (`memory`) captura correctamente ocasión, metal, estilo, piedra y presupuesto.
- Buen uso de "propuesta base" (`rulesReply`) como ancla para los LLMs.
- Sanitizer defensivo post-LLM para moneda (`forceColombianPesos`).
- Buen sistema de acciones sugeridas y quick replies.
- Integración razonable con el catálogo de productos.

### Debilidades principales

| Área | Nivel de madurez | Comentario |
|------|------------------|----------|
| Manejo de presupuesto como límite real | Bajo | Se detecta pero casi no se respeta |
| Memoria de restricciones negativas ("no quiero", "no me gusta") | Muy bajo | Prácticamente inexistente |
| Coherencia LLM vs Reglas | Media | El LLM puede contradecir la valoración calculada |
| Transparencia / Explicabilidad | Bajo | El usuario casi nunca ve el razonamiento |
| Calidad y consistencia de prompts LLM | Media-Alta (después de fixes) | Aún falta profundidad en restricciones |
| Experiencia de voz (Realtime) | Media-Baja | Es el camino más libre y riesgoso |
| Preguntas al usuario | Media | Sigue siendo muy genérico ("dime ocasión, tipo o estilo") |
| Manejo de correcciones del usuario | Bajo | Cambiar de opinión a mitad de conversación es frágil |
| Observabilidad y telemetría | Baja | Muy poco insight de cuándo falla |

---

## 3. Matriz de Prioridades (Impacto vs Esfuerzo)

| Mejora | Impacto en experiencia | Esfuerzo | Prioridad | Tipo |
|--------|------------------------|----------|-----------|------|
| Presupuesto como restricción real | Muy Alto | Media | **Crítica** | Funcional |
| Memoria de restricciones negativas | Alto | Media | **Crítica** | Funcional |
| Forzar respeto a valoración de reglas por parte del LLM | Alto | Media | Alta | Calidad |
| Exponer razonamiento (diagnostics) al usuario | Alto | Baja-Media | Alta | UX |
| Reducir preguntas genéricas / mejorar flujo de descubrimiento | Alto | Media | Alta | UX |
| Endurecer prompt y comportamiento de voz realtime | Alto | Media-Alta | Alta | Riesgo |
| Mejor distinción "precio material vs precio pieza" | Medio-Alto | Baja | Media-Alta | Claridad |
| Memoria de correcciones y cambios de opinión | Medio-Alto | Media | Media-Alta | Confiabilidad |
| Mejor fallback y manejo de errores | Medio | Baja | Media | Robustez |
| Telemetría y evaluación de calidad de respuestas | Medio | Media-Alta | Media | Mantenimiento |
| Mejorar phrase-bank o reemplazarlo por algo más inteligente | Bajo-Medio | Media-Alta | Baja | Técnico |

---

## 4. Mejoras Detalladas por Categoría

### 4.1 Manejo de Presupuesto y Restricciones (Máxima prioridad)

**Problema actual:**
- Se detecta presupuesto ("hasta 800 mil", "alrededor de 1.5 millones").
- Se pasa en algunos prompts y en `buildValuationMessage`.
- **Casi nunca se respeta** al recomendar productos ni al generar respuestas con LLM.

**Mejoras recomendadas:**

1. Crear una función central `isWithinBudget(estimatedRange, budgetText)` en `valuation.js`.
2. Modificar `recommendProduct()` para penalizar fuertemente productos que se salgan del presupuesto declarado.
3. En los prompts de OpenAI y Vertex, agregar instrucción explícita y repetida:
   > "Si el usuario declaró un presupuesto, nunca recomiendes nada que claramente supere ese límite. Si la valoración calculada está por encima, dilo claramente y ofrece ajustar."
4. En `buildValuationMessage`, ya dimos un primer paso. Reforzarlo y mostrarlo más prominentemente.
5. Agregar en la memoria un campo `budgetMaxCop` (número parseado) para que sea fácil de consultar.

**Criterio de éxito:** Si el usuario dice "hasta 700 mil", el asistente nunca debería recomendar una pieza de más de 1 millón sin avisar y justificar.

---

### 4.2 Memoria de Restricciones Negativas

**Problema actual:**
El asistente prácticamente no recuerda cuando el usuario rechaza algo ("no me gusta con diamantes grandes", "quiero algo discreto", "nada de pave", "prefiero evitar el amarillo").

**Mejoras recomendadas:**

1. Extender el objeto `memory` con un nuevo campo:
   ```js
   avoidedFeatures: string[]   // ["pave", "diamantes grandes", "estilo statement", "oro amarillo"]
   ```
2. Crear un detector `detectAvoidedFeatures(text)` similar a `detectStyle`.
3. Pasar `avoidedFeatures` explícitamente en todos los prompts de LLM con instrucción fuerte:
   > "Nunca recomiendes piezas ni sugerencias que contradigan las características que el usuario ya rechazó."
4. En `recommendProduct()`, aplicar penalización fuerte cuando un producto tenga features en `avoidedFeatures`.
5. Exponer las restricciones negativas en las "pills" de memoria del frontend para que el usuario pueda verlas y borrarlas.

---

### 4.3 Coherencia entre Motor de Reglas y LLM

**Problema actual:**
Cuando el intent es `quote_request` y ya existe una valoración calculada por reglas, el LLM a veces:
- Ignora el rango calculado.
- Da rangos diferentes.
- Habla de forma más genérica o inventa.

**Mejoras recomendadas:**

1. En `buildUserPrompt` (openai y vertex), pasar la valoración de forma más directiva:
   ```json
   "valuationFromRules": { ... },
   "instruction": "Si existe valuationFromRules.ready === true, úsala como fuente de verdad para cualquier número de precio. No inventes rangos distintos."
   ```
2. Fortalecer `chooseAssistantMessage` para que, cuando `valuation.ready === true`, el mensaje del LLM solo pueda hacer pulido menor, nunca reemplazar el contenido de precio.
3. Agregar validación post-respuesta del LLM que compare números mencionados contra la valoración de reglas.

---

### 4.4 Transparencia y Explicabilidad (UX)

**Problema actual:**
El usuario recibe respuestas pero casi nunca entiende el razonamiento. Los campos `diagnostics` y `guidanceCard` existen pero se usan poco.

**Mejoras recomendadas:**

1. **Frontend:** Crear un componente colapsable "Por qué te recomiendo esto" que muestre:
   - Known details
   - Missing details
   - Valuation summary (si aplica)
   - Razón de la acción sugerida
2. Cuando hay valoración, mostrar claramente el desglose (material + mano de obra + piedra) de forma amigable.
3. Permitir que el usuario haga clic en las pills de memoria para corregir ("No, en realidad es para regalo, no para compromiso").

---

### 4.5 Experiencia de Voz (Realtime)

Este es actualmente el punto más frágil del sistema.

**Problema actual:**
- Prompt más corto y permisivo que los de texto.
- Mayor riesgo de alucinaciones de precio y moneda.
- Menos estructura de "respeta la propuesta base".

**Mejoras recomendadas:**

1. Hacer que el prompt de `buildOrviaRealtimeInstructions` sea tan estricto como los de texto (o más).
2. Inyectar la valoración de reglas de forma más explícita cuando exista.
3. Agregar instrucción específica de longitud y tono para voz:
   > "Respuestas cortas (máximo 2-3 frases). Habla como una asesora calmada por teléfono, no como vendedora."
4. Considerar usar el path de reglas más agresivamente en modo voz, y solo llamar LLM cuando sea realmente necesario.

---

### 4.6 Calidad de Prompts y Seguridad

**Estado actual:** Bueno después de los últimos cambios, pero todavía mejorable.

**Mejoras recomendadas:**

1. Crear un único archivo `assistant-v2/prompts.js` que centralice:
   - `buildCurrencySafetyBlock()`
   - `buildCoreBehaviorInstructions()`
   - `buildBudgetAndConstraintsInstructions()`
   - `buildValuationRespectInstructions()`
   Esto evita que la misma instrucción viva en 3 lugares distintos.
2. Agregar tests automatizados de prompts (prompt regression tests) que validen que ciertas instrucciones críticas sigan presentes.
3. Revisar periódicamente los system prompts contra comportamientos observados en producción.

---

### 4.7 Frontend y UX del Asistente

**Mejoras recomendadas:**

1. Hacer mucho más visible el `guidanceCard` y el razonamiento.
2. Mejorar el estado vacío / primer mensaje (actualmente muy genérico).
3. Permitir editar/borrar elementos de la memoria desde la interfaz (especialmente presupuesto y restricciones).
4. Mostrar claramente cuando Orvia está usando una valoración calculada ("Esto es una estimación interna basada en...").
5. Mejorar el fallback cuando falla la API.

---

### 4.8 Observabilidad, Testing y Mantenimiento

**Mejoras recomendadas:**

1. Expandir el sistema de telemetría (`telemetry.js`) para registrar:
   - Cuándo el LLM se desvía de la valoración de reglas.
   - Tasa de uso de presupuesto declarado.
   - Frecuencia de correcciones del usuario.
2. Crear un conjunto de **golden prompts** (casos de prueba) que se ejecuten regularmente.
3. Agregar evaluación manual periódica (o semi-automática) de calidad de respuestas.
4. Limpiar y organizar mejor la carpeta `assistant-v2/` (actualmente hay algo de duplicación entre openai.js y vertex.js).

---

## 5. Orden Recomendado de Implementación

### Fase 1 — Fundamentos de Confiabilidad (4-6 semanas)
1. Presupuesto como restricción real
2. Memoria de restricciones negativas
3. Fortalecimiento de coherencia LLM ↔ Reglas (especialmente en valoraciones)

### Fase 2 — Transparencia y Confianza (3-4 semanas)
4. Exponer razonamiento al usuario (frontend + backend)
5. Mejorar flujo de preguntas y descubrimiento
6. Endurecer experiencia de voz

### Fase 3 — Pulido y Robustez (2-3 semanas)
7. Centralización de prompts
8. Mejora de fallbacks y manejo de errores
9. Telemetría y golden tests

---

## 6. Criterios de Éxito (Cómo sabremos que mejoró)

- Un usuario que declare presupuesto recibe recomendaciones que respetan ese límite >85% del tiempo.
- Cuando el usuario dice "no me gusta X", el asistente lo recuerda en al menos los siguientes 4-5 turnos.
- En modo voz, la tasa de menciones incorrectas de moneda baja a menos del 5%.
- El usuario puede entender fácilmente por qué Orvia le recomendó algo (sin tener que preguntar).
- Las respuestas de valoración son consistentes entre el path de reglas y cuando interviene el LLM.

---

## 7. Notas Adicionales

- El archivo `backend/test-currency-guard.js` fue creado como herramienta de verificación durante el trabajo de moneda. Se recomienda moverlo a `backend/scripts/` o eliminarlo una vez que se tenga un framework de tests más formal.
- Muchas de estas mejoras requieren tocar tanto backend como frontend. Es importante que el equipo de producto defina cómo quiere que el usuario "sienta" la inteligencia del asistente (más explícita vs más mágica).
- El asistente actual es significativamente mejor que la mayoría de chatbots comerciales de joyería, pero todavía está lejos de sentirse como una asesora senior experta.

---

**Documento preparado para:** Equipo de Orviane  
**Próximo paso sugerido:** Elegir 1-2 items de la Fase 1 y comenzar implementación con enfoque en pruebas y métricas claras.

---

*Este documento debe mantenerse vivo. Se recomienda actualizarlo después de cada iteración importante del asistente.*