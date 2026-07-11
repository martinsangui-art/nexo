# Plan de optimización NEXO — pasos para Claude Code

> **ESTADO: COMPLETADO (11 jul 2026).** Los 12 pasos de este plan ya se
> ejecutaron y están commiteados en `main`. Ver "Estado final" al fondo
> de este archivo para el resumen y los pendientes de limpieza. Este
> documento queda como registro histórico del refactor — si arrancás
> un chat nuevo sobre NEXO, leé primero la sección de "Estado final".

Cómo usar esto:

1. Abrí Claude Code en la carpeta `nexo-preview`.
2. Copiá y pegá **un solo PASO por vez** (son prompts completos, listos para pegar tal cual).
3. Dejá que termine, revisá que la verificación indicada dé OK, y recién ahí pasá al siguiente.
4. Cada paso termina con un commit propio → si algo se rompe, `git revert` de ese commit y listo, no perdés nada de lo anterior.
5. Podés cortar acá cualquier día (por cuota) y retomar mañana en el paso que sigue — cada PASO es independiente y no depende de que Claude Code recuerde la conversación anterior.

Progreso (marcá a medida que completás):

- [x] PASO 1 — Limpieza rápida
- [x] PASO 2 — Code-splitting de importadores pesados
- [x] PASO 3 — Helpers compartidos + átomos visuales
- [x] PASO 4 — Sidebar + TarjetaEsp
- [x] PASO 5 — Dashboard + PanelEquipo
- [x] PASO 6 — PanelOrganizaciones + ModalNuevaOrganizacion
- [x] PASO 7 — PanelAlertas + PanelMetricas
- [x] PASO 8 — PanelDetalle
- [x] PASO 9 — ModalNuevo + limpieza final de App.jsx
- [x] PASO 10 — Hook genérico useSupabaseTable
- [x] PASO 11 — useAuth() duplicado
- [x] PASO 12 — alert() → toasts

---

## PASO 1 — Limpieza rápida

```
Estoy en el proyecto NEXO (Vite + React + Supabase), carpeta nexo-preview.

Quiero una limpieza rápida y de bajo riesgo en src/App.jsx, sin tocar nada funcional:

1. Borrá por completo el bloque de datos DEMO que está comentado con /* ... */
   (empieza en el comentario "// DEMO: datos mock originales, comentados —
   reemplazados por useEspecialistas()." y termina en el */ que cierra el
   array DEMO). Ya no se usa, está ahí solo como referencia vieja.

2. Revisá los imports del top de App.jsx y borrá cualquiera que no se use
   en el archivo (podés confirmarlo con grep de cada símbolo importado).

3. Correé `npm run lint` (oxlint) y confirmá que no queda ningún error
   nuevo por variables/imports no usados.

4. Corré `npm run dev`, abrí la app en el browser, click por las 6
   pestañas del sidebar (Dashboard, Equipo, Organizaciones, Objetivos,
   Alertas, Métricas) y confirmá en la consola del navegador que no
   aparece ningún error rojo. Sacá un screenshot de la vista Dashboard
   para confirmar que se ve igual que antes.

5. Si todo está OK, hacé commit con el mensaje:
   "chore: elimina datos DEMO comentados e imports sin uso"

No cambies ninguna otra cosa del archivo en este paso.
```

---

## PASO 2 — Code-splitting de importadores pesados

