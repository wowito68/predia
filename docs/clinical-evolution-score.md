# PREDIA — Fundamentos Matemáticos del Sistema de Evolución Clínica

> Fases 2 y 3. Definiciones formales de las métricas longitudinales y del
> **Clinical Evolution Score (CES)**. Toda constante está justificada clínicamente.

## 0. Notación

Para una variable clínica $x$ de un paciente se observa la serie irregular
$\{(t_i, x_i)\}_{i=1}^{n}$, con $t_i$ en **días** desde la primera medición
($t_1 = 0$). Media temporal $\bar t = \frac1n\sum t_i$, media $\bar x = \frac1n\sum x_i$.
Las pendientes se expresan en **unidades por mes** (1 mes = 30 días).

## 1. Tendencia — Regresión lineal (mínimos cuadrados)

$$\beta = \frac{\sum_{i}(t_i-\bar t)(x_i-\bar x)}{\sum_i (t_i-\bar t)^2}, \qquad
\alpha = \bar x - \beta\,\bar t$$

$$R^2 = 1 - \frac{\sum_i (x_i-\hat x_i)^2}{\sum_i (x_i-\bar x)^2}, \quad \hat x_i = \alpha + \beta t_i$$

- $\beta$ (pendiente, unidades/día) → se reporta $\beta_{\text{mes}} = 30\beta$.
- $R^2\in[0,1]$: **calidad/consistencia** de la tendencia (cercano a 1 = tendencia
  limpia; cercano a 0 = ruido sin dirección clara).
- Interpretación: $\beta>0$ creciente, $\beta<0$ decreciente, $|\beta_{\text{mes}}|$ pequeño = estable.

**Pendiente promedio (extremos):** $\bar\beta = \dfrac{x_n - x_1}{t_n - t_1}$ — referencia simple; se prefiere $\beta$ (OLS) por robustez al ruido.

## 2. Velocidad de cambio

$$\frac{dx}{dt} \approx \beta \;\;(\text{unidades/día}) \;\Rightarrow\; v = 30\beta \;\;(\text{unidades/mes})$$

Ejemplos de unidades clínicas: kg/mes (peso), mg/dL por mes (glucosa), mmHg/mes (PA).

## 3. Aceleración clínica

Ajuste cuadrático por mínimos cuadrados $x(t)=a t^2 + b t + c$ (requiere $n\ge3$):

$$\frac{d^2x}{dt^2} = 2a$$

- $2a>0$ con $\beta>0$: **deterioro acelerado** (empeora cada vez más rápido).
- $2a<0$ con $\beta<0$: **mejora acelerada**.
- $2a\approx 0$: tendencia lineal/estable.

## 4. Volatilidad

Desviación estándar temporal: $\sigma = \sqrt{\frac1{n-1}\sum_i (x_i-\bar x)^2}$.

Coeficiente de variación $CV = \sigma/|\bar x|$ (clasifica estable vs fluctuante).
Adicional: desviación de los **residuos** respecto a la tendencia
$\sigma_{\text{resid}}=\sqrt{\frac1{n-2}\sum_i(x_i-\hat x_i)^2}$ (fluctuación independiente de la tendencia).

- $CV < 0.10$: paciente **estable**. $CV \ge 0.20$: **fluctuante**.

## 5. Promedios móviles

Media móvil de ventana $k$ (suaviza ruido): $\text{MM}_k(i)=\frac1k\sum_{j=i-k+1}^{i} x_j$, para $k\in\{3,5,10\}$.

## 6. Clinical Evolution Score (CES)

Indicador propio en escala **0–100** donde **50 = sin cambio (estable)**,
**>50 = evolución favorable**, **<50 = evolución desfavorable**.

### 6.1 Puntaje direccional por variable

Para cada variable donde *disminuir es clínicamente bueno*
(glucosa, IMC, PAS, PAD):

$$s_v = \operatorname{clip}\!\Big(\frac{-\,\beta_{\text{mes},v}}{\kappa_v},\,-1,\,1\Big)\in[-1,1]$$

$s_v=+1$ mejora fuerte, $-1$ empeoramiento fuerte, $0$ estable. $\kappa_v$ es el
**cambio mensual clínicamente fuerte** (ancla del trend), justificado porque,
sostenido ~6 meses, produce un cambio clínicamente relevante:

| Variable | $\kappa_v$ (por mes) | Justificación (efecto a 6 meses) |
|---|---|---|
| Glucosa | 10 mg/dL | −60 mg/dL: cambio mayor de control glucémico |
| IMC | 0.5 | −3 puntos: ~una categoría de IMC |
| PAS | 5 mmHg | −30 mmHg: reclasificación de estadio HTA |
| PAD | 3 mmHg | −18 mmHg: reclasificación de estadio HTA |

