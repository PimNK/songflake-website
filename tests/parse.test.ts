import { describe, expect, it } from 'vitest';
import { displayOrder, firstSentence, parseSong, type ParseResult } from '../src/content/parse';
import { bands, md, song, taxonomy, valid } from './fixtures';

const audio = [{ name: 'audio.mp3', url: '/songs/x/audio.mp3' }];
const run = (fm: string, opts: { slug?: string; audio?: typeof audio; body?: string } = {}) =>
  parseSong(opts.slug ?? 'x', md(fm, opts.body), opts.audio ?? [], taxonomy, bands);
const errorsOf = (r: ParseResult) => (r.ok ? [] : r.errors);

describe('parseSong — valid input', () => {
  it('parses a complete song and derives fields', () => {
    const r = run(valid);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.song).toMatchObject({
      title: 'Destination',
      band: 'Vita Brevis',
      complexityTotal: 8,
      status: 'ready',
      excerpt: 'A story.',
      audioSrc: null,
      pins: [],
    });
    expect(r.warnings).toEqual([]);
  });

  it('keeps a quoted numeric title as a string', () => {
    const r = run(valid.replace('"Destination"', '"98"'));
    expect(r.ok && r.song.title).toBe('98');
  });

  it('rejects an unquoted numeric title with a fix', () => {
    const r = run(valid.replace('"Destination"', '98'));
    expect(errorsOf(r)[0]).toContain('title must be a quoted string');
  });

  it('treats a missing ready year as in progress and a missing band as solo', () => {
    const r = run(valid.replace('band: "Vita Brevis"\n', '').replace(', ready: 2011', ''));
    expect(r.ok && r.song.status).toBe('in-progress');
    expect(r.ok && r.song.band).toBeNull();
  });

  it('prefers a local audio file over audio_url', () => {
    const fm = `${valid}\naudio_url: "https://example.com/a.mp3"`;
    expect((run(fm, { audio }) as { song: { audioSrc: string } }).song.audioSrc).toBe(
      '/songs/x/audio.mp3',
    );
    expect((run(fm) as { song: { audioSrc: string } }).song.audioSrc).toBe(
      'https://example.com/a.mp3',
    );
  });

  it('reports hidden drafts', () => {
    const r = run(`${valid}\nhidden: true`);
    expect(r.ok && r.hidden).toBe(true);
  });

  it('parses and sorts pins', () => {
    const fm = `${valid}\npins:\n  - at: "1:02:03"\n    text: late\n  - at: "0:42"\n    text: early`;
    const r = run(fm, { audio });
    expect(r.ok && r.song.pins).toEqual([
      { at: 42, text: 'early' },
      { at: 3723, text: 'late' },
    ]);
  });
});