```
Estoy en el proyecto NEXO (Vite + React + Supabase), carpeta nexo-preview.

Problema: src/App.jsx importa de forma estática
`importarPolizasDesdeExcel` desde ./lib/importarPolizas y
`importarSignosDesdeArchivos` desde ./lib/importarSignos. Esos dos
módulos a su vez importan xlsx, jszip y pdfjs-dist — tres librerías
pesadas que terminan en el bundle principal aunque el usuario nunca
haga clic en "Importar". Quiero que esas librerías solo se carguen
cuando hagan falta (code-splitting), usando import() dinámico.

Hacé esto en src/App.jsx:

1. Buscá el import estático de importarPolizasDesdeExcel y borralo.
2. Buscá el import estático de importarSignosDesdeArchivos y borralo.
3. Dentro de la función `manejarArchivoPolizas`, antes de llamar a
   `importarPolizasDesdeExcel(...)`, agregá:
   `const { importarPolizasDesdeExcel } = await import("./lib/importarPolizas");`
4. Dentro de la función `manejarArchivoSignos`, antes de llamar a
   `importarSignosDesdeArchivos(...)`, agregá:
   `const { importarSignosDesdeArchivos } = await import("./lib/importarSignos");`
5. Confirmá que ambas funciones (manejarArchivoPolizas y
   manejarArchivoSignos) ya son `async` — si no lo son, hacelas async.

Verificación:
- Corré `npm run build` y fijate en el resumen final de Vite: ahora
  debería aparecer al menos un chunk nuevo separado (algo con "xlsx",
  "jszip" o "pdf" en el nombre) además del chunk principal — eso
  confirma que el code-splitting funcionó. Contame los tamaños de
  chunk antes/después si podés compararlos.
- Corré `npm run dev`, andá a la pestaña Organizaciones, probá
  "Importar pólizas" con un Excel de prueba (o cancelá el file picker
  si no tenés uno a mano, solo para confirmar que no explota al
  abrir el diálogo) y "Importar Signos" de la misma forma. Revisá la
  consola del navegador — cero errores rojos.

Si todo está OK, hacé commit:
"perf: carga xlsx/jszip/pdfjs-dist de forma diferida (code-splitting)"
```

---

## PASO 3 — Helpers compartidos + átomos visuales

```
Estoy en el proyecto NEXO (Vite + React + Supabase), carpeta nexo-preview.
Voy a dividir src/App.jsx (que hoy tiene ~1700 líneas con 14 componentes
adentro) en archivos separados. Este es el primer paso de esa migración:
sacar los helpers de negocio y los átomos visuales que van a necesitar
varios componentes distintos.

1. Creá src/lib/especialistas.js y mové ahí (cortando de App.jsx) estas
   funciones/constantes, tal cual están, agregando `export` a cada una:
   HOY, ds, dH, dD, sem, ritmoNecesario, velocidadActual, proyeccion,
   alertas, normalizarEspecialista, TIPOS, TIPO_E.
   (Están todas juntas, entre el comentario "// ─── HELPERS" y el
   comentario "// ─── ÁTOMOS" de App.jsx — buscalas por nombre con
   grep si los números de línea no coinciden con lo que esperás,
   puede que hayan cambiado por el paso de limpieza anterior.)
   Ese archivo nuevo va a necesitar importar `pct` desde "./ui.jsx"
   (ya existe ese export ahí, confirmalo).

2. Creá src/components/Atoms.jsx y mové ahí los tres componentes
   Spark, GaugeRitmo y SemTag (los que están definidos justo después
   del comentario "// ─── ÁTOMOS"), con `export` en cada uno. Van a
   necesitar importar lo que usen de "../lib/ui.jsx" y de
   "../lib/especialistas.js" (por ejemplo SemTag probablemente usa
   `sem`).

3. En src/App.jsx, borrá el código que acabás de mover y agregá los
   imports correspondientes:
   `import { HOY, ds, dH, dD, sem, ritmoNecesario, velocidadActual, proyeccion, alertas, normalizarEspecialista, TIPOS, TIPO_E } from "./lib/especialistas";`
   `import { Spark, GaugeRitmo, SemTag } from "./components/Atoms.jsx";`
   Sacá de esos imports cualquier nombre que termines detectando que
   NO se usa directamente en App.jsx (puede que algunos solo los usen
   los componentes que vas a separar en pasos siguientes — en ese
   caso no hace falta importarlos en App.jsx todavía, pero SÍ hace
   falta que estén exportados desde especialistas.js/Atoms.jsx para
   poder importarlos ahí en los próximos pasos).

Verificación (importante, no te saltees esto):
- Corré `npm run lint` — no debe haber errores de "no-undef" ni de
  imports sin usar.
- Corré `npm run dev`, abrí la app, pasá por las 6 pestañas del
  sidebar y abrí el detalle de un especialista y de una organización.
  Mirá la consola del navegador — cero errores rojos, especialmente
  ningún "X is not defined".
- Sacá screenshot del Dashboard y compará visualmente con cómo se
  veía antes (debería ser pixel-idéntico, esto es solo reorganización
  de código, cero cambios de diseño).

Si todo está OK, hacé commit:
"refactor: extrae helpers de especialistas y átomos visuales a archivos propios"
```

