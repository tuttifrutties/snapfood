# 📱 SNAPFOOD - Configuración de Build

> **IMPORTANTE:** Leer este archivo COMPLETO antes de hacer cualquier cambio o build.
> **Última actualización:** Enero 2026 - Build v50+

---

## 🚨 REGLAS CRÍTICAS

1. **USAR NPM** (nunca yarn) - El proyecto tiene `.npmrc` con `legacy-peer-deps=true`
2. **NEW ARCHITECTURE = TRUE** - Reanimated 4.x lo requiere
3. **Slug del proyecto:** `foodsnap` (NO "snapfood")
4. **versionCode:** Se edita MANUALMENTE en `app.json` después del `git reset`
5. **Usuario:** Facu (Argentina) - Responder siempre en español

---

## ⚠️ RECORDATORIOS PARA EL AGENTE

**CAMBIOS EN FRONTEND:**
- Recordar al usuario hacer "Save to Git" en Emergent
- Luego seguir los pasos de build

**CAMBIOS EN BACKEND:**
- Recordar al usuario hacer **REDEPLOY** (Deploy en Emergent)
- El backend de producción es el del deployment, NO el de desarrollo
- Sin redeploy, los cambios de backend NO se aplican en la app de Play Store

**PowerShell:**
- Los comandos de PowerShell NO aceptan `&&` - usar comandos separados
- El usuario NO es programador, dar instrucciones paso a paso muy claras

---

## 📦 Versiones Compatibles (Enero 2026)

| Paquete | Versión |
|---------|---------|
| expo | ~54.x |
| react | 19.1.0 |
| react-native | 0.81.5 |
| react-native-reanimated | 4.2.1 |
| react-native-worklets | 0.7.2 |
| react-native-screens | 4.20.0 |
| react-native-gesture-handler | 2.30.0 |
| react-native-view-shot | latest |
| expo-sharing | latest |
| node (en eas.json) | 20.18.0 |

---

## 📁 Archivos Críticos

### 1. `app.json` - Configuración principal
```json
{
  "expo": {
    "name": "SnapFood",
    "slug": "foodsnap",  // ⚠️ DEBE SER "foodsnap"
    "newArchEnabled": true,  // ⚠️ OBLIGATORIO para Reanimated 4.x
    "android": {
      "versionCode": XX,  // ⚠️ CAMBIAR MANUALMENTE antes de cada build
      ...
    }
  }
}
```

### 2. `eas.json` - Configuración de EAS Build
```json
{
  "cli": {
    "version": ">= 3.0.0",
    "appVersionSource": "local"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "node": "20.18.0"
    },
    "preview": {
      "distribution": "internal",
      "node": "20.18.0"
    },
    "production": {
      "node": "20.18.0",
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### 3. `.npmrc` - Configuración de NPM
```
legacy-peer-deps=true
```

### 4. `.gitignore` - NO ignorar android/
```gitignore
# Native - iOS only (Android se sube al repo)
ios/
```
⚠️ La carpeta `android/` NO debe estar ignorada porque EAS la necesita.

---

## 🚀 Pasos para Build (SEGUIR EXACTAMENTE)

### Desde PowerShell:

```powershell
# 1. Ir al proyecto
cd W:\EMERGENT\APPS\snapfood\snapfood

# 2. Traer cambios de Emergent
git fetch origin
git reset --hard origin/main

# 3. Ir a frontend
cd frontend

# 4. ⭐ EDITAR versionCode en app.json (ej: 49, 50, etc)
# Abrir frontend/app.json y cambiar "versionCode": XX

# 5. Eliminar carpeta android vieja
Remove-Item -Recurse -Force android -ErrorAction SilentlyContinue

# 6. Instalar dependencias
npm install --legacy-peer-deps

# 7. Generar carpeta android nueva
npx expo prebuild --clean --platform android

# 8. Commit y push
cd ..
git add .
git commit -m "Build version XX - descripcion"
git push origin main

