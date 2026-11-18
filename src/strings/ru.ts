// The Russian UI strings, in the shape of en.ts. What is written on the record itself (the centre
// label) and the dev overlay stay English; style names and song titles are never translated.
import type { Axis } from '../content/parse';
import { en, site, type Strings } from './en';

/** Russian noun forms for 1, 2–4 and 5+ (21 → one, 12 → many). */
const forms = (n: number, one: string, few: string, many: string): string => {
  const [d, h] = [n % 10, n % 100];
  if (d === 1 && h !== 11) return one;
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return few;
  return many;
};

export const ru: Strings = {
  aboutBlock: 'Об этом блоке',

  hero: {
    title: site,
    about: 'О проекте',
    aboutGlyph: en.hero.aboutGlyph,
    lang: 'RU',
    langLabel: 'Язык: русский. Переключить на английский',
    // Shown with its line breaks; «_» opens a list line.
    intro: [
      'Это место, где я делюсь своей музыкой.',
      '',
      'Каждый раз, когда я показываю кому-то трек, мне хочется многое рассказать, указать на какие-то моменты.',
      'Spotify, SoundCloud, Yandex Music и другие сервисы не дают такой возможности.',
      'Поэтому мне пришлось изобрести свой способ.',
      'История трека и заметки рядом с каждой композицией.',
      '',
      'Каждая песня представлена в виде узора снежинки.',
      'Цвет зависит от основных инструментов.',
      'Форма определяется параметрами песни:',
      '_ритм,',
      '_мелодия,',
      '_техника,',
      '_инструменты,',
      '_структура.',
      '',
      'SONGFLAKE.',
    ].join('\n'),
  },

  axes: {
    rhythm: 'Ритм',
    melody: 'Мелодия',
    technique: 'Техника',
    instruments: 'Инструменты',
    structure: 'Структура',
  } satisfies Record<Axis, string>,

  views: {
    label: 'Вид',
    record: 'Пластинка',
    list: 'Список',
    mapLabel: 'Карта треков',
    toRecord: 'Прокрутить вниз к трекам',
    scroll: 'вниз',
  },

  filters: {
    // «из 21 трека», «из 22 треков»
    toggleLabel: (n: number, total: number) =>
      `Фильтры: показано ${n} из ${total} ${forms(total, 'трека', 'треков', 'треков')}`,
    style: 'Стиль',
    complexity: 'Сложность',
    range: en.filters.range,
    min: 'мин.',
    max: 'макс.',
    year: 'Год',
    from: 'с',
    to: 'по',
    listen: 'Основной инструмент',
    all: 'Выбрать все',
    status: 'Статус',
    ready: 'Готово',
    inProgress: 'В работе',
    reset: 'Сбросить фильтры',
    info: {
      style: 'Жанр, к которому тяготеет трек.',
      listen: 'Инструменты, ведущие основные партии в треке.',
      complexity:
        'Сумма баллов относительной сложности по параметрам: ритм, мелодия, техника, инструменты, структура.',
      year: 'Год записи трека.',
      status: 'Готовые треки записаны; треки в работе ещё в процессе.',
    },
  },

  record: {
    canvasLabel: 'Пластинка с треками; те же треки есть в виде «Список».',
    // Written on the record: stays as it is.
    labelSide: en.record.labelSide,
    labelTracks: en.record.labelTracks,
    labelShort: en.record.labelShort,
    labelName: en.record.labelName,
  },

  list: {
    year: en.list.year,
    inProgress: 'в работе',
    empty: 'Под эти фильтры не подходит ни один трек. Нажмите «Сбросить фильтры» на панели.',
  },

  card: {
    prev: 'Предыдущий трек',
    next: 'Следующий трек',
    listen: 'Основной инструмент',
    listenInfo: 'Партии инструментов, составляющие основу. Они определяют цвета снежинки.',
    style: 'Стиль',
    story: 'История',
    storyEmpty: 'История этого трека ещё не написана.',
    timeline: 'Период',
    timelineInfo: {
      idea: 'только мелодия или идея песни.',
      concept: 'структура композиции и партии основных инструментов.',
      ready: 'трек записан.',
    },
    idea: 'Идея',
    concept: 'Концепция',
    ready: 'Готово',
    notYet: 'ещё нет',
    total: 'Сложность',
    totalInfoNote: 'Баллы сложности относительно других треков.',
    totalInfo: {
      rhythm: 'насколько сложен ритм: смены размеров, переходы.',
      melody: 'как далеко уходят мелодии: диапазон, скачки, сколько линий звучит сразу.',
      technique: 'насколько трудно сыграть партии.',
      instruments: 'количество инструментов и слоёв в аранжировке.',
      structure: 'как построена песня: от куплета и припева до множества частей и поворотов.',
    } satisfies Record<Axis, string>,
    complexityLabel: (total: number, pairs: [string, number][]) =>
      `Сложность ${total} из 15: ${pairs.map(([n, v]) => `${n} ${v} из 3`).join(', ')}`,
    totalOf: (total: number) => `${total}/15`,
    notFound: 'Трек не найден',
  },

  player: {
    label: 'Плеер',
    play: 'Слушать',
    pause: 'Пауза',
    noAudio: 'Запись скоро появится',
    ready: 'Нажмите ▶, чтобы послушать',
    pinAt: (time: string, text: string) => `Заметка на ${time}: ${text}`,
    seek: 'Перемотка',
    volume: 'Громкость',
    pastEnd: en.player.pastEnd,
  },

  random: {
    label: 'Плеер случайных треков',
    idle: '⤮ Включает случайный трек',
    nowPlaying: 'Сейчас играет',
    paused: 'Пауза',
    play: 'Включить случайный трек',
    prev: 'Предыдущий трек',
    next: 'Следующий случайный трек',
    openCard: (title: string) => `Открыть «${title}»`,
    card: 'Открыть карточку трека',
    toList: 'Вернуться к трекам',
  },

  backlight: {
    brightness: 'Яркость подсветки',
    tone: 'Цвет подсветки: от холодного к тёплому',
    cold: 'холодный',
    neutral: 'нейтральный',
    warm: 'тёплый',
  },

  hints: {
    label: 'Как пользоваться страницей',
    steps: [
      'Выберите снежинку, чтобы послушать песню.',
      'Или нажмите ▶ здесь — заиграет случайный трек.',
      'Примените фильтры, чтобы отобразить только определенные треки.',
    ],
    step: en.hints.step,
    next: 'Далее',
    done: 'Понятно',
    skip: 'Пропустить',
  },

  // Development only: stays English, like the content files it reports on.
  overlay: en.overlay,
};
