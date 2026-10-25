"""Tests for the maintenance management commands, run against a temporary MEDIA_ROOT."""

import tempfile
from io import StringIO
from pathlib import Path
from unittest import mock

from django.core.management import call_command
from django.test import TestCase, override_settings

from metronome_api.models import MetronomeSoundSet


class CommandTestCase(TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        self.media = self.root / "media"
        self.media.mkdir()
        override = override_settings(MEDIA_ROOT=str(self.media), BASE_DIR=str(self.root))
        override.enable()
        self.addCleanup(override.disable)

    def run_command(self, name):
        out = StringIO()
        call_command(name, stdout=out)
        return out.getvalue()


class CheckSoundsTests(CommandTestCase):
    def make_active(self, **names):
        return MetronomeSoundSet.objects.create(
            name="Active",
            is_active=True,
            first_beat_sound=names.get("first", "first.wav"),
            accent_sound=names.get("accent", "accent.wav"),
            normal_beat_sound=names.get("normal", "normal.wav"),
        )

    def test_reports_when_no_sound_sets_exist(self):
        self.assertIn("No sound sets found in database!", self.run_command("check_sounds"))

    def test_warns_when_no_set_is_active(self):
        MetronomeSoundSet.objects.create(
            name="Idle", first_beat_sound="f.wav", accent_sound="a.wav", normal_beat_sound="n.wav"
        )

        output = self.run_command("check_sounds")

        self.assertIn("Found 1 sound set(s) in database.", output)
        self.assertIn("No active sound set found!", output)
        self.assertIn(f"MEDIA_ROOT: {self.media}", output)

    def test_existing_files_are_reported_with_size(self):
        for name in ("first.wav", "accent.wav", "normal.wav"):
            (self.media / name).write_bytes(b"12345")
        self.make_active()

        output = self.run_command("check_sounds")

        self.assertEqual(output.count("exists (5 bytes)"), 3)
        self.assertIn("Active sound set: Active", output)
        self.assertIn("Normal: /metronome_sounds/normal.wav", output)

    def test_missing_files_without_default_asset_are_reported(self):
        self.make_active()

        output = self.run_command("check_sounds")

        self.assertEqual(output.count("\u2717"), 3)
        self.assertEqual(output.count("Default sound file not found at"), 3)

    def test_missing_files_are_restored_from_default_assets(self):
        assets = self.root / "frontend" / "src" / "assets" / "audio"
        assets.mkdir(parents=True)
        for name in ("default_normal_beat.wav", "default_accent.wav", "default_first_beat.wav"):
            (assets / name).write_bytes(b"DEFAULT")
        sound_set = self.make_active()

        output = self.run_command("check_sounds")

        self.assertEqual(output.count("Copied default sound from"), 3)
        for name in ("first.wav", "accent.wav", "normal.wav"):
            self.assertEqual((self.media / name).read_bytes(), b"DEFAULT")
        sound_set.refresh_from_db()
        self.assertEqual(sound_set.first_beat_sound.name, "first.wav")


class FixSoundPathsTests(CommandTestCase):
    def test_reports_when_no_sound_sets_exist(self):
        self.assertIn("No sound sets found in database!", self.run_command("fix_sound_paths"))

    def test_strips_directories_from_stored_paths(self):
        sound_set = MetronomeSoundSet.objects.create(
            name="Nested",
            is_active=True,
            first_beat_sound="metronome_sounds/first.mp3",
            accent_sound="a/b/accent.mp3",
            normal_beat_sound="normal.mp3",
        )

        output = self.run_command("fix_sound_paths")

        sound_set.refresh_from_db()
        self.assertEqual(sound_set.first_beat_sound.name, "first.mp3")
        self.assertEqual(sound_set.accent_sound.name, "accent.mp3")
        self.assertEqual(sound_set.normal_beat_sound.name, "normal.mp3")
        self.assertIn("Updated sound set Nested", output)
        self.assertIn("Fixing first beat: metronome_sounds/first.mp3 -> first.mp3", output)
        self.assertIn("Verification after fix:", output)
        self.assertIn("First URL: /metronome_sounds/first.mp3", output)

    def test_clean_paths_are_left_alone(self):
        MetronomeSoundSet.objects.create(
            name="Clean", first_beat_sound="f.mp3", accent_sound="a.mp3", normal_beat_sound="n.mp3"
        )

        output = self.run_command("fix_sound_paths")

        self.assertIn("No changes needed for sound set Clean", output)
        self.assertNotIn("Verification after fix:", output)  # nothing is active

    def test_normal_beat_path_is_fixed_too(self):
        sound_set = MetronomeSoundSet.objects.create(
            name="Deep", first_beat_sound="f.mp3", accent_sound="a.mp3", normal_beat_sound="old/dir/n.mp3"
        )

        output = self.run_command("fix_sound_paths")

        sound_set.refresh_from_db()
        self.assertEqual(sound_set.normal_beat_sound.name, "n.mp3")
        self.assertIn("Fixing normal beat: old/dir/n.mp3 -> n.mp3", output)

    def test_each_path_is_fixed_independently(self):
        sound_set = MetronomeSoundSet.objects.create(
            name="Mixed", first_beat_sound="x/f.mp3", accent_sound="a.mp3", normal_beat_sound="n.mp3"
        )

        self.run_command("fix_sound_paths")

        sound_set.refresh_from_db()
        self.assertEqual(
            (sound_set.first_beat_sound.name, sound_set.accent_sound.name, sound_set.normal_beat_sound.name),
            ("f.mp3", "a.mp3", "n.mp3"),
        )


class MoveSoundFilesTests(CommandTestCase):
    def test_reports_missing_source_directory(self):
        self.assertIn("does not exist!", self.run_command("move_sound_files"))

    def test_copies_files_up_one_level_and_skips_existing(self):
        source = self.media / "metronome_sounds"
        source.mkdir()
        (source / "one.mp3").write_bytes(b"ONE")
        (source / "two.mp3").write_bytes(b"NEW")
        (source / "subdir").mkdir()
        (self.media / "two.mp3").write_bytes(b"OLD")

        output = self.run_command("move_sound_files")

        self.assertEqual((self.media / "one.mp3").read_bytes(), b"ONE")
        self.assertEqual((self.media / "two.mp3").read_bytes(), b"OLD")
        self.assertIn("two.mp3 already exists, skipping", output)
        self.assertIn("Successfully moved 1 files", output)

    def test_copy_errors_are_reported_and_do_not_abort(self):
        source = self.media / "metronome_sounds"
        source.mkdir()
        (source / "one.mp3").write_bytes(b"ONE")

        with mock.patch("shutil.copy2", side_effect=PermissionError("denied")):
            output = self.run_command("move_sound_files")

        self.assertIn("Error moving", output)
        self.assertIn("denied", output)
        self.assertIn("No files were moved", output)
        self.assertFalse((self.media / "one.mp3").exists())

    def test_nothing_to_move(self):
        (self.media / "metronome_sounds").mkdir()

        self.assertIn("No files were moved", self.run_command("move_sound_files"))
