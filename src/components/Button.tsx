import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  /** Icon-only round button; requires aria-label. */
  iconOnly?: boolean;
}

export function Button({ variant = 'secondary', icon, iconOnly, className = '', children, type = 'button', ...rest }: Props) {
  const classes = ['btn', `btn-${variant}`, iconOnly ? 'btn-icon' : '', className].filter(Boolean).join(' ');
  return (
    <button type={type} className={classes} {...rest}>
      {icon && <Icon name={icon} size={iconOnly ? 18 : 16} />}
      {children}
    </button>
  );
}
