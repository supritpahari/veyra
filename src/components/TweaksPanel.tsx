import { useState } from 'react';
import type { TweaksState, ThemeType, FontType } from '../types';

interface TweaksPanelProps {
  tweaks: TweaksState;
  onChange: (key: keyof TweaksState, val: string) => void;
}

export function TweaksPanel({ tweaks, onChange }: TweaksPanelProps) {
  const [open, setOpen] = useState(false);

  const themeOptions: { value: ThemeType; label: string }[] = [
    { value: 'clinical', label: 'Clinical' },
    { value: 'paper', label: 'Paper' },
    { value: 'dark', label: 'Navy' },
  ];

  const fontOptions: { value: FontType; label: string }[] = [
    { value: 'plex', label: 'Plex' },
    { value: 'geist', label: 'Geist' },
    { value: 'serif', label: 'Editorial' },
  ];

  const accentOptions = ['#0F766E', '#0E7490', '#1D4ED8', '#334E68'];

  return (
    <>
      <button
        type="button"
        className="twk-toggle-btn"
        onClick={() => setOpen(prev => !prev)}
        title="Customize Design & Palette"
        aria-label="Toggle Design Customization Panel"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <span>Theme &amp; Font</span>
      </button>

      {open && (
        <div className="twk-panel" role="dialog" aria-label="Design Tweaks">
          <div className="twk-hd">
            <b>Design Tweaks</b>
            <button
              type="button"
              className="twk-x"
              onClick={() => setOpen(false)}
              aria-label="Close tweaks panel"
            >
              ✕
            </button>
          </div>
          <div className="twk-body">
            <div className="twk-sect">Palette</div>
            <div className="twk-row">
              <div className="twk-lbl">
                <span>Theme</span>
              </div>
              <div className="twk-seg" role="radiogroup">
                {themeOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={tweaks.theme === opt.value}
                    className={tweaks.theme === opt.value ? 'active' : ''}
                    onClick={() => onChange('theme', opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {tweaks.theme !== 'dark' && (
              <div className="twk-row">
                <div className="twk-lbl">
                  <span>Accent</span>
                </div>
                <div className="twk-chips" role="radiogroup">
                  {accentOptions.map(c => (
                    <button
                      key={c}
                      type="button"
                      className="twk-chip"
                      role="radio"
                      aria-checked={tweaks.accent === c}
                      style={{ background: c }}
                      onClick={() => onChange('accent', c)}
                    >
                      {tweaks.accent === c && (
                        <svg viewBox="0 0 12 12" width="10" height="10" fill="white">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="twk-sect">Typography</div>
            <div className="twk-row">
              <div className="twk-lbl">
                <span>Family</span>
              </div>
              <div className="twk-seg" role="radiogroup">
                {fontOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={tweaks.font === opt.value}
                    className={tweaks.font === opt.value ? 'active' : ''}
                    onClick={() => onChange('font', opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
