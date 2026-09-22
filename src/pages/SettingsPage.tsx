import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { SegmentedControl } from '../components/SegmentedControl';
import { useI18n } from '../i18n/I18nProvider';
import { LANGUAGES, type Language } from '../i18n/translations';
import { useSettings } from '../settings/SettingsProvider';
import { ACCENT_PRESETS, type ThemeMode } from '../settings/theme';

export function SettingsPage() {
  const { t, language, setLanguage } = useI18n();
  const { theme, setTheme, accent, setAccent } = useSettings();
  const isPreset = ACCENT_PRESETS.some((p) => p.value === accent.toLowerCase());

  return (
    <div className="page fade-in">
      <Link to="/" className="back-link">
        <Icon name="chevronLeft" size={16} /> {t('back')}
      </Link>
      <header className="page-header">
        <h1>{t('settings')}</h1>
      </header>

      <div className="settings-list">
        <section className="card settings-card">
          <h2>{t('language')}</h2>
          <SegmentedControl<Language>
            value={language}
            onChange={setLanguage}
            options={LANGUAGES.map((l) => ({ value: l.code, label: l.label }))}
          />
        </section>

        <section className="card settings-card">
          <h2>{t('appearance')}</h2>
          <SegmentedControl<ThemeMode>
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'system', label: t('themeSystem') },
              { value: 'light', label: t('themeLight') },
              { value: 'dark', label: t('themeDark') },
            ]}
          />
        </section>

        <section className="card settings-card">
          <h2>{t('accentColor')}</h2>
          <div className="picker">
            {ACCENT_PRESETS.map((preset) => (
              <button
                type="button"
                key={preset.value}
                className={`swatch large ${accent.toLowerCase() === preset.value ? 'selected' : ''}`}
                style={{ background: preset.value }}
                aria-label={t(preset.labelKey)}
                title={t(preset.labelKey)}
                aria-pressed={accent.toLowerCase() === preset.value}
                onClick={() => setAccent(preset.value)}
              />
            ))}
            <label className={`swatch large custom ${!isPreset ? 'selected' : ''}`} title={t('customColor')}>
              <input
                type="color"
                value={accent}
                aria-label={t('customColor')}
                onChange={(e) => setAccent(e.target.value)}
              />
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}
