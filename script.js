document.addEventListener("DOMContentLoaded", () => {
  /* ================= 1. JIGSAW PUZZLE ================= */
  const puzzleImg = "v1.jpg";
  const board = document.getElementById("puzzle-board");
  const statusEl = document.getElementById("puzzle-status");

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
      statusEl.textContent = "Complete. Happy 1 Year, my love.";
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

  /* ================= 2. INTERACTIVE CANDLE & MIC ================= */
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
      wishMsg.textContent = "Wish made. Here’s to every year ahead of us.";
      stopMic();
    }
  }

  function relightCandle() {
    flame.classList.remove("out");
    wishMsg.textContent = "The candle is lit and waiting for your wish.";
  }

  cakeBtn.addEventListener("click", () => {
    flame.classList.contains("out") ? relightCandle() : extinguishCandle();
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
      micBtn.textContent = "Enable Microphone to Blow";
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
        micBtn.textContent = "Listening... Blow on the flame";
        relightCandle();

        function detectBlow() {
          if (!isListening) return;
          analyser.getByteFrequencyData(dataArray);

          let sum = 0;
          const lowFreqBins = 32;
          for (let i = 0; i < lowFreqBins; i++) {
            sum += dataArray[i];
          }
          if (sum / lowFreqBins > 105) {
            extinguishCandle();
            return;
          }
          requestAnimationFrame(detectBlow);
        }

        detectBlow();
      } catch (err) {
        wishMsg.textContent = "Microphone unavailable (requires HTTPS). Tap the flame to blow it out.";
      }
    });
  }

  /* ================= 3. SIMULTANEOUS MOVIE SYNC (PEERJS) ================= */
  const video = document.getElementById("shared-video");
  const myIdEl = document.getElementById("my-id");
  const copyIdBtn = document.getElementById("copy-id-btn");
  const partnerInput = document.getElementById("partner-id-input");
  const connectBtn = document.getElementById("connect-btn");
  const connStatusEl = document.getElementById("connection-status");
  const statusDot = document.getElementById("status-dot");

  let peer = null;
  let conn = null;
  let ignoreLocalEvents = false;

  // Generate a short, clean room code instead of a massive UUID
  function generateShortId() {
    return "vanelle-" + Math.random().toString(36).substring(2, 6);
  }

  function setStatus(text, isConnected = false) {
    connStatusEl.textContent = text;
    if (isConnected) {
      statusDot.classList.add("connected");
    } else {
      statusDot.classList.remove("connected");
    }
  }

  function initPeer() {
    if (typeof Peer === "undefined") {
      setStatus("PeerJS failed to load. Check your internet connection.");
      return;
    }

    peer = new Peer(generateShortId());

    peer.on("open", (id) => {
      myIdEl.textContent = id;
      setStatus("Ready. Share your Room ID or enter hers above.");
    });

    peer.on("connection", (incomingConn) => {
      if (conn && conn.open) conn.close();
      conn = incomingConn;
      bindConnectionEvents();
    });

    peer.on("error", (err) => {
      if (err.type === "unavailable-id") {
        // Retry with a fresh random code if taken
        peer.destroy();
        initPeer();
      } else if (err.type === "peer-unavailable") {
        setStatus("Could not find that Room ID. Double-check the spelling.");
      } else {
        setStatus(`Connection notice: ${err.type}`);
      }
    });
  }

  function bindConnectionEvents() {
    conn.on("open", () => {
      setStatus("Connected! Both screens are now synced.", true);
      // Sync current state immediately upon joining
      sendSyncEvent(video.paused ? "pause" : "play", video.currentTime);
    });

    conn.on("data", (data) => {
      if (!data || !data.type) return;

      ignoreLocalEvents = true;

      // Only adjust timestamp if drift is > 0.5s to prevent stutter
      if (Math.abs(video.currentTime - data.time) > 0.5) {
        video.currentTime = data.time;
      }

      if (data.type === "play") {
        video.play().catch(() => {
          setStatus("Connected — tap Play on your video once to allow synced playback.", true);
        });
      } else if (data.type === "pause") {
        video.pause();
      } else if (data.type === "seek") {
        video.currentTime = data.time;
      }

      setTimeout(() => {
        ignoreLocalEvents = false;
      }, 350);
    });

    conn.on("close", () => {
      setStatus("Partner disconnected.", false);
    });
  }

  function sendSyncEvent(type, time) {
    if (!ignoreLocalEvents && conn && conn.open) {
      conn.send({ type, time });
    }
  }

  // Outgoing video events
  video.addEventListener("play", () => sendSyncEvent("play", video.currentTime));
  video.addEventListener("pause", () => sendSyncEvent("pause", video.currentTime));
  video.addEventListener("seeked", () => sendSyncEvent("seek", video.currentTime));

  // Connect button
  connectBtn.addEventListener("click", () => {
    const targetId = partnerInput.value.trim();
    if (!targetId || !peer) return;
    if (targetId === peer.id) {
      setStatus("That’s your own Room ID—paste Vanelle’s ID instead.");
      return;
    }

    setStatus("Connecting to partner...");
    if (conn && conn.open) conn.close();
    conn = peer.connect(targetId, { reliable: true });
    bindConnectionEvents();
  });

  // Copy ID button
  copyIdBtn.addEventListener("click", async () => {
    const idText = myIdEl.textContent;
    if (!idText || idText.includes("Generating")) return;
    try {
      await navigator.clipboard.writeText(idText);
      copyIdBtn.textContent = "Copied!";
      setTimeout(() => (copyIdBtn.textContent = "Copy"), 2000);
    } catch {
      copyIdBtn.textContent = "Select & Copy";
    }
  });

  initPeer();
});