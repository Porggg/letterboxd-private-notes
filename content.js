/**
 * Letterboxd Private Notes
 * Injects a floating panel on film pages for taking notes
 * stored locally via browser.storage.local.
 *
 * The widget only appears when a Letterboxd account is signed in
 * in the browser, and notes are scoped to that account (useful if
 * multiple people share the same Firefox profile).
 */

(function () {
  "use strict";

  const COLLAPSE_KEY = "ui:collapsed";
  const LOGIN_COOKIE_NAME = "letterboxd.signed.in.as";

  /**
   * Reads the non-protected cookie that Letterboxd sets when an account is
   * signed in. Returns the username in lowercase, or null if no one is signed in.
   */
  function getLoggedInUsername() {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(LOGIN_COOKIE_NAME + "="));
    if (!match) return null;
    const value = decodeURIComponent(match.split("=")[1] || "").trim();
    return value ? value.toLowerCase() : null;
  }

  /**
   * Parses the URL path to extract the film slug and, when applicable,
   * the username preceding /film/.
   * - /film/oppenheimer/          -> { slug: "oppenheimer", user: null }
   * - /someuser/film/oppenheimer/ -> { slug: "oppenheimer", user: "someuser" }
   */
  function parseFilmPath(pathname) {
    const withUser = pathname.match(/^\/([^/]+)\/film\/([^/]+)\//);
    if (withUser) {
      return { slug: withUser[2], user: withUser[1].toLowerCase() };
    }
    const noUser = pathname.match(/^\/film\/([^/]+)\//);
    if (noUser) {
      return { slug: noUser[1], user: null };
    }
    return { slug: null, user: null };
  }

  /** Attempts to get the film title shown on the page for display in the panel */
  function getFilmTitle() {
    const h1 = document.querySelector('h1.headline-1, [data-testid="film-title"], h1');
    if (h1) return h1.textContent.trim();
    return document.title.replace(/\s*•\s*Letterboxd.*$/i, "").trim();
  }

  function debounce(fn, delay) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  }

  function formatDate(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /** Builds the storage key scoped by signed-in user: note:<username>:<slug> */
  function noteKey(username, slug) {
    return `note:${username}:${slug}`;
  }

  async function loadNote(username, slug) {
    const key = noteKey(username, slug);
    const result = await browser.storage.local.get(key);
    return result[key] || { text: "", updatedAt: null };
  }

  async function saveNote(username, slug, text) {
    const key = noteKey(username, slug);
    const value = { text, updatedAt: Date.now() };
    await browser.storage.local.set({ [key]: value });
    return value;
  }

  async function deleteNote(username, slug) {
    const key = noteKey(username, slug);
    await browser.storage.local.remove(key);
  }

  async function getCollapsed() {
    const result = await browser.storage.local.get(COLLAPSE_KEY);
    return Boolean(result[COLLAPSE_KEY]);
  }

  async function setCollapsed(value) {
    await browser.storage.local.set({ [COLLAPSE_KEY]: value });
  }

  function buildWidget() {
    const wrapper = document.createElement("div");
    wrapper.id = "lbn-widget";
    wrapper.innerHTML = `
      <button id="lbn-toggle" type="button" title="My private notes">
        <span id="lbn-toggle-label">Notes</span>
      </button>
      <div id="lbn-panel" role="region" aria-label="Private notes">
        <div id="lbn-header">
          <span id="lbn-title">My note</span>
          <button id="lbn-close" type="button" title="Collapse" aria-label="Collapse">&times;</button>
        </div>
        <textarea id="lbn-textarea" placeholder="Write a private note about this film…" spellcheck="true"></textarea>
        <div id="lbn-footer">
          <span id="lbn-status"></span>
          <button id="lbn-delete" type="button" title="Delete note">Delete</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrapper);
    return wrapper;
  }

  async function init() {
    // Do not show the widget when no one is signed in.
    const myUsername = getLoggedInUsername();
    if (!myUsername) return;

    // Only run on film pages.
    let { slug, user } = parseFilmPath(window.location.pathname);
    if (!slug) return;

    // When a username appears in the URL, only display notes for that signed in account.
    if (user && user !== myUsername) return;

    const wrapper = buildWidget();
    const toggleBtn = wrapper.querySelector("#lbn-toggle");
    const closeBtn = wrapper.querySelector("#lbn-close");
    const textarea = wrapper.querySelector("#lbn-textarea");
    const status = wrapper.querySelector("#lbn-status");
    const deleteBtn = wrapper.querySelector("#lbn-delete");
    const titleEl = wrapper.querySelector("#lbn-title");

    titleEl.textContent = `Notes — ${getFilmTitle()}`;

    const existing = await loadNote(myUsername, slug);
    textarea.value = existing.text;
    status.textContent = existing.updatedAt
      ? `Saved on ${formatDate(existing.updatedAt)}`
      : "No note yet";

    const collapsed = await getCollapsed();
    if (!collapsed) wrapper.classList.add("lbn-open");

    function open() {
      wrapper.classList.add("lbn-open");
      setCollapsed(false);
      textarea.focus();
    }
    function close() {
      wrapper.classList.remove("lbn-open");
      setCollapsed(true);
    }

    toggleBtn.addEventListener("click", () => {
      wrapper.classList.contains("lbn-open") ? close() : open();
    });
    closeBtn.addEventListener("click", close);

    const debouncedSave = debounce(async (value) => {
      status.textContent = "Saving…";
      const saved = await saveNote(myUsername, slug, value);
      status.textContent = `Saved on ${formatDate(saved.updatedAt)}`;
    }, 500);

    textarea.addEventListener("input", (e) => {
      debouncedSave(e.target.value);
    });

    deleteBtn.addEventListener("click", async () => {
      if (!textarea.value.trim() || confirm("Delete this note?")) {
        textarea.value = "";
        await deleteNote(myUsername, slug);
        status.textContent = "Note deleted";
      }
    });

    // If Letterboxd navigates in SPA mode (pjax) to another film without
    // reloading the page, react to the URL change to load the correct note.
    // Also re-check the login cookie on each tick in case the user signs out
    // during navigation.
    setInterval(async () => {
      const stillLoggedIn = getLoggedInUsername();
      if (stillLoggedIn !== myUsername) {
        wrapper.remove();
        return;
      }

      const parsed = parseFilmPath(window.location.pathname);
      if (!parsed.slug) return;
      if (parsed.user && parsed.user !== myUsername) return;

      if (parsed.slug !== slug) {
        slug = parsed.slug;
        titleEl.textContent = `Notes — ${getFilmTitle()}`;
        const note = await loadNote(myUsername, slug);
        textarea.value = note.text;
        status.textContent = note.updatedAt
          ? `Saved on ${formatDate(note.updatedAt)}`
          : "No note yet";
      }
    }, 1000);
  }

  init();
})();