---

## PASO 4 — Sidebar + TarjetaEsp

```
Seguimos dividiendo src/App.jsx del proyecto NEXO (venís de mover
helpers a src/lib/especialistas.js y átomos a src/components/Atoms.jsx
en el paso anterior — si por algún motivo esos archivos no existen
todavía, avisame antes de seguir en vez de asumir nada).

1. Buscá en App.jsx la función `function Sidebar({tab,onTab,cnt,esps,onSignOut})`
   y cortala completa a un archivo nuevo src/components/Sidebar.jsx,
   como `export default function Sidebar(...)`. Fijate qué importa de
   "./lib/ui.jsx" o de especialistas.js/Atoms.jsx y agregá esos imports
   arriba (con rutas relativas "../lib/..." y "./Atoms.jsx" porque ahora
   vive en components/).

2. Buscá `function TarjetaEsp({e,onPress})` en App.jsx y cortala a un
   archivo nuevo src/components/TarjetaEsp.jsx, como
   `export default function TarjetaEsp(...)`, con sus imports
   correspondientes (probablemente usa SemTag de Atoms.jsx, y sem/pct).

3. En App.jsx, reemplazá esas dos definiciones por:
   `import Sidebar from "./components/Sidebar.jsx";`
   `import TarjetaEsp from "./components/TarjetaEsp.jsx";`

Verificación:
- `npm run lint` sin errores nuevos.
- `npm run dev`, revisá que el sidebar se vea y funcione igual
  (contador de alertas, cambio de pestaña, logout), y que las tarjetas
  de especialista en Dashboard/Equipo se vean igual que antes.
  Consola del navegador sin errores rojos.

Si está OK, commit:
"refactor: extrae Sidebar y TarjetaEsp a componentes propios"
```

---

## PASO 5 — Dashboard + PanelEquipo

```
Seguimos dividiendo src/App.jsx del proyecto NEXO (mismo trabajo de los
pasos anteriores: extraer componentes a archivos propios en
src/components/, sin cambiar ningún comportamiento ni diseño).

1. Buscá `function Dashboard({esps,onVer,onNuevo,loadingEsp,errorEsp,oportunidadTotal})`
   en App.jsx, cortala a src/components/Dashboard.jsx como
   `export default function Dashboard(...)`, con los imports que
   necesite (probablemente TarjetaEsp, Spark, GaugeRitmo, alertas, etc.
   desde las rutas relativas correctas).

2. Buscá `function PanelEquipo({esps,onVer,onNuevo})` en App.jsx,
   cortala a src/components/PanelEquipo.jsx como
   `export default function PanelEquipo(...)`, con sus imports
   (probablemente usa TarjetaEsp).

3. En App.jsx reemplazá por:
   `import Dashboard from "./components/Dashboard.jsx";`
   `import PanelEquipo from "./components/PanelEquipo.jsx";`

Verificación:
- `npm run lint` sin errores nuevos.
- `npm run dev`, entrá a la pestaña Dashboard y a Equipo, confirmá que
  se ven exactamente igual que antes (gráficos, números, tarjetas).
  Consola sin errores rojos. Screenshot de ambas pestañas.

Si está OK, commit:
"refactor: extrae Dashboard y PanelEquipo a componentes propios"
```

---

## PASO 6 — PanelOrganizaciones + ModalNuevaOrganizacion

