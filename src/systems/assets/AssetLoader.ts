import * as THREE from 'three';
import { AssetInfo, AssetCategory, GameSystem } from '../../types';
import { getAssetPath } from '../../config/paths';

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
    // Known assets in the project root
    const knownAssets = [
      'forestfloor.png',
      // Large canopy trees (scale 8-12)
      'DipterocarpGiant.png',
      'TwisterBanyan.png',
      // Medium palms (scale 4-6)
      'CoconutPalm.png',
      'ArecaPalmCluster.png',
      // Small ground foliage (scale 1-3)
      'Fern.png',
      'FanPalmCluster.png',
      'ElephantEarPlants.png',
      // Legacy trees (kept for compatibility)
      'tree.png',
      'grass.png',
      // US Faction soldiers (prefixed with 'A')
      'ASoldierWalking.png',
      'ASoldierAlert.png',
      'ASoldierFiring.png',
      'ASoldierFlameThrower.png',
      // OPFOR/Enemy soldiers
      'EnemySoldierWalking.png',  // Renamed from SoliderWalking.png
      'EnemySoldierAlert.png',     // Renamed from SoldierAlert.png
      'EnemySoldierFiring.png',    // Renamed from SoliderFiring.png
      'EnemySoldierBack.png',      // Back view of enemy soldier
      // UI/Player
      'first-person.png',
      // Environment
      'skybox.png',
      'waternormals.jpg'
    ];

    for (const filename of knownAssets) {
      const category = this.categorizeAsset(filename);
      const assetInfo: AssetInfo = {
        name: filename.replace('.png', '').replace('.jpg', ''),
        path: getAssetPath(filename),
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
    // Expanded foliage detection for jungle assets
    if (name.includes('tree') || name.includes('grass') ||
        name.includes('dipterocarp') || name.includes('banyan') || name.includes('palm') ||
        name.includes('fern') || name.includes('elephant')) {
      return AssetCategory.FOLIAGE;
    }
    // Soldier detection - all soldiers are categorized as ENEMY for now (will be distinguished by prefix)
    // ASoldier* = US faction, Solider*/Soldier* = OPFOR faction
    if (name.includes('soldier') || name.includes('solider')) {
      return AssetCategory.ENEMY;  // Using ENEMY category for all combatants
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
        // Downscale extremely large textures to avoid GPU memory exhaustion
        const resized = this.downscaleIfNeeded(asset.name, texture);
        const finalTexture = resized || texture;

        asset.texture = finalTexture;
        this.loadedTextures.set(asset.name, finalTexture);

        console.log(`Loaded texture: ${asset.name} (${finalTexture.image.width}x${finalTexture.image.height})`);
      } catch (error) {
        console.warn(`Failed to load texture: ${asset.path}`, error);
      }
    });

    await Promise.all(loadPromises);
  }

  // Heuristically clamp texture size by asset type to keep WebGL stable
  private downscaleIfNeeded(name: string, texture: THREE.Texture): THREE.Texture | null {
    const w = (texture.image as any)?.width || 0;
    const h = (texture.image as any)?.height || 0;
    if (!w || !h) return null;

    const lower = name.toLowerCase();
    let maxDim = 2048;
    if (lower.includes('skybox')) maxDim = 1024;
    if (lower.includes('forestfloor') || lower.includes('waternormals')) maxDim = 1024;
    if (lower.includes('fern') || lower.includes('areca') || lower.includes('elephant') || lower.includes('fanpalm')) maxDim = 2048;

    if (w <= maxDim && h <= maxDim) return null;

    const scale = Math.min(maxDim / w, maxDim / h);
    const newW = Math.max(1, Math.floor(w * scale));
    const newH = Math.max(1, Math.floor(h * scale));

    const canvas = document.createElement('canvas');
    canvas.width = newW;
    canvas.height = newH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    try {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';
      ctx.drawImage(texture.image as any, 0, 0, newW, newH);
      const canvasTex = new THREE.CanvasTexture(canvas);
      canvasTex.magFilter = THREE.NearestFilter;
      canvasTex.minFilter = THREE.NearestFilter;
      canvasTex.wrapS = THREE.RepeatWrapping;
      canvasTex.wrapT = THREE.RepeatWrapping;
      texture.dispose();
      return canvasTex;
    } catch (e) {
      console.warn(`Texture downscale failed for ${name}:`, e);
      return null;
    }
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