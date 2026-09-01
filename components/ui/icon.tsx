import { FontAwesomeIcon, type FontAwesomeIconProps } from "@fortawesome/react-fontawesome";
import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import {
  faLeaf, faStore, faIndustry, faBell, faHeart, faTrash, faPlus,
  faLocationDot, faPhone, faEnvelope, faGlobe, faArrowRight, faArrowLeft,
  faMagnifyingGlass, faSpinner, faCheck, faXmark, faTag, faScaleBalanced,
  faSeedling, faTractor, faWheatAwn, faListCheck, faGear, faUser,
  faUsers, faChartLine, faBoxOpen, faPaperPlane, faFlag, faFileArrowDown,
  faShieldHalved, faRightFromBracket, faCircleInfo, faCircleExclamation,
  faCalendar, faMapLocationDot, faSort, faFilter, faPen, faEye,
  faEyeSlash, faLock, faLockOpen, faTriangleExclamation, faCircleCheck,
  faInbox, faComments, faReply, faArrowTrendUp, faArrowTrendDown, faMoneyBillWave,
  faPaperclip, faImage, faBars, faXmark as faClose,
  faFish,
} from "@fortawesome/free-solid-svg-icons";

// Curated allowlist — keeps the bundle predictable and gives us Greek labels.
export const icons = {
  leaf: faLeaf,
  store: faStore,
  industry: faIndustry,
  bell: faBell,
  heart: faHeart,
  trash: faTrash,
  plus: faPlus,
  location: faLocationDot,
  phone: faPhone,
  envelope: faEnvelope,
  globe: faGlobe,
  arrowRight: faArrowRight,
  arrowLeft: faArrowLeft,
  search: faMagnifyingGlass,
  spinner: faSpinner,
  check: faCheck,
  xmark: faXmark,
  tag: faTag,
  scale: faScaleBalanced,
  seedling: faSeedling,
  tractor: faTractor,
  wheat: faWheatAwn,
  listCheck: faListCheck,
  gear: faGear,
  user: faUser,
  users: faUsers,
  chart: faChartLine,
  box: faBoxOpen,
  send: faPaperPlane,
  flag: faFlag,
  download: faFileArrowDown,
  shield: faShieldHalved,
  logout: faRightFromBracket,
  info: faCircleInfo,
  warn: faCircleExclamation,
  calendar: faCalendar,
  mapLocation: faMapLocationDot,
  sort: faSort,
  filter: faFilter,
  edit: faPen,
  eye: faEye,
  eyeOff: faEyeSlash,
  lock: faLock,
  unlock: faLockOpen,
  triangleAlert: faTriangleExclamation,
  ok: faCircleCheck,
  inbox: faInbox,
  chat: faComments,
  reply: faReply,
  trendUp: faArrowTrendUp,
  trendDown: faArrowTrendDown,
  money: faMoneyBillWave,
  paperclip: faPaperclip,
  image: faImage,
  menu: faBars,
  close: faClose,
  fish: faFish,
} as const;

export type IconName = keyof typeof icons;

interface Props extends Omit<FontAwesomeIconProps, "icon"> {
  name: IconName;
}

export function Icon({ name, className, ...rest }: Props) {
  return <FontAwesomeIcon icon={icons[name] as IconProp} className={className} {...rest} />;
}
