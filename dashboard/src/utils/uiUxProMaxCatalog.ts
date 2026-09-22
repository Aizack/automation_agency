import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const UI_UX_PRO_MAX = {
  motion: {
    container: {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: {
          staggerChildren: 0.06,
          delayChildren: 0.1
        }
      }
    },
    item: {
      hidden: { opacity: 0, y: 18, scale: 0.96 },
      show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          type: 'spring' as const,
          stiffness: 320,
          damping: 24
        }
      }
    },
    fadeInUp: {
      hidden: { opacity: 0, y: 12 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }
    },
    scaleHover: {
      hover: { scale: 1.03, transition: { type: 'spring' as const, stiffness: 400, damping: 17 } },
      tap: { scale: 0.96 }
    },
    drawerSlide: {
      hidden: { x: '100%' },
      visible: { x: 0, transition: { type: 'spring' as const, stiffness: 350, damping: 30 } },
      exit: { x: '100%', transition: { duration: 0.25, ease: 'easeInOut' } }
    }
  },

  glass: {
    header: 'bg-white/95 backdrop-blur-md border-b border-[#E2DFD7] shadow-xs',
    card: 'bg-white border border-[#E2DFD7] hover:border-[#161616] shadow-xs hover:shadow-md transition-all duration-300',
    drawer: 'bg-white backdrop-blur-xl border-l border-[#E2DFD7] shadow-2xl',
    modal: 'bg-white border border-[#E2DFD7] rounded-2xl shadow-2xl'
  }
};
