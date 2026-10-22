const projectData = {
  rung: {
    code: "RUNG_01", kicker: "APPLIED AI / PERSONAL PROJECT", title: "Rung",
    summary: "A timed mock coding interview platform with skill diagnostics and an AI interviewer that guides students without revealing solutions.",
    points: ["Zero answer leaks across a 177-case adversarial suite", "Reduced projected API cost by 90%", "100+ offline tests with external calls stubbed"],
    tags: ["Python", "Flask", "Peewee", "SQLite", "Anthropic API"],
    note: "Built and deployed in August 2026."
  },
  ssdt: {
    code: "PROD_02", kicker: "PRODUCTION / 14-PERSON AGILE TEAM", title: "SSDT Systems",
    summary: "Features shipped across a student employment portal serving 1,400+ campus users and a community-service tracking system.",
    points: ["Replaced record keeping that consumed 170+ hours annually", "Restored accurate service-hour reporting for 2,000+ users", "CI tested Python 3.10–3.14 against provisioned MySQL"],
    tags: ["Python", "Flask", "Peewee", "MySQL", "GitHub Actions"],
    note: "Production work for Berea College Information Systems & Services, June–August 2026."
  },
  orm: {
    code: "RESEARCH_03", kicker: "RESEARCH / CS CAPSTONE", title: "Object-Relational Mapping",
    summary: "Research into impedance mismatch and the abstraction tradeoffs that appear when object-oriented applications meet relational databases.",
    points: ["Analyzed translation between objects and relational schemas", "Grounded the research in hands-on Peewee use", "Connected database design with application architecture"],
    tags: ["Research", "Peewee", "Databases", "Architecture"],
    note: "Computer & Information Science research at Berea College."
  },
  neetcode: {
    code: "ARCHIVE_04", kicker: "PRACTICE / PUBLIC ARCHIVE", title: "NeetCode Submissions",
    summary: "A growing record of algorithm and data-structure problem solving, written primarily in Python.",
    points: ["Documents consistent technical practice", "Covers algorithms and data structures", "Public source available on GitHub"],
    tags: ["Python", "Algorithms", "Data Structures"], note: "Personal learning archive.",
    href: "https://github.com/conwelld/neetcode-submissions"
  }
};

const routes = [...document.querySelectorAll("[data-route]")];
const navItems = [...document.querySelectorAll(".nav-item")];
const screens = [...document.querySelectorAll("[data-screen]")];
const projectSlots = [...document.querySelectorAll(".project-slot")];
const projectDetail = document.querySelector(".project-detail");
const bootScreen = document.querySelector(".boot-screen");
const clock = document.querySelector("#clock");
const blogScreen = document.querySelector("#blog");
const postView = blogScreen.querySelector(".post-view");
const baseTitle = document.title;
const posts = (typeof blogPosts === "undefined" ? [] : blogPosts).slice().sort((a, b) => b.date.localeCompare(a.date));

function screenFor(route) {
  return screens.find(screen => screen.dataset.screen === route.split("/")[0]);
}

function setRoute(route, shouldFocus = false) {
  const nextScreen = screenFor(route);
  if (!nextScreen) return;
  screens.forEach(screen => {
    const current = screen === nextScreen;
    screen.hidden = !current;
    screen.classList.toggle("is-active", current);
    screen.classList.remove("is-entering");
  });
  nextScreen.classList.add("is-entering");
  window.setTimeout(() => nextScreen.classList.remove("is-entering"), 650);
  navItems.forEach(item => {
    const current = item.dataset.route === nextScreen.dataset.screen;
    item.classList.toggle("is-active", current);
    if (current) item.setAttribute("aria-current", "page"); else item.removeAttribute("aria-current");
  });
  document.title = baseTitle;
  if (nextScreen === blogScreen) route = renderBlog(route.split("/")[1]);
  if (location.hash !== `#${route}`) history.replaceState(null, "", `#${route}`);
  if (shouldFocus) nextScreen.focus({preventScroll: true});
}

