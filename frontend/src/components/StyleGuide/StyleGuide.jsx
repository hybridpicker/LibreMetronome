import React from 'react';
import './StyleGuide.css';

const StyleGuide = () => {
  // Color section data
  const colorSections = [
    {
      title: 'Primary Colors',
      colors: [
        { name: 'Primary Teal', variable: '--primary-teal', hex: '#00A0A0', description: 'Main brand color - used for interactive elements, buttons, links' },
        { name: 'Primary Teal Dark', variable: '--primary-teal-dark', hex: '#008080', description: 'Darker variant for hover states' },
        { name: 'Primary Teal Light', variable: '--primary-teal-light', hex: '#B3E0E0', description: 'Lighter variant for backgrounds, borders' },
        { name: 'Primary Teal Ultra Light', variable: '--primary-teal-ultra-light', hex: '#E6F5F5', description: 'Very light teal for subtle backgrounds' },
      ]
    },
    {
      title: 'Secondary Colors',
      colors: [
        { name: 'Secondary Gold', variable: '--secondary-gold', hex: '#f8d38d', description: 'Secondary brand color - used for accents, highlights' },
        { name: 'Secondary Gold Dark', variable: '--secondary-gold-dark', hex: '#f5c26d', description: 'Darker gold for first beats, important elements' },
        { name: 'Secondary Gold Light', variable: '--secondary-gold-light', hex: '#fae3ad', description: 'Lighter gold for normal beats, subtle highlights' },
        { name: 'Secondary Gold Ultra Light', variable: '--secondary-gold-ultra-light', hex: '#FFF8E6', description: 'Very light gold for subtle backgrounds' },
      ]
    },
    {
      title: 'Neutral Colors',
      colors: [
        { name: 'Neutral Background', variable: '--neutral-bg', hex: '#f5f5f5', description: 'Main background color' },
        { name: 'Neutral Background Alt', variable: '--neutral-bg-alt', hex: '#f9f9f9', description: 'Alternative background for cards, modals' },
        { name: 'Neutral Border', variable: '--neutral-border', hex: '#e0e0e0', description: 'Border color' },
        { name: 'Neutral Border Light', variable: '--neutral-border-light', hex: '#eeeeee', description: 'Lighter border color' },
      ]
    },
    {
      title: 'Text Colors',
      colors: [
        { name: 'Text Primary', variable: '--text-primary', hex: '#333333', description: 'Main text color' },
        { name: 'Text Secondary', variable: '--text-secondary', hex: '#666666', description: 'Secondary text color' },
        { name: 'Text Tertiary', variable: '--text-tertiary', hex: '#999999', description: 'Tertiary text color for less important text' },
        { name: 'Text Light', variable: '--text-light', hex: '#ffffff', description: 'Light text color for dark backgrounds' },
      ]
    },
    {
      title: 'Beat State Colors',
      colors: [
        { name: 'Beat Muted', variable: '--beat-muted', hex: '#e8e8e8', description: 'Muted beat color' },
        { name: 'Beat Normal', variable: '--beat-normal', hex: 'var(--secondary-gold-light)', description: 'Normal beat color' },
        { name: 'Beat Accent', variable: '--beat-accent', hex: 'var(--secondary-gold)', description: 'Accented beat color' },
        { name: 'Beat First', variable: '--beat-first', hex: 'var(--primary-teal)', description: 'First beat color' },
        { name: 'Beat Inner', variable: '--beat-inner', hex: '#fce9c6', description: 'Inner beat color for polyrhythm' },
        { name: 'Beat Outer', variable: '--beat-outer', hex: '#f6cc7c', description: 'Outer beat color for polyrhythm' },
      ]
    },
    {
      title: 'Semantic Colors',
      colors: [
        { name: 'Success', variable: '--success', hex: '#3FB6A8', description: 'Success color - aligned with teal palette' },
        { name: 'Warning', variable: '--warning', hex: '#F9CE7A', description: 'Warning color - aligned with gold palette' },
        { name: 'Error', variable: '--error', hex: '#E67B73', description: 'Error color' },
        { name: 'Info', variable: '--info', hex: '#73B5E6', description: 'Info color' },
      ]
    },
  ];

  return (
    <div className="style-guide">
      <header className="style-guide-header">
        <h1>LibreMetronome Style Guide</h1>
        <p>A comprehensive guide to the visual styling of LibreMetronome</p>
      </header>

      <section className="style-guide-section">
        <h2>Color System</h2>
        <p>The following color palette ensures visual consistency throughout the application.</p>

        {colorSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="color-section">
            <h3>{section.title}</h3>
            <div className="color-grid">
              {section.colors.map((color, colorIndex) => (
                <div key={colorIndex} className="color-card">
                  <div 
                    className="color-preview" 
                    style={{ 
                      backgroundColor: color.hex.startsWith('var') 
                        ? `var(${color.hex.substring(4, color.hex.length - 1)})` 
                        : color.hex 
                    }}
                  ></div>
                  <div className="color-info">
                    <div className="color-name">{color.name}</div>
                    <div className="color-variable">{color.variable}</div>
                    <div className="color-hex">{color.hex}</div>
                    <div className="color-description">{color.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="style-guide-section">
        <h2>Typography</h2>
        <div className="typography-examples">
          <div className="typography-item">
            <h1>Heading 1</h1>
            <p className="typography-details">Font: Lato, Bold, 2rem</p>
          </div>
          <div className="typography-item">
            <h2>Heading 2</h2>
            <p className="typography-details">Font: Lato, Bold, 1.5rem</p>
          </div>
          <div className="typography-item">
            <h3>Heading 3</h3>
            <p className="typography-details">Font: Lato, Bold, 1.25rem</p>
          </div>
          <div className="typography-item">
            <p className="body-text">Body Text: This is the standard paragraph text used throughout the application.</p>
            <p className="typography-details">Font: Lato, Regular, 1rem</p>
          </div>
          <div className="typography-item">
            <p className="small-text">Small Text: Used for less important information, captions, etc.</p>
            <p className="typography-details">Font: Lato, Regular, 0.875rem</p>
          </div>
        </div>
      </section>

      <section className="style-guide-section">
        <h2>Buttons</h2>
        <div className="button-examples">
          <div className="button-row">
            <button className="btn-base btn-primary">Primary Button</button>
            <button className="btn-base btn-secondary">Secondary Button</button>
            <button className="btn-base btn-outline">Outline Button</button>
          </div>
        </div>
      </section>

      <section className="style-guide-section">
        <h2>Beat Visualization</h2>
        <div className="beat-examples">
          <div className="beat-row">
            <div className="beat beat-muted"></div>
            <div className="beat-label">Beat Muted</div>
          </div>
          <div className="beat-row">
            <div className="beat beat-normal"></div>
            <div className="beat-label">Beat Normal</div>
          </div>
          <div className="beat-row">
            <div className="beat beat-accent"></div>
            <div className="beat-label">Beat Accent</div>
          </div>
          <div className="beat-row">
            <div className="beat beat-first"></div>
            <div className="beat-label">Beat First</div>
          </div>
        </div>
      </section>

      <section className="style-guide-section">
        <h2>Utility Classes</h2>
        <div className="utility-examples">
          <h3>Text Colors</h3>
          <p><code>.text-primary</code>, <code>.text-secondary</code>, <code>.text-tertiary</code>, <code>.text-light</code></p>
          <p><code>.text-teal</code>, <code>.text-teal-dark</code>, <code>.text-gold</code></p>
          
          <h3>Background Colors</h3>
          <p><code>.bg-teal</code>, <code>.bg-teal-dark</code>, <code>.bg-teal-light</code>, <code>.bg-teal-ultra-light</code></p>
          <p><code>.bg-gold</code>, <code>.bg-gold-dark</code>, <code>.bg-gold-light</code>, <code>.bg-gold-ultra-light</code></p>
          
          <h3>Border Utilities</h3>
          <p><code>.border-neutral</code>, <code>.border-neutral-light</code>, <code>.border-teal</code>, <code>.border-gold</code></p>
          
          <h3>Shadow Utilities</h3>
          <p><code>.shadow-sm</code>, <code>.shadow-md</code>, <code>.shadow-lg</code></p>
        </div>
      </section>
    </div>
  );
};

export default StyleGuide;
