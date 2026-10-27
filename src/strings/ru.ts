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
  years: (n: number) => `${n} ${forms(n, 'год', 'года', 'лет')}`,
  aboutBlock: 'Об этом блоке',

  hero: {
    title: site,
    about: 'О проекте',
    lang: 'RU',
    langLabel: 'Язык: русский. Переключить на английский',
    // Shown with its line breaks; «_» opens a list line.
    intro: [
      'Это мой музыкальный дневник:',
      '_мои сольные записи,',
      '_совместные записи.',
      '',
      'Каждая песня — снежинка.',
      'Она вычислена из параметров песни:',
      '_ритм,',
      '_мелодия,',
      '_техника,',
      '_инструменты,',
      '_структура.',
      '',
      'Нажмите на снежинку, чтобы открыть трек.',
      'В заметках — на что стоит обратить внимание.',
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
    recordGlyph: en.views.recordGlyph,
    listGlyph: en.views.listGlyph,
    mapLabel: 'Карта треков',
    toRecord: 'Прокрутить вниз к трекам',
    scroll: 'вниз',
  },

  filters: {
    // «из 21 трека», «из 22 треков»
    toggleLabel: (n: number, total: number) =>
      `Фильтры: показано ${n} из ${total} ${forms(total, 'трека', 'треков', 'треков')}`,
    style: 'Стиль',
    complexity: 'Общая сложность',
    range: en.filters.range,
    min: 'мин.',
    max: 'макс.',
    year: 'Год',
    from: 'с',
    to: 'по',
    listen: 'Что слушать',
    allNone: 'все / ни одного',
    status: 'Статус',
    ready: 'Готово',
    inProgress: 'В работе',
    reset: 'Сбросить фильтры',
    info: {
      style: 'Жанр, к которому тяготеет трек. Каждый стиль — сектор пластинки.',
      listen:
        'Инструменты, на которых построен трек. Трек показан, если в нём есть хотя бы один из отмеченных.',
      complexity:
        'Ритм, мелодия, техника, инструменты и структура, каждый от 1 до 3, в сумме 5–15.',
      year: 'Год записи трека. Треки в работе считаются последним годом.',
      status: 'Готовые треки записаны; треки в работе ещё в процессе.',
    },
  },

  record: {
    canvasLabel:
      'Пластинка-карта треков: секторы — стили, расстояние от центра — год. Вид «Список» показывает те же треки плитками.',
    tooltip: (style: string, band: boolean, year: string, total: number) =>
      `${style} · ${band ? 'группа' : 'соло'} · ${year} · сложность ${total}/15`,
    // Written on the record: stays as it is.
    labelSide: en.record.labelSide,
    labelTracks: en.record.labelTracks,
    labelShort: en.record.labelShort,
    labelName: en.record.labelName,
  },

  list: {
    year: en.list.year,
    inProgress: 'в работе',
    band: 'записано с группой',
    empty: 'Под эти фильтры не подходит ни один трек. Нажмите «Сбросить фильтры» на панели.',
  },

  card: {
    prev: 'Предыдущий трек',
    next: 'Следующий трек',
    close: 'Закрыть',
    listen: 'Что слушать',
    listenInfo:
      'На что стоит обратить внимание при прослушивании — партии, на которых построен трек. Они же окрашивают лучи снежинки.',
    lead: 'главный',
    recordedWith: 'Записано с группой',
    recordedWithBand: 'Записано с группой',
    bandUnnamed: 'Название группы пока не указано',
    bandUnnamedHint: 'Название группы ещё не заполнено.',
    bandNoAbout: 'Описания пока нет.',
    story: 'История',
    storyEmpty: 'История этого трека ещё не написана.',
    timeline: 'От идеи до записи',
    timelineInfo: {
      idea: 'появляется основная мелодия или идея песни.',
      concept: 'у песни есть структура для основных инструментов.',
      ready: 'трек записан, его можно послушать.',
    },
    idea: 'Идея',
    concept: 'Концепция',
    ready: 'Готово',
    sameYear: 'в тот же год',
    notYet: 'ещё нет',
    total: (n: number) => `Общая сложность <b>${n}</b> / 15`,
    totalInfo: {
      rhythm: 'насколько сложен ритм: размер, синкопы, смены грува.',
      melody: 'как далеко уходят мелодии: диапазон, скачки, сколько линий звучит сразу.',
      technique: 'насколько трудно сыграть партии.',
      instruments: 'сколько инструментов и слоёв в аранжировке.',
      structure: 'как построена песня: от куплета и припева до множества частей и поворотов.',
    } satisfies Record<Axis, string>,
    totalInfoNote: 'Каждая ось — от 1 до 3; вместе они дают общую сложность, 5–15.',
    radarLabel: (pairs: [string, number][]) =>
      `Радар сложности: ${pairs.map(([n, v]) => `${n} ${v} из 3`).join(', ')}`,
    notFound: 'Трек не найден',
  },

  player: {
    label: 'Плеер',
    play: 'Слушать',
    pause: 'Пауза',
    playGlyph: en.player.playGlyph,
    pauseGlyph: en.player.pauseGlyph,
    noAudio: 'Запись скоро появится',
    ready: 'Нажмите ▶, чтобы послушать',
    pinAt: (time: string, text: string) => `Заметка на ${time}: ${text}`,
    seek: 'Перемотка',
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
  },

  hints: {
    label: 'Как пользоваться страницей',
    steps: [
      'Выберите снежинку, чтобы послушать песню и прочитать о ней.',
      'Или нажмите ▶ здесь — заиграет случайный трек. ⏭ выберет другой.',
      'Отберите треки по стилю, инструментам, сложности и году или смените вид.',
    ],
    step: en.hints.step,
    next: 'Далее',
    done: 'Понятно',
    skip: 'Пропустить',
  },

  // Development only: stays English, like the content files it reports on.
  overlay: en.overlay,
};
