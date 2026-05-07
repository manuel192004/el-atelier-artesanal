# Propuesta de Rebrand

Fecha de analisis: 7 de mayo de 2026

## 1. Diagnostico rapido

El proyecto esta muy bien orientado a un territorio premium:

- joyeria personalizada
- historia familiar y oficio artesanal
- atencion guiada por WhatsApp
- colecciones, citas y configurador
- un asistente apoyado por IA

El problema no esta en la idea del negocio. El problema esta en la fortaleza juridica y marcaria del nombre actual.

`El Atelier Artesanal` funciona bien como tono, pero es debil como activo de marca porque:

- `atelier` es una palabra muy usada en moda, joyeria, arte y oficios
- `artesanal` describe una cualidad del producto o del proceso
- el conjunto suena elegante, pero tiene poco filo distintivo
- el logo actual depende casi por completo del texto

En el proyecto, la marca actual aparece en metadatos, textos comerciales, manifiesto, favicon, manifest, WhatsApp, backend y nombres tecnicos. No es solo un logo: es una capa transversal del producto.

## 2. Lo que conviene hacer

Mi recomendacion principal no es "buscar otro nombre parecido", sino cambiar la arquitectura de marca:

### Ruta recomendada

Usar una **marca inventada o seminventada** como nombre principal y dejar la parte descriptiva fuera del signo principal.

Formula recomendada:

`[marca distintiva] + descriptor comercial`

Ejemplos de descriptor:

- alta joyeria personalizada
- joyeria de autor
- joyeria fina a medida
- piezas con historia

Ejemplo estructural:

- `ORVIANE`
- descriptor: `alta joyeria personalizada`

No te lo pongo como garantia de registro. Te lo propongo como **direccion correcta**: palabra distintiva arriba, descripcion abajo.

## 3. Por que recomiendo salir de "Atelier"

Lo mas importante para no volver a chocar al registrar es esto:

- no usar `atelier` como eje del nuevo nombre
- no usar `artesanal` como eje del nuevo nombre
- no depender de un logo tipografico para "salvar" un nombre debil

La SIC explica que los signos descriptivos, genericos o usuales tienen problemas de distintividad, y que agregar pequeños recursos graficos no siempre resuelve eso. Tambien diferencia entre marca, nombre comercial y razon social, asi que no basta con cambiar el nombre de empresa si la marca sigue siendo debil.

## 4. Mi idea mas fuerte para tu marca

Si me pides una sola direccion, esta es:

### Concepto

Una marca de nombre propio, sonora, elegante y breve, que suene a casa de joyeria contemporanea, no a taller generico.

### Recomendacion de enfoque

- marca principal: palabra inventada
- tono verbal: calido, refinado, humano
- descriptor fijo: `alta joyeria personalizada`
- narrativa: herencia, detalle, oficio y tecnologia al servicio de piezas con valor emocional

### Nombre conceptual recomendado

`ORVIANE`

Por que esta linea si encaja:

- se aleja del eje descriptivo de `atelier artesanal`
- suena premium y femenino sin ser fragil
- funciona mejor como dominio, favicon, monograma y empaque
- te permite escalar a colecciones, sublineas y asistente sin sonar generico

### Reserva

Antes de enamorarte del nombre, hay que validar el mismo dia:

1. homonimia en registro mercantil
2. antecedentes marcarios en SIPI
3. dominio web
4. usuario en Instagram y TikTok

Si `ORVIANE` falla, la regla no cambia: mantener la estructura de marca inventada + descriptor.

## 5. Direccion de logo

No recomiendo rehacer el logo como otro texto elegante y ya.

Recomiendo un sistema en 3 piezas:

### A. Monograma

Un simbolo simple y registrable:

- `O` intervenida con corte de gema
- o una `O` abierta con trazo de engaste
- o un sello circular con tension entre oficio y precision

### B. Wordmark

`ORVIANE` en serif refinada, menos ornamental que el logo actual y con mejor lectura en pequeno.

### C. Descriptor

`alta joyeria personalizada`

Siempre separado visualmente del nombre principal.

## 6. Para evitar problemas de autor

Esto es clave:

- no copies naming, icono ni composicion de otra joyeria
- no uses logos generados "parecidos a Cartier, Tiffany, Bvlgari, etc."
- no uses imagenes de terceros sin licencia
- si el logo final sale de IA, no lo dejes como salida cruda
- convierte el concepto en una version final trabajada por una persona en vector

