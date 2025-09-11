import * as THREE from 'three';
import { AssetInfo, AssetCategory, GameSystem } from '../types';

export class AssetLoader implements GameSystem {
  private assets: Map<string, AssetInfo> = new Map();
  private textureLoader = new THREE.TextureLoader();
  private loadedTextures: Map<string, THREE.Texture> = new Map();

  async init(): Promise<void> {
    await this.discoverAssets();
    await this.loadTextures();
  }

  update(deltaTime: number): void {
    // AssetLoader doesn't need frame updates
  }

  dispose(): void {
    this.loadedTextures.forEach(texture => texture.dispose());
    this.loadedTextures.clear();
    this.assets.clear();
  }

  private async discoverAssets(): Promise<void> {
    // Starter kit essential assets
    // Add your own assets to this array to make them available in the game
    // Supported formats: .png, .jpg
    // Categories will be automatically detected based on filename
    const knownAssets = [
      'skybox.png',
      'waternormals.jpg'
      // Add your assets here:
      // 'your-terrain-texture.png',
      // 'your-tree.png',
      // 'your-enemy.png',
      // etc.
    ];

    for (const filename of knownAssets) {
      const category = this.categorizeAsset(filename);
      const assetInfo: AssetInfo = {
        name: filename.replace('.png', '').replace('.jpg', ''),
        path: `/assets/${filename}`,
        category
      };
      
      this.assets.set(assetInfo.name, assetInfo);
    }

    console.log(`Discovered ${this.assets.size} assets:`, 
      Array.from(this.assets.values()).map(a => `${a.name} (${a.category})`));
  }

  private categorizeAsset(filename: string): AssetCategory {
    const name = filename.toLowerCase();
    
    if (name.includes('floor') || name.includes('ground')) {
      return AssetCategory.GROUND;
    }
    if (name.includes('tree') || name.includes('grass') || name.includes('mushroom') || name.includes('wheat')) {
      return AssetCategory.FOLIAGE;
    }
    if (name.includes('imp') || name.includes('enemy') || name.includes('zombie') || name.includes('goblin')) {
      return AssetCategory.ENEMY;
    }
    if (name.includes('skybox') || name.includes('sky')) {
      return AssetCategory.SKYBOX;
    }
    
    return AssetCategory.UNKNOWN;
  }

  private async loadTextures(): Promise<void> {
    const loadPromises = Array.from(this.assets.values()).map(async (asset) => {
      try {
        const texture = await this.loadTexture(asset.path);
        
        // Configure for pixel-perfect rendering
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        // Note: flipY will be handled by PixelPerfectUtils.configureTexture()
        
        asset.texture = texture;
        this.loadedTextures.set(asset.name, texture);
        
        console.log(`Loaded texture: ${asset.name} (${texture.image.width}x${texture.image.height})`);
      } catch (error) {
        console.warn(`Failed to load texture: ${asset.path}`, error);
      }
    });

    await Promise.all(loadPromises);
  }

  private loadTexture(path: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        path,
        (texture) => resolve(texture),
        undefined,
        (error) => reject(error)
      );
    });
  }

  getTexture(name: string): THREE.Texture | undefined {
    return this.loadedTextures.get(name);
  }

  getAssetsByCategory(category: AssetCategory): AssetInfo[] {
    return Array.from(this.assets.values()).filter(asset => asset.category === category);
  }

  getAsset(name: string): AssetInfo | undefined {
    return this.assets.get(name);
  }

  getAllAssets(): AssetInfo[] {
    return Array.from(this.assets.values());
  }
}