document.addEventListener("DOMContentLoaded", () => {
  /* ================= 1. JIGSAW PUZZLE LOGIC ================= */
  const puzzleImg = "v1.jpg";
  const board = document.getElementById("puzzle-board");
  const statusEl = document.getElementById("puzzle-status");

  // Properly initialize tiles 0..8 and shuffle
  let order = [0, 1, 2, 3, 4, 5, 6, 7, 8].sort(() => Math.random() - 0.5);
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

  /* ================= 2. INTERACTIVE CAKE LOGIC ================= */
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
    micBtn.textContent = "🎤 Enable Mic to Blow Candle";
  }

  micBtn.addEventListener("click", async () => {
    if (isListening) {
      stopMic();
      return;
    }

    try {
      // Request microphone access
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

        // Calculate average volume across low-to-mid frequencies (wind/blow noise)
        let sum = 0;
        const lowFreqBins = 32;
        for (let i = 0; i < lowFreqBins; i++) {
          sum += dataArray[i];
        }
        const averageVolume = sum / lowFreqBins;

        // Threshold (adjust between 80 and 130 if too sensitive or not sensitive enough)
        if (averageVolume > 105) {
          extinguishCandle();
          return;
        }

        requestAnimationFrame(detectBlow);
      }

      detectBlow();
    } catch (err) {
      wishMsg.textContent = "⚠️ Mic blocked or requires HTTPS. Just tap the candle to blow it out!";
    }
  });


  /* ================= 3. REMOTE VIDEO CONTROL (PEERJS) ================= */
  const video = document.getElementById("shared-video");
  const myIdEl = document.getElementById("my-id");
  const partnerInput = document.getElementById("partner-id-input");
  const connectBtn = document.getElementById("connect-btn");
  const connStatusEl = document.getElementById("connection-status");

  let conn = null;
  let isRemoteAction = false;

  function initPeer() {
    if (typeof Peer === "undefined") {
      myIdEl.textContent = "Library blocked/offline";
      connStatusEl.textContent = "⚠️ Could not load PeerJS. Check your internet or disable ad-blockers.";
      return;
    }

    const peer = new Peer();

    peer.on("open", (id) => {
      myIdEl.textContent = id;
    });

    peer.on("error", (err) => {
      connStatusEl.textContent = `⚠️ Connection error: ${err.type}`;
    });

    // When your partner connects to your ID
    peer.on("connection", (connection) => {
      conn = connection;
      setupConnection();
    });

    // When you connect to your partner's ID
    connectBtn.addEventListener("click", () => {
      const partnerId = partnerInput.value.trim();
      if (!partnerId) return;
      conn = peer.connect(partnerId);
      setupConnection();
    });
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
  }

  // Broadcast Play, Pause, and Seek events to the other person
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

  // Fallback loader if unpkg CDN fails to load
  if (typeof Peer === "undefined") {
    const fallbackScript = document.createElement("script");
    fallbackScript.src = "https://cloudflare.com";
    fallbackScript.onload = initPeer;
    fallbackScript.onerror = initPeer;
    document.head.appendChild(fallbackScript);
  } else {
    initPeer();
  }
});
