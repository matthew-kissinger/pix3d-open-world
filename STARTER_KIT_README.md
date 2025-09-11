# Pix3D Starter Kit - 2.5D Browser Game Engine

Welcome to the Pix3D Starter Kit! This is a clean, minimal 2.5D browser game engine built with Three.js, ready for AI-assisted game development.

## What's Included

### Core Systems
- **Terrain System**: Chunked terrain with LOD support
- **Billboard System**: Efficient sprite rendering with billboarding
- **Global Billboard System**: For large-scale sprite management
- **Chunk Manager**: Optimized world streaming
- **Player Controller**: First-person movement with collision
- **Enemy System**: Ready for NPCs and enemies (currently disabled)
- **Water System**: Animated water with normal mapping
- **Skybox**: Panoramic environment rendering

### Current Assets
- `skybox.png` - Environmental backdrop
- `waternormals.jpg` - Water surface animation

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:5173`

## Adding Assets with AI

This starter kit is designed to work seamlessly with AI assistants like Claude. Here's how to add content:

### Adding Terrain Textures
Tell your AI assistant:
```
"Add a grass texture to the terrain. The texture is at assets/grass.png"
```

The AI will:
1. Add the texture to `AssetLoader.ts`
2. Apply it to the terrain system
3. Configure proper scaling and tiling

### Adding Foliage (Trees, Grass, etc.)
Tell your AI assistant:
```
"Add trees to the world using tree.png as a billboard sprite"
```

The AI will:
1. Add the asset to the loader
2. Create billboard instances
3. Use the WorldGenerator for placement
4. Configure proper billboarding

### Adding NPCs/Enemies
Tell your AI assistant:
```
"Add a goblin enemy that wanders around. Use goblin.png"
```

The AI will:
1. Add the enemy texture
2. Enable the EnemySystem
3. Configure AI behaviors
4. Set up collision detection

### Adding Interactive Objects
Tell your AI assistant:
```
"Add collectable mushrooms using mushroom.png that the player can pick up"
```

## Asset Guidelines

### Recommended Formats
- **Textures**: PNG with transparency (for sprites)
- **Terrain**: PNG or JPG (seamless textures work best)
- **Sprites**: Power-of-2 dimensions (e.g., 512x512, 1024x1024)

### Naming Conventions
The AssetLoader automatically categorizes assets based on filename:
- `*tree*`, `*grass*`, `*mushroom*` → FOLIAGE
- `*floor*`, `*ground*` → GROUND
- `*enemy*`, `*zombie*`, `*goblin*` → ENEMY
- `*skybox*`, `*sky*` → SKYBOX

## System Architecture

### Adding Assets Manually

1. Place your asset in `public/assets/`
2. Add it to the `knownAssets` array in `src/systems/AssetLoader.ts`
3. Use it in your game systems

### Key Files to Modify

- `src/systems/AssetLoader.ts` - Register new assets
- `src/systems/WorldGenerator.ts` - Configure world generation
- `src/systems/EnemySystem.ts` - Add enemy types
- `src/main.ts` - Main game initialization

## AI Assistant Tips

When working with AI assistants:

1. **Be specific about asset locations**: "The texture is at assets/tree.png"
2. **Describe desired behavior**: "Make enemies patrol in groups"
3. **Request incremental changes**: Build complexity gradually
4. **Ask for performance optimization**: The AI can help optimize sprite batching

## Example AI Prompts

### Creating a Forest Environment
```
"Create a dense forest environment. Use tree1.png, tree2.png, and tree3.png 
for variety. Add grass.png as ground cover. Make it feel mysterious."
```

### Adding Combat System
```
"Add a simple combat system where clicking shoots projectiles that can 
defeat enemies. Use fireball.png for the projectile sprite."
```

### Creating NPCs
```
"Add friendly NPCs that the player can talk to. Use villager.png. 
They should have simple dialogue when approached."
```

## Performance Notes

- The engine supports thousands of billboard sprites efficiently
- Chunk system handles large worlds (200x200+ units)
- Automatic LOD and frustum culling
- Instanced rendering for similar objects

## Troubleshooting

### Assets Not Loading
- Check the console for load errors
- Verify asset path in AssetLoader.ts
- Ensure file exists in public/assets/

### Poor Performance
- Reduce billboard density in WorldGenerator
- Decrease chunk size in ChunkManager
- Enable fog for distant object culling

## License

MIT License - Use freely for any project!

---

Happy game building! This starter kit is your canvas - let AI help you paint your world! 🎮✨