/* Animations — Transition Orchestration */

const STAGGER_MS = 30;
const EXIT_MS = 150;

// Animate nodes out, then call onComplete to swap in new ones
export function animateTransition(container, onComplete) {
  const existing = container.querySelectorAll('.player-node');

  if (existing.length === 0) {
    onComplete();
    return;
  }

  // Exit animation
  existing.forEach(node => {
    node.classList.remove('entering');
    node.classList.add('exiting');
  });

  setTimeout(() => {
    onComplete();
  }, EXIT_MS);
}

// Stagger entrance of new nodes
export function animateEntrance(container) {
  const nodes = container.querySelectorAll('.player-node');
  nodes.forEach((node, i) => {
    node.style.animationDelay = `${i * STAGGER_MS}ms`;
    node.classList.add('entering');
  });
}

// Pop animation for year pill
export function popYearPill(el) {
  el.classList.remove('pop');
  // Force reflow
  void el.offsetWidth;
  el.classList.add('pop');
}

// Fade out loading screen, fade in app
export function transitionFromLoading() {
  return new Promise(resolve => {
    const loading = document.getElementById('loading-screen');
    const app = document.getElementById('app');

    if (!loading) {
      app?.classList.remove('hidden');
      app?.classList.add('fade-in');
      resolve();
      return;
    }

    loading.classList.add('fade-out');

    setTimeout(() => {
      loading.remove();
      app?.classList.remove('hidden');
      app?.classList.add('fade-in');
      resolve();
    }, 500);
  });
}