routes.forEach(control => control.addEventListener("click", event => {
  event.preventDefault();
  setRoute(control.dataset.route);
}));
function renderProject(key) {
  const project = projectData[key];
  if (!project || !projectDetail) return;
  projectSlots.forEach(slot => {
    const selected = slot.dataset.project === key;
    slot.classList.toggle("is-selected", selected);
    slot.setAttribute("aria-pressed", String(selected));
  });
  projectDetail.classList.remove("is-updating");
  void projectDetail.offsetWidth;
  projectDetail.querySelector(".visual-code").textContent = project.code;
  projectDetail.querySelector(".project-kicker").textContent = project.kicker;
  projectDetail.querySelector("h3").textContent = project.title;
  projectDetail.querySelector(".project-summary").textContent = project.summary;
  projectDetail.querySelector(".project-points").replaceChildren(...project.points.map(point => {
    const item = document.createElement("li"); item.textContent = point; return item;
  }));
  projectDetail.querySelector(".tag-list").replaceChildren(...project.tags.map(tag => {
    const item = document.createElement("span"); item.textContent = tag; return item;
  }));
  projectDetail.querySelector(".project-note").textContent = project.note;
  projectDetail.querySelector(".project-link")?.remove();
  if (project.href) {
    const link = document.createElement("a");
    link.className = "project-link"; link.href = project.href; link.target = "_blank"; link.rel = "noreferrer";
    link.textContent = "Open source on GitHub ↗";
    projectDetail.querySelector(".project-copy").append(link);
  }
  projectDetail.classList.add("is-updating");
}

projectSlots.forEach(slot => slot.addEventListener("click", () => renderProject(slot.dataset.project)));

function formatDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {month: "short", day: "numeric", year: "numeric"}).format(new Date(year, month - 1, day));
}

const entryLabel = index => String(posts.length - index).padStart(2, "0");
const hasPoints = post => typeof post.storyPoints === "number";

// Supports [label](url) links and **bold**; everything else is plain text.
function renderInline(text) {
  const nodes = []; let last = 0;
  for (const match of text.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)|\*\*(.+?)\*\*/g)) {
    nodes.push(document.createTextNode(text.slice(last, match.index)));
    const node = document.createElement(match[1] ? "a" : "strong");
    node.textContent = match[1] ?? match[3];
    if (match[1]) { node.href = match[2]; if (/^https?:/.test(match[2])) { node.target = "_blank"; node.rel = "noreferrer"; } }
    nodes.push(node); last = match.index + match[0].length;
  }
  nodes.push(document.createTextNode(text.slice(last)));
  return nodes;
}

// Blank lines separate paragraphs, "## " starts a heading, "- " starts a bullet.
function renderBody(source) {
  const nodes = []; let paragraph = []; let list = null;
  const flush = () => {
    if (paragraph.length) { const p = document.createElement("p"); p.append(...renderInline(paragraph.join(" "))); nodes.push(p); }
    paragraph = []; list = null;
  };
  source.split("\n").map(line => line.trim()).forEach(line => {
    if (!line) return flush();
    if (line.startsWith("## ")) { flush(); const heading = document.createElement("h3"); heading.textContent = line.slice(3); nodes.push(heading); return; }
    if (line.startsWith("- ")) {
      if (paragraph.length) flush();
      if (!list) { list = document.createElement("ul"); nodes.push(list); }
      const item = document.createElement("li"); item.append(...renderInline(line.slice(2))); list.append(item); return;
    }
    list = null; paragraph.push(line);
  });
  flush();
  return nodes;
}

function excerpt(post) {
  if (post.summary) return post.summary;
  const first = renderBody(post.body).find(node => node.tagName === "P")?.textContent ?? "";
  return first.length > 190 ? `${first.slice(0, first.lastIndexOf(" ", 190))}…` : first;
}

function renderBlogIndex() {
  blogScreen.querySelector(".blog-count").textContent = `${String(posts.length).padStart(2, "0")} ${posts.length === 1 ? "ENTRY" : "ENTRIES"}`;
  const list = blogScreen.querySelector(".post-list");
  if (!posts.length) {
    const empty = document.createElement("li"); empty.className = "post-empty"; empty.textContent = "First entry coming soon.";
    return list.replaceChildren(empty);
  }
  list.replaceChildren(...posts.map((post, index) => {
    const item = document.createElement("li");
    item.innerHTML = `<a class="post-card"><span class="slot-index"></span><span class="post-card-copy"><small></small><strong></strong><span></span></span><span class="slot-arrow" aria-hidden="true">›</span></a>`;
    const card = item.firstElementChild; card.href = `#blog/${post.slug}`;
    card.querySelector(".slot-index").textContent = entryLabel(index);
    card.querySelector("small").textContent = formatDate(post.date).toUpperCase();
    card.querySelector("strong").textContent = post.title;
    card.querySelector(".post-card-copy span").textContent = excerpt(post);
    if (hasPoints(post)) {
      const points = document.createElement("span"); points.className = "post-card-points";
      points.innerHTML = "<b></b><small>STORY PTS</small>"; points.firstChild.textContent = post.storyPoints;
      card.querySelector(".slot-arrow").before(points);
    }
    return item;
  }));
}

