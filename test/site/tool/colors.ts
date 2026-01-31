/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import uniq from 'lodash/uniq'

const COLORS = {
  used: ['bg-violet-500'],
  tailwind: {
    // Slate
    slate50: 'rgb(248, 250, 252)',
    slate100: 'rgb(241, 245, 249)',
    slate200: 'rgb(226, 232, 240)',
    slate300: 'rgb(203, 213, 225)',
    slate400: 'rgb(148, 163, 184)',
    slate500: 'rgb(100, 116, 139)',
    slate600: 'rgb(71, 85, 105)',
    slate700: 'rgb(51, 65, 85)',
    slate800: 'rgb(30, 41, 59)',
    slate900: 'rgb(15, 23, 42)',
    slate950: 'rgb(2, 6, 23)',

    // Gray
    gray50: 'rgb(249, 250, 251)',
    gray100: 'rgb(243, 244, 246)',
    gray200: 'rgb(229, 231, 235)',
    gray300: 'rgb(209, 213, 219)',
    gray400: 'rgb(156, 163, 175)',
    gray500: 'rgb(107, 114, 128)',
    gray600: 'rgb(75, 85, 99)',
    gray700: 'rgb(55, 65, 81)',
    gray800: 'rgb(31, 41, 55)',
    gray900: 'rgb(17, 24, 39)',
    gray950: 'rgb(3, 7, 18)',

    // Zinc
    zinc50: 'rgb(250, 250, 250)',
    zinc100: 'rgb(244, 244, 245)',
    zinc200: 'rgb(228, 228, 231)',
    zinc300: 'rgb(212, 212, 216)',
    zinc400: 'rgb(161, 161, 170)',
    zinc400Half: 'rgba(161, 161, 170, 0.5)',
    zinc500: 'rgb(113, 113, 122)',
    zinc500Half: 'rgba(113, 113, 122, 0.5)',
    zinc600: 'rgb(82, 82, 91)',
    zinc700: 'rgb(63, 63, 70)',
    zinc800: 'rgb(39, 39, 42)',
    zinc900: 'rgb(24, 24, 27)',
    zinc950: 'rgb(9, 9, 11)',

    // Neutral
    neutral50: 'rgb(250, 250, 250)',
    neutral100: 'rgb(245, 245, 245)',
    neutral200: 'rgb(229, 229, 229)',
    neutral300: 'rgb(212, 212, 212)',
    neutral400: 'rgb(163, 163, 163)',
    neutral500: 'rgb(115, 115, 115)',
    neutral600: 'rgb(82, 82, 82)',
    neutral700: 'rgb(64, 64, 64)',
    neutral800: 'rgb(38, 38, 38)',
    neutral900: 'rgb(23, 23, 23)',
    neutral950: 'rgb(10, 10, 10)',

    // Stone
    stone50: 'rgb(250, 250, 249)',
    stone100: 'rgb(245, 245, 244)',
    stone200: 'rgb(231, 229, 228)',
    stone300: 'rgb(214, 211, 209)',
    stone400: 'rgb(168, 162, 158)',
    stone500: 'rgb(120, 113, 108)',
    stone600: 'rgb(87, 83, 78)',
    stone700: 'rgb(68, 64, 60)',
    stone800: 'rgb(41, 37, 36)',
    stone900: 'rgb(28, 25, 23)',
    stone950: 'rgb(12, 10, 9)',

    // Red
    red50: 'rgb(254, 242, 242)',
    red100: 'rgb(254, 226, 226)',
    red200: 'rgb(254, 202, 202)',
    red300: 'rgb(252, 165, 165)',
    red400: 'rgb(248, 113, 113)',
    red500: 'rgb(239, 68, 68)',
    red600: 'rgb(220, 38, 38)',
    red700: 'rgb(185, 28, 28)',
    red800: 'rgb(153, 27, 27)',
    red900: 'rgb(127, 29, 29)',
    red950: 'rgb(69, 10, 10)',

    // Orange
    orange50: 'rgb(255, 247, 237)',
    orange100: 'rgb(255, 237, 213)',
    orange200: 'rgb(254, 215, 170)',
    orange300: 'rgb(253, 186, 116)',
    orange400: 'rgb(251, 146, 60)',
    orange500: 'rgb(249, 115, 22)',
    orange600: 'rgb(234, 88, 12)',
    orange700: 'rgb(194, 65, 12)',
    orange800: 'rgb(154, 52, 18)',
    orange900: 'rgb(124, 45, 18)',
    orange950: 'rgb(67, 20, 7)',

    // Amber
    amber50: 'rgb(255, 251, 235)',
    amber100: 'rgb(254, 243, 199)',
    amber200: 'rgb(253, 230, 138)',
    amber300: 'rgb(252, 211, 77)',
    amber400: 'rgb(251, 191, 36)',
    amber500: 'rgb(245, 158, 11)',
    amber600: 'rgb(217, 119, 6)',
    amber700: 'rgb(180, 83, 9)',
    amber800: 'rgb(146, 64, 14)',
    amber900: 'rgb(120, 53, 15)',
    amber950: 'rgb(69, 26, 3)',

    // Yellow
    yellow50: 'rgb(254, 252, 232)',
    yellow100: 'rgb(254, 249, 195)',
    yellow200: 'rgb(254, 240, 138)',
    yellow300: 'rgb(253, 224, 71)',
    yellow400: 'rgb(250, 204, 21)',
    yellow500: 'rgb(234, 179, 8)',
    yellow600: 'rgb(202, 138, 4)',
    yellow700: 'rgb(161, 98, 7)',
    yellow800: 'rgb(133, 77, 14)',
    yellow900: 'rgb(113, 63, 18)',
    yellow950: 'rgb(66, 32, 6)',

    // Lime
    lime50: 'rgb(247, 254, 231)',
    lime100: 'rgb(236, 252, 203)',
    lime200: 'rgb(217, 249, 157)',
    lime300: 'rgb(190, 242, 100)',
    lime400: 'rgb(163, 230, 53)',
    lime500: 'rgb(132, 204, 22)',
    lime600: 'rgb(101, 163, 13)',
    lime700: 'rgb(77, 124, 15)',
    lime800: 'rgb(63, 98, 18)',
    lime900: 'rgb(54, 83, 20)',
    lime950: 'rgb(26, 46, 5)',

    // Green
    green50: 'rgb(240, 253, 244)',
    green100: 'rgb(220, 252, 231)',
    green200: 'rgb(187, 247, 208)',
    green300: 'rgb(134, 239, 172)',
    green400: 'rgb(74, 222, 128)',
    green500: 'rgb(34, 197, 94)',
    green600: 'rgb(22, 163, 74)',
    green700: 'rgb(21, 128, 61)',
    green800: 'rgb(22, 101, 52)',
    green900: 'rgb(20, 83, 45)',
    green950: 'rgb(5, 46, 22)',

    // Emerald
    emerald50: 'rgb(236, 253, 245)',
    emerald100: 'rgb(209, 250, 229)',
    emerald200: 'rgb(167, 243, 208)',
    emerald300: 'rgb(110, 231, 183)',
    emerald400: 'rgb(52, 211, 153)',
    emerald500: 'rgb(16, 185, 129)',
    emerald600: 'rgb(5, 150, 105)',
    emerald700: 'rgb(4, 120, 87)',
    emerald800: 'rgb(6, 95, 70)',
    emerald900: 'rgb(6, 78, 59)',
    emerald950: 'rgb(2, 44, 34)',

    // Teal
    teal50: 'rgb(240, 253, 250)',
    teal100: 'rgb(204, 251, 241)',
    teal200: 'rgb(153, 246, 228)',
    teal300: 'rgb(94, 234, 212)',
    teal400: 'rgb(45, 212, 191)',
    teal500: 'rgb(20, 184, 166)',
    teal600: 'rgb(13, 148, 136)',
    teal700: 'rgb(15, 118, 110)',
    teal800: 'rgb(17, 94, 89)',
    teal900: 'rgb(19, 78, 74)',
    teal950: 'rgb(4, 47, 46)',

    // Cyan
    cyan50: 'rgb(236, 254, 255)',
    cyan100: 'rgb(207, 250, 254)',
    cyan200: 'rgb(165, 243, 252)',
    cyan300: 'rgb(103, 232, 249)',
    cyan400: 'rgb(34, 211, 238)',
    cyan500: 'rgb(6, 182, 212)',
    cyan600: 'rgb(8, 145, 178)',
    cyan700: 'rgb(14, 116, 144)',
    cyan800: 'rgb(21, 94, 117)',
    cyan900: 'rgb(22, 78, 99)',
    cyan950: 'rgb(8, 51, 68)',

    // Sky
    sky50: 'rgb(240, 249, 255)',
    sky100: 'rgb(224, 242, 254)',
    sky200: 'rgb(186, 230, 253)',
    sky300: 'rgb(125, 211, 252)',
    sky400: 'rgb(56, 189, 248)',
    sky500: 'rgb(14, 165, 233)',
    sky600: 'rgb(2, 132, 199)',
    sky700: 'rgb(3, 105, 161)',
    sky800: 'rgb(7, 89, 133)',
    sky900: 'rgb(12, 74, 110)',
    sky950: 'rgb(8, 47, 73)',

    // Blue
    blue50: 'rgb(239, 246, 255)',
    blue100: 'rgb(219, 234, 254)',
    blue200: 'rgb(191, 219, 254)',
    blue300: 'rgb(147, 197, 253)',
    blue400: 'rgb(96, 165, 250)',
    blue500: 'rgb(59, 130, 246)',
    blue600: 'rgb(37, 99, 235)',
    blue700: 'rgb(29, 78, 216)',
    blue800: 'rgb(30, 64, 175)',
    blue900: 'rgb(30, 58, 138)',
    blue950: 'rgb(23, 37, 84)',

    // Indigo
    indigo50: 'rgb(238, 242, 255)',
    indigo100: 'rgb(224, 231, 255)',
    indigo200: 'rgb(199, 210, 254)',
    indigo300: 'rgb(165, 180, 252)',
    indigo400: 'rgb(129, 140, 248)',
    indigo500: 'rgb(99, 102, 241)',
    indigo600: 'rgb(79, 70, 229)',
    indigo700: 'rgb(67, 56, 202)',
    indigo800: 'rgb(55, 48, 163)',
    indigo900: 'rgb(49, 46, 129)',
    indigo950: 'rgb(30, 27, 75)',

    // Violet
    violet50: 'rgb(245, 243, 255)',
    violet100: 'rgb(237, 233, 254)',
    violet200: 'rgb(221, 214, 254)',
    violet300: 'rgb(196, 181, 253)',
    violet400: 'rgb(167, 139, 250)',
    violet500: 'rgb(139, 92, 246)',
    violet600: 'rgb(124, 58, 237)',
    violet700: 'rgb(109, 40, 217)',
    violet800: 'rgb(91, 33, 182)',
    violet900: 'rgb(76, 29, 149)',
    violet950: 'rgb(46, 16, 101)',

    // Purple
    purple50: 'rgb(250, 245, 255)',
    purple100: 'rgb(243, 232, 255)',
    purple200: 'rgb(233, 213, 255)',
    purple300: 'rgb(216, 180, 254)',
    purple400: 'rgb(192, 132, 252)',
    purple500: 'rgb(168, 85, 247)',
    purple600: 'rgb(147, 51, 234)',
    purple700: 'rgb(126, 34, 206)',
    purple800: 'rgb(107, 33, 168)',
    purple900: 'rgb(88, 28, 135)',
    purple950: 'rgb(59, 7, 100)',

    // Fuchsia
    fuchsia50: 'rgb(253, 244, 255)',
    fuchsia100: 'rgb(250, 232, 255)',
    fuchsia200: 'rgb(245, 208, 254)',
    fuchsia300: 'rgb(240, 171, 252)',
    fuchsia400: 'rgb(232, 121, 249)',
    fuchsia500: 'rgb(217, 70, 239)',
    fuchsia600: 'rgb(192, 38, 211)',
    fuchsia700: 'rgb(162, 28, 175)',
    fuchsia800: 'rgb(134, 25, 143)',
    fuchsia900: 'rgb(112, 26, 117)',
    fuchsia950: 'rgb(74, 4, 78)',

    // Pink
    pink50: 'rgb(253, 242, 248)',
    pink100: 'rgb(252, 231, 243)',
    pink200: 'rgb(251, 207, 232)',
    pink300: 'rgb(249, 168, 212)',
    pink400: 'rgb(244, 114, 182)',
    pink500: 'rgb(236, 72, 153)',
    pink600: 'rgb(219, 39, 119)',
    pink700: 'rgb(190, 24, 93)',
    pink800: 'rgb(157, 23, 77)',
    pink900: 'rgb(131, 24, 67)',
    pink950: 'rgb(80, 7, 36)',

    // Rose
    rose50: 'rgb(255, 241, 242)',
    rose100: 'rgb(255, 228, 230)',
    rose200: 'rgb(254, 205, 211)',
    rose300: 'rgb(253, 164, 175)',
    rose400: 'rgb(251, 113, 133)',
    rose500: 'rgb(244, 63, 94)',
    rose600: 'rgb(225, 29, 72)',
    rose700: 'rgb(190, 18, 60)',
    rose800: 'rgb(159, 18, 57)',
    rose900: 'rgb(136, 19, 55)',
    rose950: 'rgb(76, 5, 25)',
  },
  constrast: {
    base: '',
    baseDark: '',
  },
  focus: {
    heavy:
      'focus-visible:ring focus-visible:ring-offset-2 focus-visible:ring-blue-300',
  },
  button: {
    purple:
      'bg-violet-500 text-zinc-100 dark:bg-violet-800 dark:text-violet-200 hover:opacity-70 enabled:dark:hover:opacity-10000 enabled:dark:hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50',
    green:
      'bg-emerald-500 text-zinc-100 dark:bg-emerald-800 dark:text-emerald-200 hover:opacity-70 enabled:dark:hover:opacity-10000 enabled:dark:hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50',
    red: 'bg-rose-500 text-zinc-100 dark:bg-rose-800 dark:text-rose-200 hover:opacity-70 enabled:dark:hover:opacity-10000 enabled:dark:hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50',
    blue: 'bg-blue-500 text-zinc-100 dark:bg-blue-800 dark:text-blue-200 hover:opacity-70 enabled:dark:hover:opacity-10000 enabled:dark:hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50',
    base: 'bg-zinc-800 text-zinc-100 dark:text-zinc-800 dark:bg-zinc-200 hover:opacity-70 enabled:dark:hover:opacity-10000 enabled:dark:hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50',
    neutral:
      'bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-200 hover:opacity-70 enabled:dark:hover:opacity-10000 enabled:dark:hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50',
  },
  input: {
    purple:
      'bg-violet-100 text-violet-700 [&>input]:placeholder:text-violet-400 dark:bg-violet-950 dark:text-violet-300',
    blue: 'bg-blue-100 text-blue-700 [&>input]:placeholder:text-blue-300 dark:bg-blue-950 dark:text-blue-300',
    neutral:
      'bg-zinc-100 text-zinc-950 [&>input]:placeholder:text-zinc-300 dark:bg-zinc-900 dark:text-zinc-300',
    base: 'bg-white [&>input]:placeholder:text-zinc-100 dark:bg-zinc-800 dark:text-zinc-300',
    green:
      'bg-emerald-100 text-emerald-700 [&>input]:placeholder:text-emerald-400 dark:bg-emerald-950 dark:text-emerald-300',
    red: 'bg-rose-100 text-rose-700 [&>input]:placeholder:text-rose-300 dark:bg-rose-950 dark:text-rose-300',
  },
  border: {
    purple:
      'border-4 border-solid dark:border-violet-900 border-violet-400 dark:border-violet-900 text-violet-400 hover:opacity-70 disabled:opacity-50 disabled:cursor-not-allowed',
    green:
      'border-4 border-solid dark:border-emerald-900 border-emerald-400 dark:border-emerald-900 text-emerald-400 hover:opacity-70 disabled:opacity-50 disabled:cursor-not-allowed',
    blue: 'border-4 border-solid dark:border-blue-900 border-blue-400 dark:border-blue-900 text-blue-400 hover:opacity-70 disabled:opacity-50 disabled:cursor-not-allowed',
    red: 'border-4 border-solid border-rose-700 text-rose-700 hover:opacity-70 disabled:opacity-50 disabled:cursor-not-allowed',
    base: 'border-4 border-solid border-zinc-800 text-zinc-800 hover:opacity-70 disabled:opacity-50 disabled:cursor-not-allowed',
    neutral:
      'border-4 border-solid border-zinc-400 text-zinc-400 hover:opacity-70 disabled:opacity-50 disabled:cursor-not-allowed',
  },
}

COLORS.constrast.base = COLORS.tailwind.zinc800
COLORS.constrast.baseDark = COLORS.tailwind.zinc300

export default COLORS

for (const key in COLORS.button) {
  const vals = COLORS.button[key].split(/\s+/)
  // .map(selector => selector.split(':'))
  COLORS.used.push(...vals.flat())
}

for (const key in COLORS.border) {
  const vals = COLORS.border[key].split(/\s+/)
  // .map(selector => selector.split(':'))
  COLORS.used.push(...vals.flat())
}

for (const key in COLORS.input) {
  const vals = COLORS.input[key].split(/\s+/)
  // .map(selector => selector.split(':'))
  COLORS.used.push(...vals.flat())
}

COLORS.used = uniq(COLORS.used)
