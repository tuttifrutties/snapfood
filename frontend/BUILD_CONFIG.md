# 📱 SNAPFOOD - Configuración de Build

> **IMPORTANTE:** Leer este archivo antes de hacer cualquier cambio o build.

---

## 🔧 Package Manager

**USAR NPM (nunca yarn)**

```bash
# El proyecto usa npm con --legacy-peer-deps
# Ya existe .npmrc con legacy-peer-deps=true
# NUNCA usar yarn, SIEMPRE npm
```

---

## 📦 Versiones Compatibles (Enero 2026)

Estas versiones funcionan juntas:

| Paquete | Versión |
|---------|---------|
| react-native | 0.81.5 |
| react | 19.1.0 |
| react-native-reanimated | 4.1.6 |
| react-native-worklets | 0.5.2 |
| react-native-screens | 4.16.0 |
| react-native-gesture-handler | 2.28.0 |
| expo | ~54.x |
| node (en eas.json) | 20.18.0 |

---

## 📁 Archivos Críticos

### 1. `.npmrc` (en /frontend)
```
legacy-peer-deps=true
```

### 2. `eas.json` (en /frontend)
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
      "node": "20.18.0"
    }
  },
  "submit": {
    "production": {}
  }
}
```

### 3. `.gitignore` - Carpetas nativas ignoradas
```gitignore
# Native - Let EAS generate these
android/
ios/
```

### 4. `app.json` - New Architecture habilitada
```json
{
  "expo": {
    "newArchEnabled": true,
    ...
  }
}
```

---

## 🚀 Pasos para Build

### Desde cero (fork nuevo o problemas):

```powershell
cd frontend

# 1. Limpiar e instalar dependencias
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install --legacy-peer-deps

# 2. Verificar/instalar versiones correctas
npm install react-native-worklets@0.5.2 --legacy-peer-deps
npm install react-native-reanimated@4.1.6 --legacy-peer-deps

# 3. Eliminar carpetas nativas (EAS las genera)
Remove-Item -Recurse -Force android -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ios -ErrorAction SilentlyContinue

# 4. Commit y push
cd ..
git add .
git commit -m "Prepare for build"
git push origin main

# 5. Build
cd frontend
eas build --platform android --profile production
```

### Build normal (sin problemas):

```powershell
cd frontend

# 1. Incrementar versionCode en app.json

# 2. Commit y push
cd ..
git add .
git commit -m "Version XX"
git push origin main

# 3. Build
cd frontend
eas build --platform android --profile production
```

---

## ⚠️ Errores Comunes y Soluciones

### Error: `yarn install --frozen-lockfile`
**Causa:** EAS intenta usar yarn
**Solución:** Eliminar `yarn.lock` si existe

### Error: `Cannot find module 'react-native-worklets/plugin'`
**Causa:** Falta worklets o versión incorrecta
**Solución:** `npm install react-native-worklets@0.5.2 --legacy-peer-deps`

### Error: `ReactNativeApplicationEntryPoint` / `loadReactNative`
**Causa:** Incompatibilidad de versiones RN
**Solución:** `npx expo install --fix` y regenerar android

### Error: `configs.toReversed is not a function`
**Causa:** Node version muy vieja en EAS
**Solución:** Verificar que eas.json tenga `"node": "20.18.0"`

### Error: `Reanimated requires new architecture`
**Causa:** New Arch no habilitada
**Solución:** Agregar `"newArchEnabled": true` en app.json

### Error: `Invalid version of react-native-worklets`
**Causa:** Versión de worklets incompatible con reanimated
**Solución:** Ver tabla de versiones compatibles arriba

### Error: Conflicto de merge en archivos
**Causa:** Git merge sin resolver
**Solución:** 
```powershell
git merge --abort
git reset --hard origin/main
git pull origin main
```

---

## 📝 Notas Adicionales

- **Slug del proyecto:** `foodsnap` (no "snapfood")
- **versionCode:** Se cambia manualmente en `app.json` antes de cada build
- **Idioma:** Español (Argentina)
- **Repo:** tuttifrutties/snapfood

---

## 🔄 Flujo Git Completo

```powershell
# 1. En Emergent: Click "Save to Git"

# 2. En PowerShell:
cd W:\EMERGENT\APPS\snapfood\snapfood
git pull origin main

# 3. Cambiar versionCode en frontend/app.json

# 4. Commit y push
git add .
git commit -m "Descripción del cambio"
git push origin main

# 5. Build
cd frontend
eas build --platform android --profile production
```

---

*Última actualización: Enero 2026*
*Build exitoso: v45+*