```
Seguimos dividiendo src/App.jsx del proyecto NEXO.

1. Buscá `function PanelOrganizaciones({organizadoresConDatos,loading,error,onNuevo,onImportar,importando,onImportarSignos,importandoSignos,faltantes,onVer})`
   en App.jsx, cortala a src/components/PanelOrganizaciones.jsx como
   `export default function PanelOrganizaciones(...)`, con sus imports.

2. Buscá `function ModalNuevaOrganizacion({onGuardar,onCerrar})` en
   App.jsx, cortala a src/components/ModalNuevaOrganizacion.jsx como
   `export default function ModalNuevaOrganizacion(...)`, con sus
   imports.

3. En App.jsx reemplazá por:
   `import PanelOrganizaciones from "./components/PanelOrganizaciones.jsx";`
   `import ModalNuevaOrganizacion from "./components/ModalNuevaOrganizacion.jsx";`

Verificación:
- `npm run lint` sin errores nuevos.
- `npm run dev`, entrá a la pestaña Organizaciones, abrí el modal de
  "nueva organización" (sin guardar nada, solo para confirmar que
  renderiza), confirmá que la lista y los botones de importar se ven
  igual que antes. Consola sin errores rojos.

Si está OK, commit:
"refactor: extrae PanelOrganizaciones y ModalNuevaOrganizacion a componentes propios"
```

---

## PASO 7 — PanelAlertas + PanelMetricas

```
Seguimos dividiendo src/App.jsx del proyecto NEXO.

1. Buscá `function PanelAlertas({esps,onVer})` en App.jsx, cortala a
   src/components/PanelAlertas.jsx como
   `export default function PanelAlertas(...)`, con sus imports
   (probablemente usa `alertas` de especialistas.js).

2. Buscá `function PanelMetricas({esps,onVer})` en App.jsx, cortala a
   src/components/PanelMetricas.jsx como
   `export default function PanelMetricas(...)`, con sus imports.

3. En App.jsx reemplazá por:
   `import PanelAlertas from "./components/PanelAlertas.jsx";`
   `import PanelMetricas from "./components/PanelMetricas.jsx";`

Verificación:
- `npm run lint` sin errores nuevos.
- `npm run dev`, entrá a las pestañas Alertas y Métricas, confirmá que
  se ven igual que antes (mismos números, mismas alertas listadas).
  Consola sin errores rojos.

Si está OK, commit:
"refactor: extrae PanelAlertas y PanelMetricas a componentes propios"
```

---

## PASO 8 — PanelDetalle

```
Seguimos dividiendo src/App.jsx del proyecto NEXO. Este es el
componente más grande que queda adentro de App.jsx (el panel lateral
de detalle de un especialista), así que andá con cuidado extra en la
verificación.

1. Buscá `function PanelDetalle({esp,onCerrar,onGuardar,onContacto,organizadores})`
   en App.jsx y cortala completa a src/components/PanelDetalle.jsx
   como `export default function PanelDetalle(...)`. Fijate bien todos
   los imports que necesita: probablemente TIPOS, TIPO_E, sem, alertas,
   ritmoNecesario, velocidadActual, proyeccion desde
   "../lib/especialistas.js", Spark/GaugeRitmo/SemTag desde
   "./Atoms.jsx", y lo que use de "../lib/ui.jsx".

2. En App.jsx reemplazá por:
   `import PanelDetalle from "./components/PanelDetalle.jsx";`

Verificación (extra cuidado acá, es el panel más complejo):
- `npm run lint` sin errores nuevos.
- `npm run dev`, abrí el detalle de VARIOS especialistas distintos
  (uno con plan vencido, uno en ritmo si podés identificarlo, uno sin
  contactos recientes) para pisar distintas ramas del código. Probá
  también agregar un contacto de prueba y editar un campo y guardar,
  para confirmar que las funciones onGuardar/onContacto siguen
  conectadas bien. Consola del navegador sin errores rojos en ningún
  caso. Screenshot del panel abierto.

Si está OK, commit:
"refactor: extrae PanelDetalle a componente propio"
```

---

## PASO 9 — ModalNuevo + limpieza final de App.jsx

