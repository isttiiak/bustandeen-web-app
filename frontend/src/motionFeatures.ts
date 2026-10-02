// The animation features LazyMotion loads after the app starts (main.tsx).
// domAnimation covers animate/exit, variants, whileTap/whileHover and
// AnimatePresence; it has no `layout` animations (those need domMax, about
// 10 KB more), so none of our components use `layout`.
import { domAnimation } from 'framer-motion';

export default domAnimation;