### 6.2 Composite de tendencia

$$T = 0.5 + 0.5\cdot\frac{\sum_v \omega_v\, s_v}{\sum_v \omega_v}\in[0,1]$$

Pesos clínicos $\omega_v$ (prioridad en el manejo de diabetes; se renormalizan
sobre las variables con datos):

| Variable | $\omega_v$ | Razón |
|---|---|---|
| Glucosa | 0.40 | Marcador directo de control glucémico |
| IMC | 0.25 | Factor de riesgo modificable principal |
| PAS | 0.20 | Comorbilidad de alto impacto |
| PAD | 0.15 | Comorbilidad |

### 6.3 Composite de estabilidad

$$\text{stab}_v=\operatorname{clip}\!\Big(1-\frac{CV_v}{CV_{\max}},0,1\Big),\quad CV_{\max}=0.20;\qquad S=\frac1{|V|}\sum_{v\in V}\text{stab}_v$$

### 6.4 Fórmula final

Sea $\bar s=\dfrac{\sum_v \omega_v s_v}{\sum_v \omega_v}\in[-1,1]$ el índice direccional
ponderado (equivale a $T=0.5+0.5\,\bar s$). La **volatilidad penaliza** la confianza en la tendencia:

$$W=\operatorname{clip}\big(\bar s-\mu\,(1-S),\,-1,\,1\big),\quad \mu=0.5$$

$$\boxed{\;\text{CES} = 50\,(1+W)\;}$$

**Justificación:** con esta forma, **CES = 50 ⟺ paciente estable y consistente**
($\bar s=0$, $S\to1$); CES > 50 evolución favorable, CES < 50 desfavorable. La
penalización $\mu(1-S)$ refleja que un perfil **errático** (alta volatilidad)
resta fiabilidad a la tendencia observada — clínicamente indeseable aunque la
pendiente promedio parezca favorable. $\mu=0.5$ hace que una volatilidad máxima
($S=0$) descuente hasta 0.5 del índice direccional.

### 6.5 Bandas de interpretación

| CES | Interpretación |
|---|---|
| ≥ 70 | Mejoría clara |
| 56–69 | Mejoría leve |
| 45–55 | Estable |
| 30–44 | Deterioro leve |
| < 30 | Deterioro marcado |

## 7. Ejemplo numérico resuelto

Paciente con (pendientes OLS ya en /mes, media y σ):

| Var | $\beta_{\text{mes}}$ | media | $\sigma$ | $s_v$ | $CV$ | $\text{stab}_v$ |
|---|---|---|---|---|---|---|
| Glucosa | −8 mg/dL | 120 | 12 | $\min(8/10,1)=0.80$ | 0.100 | $1-0.50=0.50$ |
| IMC | −0.3 | 29.0 | 0.4 | $0.3/0.5=0.60$ | 0.014 | 0.93 |
| PAS | +1 mmHg | 128 | 5 | $-1/5=-0.20$ | 0.039 | 0.80 |
| PAD | 0 | 82 | 3 | 0.00 | 0.037 | 0.82 |

$$\bar s = \frac{0.40(0.80)+0.25(0.60)+0.20(-0.20)+0.15(0)}{1.00} = 0.43,
\qquad S = \tfrac14(0.50+0.93+0.80+0.82) = 0.763$$
$$W = \operatorname{clip}\big(0.43 - 0.5(1-0.763),\,-1,1\big) = 0.43 - 0.1185 = 0.3115$$
$$\text{CES} = 50\,(1+0.3115) = \mathbf{65.6}\approx 66$$

→ **CES ≈ 66 (Mejoría leve)**, explicable como: *glucosa mejorando (peso 40%),
IMC mejorando (25%), PAS con leve empeoramiento (20%), PAD estable; baja-moderada
volatilidad (S=0.76), que apenas penaliza la tendencia.*

## 8. Detección de eventos (Fase 4)

Reglas sobre las métricas anteriores (severidad info/warning/critical):

| Evento | Condición |
|---|---|
| Glucosa aumentando rápidamente | $\beta_{\text{mes,glu}} \ge +8$ mg/dL **o** ($\beta>0$ y $2a>0$) |
| IMC creciendo de forma sostenida | $\beta_{\text{mes,IMC}}>0$, $R^2\ge0.5$, $n\ge3$ |
| Presión arterial empeorando | $\beta_{\text{mes,PAS}}\ge+3$ **o** $\beta_{\text{mes,PAD}}\ge+2$ |
| Paciente clínicamente estable | todas $|s_v|<0.2$ y $S\ge0.8$ |
| Mejora significativa (90 días) | en la ventana de 90 d, glucosa e IMC con $\beta<0$ y CES≥65 |