describe('parseSong — errors from CLAUDE.md §2.4', () => {
  it('unknown style lists known styles', () => {
    const [e] = errorsOf(run(valid.replace('Alternative', 'Progresive'), { slug: 'velotrack' }));
    expect(e).toBe(
      'songs/velotrack/index.md: style "Progresive" is not in content/taxonomy.yaml\n' +
        '  known styles: Alternative, Progressive, Electronic, Ambient',
    );
  });

  it('years out of order', () => {
    const fm = valid.replace(
      '{ idea: 2010, concept: 2010, ready: 2011 }',
      '{ idea: 2021, concept: 2019, ready: 2021 }',
    );
    expect(errorsOf(run(fm, { slug: '98' }))).toContain(
      'songs/98/index.md: years.concept (2019) is earlier than years.idea (2021)',
    );
  });

  it('ready earlier than idea when concept is absent', () => {
    const fm = valid.replace(
      '{ idea: 2010, concept: 2010, ready: 2011 }',
      '{ idea: 2012, ready: 2011 }',
    );
    expect(errorsOf(run(fm))[0]).toContain('years.ready (2011) is earlier than years.idea (2012)');
  });

  it('two audio files', () => {
    const two = [
      { name: 'lady.mp3', url: 'a' },
      { name: 'lady-v2.mp3', url: 'b' },
    ];
    expect(errorsOf(run(valid, { slug: 'lady', audio: two }))).toContain(
      'songs/lady/: two audio files (lady.mp3, lady-v2.mp3) — keep one',
    );
  });

  it('malformed pin time suggests a fix', () => {
    const fm = `${valid}\npins:\n  - at: "0:10"\n    text: ok\n  - at: "2.15"\n    text: bad`;
    expect(errorsOf(run(fm, { slug: 'dd', audio }))).toEqual([
      'songs/dd/index.md: pins[1].at "2.15" is not a time — write it as "2:15"',
    ]);
  });

  it('pins without audio', () => {
    const fm = `${valid}\npins:\n  - at: "0:10"\n    text: ok`;
    expect(errorsOf(run(fm, { slug: 'shine' }))).toEqual([
      'songs/shine/index.md: pins present but the song has no audio',
    ]);
  });

  it('pin rules: seconds < 60, non-empty text, unique times, quoted', () => {
    const fm = `${valid}\npins:\n  - at: "0:75"\n    text: a\n  - at: "0:10"\n    text: " "\n  - at: "0:10"\n    text: b`;
    const errs = errorsOf(run(fm, { audio }));
    expect(errs).toHaveLength(3);
    expect(errs[0]).toContain('pins[0].at "0:75" is not a time');
    expect(errs[1]).toContain('pins[1].text is empty');
    expect(errs[2]).toContain('pins[2].at "0:10" is the same moment as pins[1]');
    expect(errorsOf(run(`${valid}\npins:\n  - at: 2.15\n    text: a`, { audio }))[0]).toContain(
      'pins[0].at must be a quoted time',
    );
  });

  it('unknown style or instrument, bad complexity, bad slug, no frontmatter', () => {
    expect(errorsOf(run(valid.replace('[Vox, Bass]', '[Vox, Sitar]')))[0]).toContain(
      'accents[1] "Sitar" is not in content/taxonomy.yaml',
    );
    expect(errorsOf(run(valid.replace('rhythm: 1', 'rhythm: 4')))[0]).toBe(
      'songs/x/index.md: complexity.rhythm must be 1, 2 or 3',
    );
    expect(errorsOf(run(valid, { slug: 'Bad_Slug' }))[0]).toContain(
      'folder name must be lowercase',
    );
    expect(errorsOf(parseSong('x', 'no frontmatter', [], taxonomy, bands))[0]).toContain(
      'no frontmatter',
    );
    expect(errorsOf(run('title: "a"\nstyle: [')).length).toBe(1);
  });
});

describe('parseSong — warnings', () => {
  it('unknown key resembling a known field', () => {
    const r = run(`${valid}\naccent: [Vox]`);
    expect(r.warnings).toEqual([
      'songs/x/index.md: unknown field "accent" — did you mean "accents"?',
    ]);
  });

  it('band "" and a band missing from bands.yaml', () => {
    expect(run(valid.replace('"Vita Brevis"', '""')).warnings[0]).toContain('band is ""');
    expect(run(valid.replace('"Vita Brevis"', '"Other"')).warnings[0]).toContain(
      'band "Other" is not in content/bands.yaml',
    );
  });

  it('long pin text', () => {
    const fm = `${valid}\npins:\n  - at: "0:10"\n    text: "${'x'.repeat(201)}"`;
    const r = run(fm, { audio });
    expect(r.ok).toBe(true);
    expect(r.warnings[0]).toContain('pins[0].text is 201 characters');
  });
});

describe('derived helpers', () => {
  it('firstSentence strips Markdown', () => {
    expect(firstSentence('**Bold** start. Second.')).toBe('Bold start.');
    expect(firstSentence('See [this](http://x) now! More')).toBe('See this now!');
    expect(firstSentence('No full stop')).toBe('No full stop');
    expect(firstSentence('')).toBe('');
  });

  it('displayOrder: in progress first, ready descending, ties by title', () => {
    const a = song({ title: 'B', years: { idea: 2010, ready: 2012 } });
    const b = song({ title: 'A', years: { idea: 2010, ready: 2012 } });
    const c = song({ title: 'C', years: { idea: 2010, ready: 2020 } });
    const d = song({ title: 'D', years: { idea: 2010 }, status: 'in-progress' });
    expect(displayOrder([a, b, c, d]).map((s) => s.title)).toEqual(['D', 'C', 'A', 'B']);
  });
});
