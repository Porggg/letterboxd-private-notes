"use strict";

const LOGIN_COOKIE_NAME = "letterboxd.signed.in.as";

/** Reads the Letterboxd session cookie via the browser.cookies API (the popup
 *  is not on the letterboxd.com domain, so document.cookie is unavailable). */
async function getLoggedInUsername() {
  try {
    const cookie = await browser.cookies.get({
      url: "https://letterboxd.com",
      name: LOGIN_COOKIE_NAME,
    });
    if (!cookie || !cookie.value) return null;
    return decodeURIComponent(cookie.value).trim().toLowerCase();
  } catch (err) {
    console.error("Could not read Letterboxd login cookie:", err);
    return null;
  }
}

function noteKeyPrefix(username) {
  return `note:${username}:`;
}

function slugToUrl(slug) {
  return `https://letterboxd.com/film/${slug}/`;
}

function slugToTitle(slug) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatDate(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatMonthYear(ts) {
  if (!ts) return "Unknown date";
  return new Date(ts).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function formatDay(ts) {
  if (!ts) return "--";
  return new Date(ts).toLocaleDateString(undefined, {
    day: "2-digit",
  });
}

function formatMonth(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
  }).toUpperCase();
}

let currentSortOrder = "newest";
let storedNotes = [];

async function getAllNotes(username) {
  const prefix = noteKeyPrefix(username);
  const all = await browser.storage.local.get(null);
  return Object.entries(all)
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, value]) => ({
      slug: key.slice(prefix.length),
      title: value.title || null,
      text: value.text || "",
      updatedAt: value.updatedAt || 0,
    }));
}

function sortNotes(notes) {
  return [...notes].sort((a, b) =>
    currentSortOrder === "newest"
      ? b.updatedAt - a.updatedAt
      : a.updatedAt - b.updatedAt
  );
}

function render(notes) {
  const list = document.getElementById("list");
  const empty = document.getElementById("empty");
  const count = document.getElementById("count");

  list.innerHTML = "";
  count.textContent = notes.length ? `${notes.length} note${notes.length > 1 ? "s" : ""}` : "";
  empty.hidden = notes.length !== 0;
  if (notes.length === 0) {
    empty.textContent = "No notes saved yet. Open a film page on Letterboxd and click Notes to create one.";
    return;
  }

  const groups = [];
  let lastGroupKey = null;
  for (const note of notes) {
    const groupKey = formatMonthYear(note.updatedAt);
    if (groupKey !== lastGroupKey) {
      groups.push({ key: groupKey, notes: [] });
      lastGroupKey = groupKey;
    }
    groups[groups.length - 1].notes.push(note);
  }

  for (const group of groups) {
    const header = document.createElement("li");
    header.className = "month-header";
    header.textContent = group.key;
    list.appendChild(header);

    for (const note of group.notes) {
      const li = document.createElement("li");
      li.className = "diary-item";

      const date = document.createElement("div");
      date.className = "diary-date";

      const day = document.createElement("div");
      day.className = "diary-day";
      day.textContent = formatDay(note.updatedAt);

      const month = document.createElement("div");
      month.className = "diary-month";
      month.textContent = formatMonth(note.updatedAt);

      date.append(day, month);

      const content = document.createElement("div");
      content.className = "diary-content";

      const title = document.createElement("div");
      title.className = "diary-title";
      title.textContent = note.title || slugToTitle(note.slug);

      const snippet = document.createElement("div");
      snippet.className = "diary-snippet";
      snippet.textContent = (note.text || "").trim();

      content.append(title, snippet);

      li.append(date, content);
      li.addEventListener("click", () => {
        browser.tabs.create({ url: slugToUrl(note.slug) });
      });
      list.appendChild(li);
    }
  }
}

function renderLoggedOut() {
  document.getElementById("list").innerHTML = "";
  document.getElementById("count").textContent = "";
  document.getElementById("search").hidden = true;
  document.getElementById("sortToggle").hidden = true;
  document.querySelector("footer").hidden = true;
  const empty = document.getElementById("empty");
  empty.hidden = false;
  empty.textContent = "Sign in to your Letterboxd account to view and manage your notes.";
}

async function init() {
  const username = await getLoggedInUsername();

  if (!username) {
    renderLoggedOut();
    return;
  }

  document.getElementById("count").textContent = `Signed in as ${username}`;

  storedNotes = await getAllNotes(username);
  render(sortNotes(storedNotes));

  const sortToggle = document.getElementById("sortToggle");
  sortToggle.addEventListener("click", () => {
    currentSortOrder = currentSortOrder === "newest" ? "oldest" : "newest";
    sortToggle.textContent = currentSortOrder === "newest" ? "↓" : "↑";
    render(sortNotes(storedNotes));
  });

  document.getElementById("search").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) {
      render(sortNotes(storedNotes));
      return;
    }
    render(
      sortNotes(
        storedNotes.filter(
          (n) =>
            n.slug.toLowerCase().includes(q) ||
            (n.title && n.title.toLowerCase().includes(q)) ||
            n.text.toLowerCase().includes(q)
        )
      )
    );
  });
}

init();
