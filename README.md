# El Atelier Artesanal

Experiencia web para joyeria personalizada con catalogo editorial, configurador, area de cliente y asistente conversacional `Atel-IA`.

![Vista principal](./frontend/public/aretes-hero.png)

## Lo que incluye

- `Frontend` en React + Vite con experiencia optimizada para colecciones, configurador y cuenta.
- `Backend` en Express con autenticacion, citas, cotizaciones, favoritos y memoria del asistente.
- `PostgreSQL` como almacenamiento principal para usuarios, citas, cotizaciones y contexto del bot.
- `Docker Compose` para levantar todo el stack local en una sola orden.
- Registro e inicio de sesion con Google.
- Integracion de IA para `Atel-IA` usando Azure OpenAI u OpenAI directa, segun variables.

## Stack

- React 19
- Vite
- Express 5
- PostgreSQL
- Docker / Docker Compose
- Google Identity Services
- Azure OpenAI / OpenAI API

## GitHub

El repositorio queda preparado para trabajar mejor en equipo:

- workflow de CI para validar `backend` y `frontend`
- plantillas de issues para bugs y mejoras
- plantilla de pull request para revisiones mas ordenadas
- tag y release `v1.0.0` para el relanzamiento

## Arranque rapido

1. Completa los archivos de entorno:
   - [`.env.example`](./.env.example) en la raiz
   - [`backend/.env.example`](./backend/.env.example)
   - [`frontend/.env.example`](./frontend/.env.example)
2. Crea tus archivos reales `.env` a partir de esos ejemplos.
3. Ejecuta:

```bash
docker compose up --build
```

4. Abre:
   - `http://localhost:5173` para la web
   - `http://localhost:3001/api/health` para comprobar la API

## Servicios locales

- `frontend` -> `http://localhost:5173`
- `backend` -> `http://localhost:3001`
- `postgres` -> `localhost:5432`

## Variables importantes

### Raiz

- `GOOGLE_APPLICATION_CREDENTIALS_HOST`

### Frontend

- `VITE_API_BASE_URL`
- `VITE_GOOGLE_CLIENT_ID`

### Backend

- `PORT`
- `DATABASE_URL`
- `GOOGLE_CLIENT_ID`
- `JWT_SECRET`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_DEPLOYMENT`
- `OPENAI_API_KEY`
- `OPENAI_ASSISTANT_MODEL`

## Registro con Google

La app ya trae el flujo preparado:

- `POST /api/auth/google` valida el token desde el backend.
- Si el usuario no existe, se crea en PostgreSQL.
- Si ya existe con el mismo email, se vincula la cuenta.
- El acceso se muestra en la pagina de cuenta.

### Configuracion en Google Cloud

1. Ve a `APIs & Services > OAuth consent screen`.
2. Ve a `APIs & Services > Credentials > Create credentials > OAuth client ID`.
3. Elige `Web application`.
4. Agrega estos origenes autorizados:
   - `http://localhost`
   - `http://localhost:5173`
   - `http://127.0.0.1:5173`

Despues pega el `client id` en:

- `frontend/.env` como `VITE_GOOGLE_CLIENT_ID`
- `backend/.env` como `GOOGLE_CLIENT_ID`

## IA del asistente

`Atel-IA` puede funcionar de dos maneras:

- Con `Azure OpenAI`, si defines `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY` y `AZURE_OPENAI_DEPLOYMENT`.
- Con `OpenAI` directa, si defines `OPENAI_API_KEY` y `OPENAI_ASSISTANT_MODEL`.

Si ninguna esta activa, el asistente usa un modo de reglas como respaldo.

## Credenciales de Google Cloud en Docker

El backend esta listo para montar tu JSON de service account desde Windows usando la variable de raiz `.env`:

```env
GOOGLE_APPLICATION_CREDENTIALS_HOST=C:/ruta/a/tu/service-account.json
```

Dentro del contenedor se expone como:

```text
/app/secrets/gcp-service-account.json
```

## Scripts utiles

Desde la raiz del proyecto:

```bash
npm run dev
npm run down
npm run logs
npm run frontend:build
npm run backend:check
```

## Despliegue recomendado

La opcion mas practica que deje preparada es:

- `Netlify` para el frontend
- `Render` para el backend y PostgreSQL

Archivos incluidos para eso:

- [`netlify.toml`](./netlify.toml)
- [`render.yaml`](./render.yaml)

### Netlify

1. Crea un sitio conectado a este repositorio.
2. Netlify tomara el build desde `netlify.toml`.
3. Define en el panel:
   - `VITE_API_BASE_URL`
   - `VITE_GOOGLE_CLIENT_ID`

### Render

1. Crea un Blueprint desde este repositorio.
2. Render leera `render.yaml` y te preparara:
   - un servicio web para `backend`
   - una base PostgreSQL gestionada
3. Completa las variables sensibles en el dashboard:
   - `FRONTEND_ORIGINS`
   - `GOOGLE_CLIENT_ID`
   - `AZURE_OPENAI_API_KEY` y compañia, o `OPENAI_API_KEY`
   - `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` si quieres generacion visual en cloud

### Nota de Google Cloud para produccion

En despliegue cloud ya no dependes solo de un archivo local. El backend ahora acepta tambien:

- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64`

Eso permite llevar Vertex AI a Render sin montar manualmente un archivo dentro del servidor.

## Estado del proyecto

Actualmente el proyecto ya incluye:

- experiencia responsive refinada
- catalogo por colecciones con fichas relacionadas
- flujo de producto -> configurador -> cita
- area de cliente con citas, cotizaciones y favoritos
- `Atel-IA` con memoria y acciones rapidas

## Nota

Los archivos sensibles y datos locales como `.env`, `node_modules` y datos temporales ya estan excluidos del repositorio para que el relanzamiento en GitHub quede limpio.
