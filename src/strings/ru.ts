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
      'Это мой музыкальный дневник,',
      'в основном — мои сольные записи.',
      '',
      'Мне всегда хотелось понять, что стоит за звуками и партиями песни, которая мне нравится — или, наоборот, которую я не понимаю.',
      'Было бы круто, чтобы музыканты подсказывали, что слушать и почему.',
      '',
      'Здесь я предлагаю способ разговора музыканта со слушателем:',
      'заметки и история каждой песни прямо рядом с ней.',
      '',
      'Каждая песня — снежинка.',
      'Её цвет зависит от основных инструментов.',
      'Её форма вычислена из параметров песни:',
      '_ритм,',
      '_мелодия,',
      '_техника,',
      '_инструменты,',
      '_структура.',
      '',
      'Нажмите на снежинку, чтобы открыть трек.',
      'Приятного прослушивания.',
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
    complexity: 'Общая сложность',
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
      listen:
        'Инструменты, на которых построен трек. Выберите один, чтобы увидеть треки с ним, или «Выбрать все».',
      complexity:
        'Ритм, мелодия, техника, инструменты и структура, каждый от 1 до 3, в сумме 5–15.',
      year: 'Год записи трека. Треки в работе считаются последним годом.',
      status: 'Готовые треки записаны; треки в работе ещё в процессе.',
    },
  },

  record: {
    canvasLabel:
      'Пластинка-карта треков: расстояние от центра — год. Вид «Список» показывает те же треки плитками.',
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
    close: 'Закрыть',
    listen: 'Основной инструмент',
    listenInfo:
      'На что стоит обратить внимание при прослушивании — партии, на которых построен трек. Они же окрашивают лучи снежинки.',
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
    notYet: 'ещё нет',
    total: 'Общая сложность',
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
