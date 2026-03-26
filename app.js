const PODCAST_FEED = "https://feeds.buzzsprout.com/2605735.rss";

const state = {
  episodes: [],
  currentIndex: -1,
};

const elements = {
  status: document.getElementById("status"),
  audio: document.getElementById("audio-player"),
  title: document.getElementById("episode-title"),
  meta: document.getElementById("episode-meta"),
  episodesList: document.getElementById("episodes-list"),
  refreshBtn: document.getElementById("refresh-btn"),
  prevBtn: document.getElementById("prev-btn"),
  nextBtn: document.getElementById("next-btn"),
  playPauseBtn: document.getElementById("play-pause-btn"),
  autoNext: document.getElementById("auto-next"),
};

function setStatus(message) {
  elements.status.textContent = message;
}

function formatDate(rawDate) {
  if (!rawDate) return "Date inconnue";
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return rawDate;
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function fetchFeedJson(feedUrl) {
  const endpoint = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`API JSON HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (payload.status !== "ok" || !Array.isArray(payload.items)) {
    throw new Error("API JSON invalide");
  }

  return payload.items;
}

async function fetchFeedXml(feedUrl) {
  const attempts = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`,
    `https://cors.isomorphic-git.org/${feedUrl}`,
  ];

  let lastError = null;
  for (const url of attempts) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Impossible de charger le flux");
}

async function loadEpisodesFromFeed(feedUrl) {
  try {
    const jsonItems = await fetchFeedJson(feedUrl);
    return jsonItems
      .map((item) => ({
        audioUrl: item.enclosure?.link || item.link || "",
        pubDate: item.pubDate || "",
      }))
      .filter((item) => item.audioUrl);
  } catch {
    const xmlText = await fetchFeedXml(feedUrl);
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, "text/xml");

    return Array.from(xml.querySelectorAll("item"))
      .map((item) => ({
        audioUrl:
          item.querySelector("enclosure")?.getAttribute("url") ||
          item.querySelector("link")?.textContent?.trim() ||
          "",
        pubDate: item.querySelector("pubDate")?.textContent?.trim() || "",
      }))
      .filter((item) => item.audioUrl);
  }
}

function updatePlayer() {
  const episode = state.episodes[state.currentIndex];

  if (!episode) {
    elements.title.textContent = "Episode 1";
    elements.meta.textContent = "Pret a demarrer";
    elements.audio.removeAttribute("src");
    elements.audio.load();
    renderEpisodes();
    return;
  }

  elements.title.textContent = `Episode ${state.currentIndex + 1}`;
  elements.meta.textContent = formatDate(episode.pubDate);
  elements.audio.src = episode.audioUrl;
  renderEpisodes();
}

async function playEpisode(index, autoPlay = true) {
  if (index < 0 || index >= state.episodes.length) {
    return;
  }

  state.currentIndex = index;
  updatePlayer();

  if (autoPlay) {
    try {
      await elements.audio.play();
    } catch {
      setStatus("Pret. Clique sur Play.");
    }
  }
}

function playNext() {
  if (!state.episodes.length) return;
  const next = (state.currentIndex + 1) % state.episodes.length;
  playEpisode(next, true);
}

function playPrev() {
  if (!state.episodes.length) return;
  const prev = (state.currentIndex - 1 + state.episodes.length) % state.episodes.length;
  playEpisode(prev, true);
}

function renderEpisodes() {
  elements.episodesList.innerHTML = "";

  state.episodes.forEach((episode, index) => {
    const li = document.createElement("li");
    li.className = `episode-item${index === state.currentIndex ? " active" : ""}`;

    const text = document.createElement("div");
    text.className = "episode-text";

    const label = document.createElement("p");
    label.className = "episode-label";
    label.textContent = `Episode ${index + 1}`;

    const date = document.createElement("p");
    date.className = "episode-date";
    date.textContent = formatDate(episode.pubDate);

    const button = document.createElement("button");
    button.className = "btn";
    button.type = "button";
    button.textContent = "Lire";
    button.addEventListener("click", () => playEpisode(index, true));

    text.append(label, date);
    li.append(text, button);
    elements.episodesList.appendChild(li);
  });
}

async function loadEpisodes() {
  setStatus("Chargement des episodes...");

  try {
    const episodes = await loadEpisodesFromFeed(PODCAST_FEED);
    state.episodes = episodes.sort((a, b) => Date.parse(b.pubDate || 0) - Date.parse(a.pubDate || 0));

    if (!state.episodes.length) {
      setStatus("Aucun episode trouve.");
      renderEpisodes();
      return;
    }

    if (state.currentIndex === -1 || state.currentIndex >= state.episodes.length) {
      state.currentIndex = 0;
    }

    updatePlayer();
    setStatus(`${state.episodes.length} episode(s) disponible(s).`);
  } catch {
    setStatus("Impossible de charger le podcast. Recharge la page.");
  }
}

function setupEvents() {
  elements.refreshBtn.addEventListener("click", () => {
    loadEpisodes();
  });

  elements.nextBtn.addEventListener("click", playNext);
  elements.prevBtn.addEventListener("click", playPrev);

  elements.playPauseBtn.addEventListener("click", async () => {
    if (!elements.audio.src && state.episodes.length) {
      await playEpisode(state.currentIndex >= 0 ? state.currentIndex : 0, true);
      return;
    }

    if (elements.audio.paused) {
      try {
        await elements.audio.play();
      } catch {
        setStatus("Lecture bloquee par le navigateur.");
      }
    } else {
      elements.audio.pause();
    }
  });

  elements.audio.addEventListener("ended", () => {
    if (elements.autoNext.checked) {
      playNext();
    }
  });
}

async function init() {
  setupEvents();
  await loadEpisodes();
}

init();
