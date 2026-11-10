(() => {
  const story = document.querySelector('.hatch-story-immersive');
  if (!story) return;
  const buttons = [...story.querySelectorAll('.hs-steps button')];
  const playback = [...story.querySelectorAll('.hs-playback button')];
  const captionTitle = story.querySelector('.hs-caption strong');
  const captionBody = story.querySelector('.hs-caption p');
  const theatre = story.querySelector('.hs-theatre');
  const scenes = {
    source: story.querySelector('.hs-source'),
    team: story.querySelector('.hs-team'),
    chat: story.querySelector('.hs-chat'),
    plan: story.querySelector('.hs-plan'),
    living: story.querySelector('.hs-living'),
  };
  const stages = [
    ['Hatch an idea.', 'A public repository with unfinished potential.'],
    ['Give it a team.', 'Four roles. One project to understand.'],
    ['Let them discuss.', 'Evidence becomes a shared plan.'],
    ['Build one useful release.', 'A small, reviewable next step.'],
    ['Keep the mission alive.', 'A coin with a purpose beyond launch.'],
  ];
  let stage = Number(story.dataset.stage || 0);
  let paused = false;
  let timer;

  function render(next) {
    stage = (next + stages.length) % stages.length;
    story.dataset.stage = String(stage);
    story.dataset.paused = String(paused);
    buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === stage)));
    captionTitle.textContent = stages[stage][0];
    captionBody.textContent = stages[stage][1];
    theatre.setAttribute('aria-label', `How Hatch works: ${stages[stage][0]}`);
    Object.entries(scenes).forEach(([name, element]) => {
      const visible = ({ source: stage === 0, team: stage === 1, chat: stage === 2, plan: stage === 3, living: stage === 4 })[name];
      element?.setAttribute('aria-hidden', String(!visible));
    });
  }

  function schedule() {
    clearInterval(timer);
    if (!paused) timer = setInterval(() => render(stage + 1), 3200);
  }

  buttons.forEach((button, index) => button.addEventListener('click', () => {
    render(index);
    schedule();
  }));
  playback[0]?.addEventListener('click', () => {
    paused = false;
    render(0);
    schedule();
  });
  playback[1]?.addEventListener('click', () => {
    paused = !paused;
    playback[1].setAttribute('aria-label', paused ? 'Play walkthrough' : 'Pause walkthrough');
    render(stage);
    schedule();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearInterval(timer);
    else schedule();
  });
  render(stage);
  schedule();
})();
