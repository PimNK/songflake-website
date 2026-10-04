// Bootstrap: load content, wire views to state. No logic of any kind.
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/overlay.css';
import { loadContent } from '../content/load';
import { strings } from '../strings';
import { showContentOverlay } from '../views/content-overlay';

const content = loadContent();
if (import.meta.env.DEV) showContentOverlay(content.errors, content.warnings);

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  app.innerHTML = `<main class="wrap"><h1>${strings.siteTitle}</h1></main>`;
}
