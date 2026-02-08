# Icon Display Troubleshooting Guide

## What Was Fixed

### 1. Enhanced Font Loading Detection
- Added multiple detection methods for Material Symbols font loading
- Implemented fallback detection with 3-second timeout
- Added proper error handling for CDN failures

### 2. Updated Files
- **index.html**: Enhanced Material Symbols loading with detection script
- **styles.css**: Added proper font-family fallback chain
- **icon-test.html**: Created standalone test page for verification

### 3. Font Loading Strategy
The application now uses a multi-layered approach:
1. **Primary**: Google Fonts CDN for Material Symbols Outlined
2. **Fallback**: System fonts (Segoe UI Symbol, Segoe UI Emoji)
3. **Detection**: JavaScript monitors font loading and applies fallback class if needed

## How to Verify Icons Are Working

### Method 1: Icon Test Page
1. Open `icon-test.html` in your browser (already opened for you)
2. Check the status box at the top:
   - **Green**: Font loaded successfully ✓
   - **Yellow**: Using fallback fonts (icons may look different)
   - **Red**: Failed to load font from CDN
3. Scroll through the icon grid - you should see visual symbols, not text

### Method 2: Application Check
1. Open http://localhost:4200 (already opened for you)
2. Check the sidebar - you should see icons for:
   - Menu (☰)
   - Star (★)
   - History (⟲)
   - Chevron arrows (›)
3. Open the browser DevTools (F12)
4. Go to Console tab
5. Look for any warnings about Material Symbols font

### Method 3: Browser DevTools Network Tab
1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "font" or search for "Material+Symbols"
4. Refresh the page (Ctrl+R)
5. Check if the font file loaded successfully (status 200)

## Common Issues and Solutions

### Issue 1: Icons Show as Text (e.g., "menu", "close")
**Cause**: Material Symbols font not loaded

**Solutions**:
1. Check internet connection (font loads from Google CDN)
2. Check browser console for CORS or CSP errors
3. Clear browser cache and hard refresh (Ctrl+Shift+R)
4. Check if corporate firewall is blocking Google Fonts

**Verification**:
```javascript
// Run in browser console
document.fonts.check('24px "Material Symbols Outlined"')
// Should return true if font is loaded
```

### Issue 2: Icons Show as Squares/Boxes
**Cause**: Font loaded but characters not rendering

**Solutions**:
1. Update your browser to the latest version
2. Check if hardware acceleration is enabled
3. Try a different browser (Chrome, Edge, Firefox)

### Issue 3: Some Icons Work, Others Don't
**Cause**: Icon name mismatch or typo

**Solutions**:
1. Verify icon names at: https://fonts.google.com/icons
2. Check component templates for typos
3. Ensure icon names use underscores (e.g., `chevron_right` not `chevron-right`)

### Issue 4: Icons Appear After Delay
**Cause**: Font loading is asynchronous

**This is normal behavior**. The detection script will:
1. Wait up to 3 seconds for font to load
2. Apply fallback if font doesn't load
3. Log warnings in console

## Manual Font Check

Run this in browser console to check font status:

```javascript
// Check if font is loaded
const fontLoaded = document.fonts.check('24px "Material Symbols Outlined"');
console.log('Font loaded:', fontLoaded);

// Get computed font family for an icon
const icon = document.querySelector('.material-symbols-outlined');
if (icon) {
    const computedFont = window.getComputedStyle(icon).fontFamily;
    console.log('Computed font:', computedFont);
}

// Check if fallback class is applied
const hasFallback = document.documentElement.classList.contains('material-icons-fallback');
console.log('Using fallback:', hasFallback);
```

## Expected Console Output

### Success Case
```
(No errors or warnings)
```

### Fallback Case
```
Material Symbols font not available, using fallback
```

### Error Case
```
Material Symbols font failed to load from CDN, using fallback
```

## Network Issues

If you're behind a corporate firewall or have no internet:

### Option 1: Download Font Locally
1. Download Material Symbols from: https://github.com/google/material-design-icons
2. Place font files in `frontend/src/assets/fonts/`
3. Update `index.html` to use local font:

```html
<style>
@font-face {
    font-family: 'Material Symbols Outlined';
    src: url('/assets/fonts/MaterialSymbolsOutlined.woff2') format('woff2');
    font-weight: 100 700;
    font-style: normal;
}
</style>
```

### Option 2: Use System Fallbacks
The app already has fallback fonts configured. Icons will use:
- Windows: Segoe UI Symbol, Segoe UI Emoji
- macOS: Apple Color Emoji
- Linux: System emoji fonts

## Testing Checklist

- [ ] Icon test page shows green status
- [ ] All icons in test page display as symbols (not text)
- [ ] Sidebar icons in main app are visible
- [ ] No console errors about fonts
- [ ] Icons appear within 3 seconds of page load
- [ ] Icons work after hard refresh (Ctrl+Shift+R)

## Next Steps

1. **Check both browser tabs** (icon-test.html and localhost:4200)
2. **Open DevTools Console** (F12) in both tabs
3. **Report back** with:
   - Status from icon-test.html (green/yellow/red)
   - Whether icons are visible in the main app
   - Any console errors or warnings
   - Screenshot if icons still not working

## Additional Debugging

If icons still don't work after all checks:

1. **Check Angular build**:
   ```powershell
   cd frontend
   npm run build
   ```

2. **Verify styles are compiled**:
   - Check `frontend/dist/` folder
   - Look for compiled CSS files

3. **Check for CSS conflicts**:
   - Search for other `.material-symbols-outlined` definitions
   - Check if Tailwind is purging icon classes

4. **Browser compatibility**:
   - Test in Chrome/Edge (best support)
   - Avoid IE11 (not supported)

## Contact Information

If issues persist, provide:
1. Browser name and version
2. Operating system
3. Console errors (screenshot)
4. Network tab screenshot (filtered by "font")
5. Screenshot of icon-test.html status box
