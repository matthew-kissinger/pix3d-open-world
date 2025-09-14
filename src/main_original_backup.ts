import * as THREE from 'three';
import './style.css';

// Import our game systems
import { AssetLoader } from './systems/AssetLoader';
// Legacy systems removed: Terrain, BillboardSystem, WorldGenerator
import { PlayerController } from './systems/PlayerController';
// import { EnemyAI } from './systems/EnemyAI'; // Deprecated - using CombatantSystem now
// import { EnemySystem } from './systems/EnemySystem'; // Replaced with CombatantSystem
import { CombatantSystem } from './systems/CombatantSystem';
import { Skybox } from './systems/Skybox';
import { ImprovedChunkManager } from './systems/ImprovedChunkManager';
import { GlobalBillboardSystem } from './systems/GlobalBillboardSystem';
import { PixelPerfectUtils } from './utils/PixelPerfect';
import { WaterSystem } from './systems/WaterSystem';
import { FirstPersonWeapon } from './systems/FirstPersonWeapon';
import { ZoneManager } from './systems/ZoneManager';
import { HUDSystem } from './systems/HUDSystem';
import { TicketSystem } from './systems/TicketSystem';
import { PlayerHealthSystem } from './systems/PlayerHealthSystem';
import { MinimapSystem } from './systems/MinimapSystem';
import { AudioManager } from './systems/AudioManager';
import { GameSystem } from './types';

class PixelArtSandbox {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private systems: GameSystem[] = [];
  
  // Game systems
  private assetLoader!: AssetLoader;
  private chunkManager!: ImprovedChunkManager;
  private globalBillboardSystem!: GlobalBillboardSystem;
  private playerController!: PlayerController;
  // private enemyAI!: EnemyAI; // Deprecated - using CombatantSystem now
  // private enemySystem!: EnemySystem; // Replaced with CombatantSystem
  private combatantSystem!: CombatantSystem;
  private skybox!: Skybox;
  private waterSystem!: WaterSystem;
  private firstPersonWeapon!: FirstPersonWeapon;
  private zoneManager!: ZoneManager;
  private hudSystem!: HUDSystem;
  private ticketSystem!: TicketSystem;
  private playerHealthSystem!: PlayerHealthSystem;
  private minimapSystem!: MinimapSystem;
  private audioManager!: AudioManager;

  // Game state
  private clock = new THREE.Clock();
  private isInitialized = false;

