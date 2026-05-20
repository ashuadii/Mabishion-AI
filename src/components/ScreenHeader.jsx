import React from 'react';
import { C, glassStyle } from './consts';
import MickiiOrb from './MickiiOrb';
import Badge from './Badge';
import Button from './Button';
import Icon from './Icon';
import nexiousLogo from '../assets/Nexious-logo.png';

export default function ScreenHeader({ title, subtitle, index, badgeLabel, primaryAction, primaryIcon, secondaryAction, secondaryIcon, extraBadges, onPrimaryClick, onSecondaryClick }) {
  return (
    <>
      <header className="mb-5 flex items-center justify-between gap-4 px-5 py-3" style={glassStyle()}>
        <div className="flex min-w-0 items-center gap-3">
          <MickiiOrb />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <img src={nexiousLogo} alt="Nexious AI" className="h-4 w-auto object-contain opacity-80" />
              <span className="text-white/20">·</span>
              <p className="truncate text-sm font-black">{title}</p>
            </div>
            <p className="truncate text-[10px]" style={{ color: C.mutedLow }}>Mickii Local Agent · Deterministic Engine</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {extraBadges}
          <Button variant="soft" className="px-3"><Icon name="search" size={17} /></Button>
          <Button variant="soft" className="px-3"><Icon name="bell" size={17} /></Button>
        </div>
      </header>
      <section className="mb-5 flex min-w-0 items-start justify-between gap-5">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone="gold">{index} Main Screen</Badge>
            {badgeLabel && <Badge tone="muted">{badgeLabel}</Badge>}
          </div>
          <h1 className="text-4xl font-black tracking-tight" style={{ color: C.text }}>{title}</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6" style={{ color: C.mutedLow }}>{subtitle}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
          {secondaryAction && <Button variant="soft" icon={secondaryIcon || 'filter'} onClick={onSecondaryClick}>{secondaryAction}</Button>}
          {primaryAction && <Button icon={primaryIcon || 'plus'} onClick={onPrimaryClick}>{primaryAction}</Button>}
        </div>
      </section>
    </>
  );
}
