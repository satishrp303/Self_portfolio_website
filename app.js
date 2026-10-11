const projects = [
  { title: 'FinAdvait Trading Agent', category: 'finance', label: 'Finance & analytics', repo: 'FinAdvait_Trading_Agent', description: 'A paper-trading dashboard for Indian equities, with a stock scanner, risk controls, virtual positions, and a trade journal. Built with simulated market data.', tags: ['React', 'TypeScript', 'Cloudflare D1'], art: 'finance' },
  { title: 'Lingayat Shadi', category: 'community', label: 'Community & connection', repo: 'lingayat-shadi', description: 'An English–Marathi matrimony platform with member profiles, shortlists, and interest requests. Contact sharing follows acceptance, with profile visibility controls.', tags: ['React', 'TypeScript', 'Supabase'], art: 'community' },
  { title: 'Gita Within', category: 'wellbeing', label: 'Reflection & wellbeing', repo: 'Motivation_bhagvadgita', description: 'A multilingual Bhagavad Gita experience with daily verses, translated meanings, and narrated storytelling. Reflections across five Indian languages.', tags: ['HTML & CSS', 'JavaScript', 'Web Speech'], art: 'wellbeing' }
];

const artwork = {
  finance: `<span class="art-label">PAPER TRADING / PROJECT CONCEPT</span><div class="mini-app"><div class="mini-header">◈ FinAdvait<span class="mini-dots"><i></i><i></i><i></i></span></div><div class="mini-divider"></div><svg class="finance-chart" viewBox="0 0 240 65" aria-hidden="true"><path class="chart-grid" d="M0 15H240M0 35H240M0 55H240"/><path d="m0 54 12-4 9 4 12-15 12 4 11-7 12 6 12-17 12 4 12-9 12 8 13-13 12 4 12-13 12 4 12-6 11 9 12-17 11 4 11-6 8 3"/></svg><div class="mini-pills"><span>Stock scanner</span><span>Risk controls</span><span>Trade journal</span></div></div>`,
  community: `<span class="art-label">MEANINGFUL CONNECTIONS / PROJECT CONCEPT</span><div class="mini-app"><div class="mini-header"><span class="heart-mark">♡</span> Lingayat Shadi<span class="mini-dots"><i></i><i></i><i></i></span></div><div class="mini-divider"></div><div class="profile-row"><div class="mini-profile"><i></i><b></b><span></span></div><div class="mini-profile"><i></i><b></b><span></span></div><div class="mini-profile"><i></i><b></b><span></span></div></div></div>`,
  wellbeing: `<span class="art-label">TIMELESS WISDOM / PROJECT CONCEPT</span><div class="mini-app"><div class="mini-header">✳ Gita Within<span class="mini-dots"><i></i><i></i><i></i></span></div><div class="mini-divider"></div><div class="gita-quote">“</div><div class="gita-title">A moment of reflection.</div><div class="gita-rule"></div><div class="gita-caption">READ · REFLECT · LISTEN</div></div>`
};
const githubIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 19c-4 1-4-2-6-2m12 5v-4c0-1 .1-1.6-.5-2.2 3-.3 6-1.5 6-6.8 0-1.5-.5-2.5-1.5-3.5.2-1 .2-2-.1-3-1.7-.1-3 1-3.5 1.5a12 12 0 0 0-6.8 0C7 3 6 2.5 4.5 2.5c-.4 1-.4 2 0 3C3.5 6.5 3 7.5 3 9c0 5.3 3 6.5 6 6.8-.5.5-.8 1.3-.8 2.3V22"/></svg>`;
const grid = document.querySelector('#project-grid');
function renderProjects(filter = 'all') {
  const shown = projects.filter(project => filter === 'all' || project.category === filter);
  grid.innerHTML = shown.map(project => `<article class="project-card reveal"><div class="project-art ${project.art}" aria-hidden="true">${artwork[project.art]}</div><div class="project-body"><span class="project-category">${project.label}</span><h3>${project.title}</h3><p>${project.description}</p><div class="tags">${project.tags.map(tag => `<span>${tag}</span>`).join('')}</div><div class="project-card-footer"><a href="https://github.com/satishrp303/${project.repo}" target="_blank" rel="noopener noreferrer" aria-label="View ${project.title} on GitHub">${githubIcon} View on GitHub <span aria-hidden="true">↗</span></a><span aria-hidden="true">${project.category === 'finance' ? '◈' : project.category === 'community' ? '♡' : '✳'}</span></div></div></article>`).join('');
  document.querySelector('#project-count').textContent = filter === 'all' ? 'Showing all 3 projects' : `Showing ${shown.length} ${filter} project${shown.length === 1 ? '' : 's'}`;
}
renderProjects();
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-filter]').forEach(other => { other.classList.toggle('active', other === button); other.setAttribute('aria-pressed', String(other === button)); });
  renderProjects(button.dataset.filter);
}));

const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#main-nav');
function closeMenu() { menuToggle.setAttribute('aria-expanded', 'false'); menuToggle.setAttribute('aria-label', 'Open navigation'); nav.classList.remove('open'); }
menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(open)); menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation'); nav.classList.toggle('open', open);
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape') { const wasOpen = nav.classList.contains('open'); closeMenu(); if (wasOpen) menuToggle.focus(); } });
document.addEventListener('click', event => { if (!event.target.closest('.nav-wrap')) closeMenu(); });
const media = matchMedia('(min-width:681px)'); media.addEventListener('change', event => { if (event.matches) closeMenu(); });

document.querySelector('#year').textContent = String(new Date().getFullYear());
document.querySelector('#copy-email').addEventListener('click', async () => {
  const status = document.querySelector('#copy-status');
  try { await navigator.clipboard.writeText('satishpatil333@gmail.com'); status.textContent = 'Email copied'; }
  catch { status.textContent = 'Select the email address above to copy it.'; }
  setTimeout(() => { status.textContent = ''; }, 4000);
});
if ('IntersectionObserver' in window) {
  const links = [...nav.querySelectorAll('a[href^="#"]')];
  new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      links.forEach(link => { if (link.hash === '#' + entry.target.id) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
    }
  }, { rootMargin: '-20% 0px -60% 0px' }).observe(document.querySelector('#home'));
  const sectionObserver = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) links.forEach(link => { if (link.hash === '#' + entry.target.id) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
  }, { rootMargin: '-15% 0px -65% 0px' });
  links.forEach(link => { const section = document.querySelector(link.hash); if (section) sectionObserver.observe(section); });
}
