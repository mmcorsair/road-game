// ---------- Entry point ----------
// Loads every module in the same order the game used before modules, so start-up side effects
// (loading settings and saved progress) happen in that order. Nothing else runs while modules load:
// start() then wires up the page and starts the game.
import './config.js';
import './settings.js';
import './state.js';
import './sound.js';
import './music.js';
import './effects.js';
import './traffic.js';
import './rail.js';
import './bus.js';
import './boss.js';
import './lanechange.js';
import './weather.js';
import './player.js';
import './pickups.js';
import './skins.js';
import './daily.js';
import './tutorial.js';
import './achievements.js';
import './practice.js';
import './menu.js';
import './game.js';
import './render.js';
import './input.js';
import { start } from './main.js';

start();
