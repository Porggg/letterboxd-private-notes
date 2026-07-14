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

async function getAllNotes(username) {
  const prefix = noteKeyPrefix(username);
  const all = await browser.storage.local.get(null);
  return Object.entries(all)
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, value]) => ({
      slug: key.slice(prefix.length),
      text: value.text || "",
      updatedAt: value.updatedAt || 0,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
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
  }

  for (const note of notes) {
    const li = document.createElement("li");
    li.className = "lbn-item";

    const title = document.createElement("div");
    title.className = "lbn-item-title";
    title.textContent = slugToTitle(note.slug);

    const snippet = document.createElement("div");
    snippet.className = "lbn-item-snippet";
    snippet.textContent = (note.text || "").slice(0, 80).replace(/\n/g, " ");

    const date = document.createElement("div");
    date.className = "lbn-item-date";
    date.textContent = formatDate(note.updatedAt);

    li.append(title, snippet, date);
    li.addEventListener("click", () => {
      browser.tabs.create({ url: slugToUrl(note.slug) });
    });
    list.appendChild(li);
  }
}

function renderLoggedOut() {
  document.getElementById("list").innerHTML = "";
  document.getElementById("count").textContent = "";
  document.getElementById("search").hidden = true;
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

  const notes = await getAllNotes(username);
  render(notes);

  document.getElementById("search").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) {
      render(notes);
      return;
    }
    render(
      notes.filter(
        (n) => n.slug.toLowerCase().includes(q) || n.text.toLowerCase().includes(q)
      )
    );
  });
}

init();
