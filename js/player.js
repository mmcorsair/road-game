// ---------- Player ----------
function resetPlayer() {
  // angle: direction of travel; shownAngle turns smoothly toward it.
  // knockVx / spinRate / spin: thrown-aside animation after being hit by a car.
  player = { x: W / 2, y: H - START_H / 2, angle: 0, shownAngle: 0, walk: 0, lastStep: 0,
             knockVx: 0, spinRate: 0, spin: 0 };
}

// Cars honk once when they are about to run into the player.
function honkAtPlayer() {
  for (const lane of lanes) {
    for (const c of lane.cars) {
      if (Math.abs(vehicleY(c, lane) - player.y) > LANE_H / 2) continue;
      const gap = (player.x - c.x) * lane.dir - c.w / 2 - PLAYER_SIZE / 2;  // distance from bumper to player
      if (!c.honked && !['emergency', 'train', 'float', 'roller'].includes(c.kind) && gap > 0 && gap < 70) {
        c.honked = true;
        sfx.honk((c.x - W / 2) / (W / 2));
      }
    }
  }
}

// Returns the vehicle the player collided with (and its lane), or null.
// Vehicle overlapping the player's box at (x, y), moving (moving = true) or stopped (false).
function vehicleAt(x, y, moving) {
  const s = PLAYER_SIZE / 2 - 3;
  for (const lane of lanes) {
    if (Math.abs(lane.y - y) > LANE_H) continue;
    for (const c of lane.cars) {
      if ((c.v >= STOPPED_V) !== moving) continue;
      if (Math.abs(c.x - x) < c.w / 2 - 2 + s && Math.abs(vehicleY(c, lane) - y) < c.h / 2 - 2 + s) return { car: c, lane };
    }
  }
  return null;
}

// A stopped vehicle (waiting at the lights, a bus at its stop, a queue) blocks you but can't hurt you.
const blockedAt = (x, y) => !!vehicleAt(x, y, false);

function hitsCar() {
  return vehicleAt(player.x, player.y, true);
}
