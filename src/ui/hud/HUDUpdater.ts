import { CombatantSystem } from '../../systems/combat/CombatantSystem';
import { Faction } from '../../systems/combat/types';
import { ZoneManager, ZoneState, CaptureZone } from '../../systems/world/ZoneManager';
import { TicketSystem } from '../../systems/world/TicketSystem';
import { HUDElements } from './HUDElements';

export class HUDUpdater {
  private elements: HUDElements;
  private playerKills = 0;
  private playerDeaths = 0;

  constructor(elements: HUDElements) {
    this.elements = elements;
  }

  updateObjectivesDisplay(zoneManager: ZoneManager): void {
    const zones = zoneManager.getAllZones();
    const capturableZones = zones.filter(z => !z.isHomeBase);

    // Clear current display (keep title)
    while (this.elements.objectivesList.children.length > 1) {
      this.elements.objectivesList.removeChild(this.elements.objectivesList.lastChild!);
    }

    // Add each zone
    capturableZones.forEach(zone => {
      const zoneElement = this.createZoneElement(zone);
      this.elements.objectivesList.appendChild(zoneElement);
    });
  }

  private createZoneElement(zone: CaptureZone): HTMLDivElement {
    const element = document.createElement('div');
    element.className = 'zone-item';

    // Determine zone class
    let zoneClass = 'zone-neutral';
    let statusText = 'Neutral';

    switch (zone.state) {
      case ZoneState.US_CONTROLLED:
        zoneClass = 'zone-us';
        statusText = 'US';
        break;
      case ZoneState.OPFOR_CONTROLLED:
        zoneClass = 'zone-opfor';
        statusText = 'OPFOR';
        break;
      case ZoneState.CONTESTED:
        zoneClass = 'zone-contested';
        statusText = 'Contested';
        break;
    }

    // Calculate distance to player
    const distance = Math.round(zone.position.length());

    element.innerHTML = `
      <div>
        <span class="zone-name">${zone.name}</span>
        <span class="zone-distance">${distance}m</span>
      </div>
      <div class="zone-status">
        <div class="zone-icon ${zoneClass}"></div>
      </div>
    `;

    // Add capture progress bar if contested
    if (zone.state === ZoneState.CONTESTED) {
      const progressContainer = document.createElement('div');
      progressContainer.className = 'capture-progress';
      const progressBar = document.createElement('div');
      progressBar.className = 'capture-bar';
      progressBar.style.width = `${zone.captureProgress}%`;
      progressContainer.appendChild(progressBar);
      element.appendChild(progressContainer);
    }

    return element;
  }

  updateTicketDisplay(usTickets: number, opforTickets: number): void {
    this.elements.ticketDisplay.innerHTML = `
      <div class="faction-tickets">
        <div class="faction-name">US Forces</div>
        <div class="ticket-count us-tickets">${Math.round(usTickets)}</div>
      </div>
      <div class="ticket-separator">VS</div>
      <div class="faction-tickets">
        <div class="faction-name">OPFOR</div>
        <div class="ticket-count opfor-tickets">${Math.round(opforTickets)}</div>
      </div>
    `;
  }

  updateCombatStats(combatantSystem: CombatantSystem): void {
    const stats = combatantSystem.getCombatStats();

    this.elements.combatStats.innerHTML = `
      <div class="stat-line">Allies: ${stats.us}</div>
      <div class="stat-line">Enemies: ${stats.opfor}</div>
      <div class="stat-line">Total: ${stats.total}</div>
    `;
  }

  updateKillCounter(): void {
    const kd = this.playerDeaths > 0
      ? (this.playerKills / this.playerDeaths).toFixed(2)
      : this.playerKills.toFixed(2);

    this.elements.killCounter.innerHTML = `
      <div><span class="kill-count">${this.playerKills}</span> Kills</div>
      <div><span class="death-count">${this.playerDeaths}</span> Deaths</div>
      <div class="kd-ratio">K/D: ${kd}</div>
    `;
  }

  updateGameStatus(ticketSystem: TicketSystem): void {
    const gameState = ticketSystem.getGameState();
    const bleedRate = ticketSystem.getTicketBleedRate();
    const timeRemaining = ticketSystem.getMatchTimeRemaining();

    // Update game status class
    this.elements.gameStatus.className = `game-status phase-${gameState.phase.toLowerCase()}`;

    let statusText = '';
    switch (gameState.phase) {
      case 'SETUP':
        statusText = 'PREPARE FOR BATTLE';
        break;
      case 'COMBAT':
        statusText = 'IN COMBAT';
        break;
      case 'OVERTIME':
        statusText = 'OVERTIME!';
        break;
      case 'ENDED':
        statusText = gameState.winner ? `${gameState.winner} VICTORY!` : 'GAME ENDED';
        break;
    }

    let timeText = '';
    if (timeRemaining > 0) {
      const minutes = Math.floor(timeRemaining / 60);
      const seconds = Math.floor(timeRemaining % 60);
      timeText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    let bleedText = '';
    if (bleedRate.bleedPerSecond > 0) {
      if (bleedRate.usTickets > bleedRate.opforTickets) {
        bleedText = `US bleeding ${bleedRate.usTickets.toFixed(1)}/sec`;
      } else if (bleedRate.opforTickets > bleedRate.usTickets) {
        bleedText = `OPFOR bleeding ${bleedRate.opforTickets.toFixed(1)}/sec`;
      }
    }

    this.elements.gameStatus.innerHTML = `
      <div>${statusText}</div>
      ${timeText ? `<div class="time-remaining">${timeText}</div>` : ''}
      ${bleedText ? `<div class="bleed-indicator">${bleedText}</div>` : ''}
    `;

    // Show victory screen if game ended
    if (gameState.phase === 'ENDED' && !document.querySelector('.victory-screen')) {
      this.showVictoryScreen(gameState.winner!, ticketSystem);
    }
  }

  private showVictoryScreen(winner: Faction, ticketSystem: TicketSystem): void {
    const victoryScreen = document.createElement('div');
    victoryScreen.className = `victory-screen victory-${winner.toLowerCase()}`;

    victoryScreen.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 20px;">${winner} VICTORY!</div>
      <div style="font-size: 18px; margin-bottom: 10px;">Final Scores:</div>
      <div style="font-size: 24px;">
        US: ${Math.round(ticketSystem.getTickets(Faction.US))} |
        OPFOR: ${Math.round(ticketSystem.getTickets(Faction.OPFOR))}
      </div>
      <div style="font-size: 14px; margin-top: 20px; opacity: 0.7;">
        Press F5 to restart
      </div>
    `;

    this.elements.hudContainer.appendChild(victoryScreen);
  }

  addKill(): void {
    this.playerKills++;
    this.updateKillCounter();
    this.elements.showHitMarker('kill');
  }

  addDeath(): void {
    this.playerDeaths++;
    this.updateKillCounter();
  }

  getPlayerKills(): number {
    return this.playerKills;
  }

  getPlayerDeaths(): number {
    return this.playerDeaths;
  }
}