# VIH App

Proyecto de soporte para adherencia y análisis de pacientes con VIH.

## Qué hace

- Interfaz React/Vite para mostrar datos de pacientes y métricas de adherencia.
- Utiliza Firebase para carga y lectura de información de usuarios y registros de toma de medicamentos.
- Incluye un componente de análisis inteligente que consulta modelos ML externos:
  - Random Forest
  - LSTM
- Presenta alertas, recomendaciones y explicación de resultados para apoyar la interpretación médica.

## Tecnologías principales

- React 19
- Vite
- Firebase
- Bootstrap
- FontAwesome
- React Bootstrap
- ESLint

## Estructura relevante

- `src/main.jsx` → punto de entrada de la app.
- `src/App.jsx` → componente raíz.
- `src/firebase/firebase.js` → configuración de Firebase.
- `src/components/AnalizadorInteligente.jsx` → análisis de adherencia y llamadas a modelos.
- `src/components/LoginPage.jsx` → autenticación/ingreso.
- `src/components/AdminPanel.jsx` → panel de administración.
- `src/components/RenderDataList.jsx` → renderizado de datos.
- `api/delete-user.js` → endpoint para eliminación de usuario.

## Cómo ejecutar

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Iniciar servidor de desarrollo:
   ```bash
   npm run dev
   ```
3. Compilar para producción:
   ```bash
   npm run build
   ```

## Lógica de análisis

- `AnalizadorInteligente` construye un historial de adherencia desde `usuario.tomas`.
- Calcula métricas psicossociales sobre `usuario.seguimiento`.
- Consulta los modelos ML y muestra sus señales, junto con explicaciones para el médico.

## Notas para el bot de soporte

- La app está diseñada para ayudar a médicos y personal de salud a interpretar adherencia a tratamiento.
- Los resultados del modelo incluyen probabilidad (`prob`), predicción de toma (`will_take`) y nivel de riesgo (`risk`).
- Si hay menos de 6 días de datos, la app muestra un mensaje de insuficiencia de datos.
- El flujo principal es: cargar paciente → generar análisis → mostrar alertas y recomendaciones.
