import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import MainMenu from '../../../components/Menu/mainMenu';

let mockNative = false;

jest.mock('../../../nativeApp', () => ({
  get IS_NATIVE_APP() { return mockNative; }
}));
jest.mock('../../../components/Menu/TrainingContent', () => (props) => (
  <div data-testid="training-content">
    <button onClick={props.onClose}>training-close</button>
  </div>
));
jest.mock('../../../components/Menu/SettingsContent', () => (props) => (
  <div data-testid="settings-content" data-mode={props.currentMode} data-volume={props.volume}>
    <button onClick={props.onClose}>settings-close</button>
  </div>
));
jest.mock('../../../components/Support', () => ({
  SupportPage: () => <div data-testid="support-page" />,
  SupportButton: () => null
}));

const makeProps = (over = {}) => ({
  trainingSettings: {},
  setTrainingSettings: jest.fn(),
  setMode: jest.fn(),
  setIsPaused: jest.fn(),
  volume: 0.4,
  setVolume: jest.fn(),
  defaultTempo: 100,
  setDefaultTempo: jest.fn(),
  defaultSubdivisions: 4,
  setDefaultSubdivisions: jest.fn(),
  currentMode: 'grid',
  currentTempo: 100,
  setSoundSetReloadTrigger: jest.fn(),
  onOpenAccessibility: jest.fn(),
  onOpenGuide: jest.fn(),
  ...over
});

const menuButton = () => screen.getByRole('button', { name: 'Menu' });
const openMenu = () => fireEvent.click(menuButton());

describe('MainMenu', () => {
  beforeEach(() => {
    mockNative = false;
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { cb(0); return 1; });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('is closed initially with the menu button advertising a dialog', () => {
    render(<MainMenu {...makeProps()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton()).toHaveAttribute('aria-haspopup', 'dialog');
  });

  test('the menu button toggles the dialog and moves focus to the close button', () => {
    render(<MainMenu {...makeProps()} />);
    openMenu();
    expect(screen.getByRole('dialog', { name: 'Practice controls' })).toBeInTheDocument();
    expect(menuButton()).toHaveAttribute('aria-expanded', 'true');
    expect(menuButton()).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Close Menu' })).toHaveFocus();
    openMenu();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('the close button closes and returns focus to the menu button', () => {
    render(<MainMenu {...makeProps()} />);
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Close Menu' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(menuButton()).toHaveFocus();
  });

  test('Escape closes the menu', () => {
    render(<MainMenu {...makeProps()} />);
    openMenu();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('shows the training tab first and passes the props through', () => {
    render(<MainMenu {...makeProps()} />);
    openMenu();
    expect(screen.getByTestId('training-content')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Training' })).toHaveAttribute('aria-selected', 'true');
  });

  test('tabs switch the content and expose aria-selected', () => {
    render(<MainMenu {...makeProps()} />);
    openMenu();
    fireEvent.click(screen.getByRole('tab', { name: 'Settings' }));
    const settings = screen.getByTestId('settings-content');
    expect(settings).toHaveAttribute('data-mode', 'grid');
    expect(settings).toHaveAttribute('data-volume', '0.4');
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByTestId('training-content')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Support' }));
    expect(screen.getByTestId('support-page')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Training' }));
    expect(screen.getByTestId('training-content')).toBeInTheDocument();
  });

  test('content close callbacks close the menu', () => {
    render(<MainMenu {...makeProps()} />);
    openMenu();
    fireEvent.click(screen.getByText('training-close'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    openMenu();
    fireEvent.click(screen.getByRole('tab', { name: 'Settings' }));
    fireEvent.click(screen.getByText('settings-close'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test.each([
    ['r', 'training-content'],
    ['R', 'training-content'],
    ['s', 'settings-content'],
    ['S', 'settings-content'],
    ['d', 'support-page'],
    ['D', 'support-page']
  ])('shortcut "%s" opens the menu on the right tab', (key, testId) => {
    render(<MainMenu {...makeProps()} />);
    fireEvent.keyDown(document, { key });
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });

  test('shortcut switches tab while the menu is already open', () => {
    render(<MainMenu {...makeProps()} />);
    fireEvent.keyDown(document, { key: 's' });
    fireEvent.keyDown(document, { key: 'r' });
    expect(screen.getByTestId('training-content')).toBeInTheDocument();
  });

  test('other keys do nothing', () => {
    render(<MainMenu {...makeProps()} />);
    fireEvent.keyDown(document, { key: 'x' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('Accessibility and Guide links close the menu and call the opener with the menu button ref', () => {
    const props = makeProps();
    render(<MainMenu {...props} />);
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Accessibility' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(props.onOpenAccessibility).toHaveBeenCalledTimes(1);
    expect(props.onOpenAccessibility.mock.calls[0][0].current).toBe(menuButton());

    openMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Guide' }));
    expect(props.onOpenGuide).toHaveBeenCalledTimes(1);
    expect(props.onOpenGuide.mock.calls[0][0].current).toBe(menuButton());
  });

  test('links without an opener only close the menu', () => {
    render(<MainMenu {...makeProps({ onOpenAccessibility: undefined, onOpenGuide: undefined })} />);
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Guide' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('removes the document key listener on unmount', () => {
    const { unmount } = render(<MainMenu {...makeProps()} />);
    unmount();
    expect(() => fireEvent.keyDown(document, { key: 's' })).not.toThrow();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  describe('native app build', () => {
    beforeEach(() => { mockNative = true; });

    test('has no Support tab', () => {
      render(<MainMenu {...makeProps()} />);
      openMenu();
      const tabs = within(screen.getByRole('tablist')).getAllByRole('tab');
      expect(tabs.map((t) => t.textContent)).toEqual(['Training', 'Settings']);
    });

    test('the D shortcut is disabled', () => {
      render(<MainMenu {...makeProps()} />);
      fireEvent.keyDown(document, { key: 'd' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
