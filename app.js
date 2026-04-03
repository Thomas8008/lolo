const PRIMARY_PODCAST_FEED = "https://feeds.buzzsprout.com/2605735.rss";
// Flux RSS dedie pour l'episode 2.
const SECONDARY_PODCAST_FEED = "https://feeds.buzzsprout.com/2605735.rss";

const QUESTIONNAIRE_URL = "https://forms.gle/xP8LBG7VczJfNBra9";
const SECOND_EPISODE_QUESTIONNAIRE_URL = "https://docs.google.com/forms/d/e/1FAIpQLSetwQ-HwXIv--NHYFm7lbf_e3w05aHEAYikSjOOILTSY8UzvA/viewform?fbclid=PAVERFWAQ8mx1leHRuA2FlbQIxMABzcnRjBmFwcF9pZA8xMjQwMjQ1NzQyODc0MTQAAaelRokcmiGZo2Gs4jWiKEOaQv-C_LBWULCF3S2k3erdx69XyNeAQq6CBSDWWg_aem_4-CPi6OPLKOA3n2dV69XOQ";
const SECOND_EPISODE_AUDIO_URL = "https://www.buzzsprout.com/2605735/episodes/18954897-episode-2-asset-management-itfw.mp3?download=true";

const FIRST_EPISODE_LABEL = "Épisode 1 - Audit (ITFW)";
const SECOND_EPISODE_LABEL = "Épisode 2 - Asset Management (ITFW)";

const FIRST_EPISODE_DESCRIPTION_HTML = `
Nous sommes tres heureux de vous partager aujourd'hui le premier episode de notre projet <span class="desc-highlight">Inside the Finance World</span> !
<br /><br />
Pour ce premier episode, nous avons le plaisir de vous presenter <span class="desc-highlight">Mehdi Nassrallah</span>, ancien eleve de <span class="desc-highlight">GEM</span>, qui travaille en audit chez <span class="desc-highlight">PwC</span>.
<br /><br />
Une belle occasion d'en apprendre davantage sur son metier, son quotidien et son experience dans le domaine.
<br /><br />
Nous esperons que cet episode vous plaira et qu'il vous permettra de decouvrir la finance sous un angle plus concret et accessible !
<br /><br />
N'hesitez pas a nous donner des retours en repondant a ce questionnaire !!`;

const SECOND_EPISODE_DESCRIPTION_HTML = `
<p>Nous sommes très heureux de vous partager aujourd’hui le deuxième épisode de notre projet <span class="desc-highlight">Inside the Finance World</span>.</p>
<p>Pour ce nouveau volet consacré à l'Asset Management, nous avons le plaisir de vous présenter <span class="desc-highlight">Théo Colombani</span>, Portfolio Manager chez Mandarine Gestion.</p>
<p>C'est une occasion en or d’en apprendre davantage sur :</p>
<ul>
  <li>Le métier de gérant de portefeuille</li>
  <li>Son quotidien sur les marchés financiers</li>
  <li>Son expérience et ses conseils pour réussir dans ce domaine.</li>
</ul>
<p>Nous espérons que cet épisode vous plaira et qu’il vous permettra de découvrir la finance sous un angle plus concret et accessible !</p>
<p>Votre avis compte ! N’hésitez pas à nous faire vos retours en répondant à ce questionnaire !</p>`;

const EPISODE_CONFIG = [
  {
    label: FIRST_EPISODE_LABEL,
    feed: "primary",
    match: /(audit|ep\s*1|episode\s*1)/i,
    descriptionHtml: FIRST_EPISODE_DESCRIPTION_HTML,
    showQuestionnaire: true,
    questionnaireUrl: QUESTIONNAIRE_URL,
  },
  {
    label: SECOND_EPISODE_LABEL,
    feed: "secondary",
    match: /(asset\s*management|ep\s*2|episode\s*2)/i,
    descriptionHtml: SECOND_EPISODE_DESCRIPTION_HTML,
    showQuestionnaire: true,
    questionnaireUrl: SECOND_EPISODE_QUESTIONNAIRE_URL,
    audioUrlOverride: SECOND_EPISODE_AUDIO_URL,
  },
];

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
        title: item.title || "",
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
        title: item.querySelector("title")?.textContent?.trim() || "",
        audioUrl:
          item.querySelector("enclosure")?.getAttribute("url") ||
          item.querySelector("link")?.textContent?.trim() ||
          "",
        pubDate: item.querySelector("pubDate")?.textContent?.trim() || "",
      }))
      .filter((item) => item.audioUrl);
  }
}

