import { supabase } from './src/api/supabase.js';

document.addEventListener("DOMContentLoaded", () => {
  /* ================= 1. JIGSAW PUZZLE ================= */
  const puzzleImg = "v15.jpg";
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

  /* ================= 2. INTERACTIVE CANDLE & SUPABASE WISH ================= */
  const cakeBtn = document.getElementById("cake-btn");
  const flame = document.getElementById("flame");
  const wishMsg = document.getElementById("wish-msg");
  const micBtn = document.getElementById("mic-btn");

  let audioContext = null;
  let micStream = null;
  let isListening = false;

  async function extinguishCandle() {
    if (!flame.classList.contains("out")) {
      flame.classList.add("out");
      wishMsg.textContent = "Wish made. Saved to our cloud memory ❤️";
      stopMic();

      try {
        await supabase.from('wishes').insert([
          { message: 'Happy 1 Year Anniversary Wish - Vanelle & Partner', created_at: new Date() }
        ]);
      } catch (err) {
        console.log("Wish recorded locally");
      }
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
        wishMsg.textContent = "Microphone unavailable. Tap the flame to blow it out.";
      }
    });
  }

  /* ================= 3. YOUTUBE & SUPABASE REALTIME SYNC ================= */
  const myIdEl = document.getElementById("my-id");
  const copyIdBtn = document.getElementById("copy-id-btn");
  const partnerInput = document.getElementById("partner-id-input");
  const connectBtn = document.getElementById("connect-btn");
  const disconnectBtn = document.getElementById("disconnect-btn");
  const connStatusEl = document.getElementById("connection-status");
  const statusDot = document.getElementById("status-dot");

  let ytPlayer = null;
  let activeChannel = null;
  let isReceivingUpdate = false;
  const clientId = 'user-' + Math.random().toString(36).substring(2, 8);

  // Pre-fill input with our own generated ID so it's a 1-click sync, but DOES NOT auto-connect
  const myRoomId = myIdEl ? myIdEl.textContent.trim() : "vanelle-room-1234";
if (partnerInput) partnerInput.value = "vanelle-room-";

  function setStatus(text, isConnected = false) {
    if (!connStatusEl) return;
    connStatusEl.textContent = text;
    if (isConnected) {
      statusDot.classList.add("connected");
    } else {
      statusDot.classList.remove("connected");
    }
  }

  // Load YouTube IFrame API
  const ytScript = document.createElement('script');
  ytScript.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(ytScript);

  window.onYouTubeIframeAPIReady = () => {
    ytPlayer = new YT.Player('yt-player', {
      events: {
        onStateChange: (event) => {
          if (isReceivingUpdate || !ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return;

          const currentTime = ytPlayer.getCurrentTime();
          if (event.data === YT.PlayerState.PLAYING) {
            sendSyncCommand('play', currentTime);
          } else if (event.data === YT.PlayerState.PAUSED) {
            sendSyncCommand('pause', currentTime);
          }
        }
      }
    });
  };

  function joinRoom(roomName) {
    if (!roomName) return;

    if (activeChannel) {
      supabase.removeChannel(activeChannel);
    }

    setStatus(`Joining room: ${roomName}...`);

    activeChannel = supabase.channel(roomName, {
      config: { broadcast: { self: false } }
    });

    activeChannel
      .on('broadcast', { event: 'video-sync' }, (payload) => {
        const data = payload.payload;
        if (!data || data.sender === clientId || !ytPlayer || typeof ytPlayer.seekTo !== 'function') return;

        isReceivingUpdate = true;

        const currentTime = ytPlayer.getCurrentTime();
        if (Math.abs(currentTime - data.time) > 0.5) {
          ytPlayer.seekTo(data.time, true);
        }

        if (data.type === 'play') {
          ytPlayer.playVideo();
        } else if (data.type === 'pause') {
          ytPlayer.pauseVideo();
        } else if (data.type === 'seek') {
          ytPlayer.seekTo(data.time, true);
        }

        // Fast, snappy reset window (400ms)
        setTimeout(() => {
          isReceivingUpdate = false;
        }, 400);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setStatus(`Connected to ${roomName}! Screens are synced.`, true);
          if (connectBtn) connectBtn.style.display = "none";
          if (disconnectBtn) disconnectBtn.style.display = "inline-block";
        } else if (status === 'CHANNEL_ERROR') {
          setStatus('Connection error. Check Supabase credentials.');
        }
      });
  }

  function disconnectRoom() {
    if (activeChannel) {
      supabase.removeChannel(activeChannel);
      activeChannel = null;
    }
    setStatus("Disconnected. Supabase sync stopped.", false);
    if (connectBtn) connectBtn.style.display = "inline-block";
    if (disconnectBtn) disconnectBtn.style.display = "none";
  }

  function sendSyncCommand(type, time) {
    if (!isReceivingUpdate && activeChannel && ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
      activeChannel.send({
        type: 'broadcast',
        event: 'video-sync',
        payload: { type, time: ytPlayer.getCurrentTime(), sender: clientId }
      });
    }
  }

  if (connectBtn) {
    connectBtn.addEventListener("click", () => {
      const roomToJoin = partnerInput.value.trim();
      if (roomToJoin) {
        joinRoom(roomToJoin);
      } else {
        setStatus("Please enter or paste a Room ID first.");
      }
    });
  }

  if (disconnectBtn) {
    disconnectBtn.addEventListener("click", () => {
      disconnectRoom();
    });
  }

  if (copyIdBtn) {
    copyIdBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(myIdEl.textContent.trim());
        copyIdBtn.textContent = "Copied!";
        setTimeout(() => (copyIdBtn.textContent = "Copy"), 2000);
      } catch {
        copyIdBtn.textContent = "Copy";
      }
    });
  }
});