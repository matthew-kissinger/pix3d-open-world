import * as THREE from 'three';
import { GameSystem, WorldConfig, BillboardInstance } from '../types';
import { MathUtils } from '../utils/Math';
import { BillboardSystem } from './Billboard';
import { Terrain } from './Terrain';

export class WorldGenerator implements GameSystem {
  private config: WorldConfig;
  private billboardSystem: BillboardSystem;
  private terrain: Terrain;

  constructor(
    billboardSystem: BillboardSystem, 
    terrain: Terrain,
    config: WorldConfig = {
      terrainSize: 200,
      grassDensity: 0, // Starter kit: no auto-generated foliage
      treeDensity: 0, // Starter kit: add your own trees
      enemyCount: 0 // Starter kit: add your own enemies
    }
  ) {
    this.billboardSystem = billboardSystem;
    this.terrain = terrain;
    this.config = config;
  }

  async init(): Promise<void> {
    // World generation happens when textures are available
  }

  update(deltaTime: number): void {
    // World is static after generation
  }

  dispose(): void {
    // WorldGenerator doesn't manage resources directly
  }

  generateWorld(
    grassTexture: THREE.Texture,
    treeTexture: THREE.Texture
  ): void {
    console.log('Generating world...');
    
    // Starter kit: Auto-generation disabled
    // Uncomment these lines to enable automatic foliage generation:
    // this.generateGrass(grassTexture);
    // this.generateTrees(treeTexture);
    
    console.log('World generation complete - starter kit ready!');
  }

  private generateGrass(grassTexture: THREE.Texture): void {
    const terrainSize = this.config.terrainSize;
    const halfSize = terrainSize / 2;
    const targetCount = Math.floor(terrainSize * terrainSize * this.config.grassDensity);
    
    console.log(`🌱 GRASS GENERATION DEBUG:`);
    console.log(`- Terrain size: ${terrainSize}`);
    console.log(`- Grass density: ${this.config.grassDensity}`);
    console.log(`- Target count: ${targetCount}`);
    
    // Create billboard type for grass (much bigger and visible)
    this.billboardSystem.createBillboardType('grass', grassTexture, targetCount, 2, 3);

    console.log(`Generating ${targetCount} grass instances...`);

    let successfullyAdded = 0;
    // Generate grass with random distribution
    for (let i = 0; i < targetCount; i++) {
      const position = MathUtils.randomVector3(-halfSize, halfSize, -halfSize, halfSize, 0);
      
      // Slight height variation
      position.y = this.terrain.getHeightAt(position.x, position.z);
      
      const scale = new THREE.Vector3(
        MathUtils.randomInRange(0.5, 1.2),
        MathUtils.randomInRange(0.8, 1.5),
        1
      );
      
      const instance: BillboardInstance = {
        position,
        scale,
        rotation: MathUtils.randomInRange(0, Math.PI * 2)
      };

      const index = this.billboardSystem.addInstance('grass', instance);
      if (index >= 0) successfullyAdded++;
    }

    console.log(`✅ Generated ${successfullyAdded}/${targetCount} grass instances`);
    console.log(`Final grass count: ${this.billboardSystem.getInstanceCount('grass')}`);
  }

  private generateTrees(treeTexture: THREE.Texture): void {
    const terrainSize = this.config.terrainSize;
    const halfSize = terrainSize / 2;
    const targetCount = Math.floor(terrainSize * terrainSize * this.config.treeDensity);
    
    console.log(`🌳 TREE GENERATION DEBUG:`);
    console.log(`- Terrain size: ${terrainSize}`);
    console.log(`- Tree density: ${this.config.treeDensity}`);
    console.log(`- Target count: ${targetCount}`);
    
    // Create billboard type for trees (bigger and properly sized)
    this.billboardSystem.createBillboardType('tree', treeTexture, targetCount, 4, 6);

    console.log(`Generating ${targetCount} tree instances using Poisson disk sampling...`);

    // Use Poisson disk sampling for better tree distribution
    const minDistance = 4; // Closer trees for denser forest
    const treePoints = MathUtils.poissonDiskSampling(terrainSize, terrainSize, minDistance);
    
    console.log(`- Poisson disk generated ${treePoints.length} potential points`);
    
    // Convert points to 3D positions and create tree instances
    const actualCount = Math.min(treePoints.length, targetCount);
    
    let successfullyAdded = 0;
    for (let i = 0; i < actualCount; i++) {
      const point = treePoints[i];
      const position = new THREE.Vector3(
        point.x - halfSize,
        this.terrain.getHeightAt(point.x - halfSize, point.y - halfSize) + 2.5, // Trees sit properly on ground
        point.y - halfSize
      );
      
      const scale = new THREE.Vector3(
        MathUtils.randomInRange(0.8, 1.5),
        MathUtils.randomInRange(0.9, 1.8),
        1
      );
      
      const instance: BillboardInstance = {
        position,
        scale,
        rotation: MathUtils.randomInRange(0, Math.PI * 2)
      };

      const index = this.billboardSystem.addInstance('tree', instance);
      if (index >= 0) successfullyAdded++;
    }

    console.log(`✅ Generated ${successfullyAdded}/${actualCount} tree instances`);
    console.log(`Final tree count: ${this.billboardSystem.getInstanceCount('tree')}`);
  }

  generateEnemySpawns(): THREE.Vector3[] {
    const terrainSize = this.config.terrainSize;
    const halfSize = terrainSize / 2;
    const spawns: THREE.Vector3[] = [];

    console.log(`👹 ENEMY SPAWN GENERATION DEBUG:`);
    console.log(`- Terrain size: ${terrainSize}`);
    console.log(`- Enemy count target: ${this.config.enemyCount}`);
    console.log(`- Spawn area: ${-halfSize + 10} to ${halfSize - 10}`);

    for (let i = 0; i < this.config.enemyCount; i++) {
      let attempts = 0;
      let validPosition = false;
      let position: THREE.Vector3;

      do {
        position = MathUtils.randomVector3(-halfSize + 10, halfSize - 10, -halfSize + 10, halfSize - 10, 0);
        position.y = this.terrain.getHeightAt(position.x, position.z) + 0.5; // Slightly above ground
        
        // Check if position is far enough from trees
        validPosition = this.isValidEnemySpawn(position);
        attempts++;
      } while (!validPosition && attempts < 50);

      if (validPosition) {
        spawns.push(position);
        console.log(`Enemy spawn ${i}: valid position found at`, position, `(attempts: ${attempts})`);
      } else {
        console.warn(`Enemy spawn ${i}: failed to find valid position after 50 attempts`);
      }
    }

    console.log(`✅ Generated ${spawns.length}/${this.config.enemyCount} valid enemy spawn points`);
    return spawns;
  }

  private isValidEnemySpawn(position: THREE.Vector3): boolean {
    // Check distance from trees - much more relaxed for dense forest
    const treeInstances = this.billboardSystem.getAllInstances('tree');
    const minDistanceFromTrees = 2; // Reduced from 5 to 2 units
    
    // Only check against nearby trees for performance
    let nearbyTreeCount = 0;
    for (const tree of treeInstances) {
      const distance = position.distanceTo(tree.position);
      if (distance < minDistanceFromTrees) {
        nearbyTreeCount++;
        // Allow up to 2 nearby trees (imps can hide between trees)
        if (nearbyTreeCount > 2) {
          return false;
        }
      }
    }

    return true;
  }

  getConfig(): WorldConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<WorldConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}