# 9. Build
cd frontend
eas build --platform android --profile production
```

---

## ⚠️ Errores Comunes y Soluciones

### Error: `yarn install --frozen-lockfile`
**Causa:** Existe `yarn.lock`
**Solución:** 
```powershell
Remove-Item frontend/yarn.lock
```

### Error: `Cannot find module 'react-native-worklets/plugin'`
**Causa:** Falta worklets
**Solución:** 
```powershell
npm install react-native-worklets@0.7.2 --legacy-peer-deps
```

### Error: `ReactNativeApplicationEntryPoint` / `loadReactNative`
**Causa:** Versión incorrecta de React Native
**Solución:** 
```powershell
npm install react-native@0.81.5 --legacy-peer-deps
npx expo prebuild --clean --platform android
```

### Error: `configs.toReversed is not a function`
**Causa:** Node version vieja
**Solución:** Verificar que `eas.json` tenga `"node": "20.18.0"`

### Error: `Reanimated requires new architecture`
**Causa:** newArchEnabled está en false
**Solución:** En `app.json` poner `"newArchEnabled": true`

### Error: `Invalid version of react-native-worklets`
**Causa:** Versiones incompatibles
**Solución:** 
```powershell
npm install react-native-reanimated@4.2.1 react-native-worklets@0.7.2 --legacy-peer-deps
```

### Error: `gradlew: cannot execute: required file not found`
**Causa:** Carpeta android corrupta o vacía
**Solución:** 
```powershell
Remove-Item -Recurse -Force android
npx expo prebuild --clean --platform android
```

### Error: `slug does not match projectId`
**Causa:** El slug en app.json no coincide con EAS
**Solución:** Verificar que `"slug": "foodsnap"` (NO snapfood)

### Error de merge en git
**Solución:**
```powershell
git merge --abort
git reset --hard origin/main
```

---

## 📊 Funcionalidades Implementadas

### TDEE con MET Values
El cálculo de gasto calórico usa valores MET reales:
- Caminar: 3.5 MET
- Correr: 9.8 MET
- Ciclismo: 7.5 MET
- Natación: 8.0 MET
- Gimnasio: 6.0 MET
- Yoga: 3.0 MET
- Baile: 5.5 MET
- Deportes: 7.0 MET
- Senderismo: 6.0 MET
- Artes marciales: 7.5 MET

Fórmula: `Calorías = MET × Peso(kg) × Horas × Días/semana`

### Porciones Inteligentes (Fotos)
- Pizza/compartibles: 1 porción = 1/8 del total
- Lata/botella: 1 = unidad completa
- Plato: 1 = plato completo

### Selector de Porciones en Recetas
- Pregunta clara: "¿Para cuántas porciones vas a cocinar?"
- Opciones rápidas: 1, 2, 4, 6, 8 + botón "..." para número personalizado
- Los ingredientes se escalan automáticamente (regla de 3)
- Muestra calorías POR PORCIÓN (no total)
- Las recetas siempre se normalizan a 4 porciones base desde el backend

### Popup "¿Cuántas porciones comiste?"
- Aparece al salir de la pantalla de receta
- Obliga al usuario a indicar cuántas porciones realmente comió
- Actualiza el historial con las calorías correctas

### Compartir Recetas como Imagen
- Botón de compartir en header de cada receta
- Genera imagen con emojis de ingredientes principales
- Incluye macros, tiempo de cocción y branding "📱 SnapFood"
- Usa react-native-view-shot + expo-sharing

### Compartir Resumen como Imagen (Perfil)
- En la pantalla de perfil/Mi Ficha
- Genera imagen profesional del resumen semanal/mensual

### Horarios de Notificaciones Personalizables
- Almuerzo: default 10:00 AM
- Cena: default 8:00 PM (antes era 6:00 PM)
- Snack: default 3:30 PM
- Balance viernes: default 7:00 PM
- El usuario puede cambiar cada horario desde Ajustes

### Timezone Fix
- Los timestamps se guardan con `Date.now()` (hora local del dispositivo)
- El backend también respeta el timestamp del frontend
- El historial muestra la hora correcta independiente de la zona horaria

### Salud y Restricciones (NUEVO)
**En Onboarding (Step 6):**
- Condiciones de salud: Diabetes, Celiaquía, Hipertensión, Colesterol alto, Intolerancia a lactosa, Vegetariano, Vegano, Keto, Embarazo, Gastritis, IBS
- Alergias/Intolerancias: Maní, Frutos secos, Leche, Huevos, Trigo, Soja, Pescado, Mariscos, Banana, Fresa, etc.
- Buscador para encontrar alergias rápidamente
- Default: "Sin restricciones"

**En Mi Ficha (Perfil):**
- Tarjeta de "Salud y Restricciones" después de actividades
- Botón para editar en cualquier momento
- Modal con todas las opciones

**En Backend:**
- El prompt de recetas considera las restricciones
- Si es diabético, evita azúcares
- Si es celíaco, evita gluten
- Si tiene alergias, NUNCA incluye esos ingredientes

**Almacenamiento (AsyncStorage):**
- `user_health_conditions`: Array de IDs (ej: ['diabetes', 'lactose'])
- `user_food_allergies`: Array de IDs (ej: ['peanuts', 'eggs'])

---

## 📝 Tareas Pendientes para Próximo Fork

### ✅ ERRORES DE TYPESCRIPT CORREGIDOS (Enero 2026)

**Todos los errores de compilación fueron arreglados:**
- ✅ profile.tsx - Import de AsyncStorage agregado
- ✅ nutritionCoach.ts - Campos healthConditions y foodAllergies agregados al tipo
- ✅ onboarding.tsx - Estilos duplicados renombrados (searchInput → allergySearchInput)
- ✅ cooking/index.tsx - Estilos duplicados renombrados (searchResultsContainer → recipeSearchResultsContainer)
- ✅ cooking/index.tsx - theme.isDark → theme.mode === 'dark' (9 ocurrencias)
- ✅ track-food/index.tsx - Tipo de setTimeout corregido
- ✅ profile.tsx - PhysicalActivity con campo 'type' agregado
- ✅ profile.tsx - userName ahora se obtiene con getUserName() en lugar de UserContext

### 🟡 FEATURES PENDIENTES

1. **Force Update** - Mostrar cartel obligatorio cuando hay nueva versión (necesita URL de Play Store)
2. **Light Mode** - Algunos textos pueden seguir con problemas en modo claro
3. **Plan anual** - El plan de suscripción anual no se muestra

---

## 🔧 Comandos Útiles

```powershell
# Ver versionCode actual
Select-String -Path "app.json" -Pattern "versionCode"

