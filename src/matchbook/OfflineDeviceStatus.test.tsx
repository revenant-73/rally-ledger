import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OfflineDeviceStatus } from './OfflineDeviceStatus';
import { APP_UPDATE_READY_EVENT } from '../appUpdateEvents';
import { prepareOfflineWorkspace } from './offlineWorkspace';
import { createFreshPrototypeDocument, getTeamPrototypeStorageKey } from './prototypeCloudState';

describe('offline preparation and safe app updates', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('navigator', { serviceWorker: { getRegistration: vi.fn().mockResolvedValue({ active: {} }), addEventListener: vi.fn(), removeEventListener: vi.fn() }, storage: { persist: vi.fn().mockResolvedValue(false) } });
  });
  afterEach(() => vi.unstubAllGlobals());
  it('requires both a cached application and this account’s downloaded team', async () => {
    const view = render(<OfflineDeviceStatus userId="coach" teamId="team" localSaved={false} safeToUpdate={false} />);
    expect(await screen.findByText('Offline setup needs an online visit')).toBeInTheDocument();
    prepareOfflineWorkspace('coach', [{ id: 'team', name: 'Varsity', season: '2026', level: 'Varsity', createdAt: '', updatedAt: '' }]);
    localStorage.setItem(getTeamPrototypeStorageKey('team'), JSON.stringify(createFreshPrototypeDocument()));
    view.rerender(<OfflineDeviceStatus userId="coach" teamId="team" localSaved safeToUpdate={false} />);
    expect(await screen.findByText('Ready to reopen offline on this device')).toBeInTheDocument();
  });
  it('leaves an update waiting through live or unsynced scoring', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const view = render(<OfflineDeviceStatus userId="coach" teamId="team" localSaved safeToUpdate={false} />);
    act(() => window.dispatchEvent(new CustomEvent(APP_UPDATE_READY_EVENT, { detail: { updateServiceWorker: update } })));
    const button = screen.getByRole('button', { name: 'Update app' });
    expect(button).toBeDisabled(); button.click(); expect(update).not.toHaveBeenCalled();
    view.rerender(<OfflineDeviceStatus userId="coach" teamId="team" localSaved safeToUpdate />);
    expect(button).toBeEnabled(); button.click(); expect(update).toHaveBeenCalledWith(true);
  });
});
