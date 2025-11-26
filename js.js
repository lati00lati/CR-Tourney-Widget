let fieldData;
let password;
let timeout, timer;
let socket;

window.addEventListener('onEventReceived', function (obj) {
  let listener = obj.detail.listener;
  let event = obj.detail.event;

  if (listener == "message") {
    let isMod = event.data.badges.find(badge => badge.type == "moderator");
    if (!isMod) return;

    let [command, subcommand, ...args] = event.data.text.split(" ");
    if (command != fieldData.command) return;

    if (subcommand == "stop") socket?.disconnect();
    else if (subcommand == "start" && args.length >= 1) {
      let tourneyTag = args[0].trim().replace("#", "");
      password = args[1]?.trim();
      startSocket(tourneyTag, password);
    }
  }
});

/**
 * Loads variables and renders placeholder widget if 'always_display_widget' is enabled.
 */
window.addEventListener('onWidgetLoad', function (obj) {
  fieldData = obj.detail.fieldData;

  if (!fieldData.always_display_widget) return;

  document.querySelector(".tournament-container").style.visibility = "visible";

  // Two animation frames to ensure visuals are loaded prior to adjusting size (so that containers have sizes)
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      if (fieldData.auto_title_size) autoAdjustTextSize(".tournament-name");
      if (fieldData.auto_password_size) autoAdjustTextSize(".tournament-password");
      if (fieldData.auto_timer_size) autoAdjustTextSize(".progress-label");
    });
  });

  let passwordContainer = document.querySelector(".tournament-password");
  if (passwordContainer.textContent.trim() == "") passwordContainer.style.visibility = "hidden";

  let playerContainer = document.querySelector(".players");

  for (let i = 0; i < fieldData.numPlayers; i++) {
    let player = { name: `Player ${i + 1}`, score: 100 - i * 10 }
    playerContainer.appendChild(createPlayerElement(player, i + 1))
  }
});

/**
 * Socket Connection
 */
function startSocket(tourneyTag, password) {
  if (socket) socket.disconnect();

  socket = io('https://api.lati00lati.org', { path: '/widgets/clashroyale/', transports: ['websocket'] });

  socket.on('connect', () => socket.emit('subscribeToTournament', { tag: tourneyTag }));

  socket.on('connected', (data) => {
    clearTimeout(timeout);

    document.querySelector('.players').innerHTML = '';

    document.querySelector(".tournament-name").textContent = data.name;
    if (fieldData.auto_title_size) autoAdjustTextSize(".tournament-name");

    document.querySelector(".tournament-password").textContent = password ? fieldData.password_text.replaceAll('{password}', password) : "";
    if (password && fieldData.auto_password_size) autoAdjustTextSize(".tournament-password");

    updateTournamentStatus(data.status, data.createdTime, data.preparationDuration, data.startedTime, data.duration);
    updateLeaderboard(data.membersList);

    document.querySelector(".tournament-container").style.visibility = "visible";
  });

  socket.on('player_change', data => updateLeaderboard(data.membersList))
  socket.on('status_change', data => updateTournamentStatus(data.status, data.createdTime, data.preparationDuration, data.startedTime, data.duration))

  socket.on('disconnect', (reason) => {
    clearInterval(timer)
    clearTimeout(timeout)

    let container = document.querySelector(".tournament-container")

    switch (reason) {
      case 'io server disconnect':
        // Tournament does not exist
        if (container.style.visibility == "hidden") return

        // Tournament ended
        timeout = setTimeout(() => {
          container.style.visibility = "hidden"
        }, fieldData.time_to_hide * 1000)
        break

      case 'io client disconnect':
      case 'reconnect failed':
        // Manual disconnect, or failure to reconnect. Immediately hide container.
        container.style.visibility = "hidden"
        break

      default:
        document.querySelector(".progress-label").textContent = "Reconnecting...";
    }
  });
}

/**
 * Helper Functions
 */
function updateTournamentStatus(status, createdTime, prepDuration, startedTime, duration) {
  const now = Date.now();

  if (status === "inPreparation") {
    document.querySelector(".progress-fill").style.backgroundColor = "#FFDD1E"; // Yellow color
    startTimer(status, createdTime + prepDuration - now, prepDuration, "Starts in: {time}");
  } else if (status === "inProgress") {
    document.querySelector(".progress-fill").style.backgroundColor = "#4CAF50"; // Green color
    startTimer(status, startedTime + duration - now, duration, "{time} Remaining");
  } else if (status === "ended") {
    startTimer(status, 0, 1, "Ended");
  } else return;

  if (fieldData.auto_timer_size) autoAdjustTextSize(".progress-label");
}

