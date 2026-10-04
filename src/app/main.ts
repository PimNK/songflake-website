// Bootstrap: load content, wire views to state. No logic of any kind.
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/record.css';
import '../styles/card.css';
import '../styles/overlay.css';
import { loadContent } from '../content/load';
import { yearRange } from '../domain/record-layout';
import { showContentOverlay } from '../views/content-overlay';
import { renderHowTo, renderLegend } from '../views/legend';
import { renderPage } from '../views/page';
import { mountRecord } from '../views/record';

const content = loadContent();
if (import.meta.env.DEV) showContentOverlay(content.errors, content.warnings);

const root = document.querySelector<HTMLElement>('#app')!;
const slots = renderPage(root, content);
mountRecord(slots.stage, content, () => {});
renderLegend(slots.legend, content.taxonomy, yearRange(content.songs));
renderHowTo(slots.howTo, content.taxonomy);
