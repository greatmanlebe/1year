document.addEventListener("DOMContentLoaded", () => {
  /* ================= 1. JIGSAW PUZZLE LOGIC ================= */
  const puzzleImg = "v1.jpg"; // Replace with your photo path
  const board = document.getElementById("puzzle-board");
  const statusEl = document.getElementById("puzzle-status");

  // Initialize tiles 0..8 and shuffle until not already solved
  // Create [0, 1, 2, 3, 4, 5, 6, 7, 8] safely and shuffle
  let order = Array.from({ length: 9 }, (_, i) => i);
  do {
    order.sort(() => Math.random() - 0.5);
  } while (order.every((val, i) => val === i));
  let selectedIdx = null;

  function renderPuzzle() {
    board.innerHTML = "";
    order.forEach((tilePos, index) => {
      const tile = document.createElement("div");
      tile.className = "tile" + (selectedIdx === index ? " selected" : "");
      const row = Math.floor(tilePos / 3);
      const col = tilePos % 3;
      tile.style.backgroundImage = `url('${puzzleImg}')`;
      tile.style.backgroundPosition = `-${col * 100}px -${row * 100}px`;
      tile.addEventListener("click", () => handleTileClick(index));
      board.appendChild(tile);
    });

    if (order.every((val, i) => val === i)) {
      statusEl.textContent = "🎉 You solved it! Happy 1 Year, my love!";
    }
  }

  function handleTileClick(index) {
    if (selectedIdx === null) {
      selectedIdx = index;
    } else {
      [order[selectedIdx], order[index]] = [order[index], order[selectedIdx]];
      selectedIdx = null;
    }
    renderPuzzle();
  }

  renderPuzzle();

  /* ================= 2. INTERACTIVE CAKE & MIC BLOW LOGIC ================= */
  const cakeBtn = document.getElementById("cake-btn");
  const flame = document.getElementById("flame");
  const wishMsg = document.getElementById("wish-msg");
  const micBtn = document.getElementById("mic-btn");

  let audioContext = null;
  let micStream = null;
  let isListening = false;

  function extinguishCandle() {
    if (!flame.classList.contains("out")) {
      flame.classList.add("out");
      wishMsg.textContent = "✨ Wish made! Here is to many more years together! ❤️";
      stopMic();
    }
  }

  function relightCandle() {
    flame.classList.remove("out");
    wishMsg.textContent = "Tap the candle or blow into your mic to blow it out!";
  }

  // Backup tap/click toggle
  cakeBtn.addEventListener("click", () => {
    if (flame.classList.contains("out")) {
      relightCandle();
    } else {
      extinguishCandle();
    }
  });

  function stopMic() {
    isListening = false;
    if (micStream) {
      micStream.getTracks().forEach((track) => track.stop());
      micStream = null;
    }
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
    if (micBtn) {
      micBtn.textContent = "🎤 Enable Mic to Blow Candle";
    }
  }

  if (micBtn) {
    micBtn.addEventListener("click", async () => {
      if (isListening) {
        stopMic();
        return;
      }

      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(micStream);
        const analyser = audioContext.createAnalyser();

        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        isListening = true;
        micBtn.textContent = "🌬️ Listening... Blow on the candle!";
        relightCandle();

        function detectBlow() {
          if (!isListening) return;

          analyser.getByteFrequencyData(dataArray);

          // Measure low-frequency wind noise from blowing into the mic
          let sum = 0;
          const lowFreqBins = 32;
          for (let i = 0; i < lowFreqBins; i++) {
            sum += dataArray[i];
          }
          const averageVolume = sum / lowFreqBins;

          // Adjust threshold (80-130) to tune sensitivity
          if (averageVolume > 105) {
            extinguishCandle();
            return;
          }

          requestAnimationFrame(detectBlow);
        }

        detectBlow();
      } catch (err) {
        wishMsg.textContent = "⚠️ Mic blocked or requires HTTPS. Tap the candle to blow it out!";
      }
    });
  }

  /* ================= 3. REMOTE VIDEO CONTROL (PEERJS) ================= */
  const video = document.getElementById("shared-video");
  const myIdEl = document.getElementById("my-id");
  const partnerInput = document.getElementById("partner-id-input");
  const connectBtn = document.getElementById("connect-btn");
  const connStatusEl = document.getElementById("connection-status");

  let conn = null;
  let isRemoteAction = false;

  function initPeer() {
     const createRoomBtn = document.getElementById("create-room-btn");
  const customRoomInput = document.getElementById("custom-room-input");

  function startPeer(customId = null) {
    if (typeof Peer === "undefined") {
      connStatusEl.textContent = "⚠️ PeerJS library not loaded.";
      return;
    }

    // Pass customId if provided, otherwise PeerJS generates one automatically
    const peer = customId ? new Peer(customId) : new Peer();

    peer.on("open", (id) => {
      myIdEl.textContent = id;
      connStatusEl.textContent = "✅ Room ready! Share this ID with your partner.";
    });

    peer.on("error", (err) => {
      if (err.type === "unavailable-id") {
        connStatusEl.textContent = "⚠️ That room name is already taken. Try another!";
      } else {
        connStatusEl.textContent = `⚠️ Error: ${err.type}`;
      }
    });

    peer.on("connection", (connection) => {
      conn = connection;
      setupConnection();
    });

    connectBtn.onclick = () => {
      const partnerId = partnerInput.value.trim();
      if (!partnerId) return;
      conn = peer.connect(partnerId);
      setupConnection();
    };
  }

  // Host clicks "Create Host Room" with a custom name
  createRoomBtn.addEventListener("click", () => {
    const chosenName = customRoomInput.value.trim();
    if (!chosenName) return;
    startPeer(chosenName);
  });

  // Guest can start with an automatic ID right away
  startPeer();

  }

  function setupConnection() {
    connStatusEl.textContent = "✅ Connected! Controls are now synced.";

    conn.on("data", (data) => {
      isRemoteAction = true;
      if (data.type === "play") {
        video.currentTime = data.time;
        video.play().catch(() => {
          connStatusEl.textContent = "⚠️ Click the video once to allow remote autoplay!";
        });
      } else if (data.type === "pause") {
        video.currentTime = data.time;
        video.pause();
      } else if (data.type === "seek") {
        video.currentTime = data.time;
      }
      setTimeout(() => {
        isRemoteAction = false;
      }, 300);
    });

    conn.on("close", () => {
      connStatusEl.textContent = "⚠️ Partner disconnected.";
    });
  }

  // Broadcast Play, Pause, and Seek events to the other screen
  video.addEventListener("play", () => {
    if (!isRemoteAction && conn && conn.open) {
      conn.send({ type: "play", time: video.currentTime });
    }
  });

  video.addEventListener("pause", () => {
    if (!isRemoteAction && conn && conn.open) {
      conn.send({ type: "pause", time: video.currentTime });
    }
  });

  video.addEventListener("seeked", () => {
    if (!isRemoteAction && conn && conn.open) {
      conn.send({ type: "seek", time: video.currentTime });
    }
  });

  initPeer();
});