En Colombia, la DNDA ha indicado que los resultados generados por IA no son susceptibles de inscripcion en el Registro Nacional del Derecho de Autor cuando no son producto de creacion humana. Por prudencia, el logo final debe tener intervencion humana real y documentable.

## 7. Clases que deberias revisar para registro

Segun la Clasificacion de Niza, para este proyecto las clases mas probables son:

- `Clase 14`: joyeria, piedras preciosas y articulos relacionados
- `Clase 35`: comercializacion y venta al por menor, incluida la venta por web
- `Clase 40`: fabricacion por encargo, si vas a ofrecer piezas hechas a medida para terceros

Clase opcional a evaluar:

- `Clase 42`: solo si en el futuro conviertes el configurador o el asistente en un servicio tecnologico propio para terceros

## 8. Que cambiar dentro de este proyecto

### Cambios visibles

- `frontend/index.html`
- `frontend/public/site.webmanifest`
- `frontend/src/components/common/PageMeta.jsx`
- `frontend/src/components/common/Header.jsx`
- `frontend/src/components/common/Footer.jsx`
- `frontend/src/pages/HomePage.jsx`
- `frontend/src/pages/AtelierPage.jsx`
- `frontend/src/pages/ColeccionesPage.jsx`
- `frontend/src/pages/ConfiguratorPage.jsx`
- `frontend/src/pages/AccountPage.jsx`
- `frontend/src/features/assistant-v2/AtelierAssistantV2.jsx`

### Cambios tecnicos y de despliegue

- `package.json`
- `README.md`
- `docker-compose.yml`
- `backend/.env.example`
- `backend/src/server.js`
- `backend/src/assistant-v2/vertex.js`
- `frontend/public/logo-atelier.png`
- dominio actual y metadatos Open Graph

## 9. Orden correcto para hacerlo sin riesgo

1. Definir el nuevo nombre principal
2. Validar homonimia y antecedentes marcarios
3. Cerrar dominio y redes
4. Diseñar logo final con intervencion humana real
5. Reemplazar branding del frontend
6. Renombrar backend, variables, URLs y metadata
7. Ajustar el nombre del asistente

## 10. Mi recomendacion final

La mejor idea para protegerte mejor no es seguir muy cerca de `El Atelier Artesanal`.

La mejor idea es:

- abandonar el eje `atelier`
- escoger una marca mas distintiva
- dejar lo descriptivo como subtitulo
- redibujar el logo con criterio humano y vectorial
- registrar como minimo en clases 14 y 35, y evaluar 40

Si hoy tuviera que tomar la direccion mas sensata para este proyecto, haria esto:

- nueva marca: `ORVIANE`
- descriptor: `alta joyeria personalizada`
- asistente: `Orvia`
- logo: monograma `O` + wordmark serif + descriptor discreto

## 11. Fuentes consultadas

- SIC, informacion de marcas: https://www.sic.gov.co/marcas
- SIC, antes de solicitar marcas: https://www.sic.gov.co/marcas/antes-de-solicitar
- SIC, nombres y enseñas comerciales: https://www.sic.gov.co/content/antes-de-solicitar-nombres-y-ense%C3%B1as-comerciales
- SIC, solicitud y costos del registro: https://www.sic.gov.co/node/82
- SIC, marcas con elementos nominativos debiles: https://www.sic.gov.co/content/las-marcas-compuestas-por-elementos-nominativos-d%C3%A9biles-figleaf-trademarks-o-marcas-hoja
- CCB, consulta de homonimia: https://www.ccb.org.co/servicios/crea-tu-empresa/constituye-tu-empresa/consulta-de-nombre
- WIPO Nice, clase 14: https://nclpub.wipo.int/enfr/?class_number=14&lang=en&menulang=en&mode=flat&notion=modifications&version=20180101
- WIPO Nice, clase 35: https://nclpub.wipo.int/enfr/?class_number=35&lang=en&menulang=en&mode=flat&notion=modifications&version=20170101
- WIPO Nice, clase 40: https://nclpub.wipo.int/esen/?basic_numbers=show&class_number=40&explanatory_notes=show&lang=es&menulang=en&mode=flat&notion=&pagination=no&version=20190101
- DNDA Colombia, pronunciamientos sobre IA: https://www.derechodeautor.gov.co/es/pronunciamientos-sobre-ia

## 12. Nota importante

Esto es una recomendacion estrategica y operativa, no un concepto juridico individual. Antes de presentar la solicitud final, conviene validar el nombre exacto y las clases exactas con un abogado de propiedad industrial o con un agente marcario en Colombia.
