# 📱 SNAPFOOD - Configuración de Build

> **IMPORTANTE:** Leer este archivo COMPLETO antes de hacer cualquier cambio o build.
> **Última actualización:** Enero 2026 - Build v48+

---

## 🚨 REGLAS CRÍTICAS

1. **USAR NPM** (nunca yarn) - El proyecto tiene `.npmrc` con `legacy-peer-deps=true`
2. **NEW ARCHITECTURE = TRUE** - Reanimated 4.x lo requiere
3. **Slug del proyecto:** `foodsnap` (NO "snapfood")
4. **versionCode:** Se edita MANUALMENTE en `app.json` después del `git reset`

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
- Muestra cantidad de porciones base
- Permite escalar ingredientes (regla de 3)
- Recalcula calorías automáticamente

### Compartir como Imagen
- Genera imagen profesional del resumen
- Usa react-native-view-shot + expo-sharing

---

## 📝 Tareas Pendientes para Próximo Fork

1. **Force Update** - Mostrar cartel obligatorio cuando hay nueva versión
2. **Probar TDEE** - Verificar que todas las actividades suman correctamente
3. **Light Mode** - Algunos textos pueden seguir con problemas

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
- **Idioma:** Español (Argentina)

---

*Mantener este archivo actualizado después de cada sesión de desarrollo.*