```
Último paso de la división de src/App.jsx del proyecto NEXO.

1. Buscá `function ModalNuevo({onGuardar,onCerrar,organizadores})` en
   App.jsx, cortala a src/components/ModalNuevo.jsx como
   `export default function ModalNuevo(...)`, con sus imports
   (probablemente usa TIPOS/TIPO_E si tiene selector de tipo de
   contacto, confirmalo).

2. En App.jsx reemplazá por:
   `import ModalNuevo from "./components/ModalNuevo.jsx";`

3. Ahora App.jsx debería quedar solo con: los imports de arriba, el
   bloque de inyección de fuente Google Fonts, y la función
   `export default function App()`. Revisá que no haya quedado ninguna
   función/componente suelto sin usar, y que no sobre ningún import.
   Contame cuántas líneas tiene App.jsx al final (debería haber bajado
   de ~1700 a bastante menos de 400).

Verificación:
- `npm run lint` sin errores nuevos, cero imports sin usar, cero
  variables no definidas.
- `npm run build` completo sin errores.
- `npm run dev`, recorré TODA la app una vez más de punta a punta:
  las 6 pestañas, abrir/cerrar detalle de especialista, abrir/cerrar
  ficha de organización, los dos modales de "nuevo", el toast de
  confirmación al guardar algo. Consola sin errores rojos en ningún
  momento. Sacá 2-3 screenshots de pantallas clave.

Si todo está OK, hacé commit:
"refactor: completa la división de App.jsx en componentes individuales"

Y contame un resumen: cuántos archivos quedaron en src/components/,
y el tamaño final de App.jsx.
```

---

## PASO 10 — Hook genérico useSupabaseTable

```
Estoy en el proyecto NEXO (Vite + React + Supabase), carpeta
nexo-preview. Los hooks src/hooks/useEspecialistas.js,
useOrganizadores.js, usePolizas.js, useOrganizadorCodigos.js y
useOrganizadorKpis.js repiten el mismo patrón: estado de loading/error/
data, un fetch en useEffect al montar, y una función refetch. Quiero
factorizar eso en un hook genérico, sin cambiar ningún comportamiento
ni ninguna de las funciones extra que ya tienen (como agregarOrganizador
o editarOrganizador en useOrganizadores.js — esas quedan igual, solo
cambia de dónde sacan loading/data/refetch).

1. Creá src/hooks/useSupabaseTable.js con algo como:

   import { useState, useEffect, useCallback } from 'react'
   import { supabase } from '../lib/supabase'

   export function useSupabaseTable(tabla, orderBy) {
     const [data, setData] = useState([])
     const [loading, setLoading] = useState(true)
     const [error, setError] = useState(null)

     const fetchData = useCallback(async () => {
       setLoading(true)
       let query = supabase.from(tabla).select('*')
       if (orderBy) query = query.order(orderBy)
       const { data, error } = await query
       if (error) setError(error)
       else setData(data)
       setLoading(false)
     }, [tabla, orderBy])

     useEffect(() => { fetchData() }, [fetchData])

     return { data, loading, error, refetch: fetchData, setData }
   }

   Ajustá el nombre de la propiedad de retorno "data" a algo genérico
   está bien así, cada hook específico le va a poner su propio nombre
   al desestructurar.

2. Reescribí src/hooks/useEspecialistas.js para que use
   useSupabaseTable('especialistas', 'nombre') por dentro, y siga
   exportando exactamente la misma forma que exporta hoy:
   `{ especialistas, loading, error, refetch }` (renombrando `data` a
   `especialistas` al desestructurar el resultado del hook genérico).

3. Hacé lo mismo con usePolizas.js, useOrganizadorCodigos.js y
   useOrganizadorKpis.js — mismo patrón, cada uno respetando el nombre
   de tabla y campo de orden que ya usan hoy (revisalos antes de tocar
   nada, puede que no todos ordenen por el mismo campo o que alguno no
   ordene).

4. Con useOrganizadores.js y useContactos.js tené más cuidado: ADEMÁS
   del fetch básico tienen funciones propias (agregarOrganizador,
   editarOrganizador en uno; lo que tenga useContactos.js en el otro).
   Migralos también a usar useSupabaseTable por dentro para el
   fetch/loading/error/refetch, pero conservando esas funciones extra
   tal cual están (solo que ahora llamen a `refetch` del hook genérico
   en vez de a su propia fetchXxx local).

No toques useAuth.js ni useUdnObjetivos.js en este paso (useUdnObjetivos
tiene lógica propia más compleja, no encaja en este patrón genérico).

Verificación:
- `npm run lint` sin errores nuevos.
- `npm run dev`, recorré las pestañas que dependen de estos hooks
  (Dashboard, Equipo, Organizaciones) y confirmá que los datos cargan
  igual que antes. Probá también agregar una organización nueva desde
  el modal, para confirmar que agregarOrganizador + refetch siguen
  funcionando. Consola sin errores rojos.

Si todo está OK, hacé commit:
"refactor: unifica hooks de datos de Supabase en useSupabaseTable genérico"
```