// Shows the post for `slug`, or the index when there is none. Returns the canonical route.
function renderBlog(slug) {
  const index = posts.findIndex(post => post.slug === slug);
  const post = posts[index];
  blogScreen.querySelector(".blog-index").hidden = Boolean(post);
  postView.hidden = !post;
  blogScreen.scrollTop = 0;
  if (!post) return "blog";
  document.title = `${post.title} — ${baseTitle}`;
  postView.querySelector(".project-kicker").textContent = `DEV LOG / ENTRY ${entryLabel(index)}`;
  postView.querySelector("h3").textContent = post.title;
  const words = post.body.split(/\s+/).filter(Boolean).length;
  const meta = [["Published", formatDate(post.date)], ["Read", `${Math.max(1, Math.round(words / 200))} min`]];
  if (hasPoints(post)) meta.push(["Story points", String(post.storyPoints), "is-stat"]);
  postView.querySelector(".post-meta").replaceChildren(...meta.map(([term, value, className]) => {
    const row = document.createElement("div"); row.innerHTML = "<dt></dt><dd></dd>";
    row.firstChild.textContent = term; row.lastChild.textContent = value; if (className) row.lastChild.className = className;
    return row;
  }));
  const tags = postView.querySelector(".tag-list");
  tags.hidden = !post.tags?.length;
  tags.replaceChildren(...(post.tags ?? []).map(tag => {
    const item = document.createElement("span"); item.textContent = tag; return item;
  }));
  const prompt = postView.querySelector(".post-prompt");
  prompt.hidden = !post.prompt; prompt.open = false;
  postView.querySelector(".post-prompt-body").replaceChildren(...renderBody(post.prompt ?? ""));
  postView.querySelector(".post-body").replaceChildren(...renderBody(post.body));
  const pager = postView.querySelector(".post-pager");
  pager.replaceChildren(...[[posts[index + 1], "is-older", "‹ Older entry"], [posts[index - 1], "is-newer", "Newer entry ›"]]
    .filter(([neighbor]) => neighbor).map(([neighbor, className, label]) => {
      const link = document.createElement("a"); link.className = className; link.href = `#blog/${neighbor.slug}`;
      link.innerHTML = "<small></small><strong></strong>"; link.firstChild.textContent = label; link.lastChild.textContent = neighbor.title;
      return link;
    }));
  pager.hidden = !pager.children.length;
  return `blog/${post.slug}`;
}

renderBlogIndex();
document.addEventListener("keydown", event => {
  const navIndex = navItems.indexOf(document.activeElement);
  const projectIndex = projectSlots.indexOf(document.activeElement);
  const arrow = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(event.key);
  if (navIndex >= 0 && arrow) {
    event.preventDefault();
    const direction = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
    navItems[(navIndex + direction + navItems.length) % navItems.length].focus();
  }
  if (projectIndex >= 0 && arrow) {
    event.preventDefault();
    const direction = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
    const next = projectSlots[(projectIndex + direction + projectSlots.length) % projectSlots.length];
    next.focus(); next.click();
  }
});

function updateClock() {
  const now = new Date();
  clock.textContent = new Intl.DateTimeFormat([], {hour: "2-digit", minute: "2-digit", hour12: false}).format(now);
  clock.dateTime = now.toISOString();
}
updateClock(); window.setInterval(updateClock, 30000);

const initialRoute = location.hash.replace("#", "");
if (screenFor(initialRoute)) setRoute(initialRoute);
window.addEventListener("hashchange", () => {
  const route = location.hash.replace("#", "");
  if (!screenFor(route)) return;
  setRoute(route);
  if (route.startsWith("blog/") && !postView.hidden) postView.querySelector("h3").focus({preventScroll: true});
});

const finishBoot = () => bootScreen?.classList.add("is-complete");
window.setTimeout(finishBoot, 1450);
bootScreen?.addEventListener("click", finishBoot);
