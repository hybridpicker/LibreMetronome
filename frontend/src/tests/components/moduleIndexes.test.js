import * as InfoSection from '../../components/InfoSection';
import * as Support from '../../components/Support';
import PolyrhythmMetronome from '../../components/metronome/PolyrhythmMode';
import PolyrhythmMetronomeComponent from '../../components/metronome/PolyrhythmMode/PolyrhythmMetronome';
import HelpButton from '../../components/InfoSection/HelpButton';
import InfoModal from '../../components/InfoSection/InfoModal';
import SupportButton from '../../components/Support/SupportButton';
import SupportPage from '../../components/Support/SupportPage';

describe('component index modules', () => {
  test('InfoSection exposes the help button and the info modal', () => {
    expect(InfoSection.HelpButton).toBe(HelpButton);
    expect(InfoSection.InfoModal).toBe(InfoModal);
  });

  test('Support exposes the support button and page', () => {
    expect(Support.SupportButton).toBe(SupportButton);
    expect(Support.SupportPage).toBe(SupportPage);
  });

  test('PolyrhythmMode exposes the metronome as its default export', () => {
    expect(PolyrhythmMetronome).toBe(PolyrhythmMetronomeComponent);
  });
});