---

## PASO 11 — useAuth() duplicado

```
Estoy en el proyecto NEXO (Vite + React + Supabase), carpeta
nexo-preview. Hay un bug latente: src/hooks/useOrganizadores.js llama
internamente a useAuth() (para tener `user.id` al crear una
organización), pero App.jsx TAMBIÉN llama a useAuth() para el resto de
la app. Son dos instancias independientes del hook, cada una con su
propia suscripción a supabase.auth.onAuthStateChange — esto duplica
listeners innecesariamente y puede desincronizarse por un instante.

Arreglalo así:

1. En src/hooks/useOrganizadores.js, sacá el `import { useAuth } from
   './useAuth'` y la línea `const { user } = useAuth()`. En su lugar,
   hacé que useOrganizadores reciba `userId` como parámetro:
   `export function useOrganizadores(userId) { ... }`
   y usá `userId` en vez de `user.id` dentro de agregarOrganizador.

2. En src/App.jsx, donde se llama a
   `const { organizadores, ... } = useOrganizadores();`, pasale el id:
   `const { organizadores, ... } = useOrganizadores(user.id);`
   (la variable `user` ya existe en App.jsx desde su propio useAuth()).

3. Revisá si algún otro hook (useContactos, usePolizas, etc.) tiene el
   mismo problema de llamar a useAuth() por su cuenta en vez de recibir
   el id como parámetro, y aplicá el mismo arreglo si corresponde.

Verificación:
- `npm run lint` sin errores nuevos.
- `npm run dev`, iniciá sesión, andá a Organizaciones y creá una
  organización de prueba — confirmá que se guarda bien (con el
  profile_id correcto, podés chequearlo en la tabla de Supabase si
  querés). Consola sin errores rojos.

Si está OK, commit:
"fix: elimina suscripción duplicada a useAuth() en useOrganizadores"
```

---

## PASO 12 — alert() → toasts de error

```
Estoy en el proyecto NEXO (Vite + React + Supabase), carpeta
nexo-preview. Hoy los errores usan `alert()` nativo del navegador (hay
11 casos en src/App.jsx, y algunos en src/lib/importarPolizas.js y
src/lib/importarSignos.js si les pasás un objeto showToast). Los
éxitos, en cambio, usan el sistema de toast prolijo que ya existe
(`showToast("check", mensaje)`). Quiero que los errores también usen
ese mismo sistema, con un ícono distinto, para que sea visualmente
consistente con el resto del diseño.

1. En src/App.jsx, revisá cómo está armado el componente de toast
   (el bloque `{toast && <Card ...>}` cerca del final del archivo) y
   el ícono que usa hoy para éxito (probablemente "check" en verde).
   Fijate en src/lib/ui.jsx qué íconos hay disponibles para error
   (algo tipo "alertCircle" o "x" en rojo — usá el que ya exista en el
   set de íconos, no inventes uno nuevo).

2. Ajustá `showToast` (o el render del toast) para que acepte un color
   distinto según el ícono/tipo, de forma que un toast de error se vea
   en rojo y uno de éxito en verde, sin romper las llamadas que ya
   existen de éxito.

3. Reemplazá cada `alert('mensaje: ' + error.message)` de App.jsx por
   `showToast("alertCircle", 'mensaje: ' + error.message)` (ajustando
   el nombre del ícono al que confirmaste que existe en el paso 1),
   manteniendo el mismo mensaje de texto que tenía cada alert().

4. Como el toast actual se autodestruye a los 3 segundos
   (setTimeout(...,3000)) y un mensaje de error puede ser más largo o
   más importante que uno de éxito, subí ese tiempo a 5000ms SOLO para
   los toasts de error (podés pasar la duración como parámetro opcional
   de showToast).

No toques los `console.error(...)` que acompañan a cada alert — esos
quedan igual, son útiles para debug.

Verificación:
- `npm run lint` sin errores nuevos.
- `npm run dev`, forzá al menos un error real (por ejemplo, intentá
  guardar un especialista con un campo que dispare un error de
  Supabase, o simplemente revisá el código para confirmar que la
  llamada a showToast quedó bien puesta en cada uno de los ~11 casos).
  Confirmá visualmente que el toast de error se ve en rojo y dura más
  tiempo en pantalla que el de éxito.

Si está OK, commit:
"feat: unifica manejo de errores en el sistema de toasts (reemplaza alert())"
```

