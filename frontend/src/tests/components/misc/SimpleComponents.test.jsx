/* SVG shapes and aria-hidden separators have no accessible role, so these tests inspect the DOM directly. */
/* eslint-disable testing-library/no-node-access, testing-library/no-container */
import React from 'react';
import { render, screen } from '@testing-library/react';
import Header from '../../../components/Header/Header';
import Footer from '../../../components/Footer/Footer';
import InterfaceIcon from '../../../components/common/InterfaceIcon';
import { getPaymentLink } from '../../../utils/supportUtils';

let mockNative = false;
jest.mock('../../../nativeApp', () => ({
  get IS_NATIVE_APP() { return mockNative; }
}));
jest.mock('../../../utils/supportUtils', () => ({
  getPaymentLink: jest.fn()
}));

describe('Header', () => {
  test('renders a banner with the logo as a labelled image', () => {
    render(<Header />);
    expect(screen.getByRole('banner')).toHaveClass('header');
    expect(screen.getByRole('img', { name: 'LibreMetronome' })).toHaveClass('header-logo');
  });
});

describe('Footer', () => {
  beforeEach(() => {
    mockNative = false;
    getPaymentLink.mockResolvedValue('https://pay.example/test');
  });

  test('web build: copyright with the current year, licence, source link and donate button', async () => {
    render(<Footer />);
    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveTextContent(`© ${new Date().getFullYear()} LibreMetronome`);
    expect(footer).toHaveTextContent('GPL v3');
    const link = screen.getByRole('link', { name: 'Source' });
    expect(link).toHaveAttribute('href', 'https://github.com/hybridpicker/LibreMetronome');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(await screen.findByRole('button', { name: 'Support this project' })).toBeInTheDocument();
  });

  test('decorative separators are hidden from assistive technology', async () => {
    render(<Footer />);
    await screen.findByRole('button', { name: 'Support this project' });
    const separators = screen.getByRole('contentinfo').querySelectorAll('[aria-hidden="true"]');
    expect(separators).toHaveLength(3);
  });

  test('native build: empty footer without links or donation', () => {
    mockNative = true;
    render(<Footer />);
    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveClass('footer--native');
    expect(footer).toBeEmptyDOMElement();
  });
});

describe('InterfaceIcon', () => {
  const names = ['menu', 'accessibility', 'training', 'settings', 'support', 'silence', 'sound', 'speed',
    'timer', 'tip', 'general', 'info', 'usage', 'features', 'shortcuts', 'close', 'add', 'remove',
    'music', 'mobile', 'sync'];

  const svgOf = (ui) => {
    const { container } = render(ui);
    return container.firstChild;
  };

  test.each(names)('"%s" draws at least one shape', (name) => {
    const svg = svgOf(<InterfaceIcon name={name} />);
    expect(svg.querySelectorAll('path, circle, rect').length).toBeGreaterThan(0);
  });

  test('is decorative by default', () => {
    const svg = svgOf(<InterfaceIcon name="menu" />);
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('role');
    expect(svg).toHaveAttribute('width', '20');
    expect(svg).toHaveAttribute('height', '20');
    expect(svg).toHaveClass('interface-icon');
  });

  test('size and class name are applied', () => {
    const svg = svgOf(<InterfaceIcon name="menu" size={32} className="extra" />);
    expect(svg).toHaveAttribute('width', '32');
    expect(svg).toHaveAttribute('height', '32');
    expect(svg).toHaveClass('interface-icon', 'extra');
  });

  test('a title makes it an accessible image', () => {
    render(<InterfaceIcon name="info" title="Information" />);
    const img = screen.getByRole('img', { name: 'Information' });
    expect(img).not.toHaveAttribute('aria-hidden');
  });

  test('an unknown name renders an empty svg without throwing', () => {
    const svg = svgOf(<InterfaceIcon name="does-not-exist" />);
    expect(svg.querySelectorAll('path, circle, rect')).toHaveLength(0);
  });
});
