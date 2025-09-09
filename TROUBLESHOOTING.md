# 🛠️ Troubleshooting Blank Page Issue

## 🚨 Problem: http://localhost:5173 shows blank page

### 🔧 Quick Fix: Run This First

```bash
# Double-click: test_startup.bat
```

This will:
1. ✅ Test if React builds properly
2. ✅ Start development server
3. ✅ Open browser with test page
4. ✅ Show you what should appear

---

## 🔍 Step-by-Step Diagnosis

### Step 1: Test React App Alone
```bash
cd web
npm run build
```

**✅ Success**: Should show "built in X.XXs"  
**❌ Failed**: Fix TypeScript errors first

### Step 2: Test Development Server
```bash
cd web
npm run dev
```

**✅ Success**: Shows "Local: http://localhost:5173"  
**❌ Failed**: Port might be in use

### Step 3: Check Browser
Open http://localhost:5173

**✅ Success**: See purple background with "Test Mode" button  
**❌ Blank**: Check browser console (F12)

---

## 🚨 Common Issues & Fixes

### Issue 1: TypeScript Errors
**Symptoms**: Build fails, blank page
**Fix**: Already fixed in latest code

### Issue 2: Port Already in Use
**Symptoms**: "Port 5173 is in use"
**Fix**: 
```bash
# Kill existing process
npx kill-port 5173

# Or use different port
npm run dev -- --port 3000
```

### Issue 3: Firebase Connection Errors
**Symptoms**: Console shows Firebase errors
**Fix**: Firebase emulator not needed for test page

### Issue 4: Module Import Errors
**Symptoms**: Console shows "cannot resolve module"
**Fix**: 
```bash
cd web
npm install
```

### Issue 5: Browser Cache Issues
**Symptoms**: Old blank page stuck
**Fix**: 
- Hard refresh: Ctrl+Shift+R
- Clear cache: Ctrl+Shift+Delete
- Try incognito mode

---

## 🧪 Test Sequence

### Test 1: Basic React (test_startup.bat)
- **Expected**: Purple page with button
- **If fails**: React/TypeScript issue

### Test 2: Dashboard with Demo Data
- **Expected**: Lighting dashboard with static data
- **If fails**: Component/Firebase issue

### Test 3: Full System (start.bat)
- **Expected**: Live data from simulator
- **If fails**: Firebase emulator issue

---

## 💡 Debug Commands

### Check if React server is running:
```bash
netstat -an | findstr :5173
```

### Check for TypeScript errors:
```bash
cd web
npx tsc --noEmit
```

### Check if all dependencies installed:
```bash
cd web
npm list --depth=0
```

### Test Firebase connection:
```bash
firebase emulators:start
# Should show: "All emulators ready!"
```

---

## 🔥 Emergency Reset

If nothing works:

```bash
# 1. Clean everything
cd web
rm -rf node_modules package-lock.json
npm install

# 2. Test basic build
npm run build

# 3. Start fresh
npm run dev
```

---

## ✅ Success Criteria

When working correctly, you should see:

1. **Test Page**: Purple background, working button
2. **Dashboard**: Status tiles, mode switch, controls
3. **Reports**: Charts (even with demo data)
4. **Console**: No errors in browser F12

---

## 📞 Next Steps

1. **If test page works**: Proceed to full dashboard
2. **If dashboard works**: Start Firebase emulator
3. **If everything works**: Test with simulator
4. **Ready for demo**: Connect hardware in lab

The blank page issue is now **diagnosed and fixed**! 🎉