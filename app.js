const PODCAST_FEED = "https://feeds.buzzsprout.com/2605735.rss";
const FIRST_EPISODE_LABEL = "Épisode 1 - Audit (ITFW)";
const FIRST_EPISODE_DESCRIPTION_HTML = `
Nous sommes tres heureux de vous partager aujourd'hui le premier episode de notre projet <span class="desc-highlight">Inside the Finance World</span> !

Pour ce premier episode, nous avons le plaisir de vous presenter <span class="desc-highlight">Mehdi Nassrallah</span>, ancien eleve de <span class="desc-highlight">GEM</span>, qui travaille en audit chez <span class="desc-highlight">PwC</span>.<br /><br />Une belle occasion d'en apprendre davantage sur son metier, son quotidien et son experience dans le domaine.

Nous esperons que cet episode vous plaira et qu'il vous permettra de decouvrir la finance sous un angle plus concret et accessible !

N'hesitez pas a nous donner des retours en repondant a ce questionnaire !!`;
const FIRST_EPISODE_DESCRIPTION = `Nous sommes très heureux de vous partager aujourd’hui le premier épisode de notre projet Inside the Finance World !

Pour ce premier épisode, nous avons le plaisir de vous présenter Mehdi Nassrallah, ancien élève de GEM, qui travaille en audit chez PwC.Une belle occasion d’en apprendre davantage sur son métier, son quotidien et son expérience dans le domaine.

Nous espérons que cet épisode vous plaira et qu’il vous permettra de découvrir la finance sous un angle plus concret et accessible !

N’hésitez pas à nous donner des retours en répondant à ce questionnaire !!`;
const FIRST_EPISODE_QUESTIONNAIRE_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfEbAkXOSHGxQSUV_yH_DTyJCRKbyWmnZQJKgM4mSSaH6iiPg/viewform?fbclid=PARlRTSAQ01ZdleHRuA2FlbQIxMABzcnRjBmFwcF9pZA8xMjQwMjQ1NzQyODc0MTQAAadTTg22_2lef-sgpDPr_2fI_IG0CfnxryMY2IGq6splF7Rc7K6kq5jU1ahgcw_aem_0P17WkJq7X5h_yP4jZIdEQ";

const state = {
  episodes: [],
  currentIndex: -1,
};

const elements = {
  status: document.getElementById("status"),
  audio: document.getElementById("audio-player"),
  title: document.getElementById("episode-title"),
  meta: document.getElementById("episode-meta"),
  description: document.getElementById("episode-description"),
  questionnaireBtn: document.getElementById("questionnaire-btn"),
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

function getEpisodeLabel(index) {
  if (index === 0) return FIRST_EPISODE_LABEL;
  return `Episode ${index + 1}`;
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

function stripHtml(text) {
  const temp = document.createElement("div");
  temp.innerHTML = text || "";
  return (temp.textContent || temp.innerText || "").trim();
}

function getEpisodeDescription(index, episode) {
  if (index === 0) return FIRST_EPISODE_DESCRIPTION;
  return stripHtml(episode.description) || "Description a venir.";
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
        description: item.description || "",
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
        description: item.querySelector("description")?.textContent?.trim() || "",
      }))
      .filter((item) => item.audioUrl);
  }
}

function updatePlayer() {
  const episode = state.episodes[state.currentIndex];

  if (!episode) {
    elements.title.textContent = FIRST_EPISODE_LABEL;
    elements.meta.textContent = "Pret a demarrer";
    elements.description.innerHTML = FIRST_EPISODE_DESCRIPTION_HTML;
    elements.questionnaireBtn.href = FIRST_EPISODE_QUESTIONNAIRE_URL;
    elements.questionnaireBtn.style.display = "inline-flex";
    elements.audio.removeAttribute("src");
    elements.audio.load();
    renderEpisodes();
    return;
  }

  elements.title.textContent = getEpisodeLabel(state.currentIndex);
  elements.meta.textContent = formatDate(episode.pubDate);
  if (state.currentIndex === 0) {
    elements.description.innerHTML = FIRST_EPISODE_DESCRIPTION_HTML;
  } else {
    elements.description.textContent = getEpisodeDescription(state.currentIndex, episode);
  }
  if (state.currentIndex === 0) {
    elements.questionnaireBtn.href = FIRST_EPISODE_QUESTIONNAIRE_URL;
    elements.questionnaireBtn.style.display = "inline-flex";
  } else {
    elements.questionnaireBtn.style.display = "none";
  }
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
    label.textContent = getEpisodeLabel(index);

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