# Verificar dependencias
npm list react-native react-native-reanimated react-native-worklets

# Limpiar cache
npm cache clean --force
Remove-Item -Recurse -Force node_modules
npm install --legacy-peer-deps

# Fix de versiones automático (a veces funciona)
npx expo install --fix
```

---

## 📱 Info del Proyecto

- **Slug EAS:** foodsnap
- **Package:** com.masiru.snapfood
- **Repo:** tuttifrutties/snapfood
- **Ruta local:** W:\EMERGENT\APPS\snapfood\snapfood
- **Idioma UI:** Español (Argentina) e Inglés
- **Usuario:** Facu

---

## 🗂️ Estructura de Archivos Clave

```
/app/frontend/
├── app/
│   ├── (tabs)/
│   │   ├── home.tsx          # Pantalla principal
│   │   ├── history.tsx       # Historial de comidas
│   │   └── settings.tsx      # Ajustes (horarios notificaciones)
│   ├── cooking/
│   │   ├── index.tsx         # Selección de ingredientes
│   │   └── recipe/[id].tsx   # Detalle de receta (compartir, porciones)
│   ├── track-food/
│   │   └── index.tsx         # Rastrear comida (foto, galería, buscar)
│   ├── onboarding.tsx        # Onboarding (paso 6 = salud)
│   └── profile.tsx           # Mi Ficha (editar salud, compartir resumen)
├── src/
│   └── services/
│       ├── nutritionCoach.ts # Cálculos de TDEE con MET
│       └── notifications.ts  # Notificaciones personalizables
└── assets/images/
    ├── icon.png
    ├── adaptive-icon.png
    ├── adaptive-icon-background.png  # Fondo blanco
    ├── splash-icon.png
    └── favicon.png
```

---

## 🔑 Integraciones

- **OpenAI GPT-4o**: Análisis de fotos y generación de recetas (via Emergent LLM Key)
- **RevenueCat**: Suscripciones premium
- **expo-notifications**: Recordatorios
- **expo-sharing + react-native-view-shot**: Compartir imágenes

---

*Mantener este archivo actualizado después de cada sesión de desarrollo.*
