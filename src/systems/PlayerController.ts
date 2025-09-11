import * as THREE from 'three';
import { GameSystem, PlayerState } from '../types';
import { MathUtils } from '../utils/Math';
import { Terrain } from './Terrain';
import { ChunkManager } from './ChunkManager';
import { ImprovedChunkManager } from './ImprovedChunkManager';

export class PlayerController implements GameSystem {
  private camera: THREE.PerspectiveCamera;
  private terrain: Terrain;
  private chunkManager?: ChunkManager | ImprovedChunkManager;
  private playerState: PlayerState;
  private keys: Set<string> = new Set();
  private mouseMovement = { x: 0, y: 0 };
  private isPointerLocked = false;

  // Camera settings
  private pitch = 0;
  private yaw = 0;
  private maxPitch = Math.PI / 2 - 0.1; // Prevent full vertical rotation

  constructor(camera: THREE.PerspectiveCamera, terrain: Terrain) {
    this.camera = camera;
    this.terrain = terrain;
    
    this.playerState = {
      position: new THREE.Vector3(0, 5, 10), // BACK TO ORIGINAL POSITION
      velocity: new THREE.Vector3(0, 0, 0),
      speed: 10,
      runSpeed: 20,
      isRunning: false,
      isGrounded: false,
      isJumping: false,
      jumpForce: 12,
      gravity: -25
    };

    this.setupEventListeners();
  }

  async init(): Promise<void> {
    // Set initial camera position
    this.camera.position.copy(this.playerState.position);
    console.log('Player controller initialized');
  }

  update(deltaTime: number): void {
    this.updateMovement(deltaTime);
    this.updateCamera();
    
    // Update chunk manager with player position
    if (this.chunkManager) {
      this.chunkManager.updatePlayerPosition(this.playerState.position);
    }
  }

  dispose(): void {
    this.removeEventListeners();
  }