function pickEpisodeItem(items, matcher, usedAudioUrls) {
  const matched = items.find((item) => matcher.test(item.title || "") && !usedAudioUrls.has(item.audioUrl));
  if (matched) return matched;

  const firstUnused = items.find((item) => !usedAudioUrls.has(item.audioUrl));
  return firstUnused || null;
}

function buildEpisodeList(primaryItems, secondaryItems) {
  const resolvedEpisodes = [];

  const primaryPicked = pickEpisodeItem(primaryItems, EPISODE_CONFIG[0].match, new Set());
  const secondaryPicked = pickEpisodeItem(secondaryItems, EPISODE_CONFIG[1].match, new Set());

  const firstFallback = primaryItems[0] || secondaryItems[0] || null;
  const secondFallback = secondaryItems[0] || primaryItems[0] || null;

  const firstEpisodeSource = primaryPicked || firstFallback;
  const secondEpisodeSource = secondaryPicked || secondFallback;

  if (firstEpisodeSource) {
    resolvedEpisodes.push({
      label: EPISODE_CONFIG[0].label,
      audioUrl: firstEpisodeSource.audioUrl,
      pubDate: firstEpisodeSource.pubDate,
      descriptionHtml: EPISODE_CONFIG[0].descriptionHtml,
      showQuestionnaire: EPISODE_CONFIG[0].showQuestionnaire,
      questionnaireUrl: EPISODE_CONFIG[0].questionnaireUrl,
    });
  }

  if (secondEpisodeSource) {
    resolvedEpisodes.push({
      label: EPISODE_CONFIG[1].label,
      audioUrl: EPISODE_CONFIG[1].audioUrlOverride || secondEpisodeSource.audioUrl,
      pubDate: secondEpisodeSource.pubDate,
      descriptionHtml: EPISODE_CONFIG[1].descriptionHtml,
      showQuestionnaire: EPISODE_CONFIG[1].showQuestionnaire,
      questionnaireUrl: EPISODE_CONFIG[1].questionnaireUrl,
    });
  }

  return resolvedEpisodes;
}

function updatePlayer() {
  const episode = state.episodes[state.currentIndex];

  if (!episode) {
    elements.title.textContent = FIRST_EPISODE_LABEL;
    elements.meta.textContent = "Pret a demarrer";
    elements.description.innerHTML = FIRST_EPISODE_DESCRIPTION_HTML;
    elements.questionnaireBtn.href = QUESTIONNAIRE_URL;
    elements.questionnaireBtn.style.display = "inline-flex";
    elements.audio.removeAttribute("src");
    elements.audio.load();
    renderEpisodes();
    return;
  }

  elements.title.textContent = episode.label;
  elements.meta.textContent = formatDate(episode.pubDate);
  elements.description.innerHTML = episode.descriptionHtml;

  if (episode.showQuestionnaire) {
    elements.questionnaireBtn.href = episode.questionnaireUrl || QUESTIONNAIRE_URL;
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
    label.textContent = episode.label;

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
    const [primaryItems, secondaryItems] = await Promise.all([
      loadEpisodesFromFeed(PRIMARY_PODCAST_FEED),
      loadEpisodesFromFeed(SECONDARY_PODCAST_FEED),
    ]);

    state.episodes = buildEpisodeList(primaryItems, secondaryItems);

    if (state.episodes.length < 2) {
      setStatus("Un seul episode RSS trouve. Le deuxieme peut etre indisponible temporairement.");
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
        setStatus("Lecture bloquee par le navigateur. Clique sur Play une fois.");
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