  constructor() {
    console.log('🎮 Initializing Pixel Art Sandbox Engine...');
    console.log('Three.js version:', THREE.REVISION);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: false, // Disabled for pixel-perfect rendering
      powerPreference: 'high-performance'
    });

    this.setupRenderer();
    this.setupLighting();
    this.setupEventListeners();
    this.initializeSystems();
  }

  private setupRenderer(): void {
    // Configure for pixel-perfect rendering
    PixelPerfectUtils.configureRenderer(this.renderer);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    document.body.appendChild(this.renderer.domElement);

    // Simple crosshair
    const crosshair = document.createElement('div');
    crosshair.style.position = 'fixed';
    crosshair.style.left = '50%';
    crosshair.style.top = '50%';
    crosshair.style.transform = 'translate(-50%, -50%)';
    crosshair.style.width = '4px';
    crosshair.style.height = '4px';
    crosshair.style.background = '#ff3333';
    crosshair.style.borderRadius = '50%';
    crosshair.style.pointerEvents = 'none';
    crosshair.style.zIndex = '10';
    document.body.appendChild(crosshair);
  }

  private setupLighting(): void {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0x87CEEB, 0.6); // Sky blue ambient
    this.scene.add(ambientLight);

    // Directional light (sun) with shadows
    const directionalLight = new THREE.DirectionalLight(0xFFE5B4, 0.8); // Warm sunlight
    directionalLight.position.set(50, 100, 30);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    
    this.scene.add(directionalLight);

    console.log('✨ Lighting setup complete');
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Performance monitoring
    window.addEventListener('keydown', (event) => {
      if (event.key === 'F1') {
        this.togglePerformanceStats();
      }
    });
  }

  private async initializeSystems(): Promise<void> {
    try {
      console.log('🔧 Initializing game systems...');

      // Initialize core systems with global billboard system
      this.assetLoader = new AssetLoader();
      this.globalBillboardSystem = new GlobalBillboardSystem(this.scene, this.camera, this.assetLoader);
      this.chunkManager = new ImprovedChunkManager(this.scene, this.camera, this.assetLoader, this.globalBillboardSystem);
      
      // Keep original systems for fallback compatibility
      this.playerController = new PlayerController(this.camera);
      // this.enemyAI = new EnemyAI(this.billboardSystem, this.terrain); // Deprecated
      // this.enemySystem = new EnemySystem(this.scene, this.camera, this.globalBillboardSystem, this.assetLoader, this.chunkManager);
      this.combatantSystem = new CombatantSystem(this.scene, this.camera, this.globalBillboardSystem, this.assetLoader, this.chunkManager);
      this.skybox = new Skybox(this.scene);
      this.waterSystem = new WaterSystem(this.scene, this.assetLoader);
      this.firstPersonWeapon = new FirstPersonWeapon(this.scene, this.camera, this.assetLoader);
      this.zoneManager = new ZoneManager(this.scene);
      this.hudSystem = new HUDSystem();
      this.ticketSystem = new TicketSystem();
      this.playerHealthSystem = new PlayerHealthSystem();
      this.minimapSystem = new MinimapSystem(this.camera);
      this.audioManager = new AudioManager(this.scene, this.camera);

      // Connect systems with chunk manager
      this.playerController.setChunkManager(this.chunkManager);
      this.combatantSystem.setChunkManager(this.chunkManager);
      this.firstPersonWeapon.setPlayerController(this.playerController);
      this.firstPersonWeapon.setCombatantSystem(this.combatantSystem);
      this.firstPersonWeapon.setHUDSystem(this.hudSystem); // Connect HUD to weapon for hit markers
      this.hudSystem.setCombatantSystem(this.combatantSystem);
      this.hudSystem.setZoneManager(this.zoneManager);
      this.hudSystem.setTicketSystem(this.ticketSystem);
      this.ticketSystem.setZoneManager(this.zoneManager);
      this.combatantSystem.setTicketSystem(this.ticketSystem);
      this.combatantSystem.setPlayerHealthSystem(this.playerHealthSystem);
      this.combatantSystem.setZoneManager(this.zoneManager);
      this.combatantSystem.setHUDSystem(this.hudSystem); // Connect HUD to combatant system for kill tracking
      this.playerHealthSystem.setZoneManager(this.zoneManager);
      this.playerHealthSystem.setTicketSystem(this.ticketSystem);
      this.playerHealthSystem.setPlayerController(this.playerController); // Connect player controller for respawning
      this.minimapSystem.setZoneManager(this.zoneManager);
      this.minimapSystem.setCombatantSystem(this.combatantSystem);
      this.zoneManager.setCombatantSystem(this.combatantSystem);
      this.zoneManager.setCamera(this.camera);

      // Connect audio manager
      this.firstPersonWeapon.setAudioManager(this.audioManager);
      this.combatantSystem.setAudioManager(this.audioManager);

      // Add systems to update list - NEW ORDER WITH GLOBAL BILLBOARD SYSTEM
      this.systems = [
        this.assetLoader,
        this.audioManager,
        this.globalBillboardSystem,
        this.chunkManager,
        this.waterSystem,
        this.playerController,
        this.firstPersonWeapon,
        this.combatantSystem,
        this.zoneManager,
        this.ticketSystem,
        this.playerHealthSystem,
        this.minimapSystem,
        this.hudSystem,
        this.skybox
      ];

      // Initialize all systems
      for (const system of this.systems) {
        await system.init();
      }

      console.log('🎯 Systems initialized, loading assets...');
      await this.loadGameAssets();

      // Create skybox for the world
      const skyboxTexture = this.assetLoader.getTexture('skybox');
      if (skyboxTexture) {
        this.skybox.createSkybox(skyboxTexture);
        console.log('☁️ Skybox created');
      }

      // Chunks generate dynamically via ImprovedChunkManager
      console.log('🌍 World system ready for dynamic chunk loading...');

      this.isInitialized = true;
      console.log('🚀 Pixel Art Sandbox ready!');
      this.showWelcomeMessage();

    } catch (error) {
      console.error('❌ Failed to initialize sandbox:', error);
    }
  }

  private async loadGameAssets(): Promise<void> {
    // Assets are auto-discovered by AssetLoader; ensure critical ones exist but don't hard-fail
    const skyboxTexture = this.assetLoader.getTexture('skybox');
    if (!skyboxTexture) {
      console.warn('Skybox texture missing; proceeding without skybox.');
    }
    console.log('📦 Asset check complete');
  }

  // Legacy buildWorld removed; generation handled by chunk manager and billboard system

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private togglePerformanceStats(): void {
    const debugInfo = this.globalBillboardSystem.getDebugInfo();
    console.log('📊 Performance Stats:');
    console.log(`FPS: ${Math.round(1 / this.clock.getDelta())}`);
    console.log(`Draw calls: ${this.renderer.info.render.calls}`);
    console.log(`Triangles: ${this.renderer.info.render.triangles}`);
    console.log(`Grass instances: ${debugInfo.grassUsed}/${this.globalBillboardSystem.getInstanceCount('grass')}`);
    console.log(`Tree instances: ${debugInfo.treeUsed}/${this.globalBillboardSystem.getInstanceCount('tree')}`);
    const stats = this.combatantSystem.getCombatStats();
    console.log(`Combatants - US: ${stats.us}, OPFOR: ${stats.opfor}`);  
    console.log(`Chunks loaded: ${this.chunkManager.getLoadedChunkCount()}, Queue: ${this.chunkManager.getQueueSize()}, Loading: ${this.chunkManager.getLoadingCount()}`);
    console.log(`Chunks tracked: ${debugInfo.chunksTracked}`);
  }

  private showWelcomeMessage(): void {
    const debugInfo = this.globalBillboardSystem.getDebugInfo();
    console.log(`
🎮 PIXEL ART SANDBOX ENGINE READY!

🌍 World Features:
- ${debugInfo.grassUsed} grass instances allocated
- ${debugInfo.treeUsed} tree instances allocated
- ${this.chunkManager ? this.chunkManager.getLoadedChunkCount() : 0} chunks loaded
- ${this.combatantSystem ? `US: ${this.combatantSystem.getCombatStats().us}, OPFOR: ${this.combatantSystem.getCombatStats().opfor}` : '0'} combatants in battle
- Global billboard system with centralized camera tracking
- Dynamic chunk loading system
- Equirectangular skybox

🎯 Controls:
- WASD: Move around
- Shift: Run
- Mouse: Look around (click to enable)
- F1: Performance stats
- Escape: Release mouse lock

🔧 Developer Features:
- Auto-asset discovery from /assets/
- Pixel-perfect rendering
- Global billboard system (100K+ instances)
- Dynamic chunk loading/unloading
- Centralized camera tracking
- Modular architecture

Drop new PNG files in public/assets/ and they'll be auto-discovered!
    `);
  }

  public start(): void {
    this.animate();
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    if (!this.isInitialized) return;

    const deltaTime = this.clock.getDelta();

    // Update all systems
    for (const system of this.systems) {
      system.update(deltaTime);
    }

    // Update skybox position to follow camera
    this.skybox.updatePosition(this.camera.position);

    // Render the main scene
    this.renderer.render(this.scene, this.camera);
    
    // Render weapon overlay on top
    if (this.firstPersonWeapon) {
      this.firstPersonWeapon.renderWeapon(this.renderer);
    }
  }

  public dispose(): void {
    // Clean up all systems
    for (const system of this.systems) {
      system.dispose();
    }

    // Clean up Three.js resources
    this.renderer.dispose();
    document.body.removeChild(this.renderer.domElement);
    
    console.log('🧹 Sandbox disposed');
  }
}

// Initialize and start the sandbox
const sandbox = new PixelArtSandbox();
sandbox.start();

// Global cleanup handler
window.addEventListener('beforeunload', () => {
  sandbox.dispose();
});

// Hot reload support for development
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    sandbox.dispose();
  });
}