  private setupEventListeners(): void {
    // Keyboard events
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));

    // Mouse events
    document.addEventListener('click', this.requestPointerLock.bind(this));
    document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));

    // Instructions for user
    this.showControls();
  }

  private removeEventListeners(): void {
    document.removeEventListener('keydown', this.onKeyDown.bind(this));
    document.removeEventListener('keyup', this.onKeyUp.bind(this));
    document.removeEventListener('click', this.requestPointerLock.bind(this));
    document.removeEventListener('pointerlockchange', this.onPointerLockChange.bind(this));
    document.removeEventListener('mousemove', this.onMouseMove.bind(this));
  }

  private onKeyDown(event: KeyboardEvent): void {
    this.keys.add(event.code.toLowerCase());
    
    // Handle special keys
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
      this.playerState.isRunning = true;
    }
    
    if (event.code === 'Space' && this.playerState.isGrounded && !this.playerState.isJumping) {
      this.playerState.velocity.y = this.playerState.jumpForce;
      this.playerState.isJumping = true;
      this.playerState.isGrounded = false;
    }
    
    if (event.code === 'Escape') {
      document.exitPointerLock();
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.keys.delete(event.code.toLowerCase());
    
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
      this.playerState.isRunning = false;
    }
  }

  private requestPointerLock(): void {
    document.body.requestPointerLock();
  }

  private onPointerLockChange(): void {
    this.isPointerLocked = document.pointerLockElement === document.body;
    
    if (this.isPointerLocked) {
      console.log('Pointer locked - mouse look enabled');
    } else {
      console.log('Pointer lock released - click to re-enable mouse look');
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isPointerLocked) return;

    const sensitivity = 0.002;
    this.mouseMovement.x = event.movementX * sensitivity;
    this.mouseMovement.y = event.movementY * sensitivity;
  }

  private updateMovement(deltaTime: number): void {
    const moveVector = new THREE.Vector3();
    const currentSpeed = this.playerState.isRunning ? this.playerState.runSpeed : this.playerState.speed;

    // Calculate movement direction based on camera orientation
    if (this.keys.has('keyw')) {
      moveVector.z -= 1;
    }
    if (this.keys.has('keys')) {
      moveVector.z += 1;
    }
    if (this.keys.has('keya')) {
      moveVector.x -= 1;
    }
    if (this.keys.has('keyd')) {
      moveVector.x += 1;
    }

    // Normalize movement vector
    if (moveVector.length() > 0) {
      moveVector.normalize();
      
      // Apply camera rotation to movement
      const cameraDirection = new THREE.Vector3();
      this.camera.getWorldDirection(cameraDirection);
      cameraDirection.y = 0; // Keep movement horizontal
      cameraDirection.normalize();
      
      const cameraRight = new THREE.Vector3();
      cameraRight.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));
      
      const worldMoveVector = new THREE.Vector3();
      worldMoveVector.addScaledVector(cameraDirection, -moveVector.z);
      worldMoveVector.addScaledVector(cameraRight, moveVector.x);
      
      // Apply movement with acceleration (only horizontal components)
      const acceleration = currentSpeed * 5; // Acceleration factor
      const targetVelocity = worldMoveVector.multiplyScalar(currentSpeed);
      const horizontalVelocity = new THREE.Vector3(this.playerState.velocity.x, 0, this.playerState.velocity.z);
      
      horizontalVelocity.lerp(targetVelocity, Math.min(deltaTime * acceleration, 1));
      
      // Update only horizontal components, preserve Y velocity for jumping/gravity
      this.playerState.velocity.x = horizontalVelocity.x;
      this.playerState.velocity.z = horizontalVelocity.z;
    } else {
      // Apply friction when not moving (only horizontal components)
      const frictionFactor = Math.max(0, 1 - deltaTime * 8);
      this.playerState.velocity.x *= frictionFactor;
      this.playerState.velocity.z *= frictionFactor;
    }

    // Apply gravity
    this.playerState.velocity.y += this.playerState.gravity * deltaTime;

    // Update position
    const movement = this.playerState.velocity.clone().multiplyScalar(deltaTime);
    const newPosition = this.playerState.position.clone().add(movement);

    // No bounds clamping for infinite world
    // Remove the old terrain bounds limitation

    // Check ground collision using ChunkManager if available, otherwise use flat terrain
    let groundHeight = 2; // Default player height above ground
    
    if (this.chunkManager) {
      // Use chunk-based terrain height
      const terrainHeight = this.chunkManager.getHeightAt(newPosition.x, newPosition.z);
      groundHeight = terrainHeight + 2; // Player height above terrain
    } else {
      // Fallback to flat terrain for compatibility
      groundHeight = this.terrain.getHeightAt(newPosition.x, newPosition.z) + 2;
    }
    
    if (newPosition.y <= groundHeight) {
      // Player is on or below ground
      newPosition.y = groundHeight;
      this.playerState.velocity.y = 0;
      this.playerState.isGrounded = true;
      this.playerState.isJumping = false;
    } else {
      // Player is in the air
      this.playerState.isGrounded = false;
    }

    this.playerState.position.copy(newPosition);
  }

  private updateCamera(): void {
    // Update camera rotation from mouse movement
    if (this.isPointerLocked) {
      this.yaw -= this.mouseMovement.x;
      this.pitch -= this.mouseMovement.y;
      this.pitch = MathUtils.clamp(this.pitch, -this.maxPitch, this.maxPitch);
      
      // Reset mouse movement
      this.mouseMovement.x = 0;
      this.mouseMovement.y = 0;
    }

    // Apply rotation to camera
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    // Update camera position
    this.camera.position.copy(this.playerState.position);
  }

  private showControls(): void {
    console.log(`
🎮 CONTROLS:
WASD - Move
Shift - Run
Space - Jump
Mouse - Look around (click to enable pointer lock)
Escape - Release pointer lock
    `);
  }

  getPosition(): THREE.Vector3 {
    return this.playerState.position.clone();
  }

  getVelocity(): THREE.Vector3 {
    return this.playerState.velocity.clone();
  }

  isMoving(): boolean {
    return this.playerState.velocity.length() > 0.1;
  }

  teleport(position: THREE.Vector3): void {
    this.playerState.position.copy(position);
    this.playerState.velocity.set(0, 0, 0);
  }

  setChunkManager(chunkManager: ChunkManager | ImprovedChunkManager): void {
    this.chunkManager = chunkManager;
  }
}