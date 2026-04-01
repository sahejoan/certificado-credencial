import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | number) {
  return new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function getAuthorityX(index: number, total: number, elementWidth: number = 0, stageWidth: number = 800) {
  if (total <= 0) return 0;
  const spacing = stageWidth / (total + 1);
  return spacing * (index + 1) - (elementWidth / 2);
}