function formatTime(ms) {
  if (ms <= 0) return "0s";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);

  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function startTimer(status, remainingMs, totalMs, textPattern) {
  const fill = document.querySelector('.progress-fill');
  const label = document.querySelector('.progress-label');

  // 1. Set Initial State (No Animation)
  const elapsedMs = totalMs - remainingMs;
  const currentPercent = Math.min(100, (elapsedMs / totalMs) * 100);

  fill.style.transition = 'none';
  fill.classList.remove('active');
  fill.style.width = `${currentPercent}%`;
  label.textContent = textPattern.replace("{time}", formatTime(remainingMs));

  void fill.offsetWidth;
  fill.style.transition = `width ${remainingMs}ms linear`;
  fill.classList.add('active');

  // 3. Handle Text Loop
  clearInterval(timer);
  timer = setInterval(() => {
    remainingMs -= 1000;
    if (remainingMs <= 0) {
      clearInterval(timer);
      remainingMs = 0;
      if (status == "inPreparation") textPattern = "Starting..."
      if (status == "inProgress") textPattern = "Waiting for last games..."
      fill.style.width = `100%`;
    }

    label.textContent = textPattern.replace("{time}", formatTime(remainingMs));
  }, 1000);
}

/**
 * Decreases px of specified text until the container fits it
 */
function autoAdjustTextSize(selector) {
  const element = document.querySelector(selector);

  let min = 6;
  let max = 100
  let size = max;

  element.style.fontSize = size + "px";

  while ((element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth) && size > min) {
    size--;
    element.style.fontSize = size + "px";
  }
}

/**
 * Helper function to create a player div
 */
function createPlayerElement(player, rank) {
  const div = document.createElement('div');
  div.className = 'player';
  div.setAttribute('data-id', player.name);

  let rankClass = '';
  if (rank === 1) rankClass = 'rank-gold';
  else if (rank === 2) rankClass = 'rank-silver';
  else if (rank === 3) rankClass = 'rank-bronze';

  div.innerHTML = `
            <div class="player-rank ${rankClass}">${rank}</div>
            <div class="player-name">${player.name}</div>
            <div class="player-score-container">
                <img class="player-score-medal" src="https://iili.io/fFZfPIe.webp">
                <div class="player-score">${player.score}</div>
            </div>
        `;
  return div;
}

/**
 * Updates the leaderboard. Existing players will have an animation to represent them switching positions.
 * New players will appear from the bottom. No animation for changing scores (yet?)
 */
function updateLeaderboard(newPlayerData) {
  const container = document.querySelector('.players');
  const currentPositions = new Map();
  const existingMap = new Map();

  // 1. Snapshot Phase: Map IDs to their HTML elements & current Y positions
  for (const el of container.querySelectorAll('.player')) {
    const id = el.dataset.id;
    currentPositions.set(id, el.getBoundingClientRect().top);
    existingMap.set(id, el);
  }

  // 2. DOM Update Phase: Move existing items, create new ones
  const processedIds = new Set();

  newPlayerData.forEach((player, index) => {
    const id = player.name;
    const rank = index + 1;
    processedIds.add(id);

    let el = existingMap.get(id);

    if (el) {
      updatePlayerNode(el, rank, player.score);
      el.classList.remove('entering');
    } else {
      el = createPlayerElement(player, rank);
      el.classList.add('entering');
    }

    container.appendChild(el);
  });

  // 3. Cleanup: Remove players who are no longer in the top 10
  existingMap.forEach((el, id) => {
    if (!processedIds.has(id)) el.remove();
  });

  // 4. FLIP Animation Phase
  for (const el of container.querySelectorAll('.player')) {
    const id = el.dataset.id;
    const newRect = el.getBoundingClientRect();
    const oldTop = currentPositions.get(id);

    // Only animate if it existed previously
    if (oldTop == undefined) continue;

    const deltaY = oldTop - newRect.top;

    if (deltaY == 0) continue;
    // Invert
    el.style.transform = `translateY(${deltaY}px)`;
    el.style.transition = 'none';

    // Play
    requestAnimationFrame(() => {
      el.offsetHeight; // Force reflow
      el.style.transition = 'transform 0.5s cubic-bezier(0.2, 0, 0.2, 1)';
      el.style.transform = '';
    });
  }
}

/**
 * Updates a player container without re-rendering images and such (prevents flicker)
 */
function updatePlayerNode(el, rank, score) {
  const rankEl = el.querySelector('.player-rank');
  const scoreEl = el.querySelector('.player-score');

  // Update Rank Style
  if (rankEl.textContent != rank) {
    rankEl.textContent = rank;
    rankEl.className = 'player-rank';
    if (rank === 1) rankEl.classList.add('rank-gold');
    else if (rank === 2) rankEl.classList.add('rank-silver');
    else if (rank === 3) rankEl.classList.add('rank-bronze');
  }

  // Update Score Text
  if (scoreEl.textContent != score) scoreEl.textContent = score;
}