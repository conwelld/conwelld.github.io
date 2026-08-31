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

function setRoute(route, shouldFocus = false) {
  const nextScreen = screens.find(screen => screen.dataset.screen === route);
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
    const current = item.dataset.route === route;
    item.classList.toggle("is-active", current);
    if (current) item.setAttribute("aria-current", "page"); else item.removeAttribute("aria-current");
  });
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
if (screens.some(screen => screen.dataset.screen === initialRoute)) setRoute(initialRoute);
window.addEventListener("hashchange", () => {
  const route = location.hash.replace("#", "");
  if (screens.some(screen => screen.dataset.screen === route)) setRoute(route);
});

const finishBoot = () => bootScreen?.classList.add("is-complete");
window.setTimeout(finishBoot, 1450);
bootScreen?.addEventListener("click", finishBoot);
