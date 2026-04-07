# How to Run the Floor Planner

## Prerequisites ✅
- Node.js is installed
- Dependencies are installed (`npm install` - already done!)

## Quick Start (3 steps)

### 1️⃣ Add Your Floor Plan
Place your floor plan image in the `public` folder and name it `floorplan.png`

```bash
# From the floor-planner directory
cp ~/path/to/your/floorplan.png public/floorplan.png
```

### 2️⃣ Start the App
```bash
npm run dev
```

### 3️⃣ Open in Browser
Navigate to: **http://localhost:5173**

---

## First Time Usage

### Calibrate the Scale (CRITICAL!)

1. Click **"Calibrate Scale"** button (top left)
2. Click once on your floor plan to **start** a line
3. Click again to **end** the line
   - ⭐ **Pro tip**: Draw along a wall with a known dimension
   - Example: The M. Bedroom wall is **11'5"**
4. Enter the dimension in the popup:
   - Feet: `11`
   - Inches: `5`
5. Click **"Set Scale"**

✅ Now the app knows the exact scale of your floor plan!

### Add Furniture

**Right Panel → Furniture Presets**
- Click any preset (Queen Bed, Sofa, etc.)
- Furniture appears at canvas center

**Custom Furniture**
- Click **"+ Add Custom"**
- Enter name and dimensions
- Click **"Add to Canvas"**

### Interact with Furniture

- **Move**: Drag any furniture piece
- **Rotate**: Select furniture → drag the circular handle at top
- **Resize**: Select furniture → drag corner handles
- **Edit Dimensions**: Select furniture → edit in right panel → **"Update Dimensions"**
- **Delete**: Select furniture → **"Delete"** button

---

## Keyboard Shortcuts

- **Click furniture**: Select it
- **Drag**: Move selected furniture
- **Delete key**: Remove selected furniture (coming soon)

---

## Your Floor Plan Dimensions

Use these for calibration:

| Room | Dimensions |
|------|-----------|
| Living/Dining/Kitchen | 23'4" × 29'3" |
| M. Bedroom | 11'5" × 12'0" |
| Bedroom | 12'5" × 12'6" |

---

## Common Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Stop the server
Press Ctrl+C in the terminal
```

---

## Troubleshooting

### Port 5173 is already in use
```bash
# Kill the process or use a different port
npm run dev -- --port 3000
```

### Floor plan doesn't show
- Verify image is at `public/floorplan.png`
- Check browser console (F12) for errors
- Try a different image format (PNG recommended)

### Furniture is the wrong size
- **Recalibrate!** The scale calibration is everything
- Draw calibration line carefully (straight horizontal/vertical is best)
- Verify you're entering feet AND inches, not total inches

---

## File Structure

```
floor-planner/
├── public/
│   └── floorplan.png          ← YOUR IMAGE GOES HERE
├── src/
│   ├── components/            ← React components
│   ├── hooks/                 ← Custom hooks
│   ├── App.jsx                ← Main app logic
│   └── main.jsx               ← Entry point
├── package.json
└── vite.config.js
```

---

## What's Next?

- **Save layouts**: Add localStorage (see README.md)
- **Export**: Save furniture positions as JSON
- **Share**: Build and deploy to Vercel/Netlify

Read the full [README.md](README.md) for advanced features and customization.

---

**Need help?** Check the [SETUP.md](SETUP.md) and [README.md](README.md) files.