---

## Estado final (11 jul 2026) — leer esto primero en un chat nuevo

Los 12 pasos se ejecutaron completos, cada uno con su propio commit,
lint, build y verificación en browser. Todo está en `main`, pusheado.

**Qué cambió respecto al plan original:**

- `App.jsx` bajó de ~1700 a **363 líneas**. Los 12 componentes que vivían
  adentro ahora son archivos propios en `src/components/`: `Sidebar`,
  `TarjetaEsp`, `Dashboard`, `PanelEquipo`, `PanelOrganizaciones`,
  `ModalNuevaOrganizacion`, `PanelAlertas`, `PanelMetricas`,
  `PanelDetalle`, `ModalNuevo` (+ `Atoms.jsx` del paso 3).
- Helpers de negocio (`sem`, `alertas`, `normalizarEspecialista`, `TIPOS`,
  etc.) viven en `src/lib/especialistas.js`.
- `src/hooks/useSupabaseTable.js` es el hook genérico nuevo. Migrados a
  usarlo: `useEspecialistas`, `usePolizas`, `useOrganizadorCodigos`,
  `useOrganizadorKpis`, `useOrganizadores`, `useContactos`.
- **Extra no planeado:** el bug de `useAuth()` duplicado (paso 11)
  también estaba presente en `useUdnObjetivos.js` con el mismo patrón —
  se detectó y corrigió ahí también, no solo en `useOrganizadores`.
- Errores: los 11 `alert()` fueron reemplazados por `showError()`
  (toast rojo, ícono `alertCircle`, 5s en pantalla vs. 3s del éxito).
- `xlsx`, `jszip` y `pdfjs-dist` ahora cargan con `import()` dinámico —
  solo entran al bundle cuando se usa Importar pólizas/Signos.

**Pendiente de limpieza manual (datos de prueba en Supabase):**

- Una nota de contacto de prueba en el especialista "Fasto S" (quedó
  del paso 8).
- Dos organizaciones de prueba: "TEST PASO 10 - Verificación Hook" y
  "TEST PASO 11 - Verificación userId" (quedaron de los pasos 10 y 11).

Borrarlas desde las pestañas Organizaciones/Contactos de la app antes
de mostrarle NEXO a alguien más.

**Nota sobre un error que apareció y no es real:** durante la
verificación del paso 10 salió un "React hooks order changed" en la
consola. Se confirmó con una pestaña nueva del browser que era un
artefacto de Fast Refresh por la sesión de dev muy larga, no un bug de
código — no aparece en cargas frescas. Si reaparece alguna vez, primero
descartar esta causa (reiniciar `npm run dev` limpio) antes de asumir
que es un problema real.

**Próximos temas pendientes del proyecto** (no relacionados a este
refactor, quedan del estado general de NEXO): importador de Excel
semanal desde Power BI, definir umbral de alerta de "contacto sin
venta", migración de campos nuevos en organizadores
(`cantidad_productores`, `primaje_ramos_generales`, `observaciones`),
deploy en Vercel, y el diseño del logo (deliberadamente pospuesto).

**Nota sobre memoria del proyecto:** este archivo vive en el repo (se
actualiza con `git`) y es la fuente de verdad más confiable para
retomar el trabajo — más que la memoria del proyecto en Claude.ai
asociada a este chat, que quedó desactualizada respecto al código real
en más de una ocasión durante este mismo hilo.
