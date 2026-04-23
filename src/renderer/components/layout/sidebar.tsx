import {
  Home,
  Server,
  ListFilter,
  Settings,
  ChevronLeft,
  Sliders,
  Palette,
  Cpu,
  Info,
  Shield,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  settingsSection: string;
  onSettingsSectionChange: (section: string) => void;
}

const mainNavItems = [
  { id: 'home', icon: Home },
  { id: 'server', icon: Server },
  { id: 'rules', icon: ListFilter },
];

const settingsNavItems = [
  { id: 'general', icon: Sliders },
  { id: 'proxyMode', icon: Shield },
  { id: 'appearance', icon: Palette },
  { id: 'advanced', icon: Cpu },
  { id: 'about', icon: Info },
];

const isMac = window.electron?.platform === 'darwin';

export function Sidebar({
  currentView,
  onViewChange,
  settingsSection,
  onSettingsSectionChange,
}: SidebarProps) {
  const { t } = useTranslation();

  const isSettings = currentView === 'settings';

  const renderNavItem = (
    item: { id: string; icon: React.ElementType },
    onClick: () => void,
    isActive: boolean
  ) => {
    const Icon = item.icon;
    return (
      <button key={item.id} onClick={onClick} className={`nav-item${isActive ? ' active' : ''}`}>
        <span className="nav-item-indicator" />
        <Icon
          className="h-[16px] w-[16px] flex-shrink-0"
          strokeWidth={isActive ? 2.2 : 1.8}
          style={{ color: isActive ? 'var(--accent-blue)' : 'var(--ink-tertiary)' }}
        />
        <span>{isSettings ? t(`settings.nav.${item.id}`, item.id) : t(`sidebar.${item.id}`)}</span>
      </button>
    );
  };

  return (
    <div className="w-[240px] sidebar h-full flex flex-col relative z-20 select-none">
      {isMac ? (
        <div className="h-[52px] flex-shrink-0 app-region-drag" />
      ) : (
        <div className="h-4 flex-shrink-0" />
      )}

      {isSettings ? (
        <>
          <div className="px-2 pb-2 app-region-no-drag">
            <button
              onClick={() => onViewChange('home')}
              className="nav-item"
              style={{ color: 'var(--ink-secondary)' }}
            >
              <ChevronLeft
                className="h-4 w-4 flex-shrink-0"
                style={{ color: 'var(--ink-secondary)' }}
              />
              <span style={{ color: 'var(--ink-secondary)' }}>
                {t('settings.nav.back', '返回应用')}
              </span>
            </button>
          </div>

          <nav className="flex-1 app-region-no-drag space-y-[6px] overflow-hidden">
            {settingsNavItems.map((item) =>
              renderNavItem(
                item,
                () => onSettingsSectionChange(item.id),
                settingsSection === item.id
              )
            )}
          </nav>
        </>
      ) : (
        <>
          <nav className="flex-1 pb-2 app-region-no-drag space-y-[6px] overflow-hidden">
            {mainNavItems.map((item) =>
              renderNavItem(item, () => onViewChange(item.id), currentView === item.id)
            )}
          </nav>

          <div className="pb-4 app-region-no-drag space-y-[6px]">
            {renderNavItem(
              { id: 'settings', icon: Settings },
              () => onViewChange('settings'),
              false
            )}
          </div>
        </>
      )}
    </div>
  );
}
