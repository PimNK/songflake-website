// Bootstrap: load content, wire views to state. No logic of any kind.
import '../styles/tokens.css';
import '../styles/base.css';
import { strings } from '../strings';

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  app.innerHTML = `<main class="wrap"><h1>${strings.siteTitle}</h1></main>`;
}
